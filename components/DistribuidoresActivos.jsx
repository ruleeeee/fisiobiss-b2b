"use client";
import { colors } from "../lib/theme";
import { useEffect, useMemo, useState } from "react";
import { $, N } from "../lib/constants";
import { buildClientIndex } from "../lib/clientIdentity";
import { normalizeRegionName, parseOrderDate } from "../lib/geoChile";
import { foldGeoName } from "../lib/comunas";
import ChileIllustratedMap from "./ChileIllustratedMap";

const LS_DAYS = "fb2b_activo_days";
const MAX_DAYS = 180;
const MIN_DAYS = 7;
const PRESETS = [
  { days: 30, label: "1 mes" },
  { days: 45, label: "1 mes y medio" },
  { days: 60, label: "2 meses" },
  { days: 90, label: "3 meses" },
];
const EXTRA = [
  { days: 7, label: "7 días" },
  { days: 15, label: "15 días" },
  { days: 21, label: "3 semanas" },
  { days: 180, label: "6 meses" },
];

function readDays() {
  try {
    const v = Number(localStorage.getItem(LS_DAYS));
    if (Number.isFinite(v)) return Math.min(MAX_DAYS, Math.max(MIN_DAYS, v));
  } catch {}
  return 30;
}

function windowLabel(days) {
  if (days <= 10) return `${days} días`;
  if (days <= 37) return "1 mes";
  if (days <= 52) return "1 mes y medio";
  const months = Math.round(days / 30);
  return `${months} mes${months === 1 ? "" : "es"}`;
}

function fromLabel(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function groupKey(row, mode) {
  if (mode === "comuna") return row.comuna || "Sin comuna";
  return row.region || "Sin región";
}

export default function DistribuidoresActivos({ orders = [] }) {
  const [days, setDays] = useState(readDays);
  const [zone, setZone] = useState(null);
  const [hover, setHover] = useState(null);
  const [drillRegion, setDrillRegion] = useState("");
  const [optsOpen, setOptsOpen] = useState(false);
  const [listMode, setListMode] = useState("region");
  const [openGroup, setOpenGroup] = useState("");

  useEffect(() => {
    try { localStorage.setItem(LS_DAYS, String(days)); } catch {}
  }, [days]);

  useEffect(() => {
    setListMode(drillRegion ? "comuna" : "region");
    setOpenGroup("");
  }, [drillRegion]);

  const data = useMemo(() => {
    const { orderKeyMap, groups } = buildClientIndex(orders);
    const latest = {};
    const cutoff = Date.now() - days * 86400000;
    const pedidos = [];
    orders.forEach(o => {
      const dt = parseOrderDate(o.fecha);
      if (!dt || dt.getTime() < cutoff) return;
      const key = orderKeyMap[o.id];
      const g = groups[key] || {};
      const rec = {
        key: o.id,
        clientKey: key,
        nombre: g.nombre || o.cliente || "Sin nombre",
        telefono: g.telefono || o.telefono || "",
        fecha: o.fecha,
        region: normalizeRegionName(o.region),
        comuna: String(o.comuna || "").trim(),
        orderId: o.id,
        total: o.totalPagar || 0,
      };
      pedidos.push(rec);
      if (key) {
        const prev = latest[key];
        if (!prev || dt > prev.date) latest[key] = { date: dt, rec };
      }
    });
    const activos = Object.values(latest).map(x => x.rec);
    const regionMap = {};
    const comunaMap = {};
    activos.forEach(d => {
      if (d.region) {
        if (!regionMap[d.region]) regionMap[d.region] = { name: d.region, dists: [] };
        regionMap[d.region].dists.push(d);
      }
      if (d.comuna) {
        if (!comunaMap[d.comuna]) comunaMap[d.comuna] = { name: d.comuna, region: d.region, dists: [] };
        comunaMap[d.comuna].dists.push(d);
      }
    });
    const pack = (obj) => Object.values(obj).map(z => ({ ...z, count: z.dists.length })).sort((a, b) => b.count - a.count);
    return {
      pedidos: pedidos.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
      byRegion: pack(regionMap),
      byComuna: pack(comunaMap),
      totalActivos: activos.length,
    };
  }, [orders, days]);

  const { byRegion, byComuna, pedidos, totalActivos } = data;
  const drilled = !!drillRegion;

  const counts = useMemo(() => {
    const m = {};
    byRegion.forEach(z => { m[z.name] = z.count; });
    byComuna.forEach(z => { m[z.name] = z.count; });
    return m;
  }, [byRegion, byComuna]);

  const visiblePedidos = useMemo(() => {
    return pedidos.filter(p => {
      if (drilled && foldGeoName(p.region) !== foldGeoName(drillRegion)) return false;
      if (zone && listMode === "comuna" && foldGeoName(p.comuna) !== foldGeoName(zone)) return false;
      return true;
    });
  }, [pedidos, drilled, drillRegion, zone, listMode]);

  const grouped = useMemo(() => {
    const map = {};
    visiblePedidos.forEach(p => {
      const k = groupKey(p, listMode);
      if (!map[k]) map[k] = [];
      map[k].push(p);
    });
    return Object.entries(map)
      .map(([name, rows]) => ({
        name,
        rows: rows.slice().sort((a, b) => (b.total || 0) - (a.total || 0)),
        count: rows.length,
      }))
      .sort((a, b) => b.count - a.count || (b.rows[0]?.total || 0) - (a.rows[0]?.total || 0));
  }, [visiblePedidos, listMode]);

  const goChile = () => {
    setDrillRegion("");
    setZone(null);
    setHover(null);
  };

  const pickGroup = (name) => {
    setOpenGroup(prev => prev === name ? "" : name);
    if (listMode === "region" && name !== "Sin región") {
      setDrillRegion(name);
      setZone(null);
    }
    if (listMode === "comuna" && name !== "Sin comuna") {
      setZone(name);
      const sample = grouped.find(g => g.name === name)?.rows?.[0];
      if (sample?.region) setDrillRegion(sample.region);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Distribuidores activos</div>

      <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted, letterSpacing: 1 }}>VENTANA DE ACTIVIDAD</div>
          <div style={{ fontSize: 13, color: colors.ink }}>
            Desde <strong style={{ color: colors.orange }}>{fromLabel(days)}</strong> hasta hoy · {windowLabel(days)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {PRESETS.map(p => {
            const on = days === p.days;
            return (
              <button key={p.days} type="button" onClick={() => { setDays(p.days); setOptsOpen(false); }}
                style={{
                  background: on ? colors.line : "transparent",
                  color: on ? colors.purple : colors.muted,
                  border: `1px solid ${on ? colors.purple : colors.line}`,
                  borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                  fontSize: 13, fontWeight: 700,
                }}>
                {p.label}
              </button>
            );
          })}
          <div style={{ position: "relative" }}>
            {optsOpen && (
              <div onClick={() => setOptsOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 19 }} />
            )}
            <button type="button" onClick={() => setOptsOpen(v => !v)}
              style={{
                background: (!PRESETS.some(p => p.days === days) || optsOpen) ? colors.line : "transparent",
                color: colors.orange,
                border: `1px solid ${colors.line}`,
                borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                fontSize: 13, fontWeight: 700,
              }}>
              Opciones {optsOpen ? "▴" : "▾"}
            </button>
            {optsOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20,
                width: 280, background: colors.paper, border: `1px solid ${colors.line}`,
                borderRadius: 10, padding: 12, boxShadow: "0 12px 32px rgba(20,16,18,.12)",
              }} onMouseDown={e => e.stopPropagation()}>
                <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>MÁS PERÍODOS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {EXTRA.map(p => (
                    <button key={p.days} type="button" onClick={() => { setDays(p.days); setOptsOpen(false); }}
                      style={{
                        background: days === p.days ? colors.line : "transparent",
                        color: days === p.days ? colors.purple : colors.muted,
                        border: `1px solid ${days === p.days ? colors.purple : colors.line}`,
                        borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>PERSONALIZADO</div>
                <input
                  type="range" min={MIN_DAYS} max={MAX_DAYS} step={1} value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  style={{ width: `100%`, accentColor: colors.purple, cursor: `pointer` }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: colors.muted, marginTop: 4 }}>
                  <span>{MIN_DAYS} días</span>
                  <span style={{ color: colors.purple, fontWeight: 700 }}>{windowLabel(days)}</span>
                  <span>6 meses</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          ["Activos", N(totalActivos), windowLabel(days)],
          ["Pedidos", N(pedidos.length), "en la ventana"],
          ["Regiones", N(byRegion.length), "con cobertura"],
        ].map(([l, v, s]) => (
          <div key={l} style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 10, color: colors.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: colors.purple }}>{v}</div>
            <div style={{ fontSize: 11, color: colors.purple, marginTop: 4 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 1.15fr) minmax(300px, 0.85fr)", gap: 18, alignItems: "stretch" }}>
        <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.purple, letterSpacing: 1 }}>
              {drilled ? `COMUNAS · ${drillRegion}` : "CHILE · ELIGE UNA REGIÓN"}
            </div>
            {drilled && (
              <button type="button" onClick={goChile}
                style={{ background: "transparent", border: `1px solid ${colors.line}`, color: colors.muted, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>
                Volver a Chile
              </button>
            )}
          </div>
          <ChileIllustratedMap
            counts={counts}
            selectedRegion={drillRegion || null}
            selectedComuna={zone}
            hover={hover}
            setHover={setHover}
            onRegion={(name) => { setDrillRegion(name); setZone(null); }}
            onComuna={(name) => setZone(prev => prev === name ? null : name)}
          />
        </div>

        <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", height: 0, minHeight: "100%", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: 1 }}>
              PEDIDOS {drilled ? `· ${drillRegion}` : ""}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                ["region", "Por región"],
                ["comuna", "Por comuna"],
              ].map(([id, label]) => {
                const on = listMode === id;
                return (
                  <button key={id} type="button" onClick={() => { setListMode(id); setOpenGroup(""); }}
                    style={{
                      background: on ? colors.line : "transparent",
                      color: on ? colors.purple : colors.muted,
                      border: `1px solid ${on ? colors.purple : colors.line}`,
                      borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                      fontSize: 12, fontWeight: 700,
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {zone && (
            <button type="button" onClick={() => setZone(null)}
              style={{ background: "transparent", border: `1px solid ${colors.line}`, color: colors.muted, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, marginBottom: 10 }}>
              Quitar filtro {zone}
            </button>
          )}
          <div style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>{N(visiblePedidos.length)} pedidos</div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {grouped.length === 0 && (
              <div style={{ color: colors.muted, fontSize: 13 }}>No hay pedidos en esta vista y ventana.</div>
            )}
            {grouped.map(g => {
              const open = openGroup === g.name || grouped.length === 1;
              return (
                <div key={g.name} style={{ borderBottom: `1px solid ${colors.subtle}` }}>
                  <button type="button" onClick={() => pickGroup(g.name)}
                    style={{
                      display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center",
                      background: "transparent", border: "none", padding: "14px 0", cursor: "pointer",
                      color: colors.ink, fontSize: 15, textAlign: "left",
                    }}>
                    <span style={{ fontWeight: 700 }}>{open ? "▾ " : "▸ "}{g.name}</span>
                    <span style={{ color: colors.purple, fontWeight: 800 }}>{g.count}</span>
                  </button>
                  {open && g.rows.map(p => (
                    <div key={p.orderId} style={{ padding: "12px 0 12px 8px", borderTop: `1px solid ${colors.subtle}` }}>
                      <div style={{ fontWeight: 700, color: colors.ink, fontSize: 15 }}>{p.nombre}</div>
                      <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                        {p.orderId} · {p.fecha} · {p.comuna || "sin comuna"}
                        {p.telefono ? ` · ${p.telefono}` : ""}
                      </div>
                      <div style={{ fontSize: 12, color: colors.purple, fontWeight: 700, marginTop: 2 }}>{$(p.total)}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
