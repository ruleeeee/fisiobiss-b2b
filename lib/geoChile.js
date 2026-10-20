import { foldGeoName, lookupAppRegion, regionKeyFromApp } from "./comunas";

export const REGION_GEO_CODE = {
  "Arica y Parinacota (XV)": 15,
  "Tarapacá (I)": 1,
  "Antofagasta (II)": 2,
  "Atacama (III)": 3,
  "Coquimbo (IV)": 4,
  "Valparaíso (V)": 5,
  "Metropolitana (RM)": 13,
  "O'Higgins (VI)": 6,
  "Maule (VII)": 7,
  "Ñuble (XVI)": 16,
  "Biobío (VIII)": 8,
  "Araucanía (IX)": 9,
  "Los Ríos (XIV)": 14,
  "Los Lagos (X)": 10,
  "Aysén (XI)": 11,
  "Magallanes (XII)": 12,
};

export function normalizeRegionName(raw) {
  const s = String(raw || "").trim();
  if (!s || /^retiro/i.test(s)) return "";
  const app = lookupAppRegion(s) || Object.keys(REGION_GEO_CODE).find(k => foldGeoName(k) === regionKeyFromApp(s));
  return app || s;
}

export function communeGeoUrl(appRegion) {
  const code = REGION_GEO_CODE[appRegion];
  if (!code) return "";
  return `/geo/comunas/${code}.geojson`;
}

export function geoFeatureName(props, kind) {
  if (!props) return "";
  if (kind === "comuna") return props.Comuna || props.comuna || props.NOM_COMUNA || "";
  return lookupAppRegion(props.Region || props.region || "") || (props.Region || "");
}

export function countByName(counts, name) {
  if (!counts || !name) return 0;
  if (counts[name]) return counts[name];
  const k = foldGeoName(name);
  for (const [n, v] of Object.entries(counts)) {
    if (foldGeoName(n) === k) return v;
  }
  return 0;
}

export function heatColor(count, max) {
  if (!count) return "#1F7A48";
  const t = Math.min(1, count / Math.max(1, max));
  const r = Math.round(31 + t * (82 - 31));
  const g = Math.round(122 + t * (183 - 122));
  const b = Math.round(72 + t * (136 - 72));
  return `rgb(${r},${g},${b})`;
}

function ringInChile(ring) {
  if (!ring?.length) return false;
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  ring.forEach(p => {
    if (typeof p?.[0] === "number") {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
    }
    if (typeof p?.[1] === "number") {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
  });
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return midX > -77 && midX < -66 && midY > -56.6 && midY < -17;
}

function clipGeometry(geom) {
  if (!geom) return null;
  if (geom.type === "Polygon") {
    const rings = (geom.coordinates || []).filter(ringInChile);
    return rings.length ? { ...geom, coordinates: rings } : null;
  }
  if (geom.type === "MultiPolygon") {
    const polys = (geom.coordinates || []).filter(poly => ringInChile(poly[0]));
    if (!polys.length) return null;
    return polys.length === 1
      ? { type: "Polygon", coordinates: polys[0] }
      : { ...geom, coordinates: polys };
  }
  return geom;
}

export function clipChileContinental(fc) {
  if (!fc?.features) return fc;
  return {
    type: "FeatureCollection",
    features: fc.features
      .map(f => {
        const geometry = clipGeometry(f.geometry);
        return geometry ? { ...f, geometry } : null;
      })
      .filter(Boolean),
  };
}

export function parseOrderDate(fechaRaw) {
  if (!fechaRaw) return null;
  const str = String(fechaRaw).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(str.slice(0, 10) + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    let y = parts[2];
    if (y.length === 2) y = "20" + y;
    const d = new Date(`${y}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
