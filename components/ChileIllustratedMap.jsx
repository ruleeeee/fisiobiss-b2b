import { colors } from "../lib/theme.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import {
  clipChileContinental, communeGeoUrl, countByName, geoFeatureName,
} from "../lib/geoChile";
import { foldGeoName } from "../lib/comunas";

const MAP_W = 420;
const MAP_H = 820;
const ZOOM_H = 640;
const MIN_Z = 1;
const MAX_Z = 8;

const MAP_DARK = [
  "#6414B8",
  "#C24510",
  "#1A6240",
  "#8C3014",
  "#332A86",
  "#1A5560",
  "#5C4034",
  "#7A1844",
  "#3E5418",
  "#642456",
  "#1E3A6E",
  "#6E3218",
  "#244232",
  "#4A2878",
  "#5C3030",
  "#2A3830",
];

const REGION_FILL = {
  "Arica y Parinacota (XV)": MAP_DARK[0],
  "Tarapacá (I)": MAP_DARK[1],
  "Antofagasta (II)": MAP_DARK[2],
  "Atacama (III)": MAP_DARK[3],
  "Coquimbo (IV)": MAP_DARK[4],
  "Valparaíso (V)": MAP_DARK[5],
  "Metropolitana (RM)": MAP_DARK[6],
  "O'Higgins (VI)": MAP_DARK[7],
  "Maule (VII)": MAP_DARK[8],
  "Ñuble (XVI)": MAP_DARK[9],
  "Biobío (VIII)": MAP_DARK[10],
  "Araucanía (IX)": MAP_DARK[11],
  "Los Ríos (XIV)": MAP_DARK[12],
  "Los Lagos (X)": MAP_DARK[13],
  "Aysén (XI)": MAP_DARK[14],
  "Magallanes (XII)": MAP_DARK[15],
};

const COMMUNE_FILL = MAP_DARK;

function fit(geo, drilled) {
  const h = drilled ? ZOOM_H : MAP_H;
  if (drilled) return geoMercator().fitExtent([[28, 28], [MAP_W - 28, h - 24]], geo);
  return geoMercator().fitExtent([[MAP_W * 0.3, 12], [MAP_W * 0.7, h - 12]], geo);
}

export default function ChileIllustratedMap({
  counts = {},
  selectedRegion,
  selectedComuna,
  onRegion,
  onComuna,
  hover,
  setHover,
}) {
  const [chileGeo, setChileGeo] = useState(null);
  const [communeGeo, setCommuneGeo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const moved = useRef(false);

  useEffect(() => {
    fetch("/geo/regiones-chile.json")
      .then(r => { if (!r.ok) throw new Error("No se pudo cargar Chile"); return r.json(); })
      .then(json => { setChileGeo(clipChileContinental(json)); setError(""); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setQ("");
    if (!selectedRegion) {
      setCommuneGeo(null);
      return;
    }
    const url = communeGeoUrl(selectedRegion);
    if (!url) return;
    let cancel = false;
    setCommuneGeo(null);
    setLoading(true);
    fetch(url)
      .then(r => { if (!r.ok) throw new Error("No se pudieron cargar las comunas"); return r.json(); })
      .then(json => { if (!cancel) { setCommuneGeo(clipChileContinental(json)); setError(""); } })
      .catch(e => { if (!cancel) setError(e.message); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [selectedRegion]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedRegion]);

  const drilled = !!selectedRegion;
  const geo = drilled ? communeGeo : chileGeo;
  const kind = drilled ? "comuna" : "region";
  const height = drilled ? ZOOM_H : MAP_H;
  const projection = useMemo(() => (geo ? fit(geo, drilled) : geoMercator()), [geo, drilled]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const labelScale = drilled ? zoom : 1;
  const picked = (name) => foldGeoName(selectedComuna) === foldGeoName(name);

  const communes = useMemo(() => {
    if (!communeGeo?.features) return [];
    return communeGeo.features
      .map(f => geoFeatureName(f.properties, "comuna"))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [communeGeo]);

  const fillOf = (name, idx) => {
    if (kind === "region") return REGION_FILL[name] || COMMUNE_FILL[idx % COMMUNE_FILL.length];
    return COMMUNE_FILL[idx % COMMUNE_FILL.length];
  };

  const shown = communes.filter(c => !q || foldGeoName(c).includes(foldGeoName(q)));
  const cx = MAP_W / 2;
  const cy = height / 2;

  const zoomAt = (next, sx, sy) => {
    const z = Math.min(MAX_Z, Math.max(MIN_Z, next));
    const px = (sx - pan.x - cx * (1 - zoom)) / zoom;
    const py = (sy - pan.y - cy * (1 - zoom)) / zoom;
    setZoom(z);
    setPan({
      x: sx - cx * (1 - z) - px * z,
      y: sy - cy * (1 - z) - py * z,
    });
  };

  const btn = {
    width: 36, height: 36, borderRadius: 8, border: `1px solid ${colors.line}`,
    background: colors.paper, color: colors.purple, fontSize: 18, fontWeight: 800,
    cursor: "pointer", lineHeight: 1,
  };

  return (
    <div>
      <div style={{
        background: colors.bg,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        aspectRatio: `${MAP_W} / ${height}`,
        touchAction: drilled && zoom > 1 ? "none" : "auto",
        cursor: drilled && zoom > 1 ? "grab" : "default",
        onPointerDown: drilled && zoom > 1 ? (e) => {
          drag.current = { x: e.clientX, y: e.clientY, pan };
          moved.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
        } : undefined,
        onPointerMove: drilled && zoom > 1 ? (e) => {
          if (!drag.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const dx = (e.clientX - drag.current.x) * (MAP_W / rect.width);
          const dy = (e.clientY - drag.current.y) * (height / rect.height);
          if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
          setPan({ x: drag.current.pan.x + dx, y: drag.current.pan.y + dy });
        } : undefined,
        onPointerUp: () => { drag.current = null; },
      }}>
        <div style={{
          position: "absolute", left: 14, top: 12, right: 14, zIndex: 2,
          minHeight: 20, fontSize: 13, fontWeight: 700, color: colors.ink,
          pointerEvents: "none",
        }}>
          {hover ? `${hover.name} · ${hover.count} activos` : ""}
        </div>
        {error && <div style={{ color: colors.orange, fontSize: 13, padding: 12 }}>{error}</div>}
        {loading && !geo && <div style={{ color: colors.muted, fontSize: 14, padding: 28 }}>Cargando mapa…</div>}
        {geo && (
          <ComposableMap
            projection={projection}
            width={MAP_W}
            height={height}
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <g transform={`translate(${pan.x} ${pan.y}) translate(${cx} ${cy}) scale(${drilled ? zoom : 1}) translate(${-cx} ${-cy})`}>
            <Geographies geography={geo}>
              {({ geographies }) => (
                <>
                  {geographies.map((g, idx) => {
                    const name = geoFeatureName(g.properties, kind);
                    const regionApp = geoFeatureName(g.properties, "region");
                    const n = countByName(counts, name);
                    const on = picked(name) || hover?.name === name;
                    const fill = on ? colors.ink : fillOf(name, idx);
                    const stroke = on ? colors.ink : colors.paper;
                    return (
                      <Geography
                        key={g.rsmKey}
                        geography={g}
                        tabIndex={-1}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={0.7}
                        onMouseDown={e => e.preventDefault()}
                        onMouseEnter={() => setHover({ name, count: n })}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => {
                          if (moved.current) return;
                          if (kind === "region") onRegion(regionApp || name);
                          else onComuna(name);
                        }}
                        style={{ fill, stroke, outline: "none", cursor: "pointer" }}
                      />
                    );
                  })}
                  {geographies.map((g) => {
                    const name = geoFeatureName(g.properties, kind);
                    const n = countByName(counts, name);
                    const [x, y] = path.centroid(g);
                    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                    const [[x0, y0], [x1, y1]] = path.bounds(g);
                    const box = Math.min(Math.abs(x1 - x0), Math.abs(y1 - y0));
                    const screen = Math.max(8, Math.min(15, box * 0.42));
                    const fontSize = screen / labelScale;
                    return (
                      <text
                        key={`count-${g.rsmKey}`}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={fontSize}
                        fontWeight={700}
                        fill="#F4EFE6"
                        stroke="#141012"
                        strokeWidth={Math.max(0.35, fontSize * 0.14)}
                        paintOrder="stroke"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {n > 0 ? n : "S.D"}
                      </text>
                    );
                  })}
                </>
              )}
            </Geographies>
            </g>
          </ComposableMap>
        )}
        {drilled && (
          <div
            style={{ position: "absolute", right: 12, bottom: 12, zIndex: 3, display: "flex", flexDirection: "column", gap: 6 }}
            onPointerDown={e => e.stopPropagation()}
          >
            <button type="button" style={btn} onClick={() => zoomAt(zoom * 1.35, cx, cy)} aria-label="Acercar">+</button>
            <button type="button" style={btn} onClick={() => zoomAt(zoom / 1.35, cx, cy)} aria-label="Alejar">−</button>
            <button type="button" style={{ ...btn, fontSize: 11 }} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Ver toda la región">1:1</button>
          </div>
        )}
      </div>

      {drilled && (
        <div style={{ marginTop: 14 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar comuna…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: colors.paper, border: `1px solid ${colors.line}`, color: colors.ink,
              padding: "12px 14px", borderRadius: 8, fontSize: 14, marginBottom: 10,
            }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 340, overflowY: "auto" }}>
            {shown.map(name => {
              const n = countByName(counts, name);
              const on = picked(name);
              return (
                <button
                  key={name}
                  type="button"
                  onMouseEnter={() => setHover({ name, count: n })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onComuna(name)}
                  style={{
                    textAlign: "left",
                    background: on ? colors.line : "transparent",
                    border: `1px solid ${on ? colors.purple : colors.line}`,
                    color: on ? colors.purple : colors.ink,
                    borderRadius: 8,
                    padding: "12px 14px",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{name}</span>
                  <span style={{ color: colors.purple, fontWeight: 800 }}>{n}</span>
                </button>
              );
            })}
            {shown.length === 0 && <div style={{ color: colors.muted, fontSize: 14, padding: 8 }}>Sin comunas con ese nombre.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
