import { colors, tiers } from "../lib/theme.js";
// components/Distribuidores.jsx
import { useState, useMemo } from "react";
import {
  BarChart, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { $, N, PERFILES_DIST, ORIGENES_PEDIDO, CANALES_ADQUISICION } from "../lib/constants";
import { buildClientIndex } from "../lib/clientIdentity";

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIERS = [
  { id: "oro",   label: "ORO",      icon: "🏆", min: 500000, color: tiers.oro.fg, bg: colors.orangeSoft, border: tiers.oro.fg },
  { id: "plata", label: "PLATA",    icon: "🥈", min: 300000, color: tiers.plata.fg, bg: colors.paper, border: colors.muted },
  { id: "verde", label: "VERDE",    icon: "🌿", min: 150000, color: colors.purple, bg: colors.paper, border: colors.muted },
  { id: "sin",   label: "SIN TIER", icon: "–",  min: 0,      color: tiers.sin.fg, bg: colors.bg, border: colors.ink },
];

function getTier(monthlySpend) {
  if (monthlySpend >= 500000) return TIERS[0];
  if (monthlySpend >= 300000) return TIERS[1];
  if (monthlySpend >= 150000) return TIERS[2];
  return TIERS[3];
}

const selStyle = {
  background: colors.paper, border: `1px solid ${colors.line}`, color: colors.ink,
  padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
};

const SIN_DATO = "Sin dato";
const PERFIL_KEYS = [...PERFILES_DIST, SIN_DATO];
const ORIGEN_KEYS = [...ORIGENES_PEDIDO, SIN_DATO];
const CANAL_KEYS = [...CANALES_ADQUISICION, SIN_DATO];
const PERFIL_COLORS = {
  "Distribuidor natural": colors.purple,
  "Local": colors.purple,
  "Profesional de la salud": colors.purple,
  [SIN_DATO]: colors.muted,
};
const ORIGEN_COLORS = {
  "Lead nuevo": colors.purple,
  "Cliente antiguo": colors.orange,
  [SIN_DATO]: colors.muted,
};
const CANAL_COLORS = {
  "Contacto Directo": colors.purple,
  "Meta": colors.purple,
  "TikTok": colors.orange,
  "Landing page": colors.purple,
  [SIN_DATO]: colors.muted,
};

const monthLabel = (m) => `${m.slice(5)}/${m.slice(2, 4)}`;
const pickClass = (raw, allowed) => {
  const s = String(raw || "").trim();
  return allowed.includes(s) ? s : SIN_DATO;
};

const parseDate = (fechaRaw) => {
  if (!fechaRaw) return { month: "", day: "", iso: "" };
  const str = String(fechaRaw).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return { month: str.slice(0, 7), day: str.slice(8, 10), iso: str.slice(0, 10) };
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    let y = parts[2];
    if (y.length === 2) y = "20" + y;
    return { month: `${y}-${m}`, day: d, iso: `${y}-${m}-${d}` };
  }
  return { month: str.slice(0, 7), day: "01", iso: str.slice(0, 10) };
};

export default function Distribuidores({ orders = [] }) {
  const allMonths = useMemo(() => {
    const months = [...new Set(orders.map(o => parseDate(o.fecha).month).filter(Boolean))].sort().reverse();
    return months;
  }, [orders]);

  const defaultMonth = allMonths[0] || new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(defaultMonth);
  const [selectedTier, setSelectedTier] = useState("todos");
  const [selectedDist, setSelectedDist] = useState(null);
  const [classifMetric, setClassifMetric] = useState("pedidos");
  const [classifFilter, setClassifFilter] = useState(null);

  // ─── Procesar pedidos: añadir mes/día ────────────────────────────────────
  const processed = useMemo(() =>
    orders.map(o => ({ ...o, ...parseDate(o.fecha) })).filter(o => o.month),
    [orders]
  );

  // ─── Índice de identidad de clientes (union-find por tel + email) ─────────
  // orderKeyMap: { orderId → clientKey }
  // groups: { clientKey → { nombre, telefono, email, orderIds[] } }
  const { orderKeyMap, groups } = useMemo(() => buildClientIndex(processed), [processed]);

  // ─── Primera compra de cada cliente (en TODO el historial) ───────────────
  const firstPurchaseMonth = useMemo(() => {
    const fp = {};
    processed.forEach(o => {
      const key = orderKeyMap[o.id];
      if (!key) return;
      if (!fp[key] || o.month < fp[key]) fp[key] = o.month;
    });
    return fp;
  }, [processed, orderKeyMap]);

  // ─── Distribuidores del período seleccionado ─────────────────────────────
  const orderMatchesClassif = (o) => {
    if (!classifFilter) return true;
    if (classifFilter.dim === "perfil") return pickClass(o.perfilDistribuidor, PERFILES_DIST) === classifFilter.value;
    if (classifFilter.dim === "origen") return pickClass(o.origenPedido, ORIGENES_PEDIDO) === classifFilter.value;
    if (classifFilter.dim === "canal") return pickClass(o.origenPedido, ORIGENES_PEDIDO) === "Lead nuevo"
      && pickClass(o.canalAdquisicion, CANALES_ADQUISICION) === classifFilter.value;
    return true;
  };

  const toggleClassif = (dim, value) => {
    setClassifFilter(prev => (prev?.dim === dim && prev.value === value ? null : { dim, value }));
  };

  const distData = useMemo(() => {
    const inPeriod = processed.filter(o => o.month === mes && orderMatchesClassif(o));

    // Agrupar por clientKey
    const distMap = {};
    inPeriod.forEach(o => {
      const key = orderKeyMap[o.id];
      if (!key) return;
      const groupInfo = groups[key] || {};
      if (!distMap[key]) {
        distMap[key] = {
          _key: key,
          nombre: groupInfo.nombre || o.cliente?.trim() || "Sin nombre",
          nombres: groupInfo.nombres || [],
          region: o.region?.split("(")[0]?.trim() || "Otra",
          telefono: groupInfo.telefono || "",
          telefonos: groupInfo.telefonos || [],
          email: groupInfo.email || "",
          emails: groupInfo.emails || [],
          pedidos: 0,
          revenue: 0,
          unidades: 0,
          orders: [],
          firstPurchaseMonth: firstPurchaseMonth[key] || mes,
        };
      }
      distMap[key].pedidos += 1;
      distMap[key].revenue += o.totalPagar || 0;
      distMap[key].unidades += o.totalUnidades || 0;
      distMap[key].orders.push(o);
    });

    return Object.values(distMap).map(d => {
      const tier = getTier(d.revenue);
      const isNew = d.firstPurchaseMonth === mes;
      return { ...d, tier, isNew };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [processed, mes, orderKeyMap, groups, firstPurchaseMonth, classifFilter]);

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = distData.length;
    const nuevos = distData.filter(d => d.isNew).length;
    const frecuentes = distData.filter(d => !d.isNew).length;
    const revenueNuevos = distData.filter(d => d.isNew).reduce((s, d) => s + d.revenue, 0);
    const revenueFrecuentes = distData.filter(d => !d.isNew).reduce((s, d) => s + d.revenue, 0);
    const totalRevenue = distData.reduce((s, d) => s + d.revenue, 0);
    const byTier = { oro: 0, plata: 0, verde: 0, sin: 0 };
    distData.forEach(d => { byTier[d.tier.id] = (byTier[d.tier.id] || 0) + 1; });
    return { total, nuevos, frecuentes, revenueNuevos, revenueFrecuentes, totalRevenue, byTier };
  }, [distData]);

  // ─── Tendencia mensual ────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const byMonth = {};
    allMonths.slice().reverse().forEach(m => {
      const inM = processed.filter(o => o.month === m);
      const clientKeys = [...new Set(inM.map(o => orderKeyMap[o.id]).filter(Boolean))];
      const nuevos = clientKeys.filter(k => firstPurchaseMonth[k] === m).length;
      const frecuentes = clientKeys.filter(k => firstPurchaseMonth[k] !== m).length;
      const revenue = inM.reduce((s, o) => s + (o.totalPagar || 0), 0);
      byMonth[m] = { mes: m, label: m.slice(5) + "/" + m.slice(2, 4), nuevos, frecuentes, total: clientKeys.length, revenue };
    });
    return Object.values(byMonth).slice(-8);
  }, [processed, allMonths, orderKeyMap, firstPurchaseMonth]);

  const classifCharts = useMemo(() => {
    const months = allMonths.slice().reverse().slice(-8);
    const addVal = (row, key, order) => {
      row[key] = (row[key] || 0) + (classifMetric === "revenue" ? (order.totalPagar || 0) : 1);
    };
    const emptyRow = (m, keys) => {
      const row = { mes: m, label: monthLabel(m) };
      keys.forEach(k => { row[k] = 0; });
      return row;
    };
    const scoped = processed.filter(orderMatchesClassif);
    const withTotal = (row, keys) => {
      row.total = keys.reduce((s, k) => s + (row[k] || 0), 0);
      return row;
    };
    const perfilTrend = months.map(m => {
      const row = emptyRow(m, PERFIL_KEYS);
      scoped.filter(o => o.month === m).forEach(o => addVal(row, pickClass(o.perfilDistribuidor, PERFILES_DIST), o));
      return withTotal(row, PERFIL_KEYS);
    });
    const origenTrend = months.map(m => {
      const row = emptyRow(m, ORIGEN_KEYS);
      scoped.filter(o => o.month === m).forEach(o => addVal(row, pickClass(o.origenPedido, ORIGENES_PEDIDO), o));
      return withTotal(row, ORIGEN_KEYS);
    });
    const canalTrend = months.map(m => {
      const row = emptyRow(m, CANAL_KEYS);
      scoped.filter(o => o.month === m && pickClass(o.origenPedido, ORIGENES_PEDIDO) === "Lead nuevo")
        .forEach(o => addVal(row, pickClass(o.canalAdquisicion, CANALES_ADQUISICION), o));
      return withTotal(row, CANAL_KEYS);
    });

    const inMes = scoped.filter(o => o.month === mes);
    const mix = (list, keyFn, keys) => keys.map(name => {
      const group = list.filter(o => keyFn(o) === name);
      return {
        name,
        pedidos: group.length,
        revenue: group.reduce((s, o) => s + (o.totalPagar || 0), 0),
        value: classifMetric === "revenue"
          ? group.reduce((s, o) => s + (o.totalPagar || 0), 0)
          : group.length,
      };
    });
    const leadsMes = inMes.filter(o => pickClass(o.origenPedido, ORIGENES_PEDIDO) === "Lead nuevo");

    return {
      perfilTrend,
      origenTrend,
      canalTrend,
      perfilMes: mix(inMes, o => pickClass(o.perfilDistribuidor, PERFILES_DIST), PERFIL_KEYS),
      origenMes: mix(inMes, o => pickClass(o.origenPedido, ORIGENES_PEDIDO), ORIGEN_KEYS),
      canalMes: mix(leadsMes, o => pickClass(o.canalAdquisicion, CANALES_ADQUISICION), CANAL_KEYS),
      leadsCount: leadsMes.length,
    };
  }, [processed, allMonths, mes, classifMetric, classifFilter]);

  // ─── Filtrar por tier ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (selectedTier === "todos") return distData;
    return distData.filter(d => d.tier.id === selectedTier);
  }, [distData, selectedTier]);

  const newDist = filtered.filter(d => d.isNew);
  const frecDist = filtered.filter(d => !d.isNew);

  // ─── Subcomponentes ───────────────────────────────────────────────────────
  const KPI = ({ icon, label, value, sub, color = colors.purple }) => (
    <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, color: colors.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>{label.toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: colors.purple, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const Chart = ({ title, children }) => (
    <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: 1, marginBottom: 10 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );

  const formatClassif = (v) => classifMetric === "revenue" ? $(v) : N(v);

  const TT = ({ active, payload, label }) => active && payload?.length ? (
    <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: colors.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || colors.purple, fontWeight: 700 }}>{p.name}: {p.value}</div>)}
    </div>
  ) : null;

  const ClassifTT = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const items = payload.filter(p => p.dataKey !== "total" && p.value);
    const tot = payload[0]?.payload?.total || items.reduce((s, p) => s + (p.value || 0), 0);
    const title = (label && Number.isNaN(Number(label)) ? label : payload[0]?.payload?.name) || "";
    return (
      <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
        <div style={{ color: colors.muted, marginBottom: 4 }}>{title}</div>
        {items.map((p, i) => {
          const pct = tot ? ((p.value / tot) * 100).toFixed(1) : "0.0";
          return <div key={i} style={{ color: p.color || colors.purple, fontWeight: 700 }}>{p.name}: {formatClassif(p.value)} ({pct}%)</div>;
        })}
      </div>
    );
  };

  const StackedMonthChart = ({ data, keys, colors, dim }) => (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} onClick={(state) => {
        const row = state?.activePayload?.[0]?.payload;
        if (row?.mes) setMes(row.mes);
      }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
        <XAxis dataKey="label" tick={{ fill: colors.purple, fontSize: 10 }} />
        <YAxis tick={{ fill: colors.purple, fontSize: 10 }} tickFormatter={v => classifMetric === "revenue" ? $(v).replace("$", "") : v} allowDecimals={false} />
        <Tooltip content={<ClassifTT />} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: colors.muted }} />
        {keys.map(k => (
          <Bar key={k} dataKey={k} stackId="a" fill={colors[k]} cursor="pointer"
            radius={k === keys[keys.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]} name={k}
            onClick={(row) => { if (row?.mes) setMes(row.mes); toggleClassif(dim, k); }} />
        ))}
        <Line type="monotone" dataKey="total" stroke={colors.ink} strokeWidth={2} dot={{ r: 3 }} name="Total" />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const MonthMixChart = ({ data, colors, dim }) => {
    const tot = data.reduce((s, d) => s + (d.value || 0), 0);
    const withTot = data.map(d => ({ ...d, total: tot }));
    return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={withTot} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
        <XAxis type="number" tick={{ fill: colors.purple, fontSize: 10 }} tickFormatter={v => classifMetric === `revenue` ? $(v).replace("$", "") : v} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={118} tick={{ fill: colors.muted, fontSize: 10 }} />
        <Tooltip content={<ClassifTT />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} name={classifMetric === "revenue" ? "Revenue" : "Pedidos"} cursor="pointer"
          onClick={(row) => row?.name && toggleClassif(dim, row.name)}>
          {withTot.map((d, i) => <Cell key={i} fill={colors[d.name] || colors.purple} opacity={!classifFilter || classifFilter.value === d.name ? 1 : 0.35} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    );
  };

  const TierBadge = ({ tier, size = "sm" }) => (
    <span style={{
      background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color,
      borderRadius: 6, padding: size === "sm" ? "2px 7px" : "4px 10px",
      fontSize: size === "sm" ? 10 : 12, fontWeight: 700, letterSpacing: 0.5,
      display: "inline-flex", alignItems: "center", gap: 3,
    }}>
      {tier.icon} {tier.label}
    </span>
  );

  const DistTable = ({ dists, emptyMsg, accentColor }) => (
    dists.length === 0
      ? <div style={{ color: colors.muted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>{emptyMsg}</div>
      : <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.line}` }}>
              {["#", "Distribuidor", "Región", "Tier", "Pedidos", "Revenue", "Unidades"].map(h => (
                <th key={h} style={{ color: colors.muted, fontWeight: 700, padding: "6px 10px", textAlign: "left", fontSize: 10, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dists.map((d, i) => (
              <tr
                key={d._key}
                onClick={() => setSelectedDist(selectedDist?._key === d._key ? null : d)}
                style={{
                  borderBottom: `1px solid ${colors.subtle}`,
                  background: selectedDist?._key === d._key ? colors.paper : "transparent",
                  cursor: "pointer", transition: "background .1s",
                }}
                onMouseEnter={e => { if (selectedDist?._key !== d._key) e.currentTarget.style.background = colors.subtle; }}
                onMouseLeave={e => { if (selectedDist?._key !== d._key) e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "8px 10px", color: colors.muted, fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: "8px 10px", color: colors.ink, fontWeight: 600 }}>{d.nombre}</td>
                <td style={{ padding: "8px 10px", color: colors.muted, fontSize: 11 }}>{d.region}</td>
                <td style={{ padding: "8px 10px" }}><TierBadge tier={d.tier} /></td>
                <td style={{ padding: "8px 10px", color: colors.muted }}>{d.pedidos}</td>
                <td style={{ padding: "8px 10px", color: accentColor || colors.purple, fontWeight: 700 }}>{$(d.revenue)}</td>
                <td style={{ padding: "8px 10px", color: colors.muted }}>{N(d.unidades)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );

  // ─── Vista detalle distribuidor ───────────────────────────────────────────
  if (selectedDist) {
    const d = selectedDist;
    // Historial completo: pedidos del período actual del distribuidor + total histórico desde groups
    const distHistory = processed.filter(o => orderKeyMap[o.id] === d._key);
    const totalHistorico = groups[d._key]?.orderIds?.length ?? distHistory.length;
    const histByMonth = {};
    distHistory.forEach(o => {
      if (!histByMonth[o.month]) histByMonth[o.month] = { mes: o.month, label: o.month.slice(5) + "/" + o.month.slice(2, 4), revenue: 0, pedidos: 0 };
      histByMonth[o.month].revenue += o.totalPagar || 0;
      histByMonth[o.month].pedidos += 1;
    });
    const histChartData = Object.values(histByMonth).sort((a, b) => a.mes.localeCompare(b.mes));

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setSelectedDist(null)} style={{ ...selStyle, display: "flex", alignItems: "center", gap: 6 }}>
            ← Volver
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>{d.nombre}</div>
          <TierBadge tier={d.tier} size="lg" />
          <span style={{ fontSize: 11, color: d.isNew ? colors.purple : colors.orange, fontWeight: 700, background: d.isNew ? colors.subtle : colors.orangeSoft, padding: "4px 10px", borderRadius: 6, border: `1px solid ${d.isNew ? colors.ok : colors.caution}` }}>
            {d.isNew ? "✦ NUEVO" : "⟳ FRECUENTE"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <KPI icon="💰" label="Revenue" value={$(d.revenue)} sub={`en ${mes}`} color={colors.purple} />
          <KPI icon="📦" label="Pedidos" value={d.pedidos} sub={`en ${mes}`} color={colors.muted} />
          <KPI icon="📊" label="Unidades" value={N(d.unidades)} sub={`en ${mes}`} color={colors.muted} />
          <KPI icon="📅" label="1er Compra" value={d.firstPurchaseMonth} color={colors.orange} />
          <KPI icon="🗂" label="Total Pedidos" value={totalHistorico} sub="histórico" color={colors.purple} />
        </div>

        {/* Info de contacto — todos los datos registrados del cliente */}
        {(d.telefonos?.length > 0 || d.emails?.length > 0 || d.nombres?.length > 1) && (
          <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12 }}>
            {d.nombres?.length > 1 && (
              <div style={{ marginBottom: 6, color: colors.muted }}>
                <span style={{ color: colors.muted, marginRight: 6 }}>También registrado como:</span>
                {d.nombres.slice(0, -1).map((n, i) => (
                  <span key={i} style={{ color: colors.muted, marginRight: 10 }}>{n}</span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {d.telefonos?.map((t, i) => (
                <span key={i} style={{ color: colors.muted }}>📞 {t}</span>
              ))}
              {d.emails?.map((m, i) => (
                <span key={i} style={{ color: colors.muted }}>✉ {m}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Chart title="Revenue Mensual">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={histChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
                <XAxis dataKey="label" tick={{ fill: colors.purple, fontSize: 10 }} />
                <YAxis tick={{ fill: colors.purple, fontSize: 10 }} tickFormatter={v => $(v).replace("$", "")} />
                <Tooltip content={<TT />} />
                <Bar dataKey="revenue" fill={colors.purple} radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </Chart>
          <Chart title="Evolución de Tier">
            <div style={{ padding: "10px 0" }}>
              {histChartData.map(m => {
                const t = getTier(m.revenue);
                return (
                  <div key={m.mes} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ color: colors.muted, fontSize: 11, minWidth: 60 }}>{m.label}</span>
                    <div style={{ flex: 1, height: 24, background: colors.paper, borderRadius: 6, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: t.color, opacity: 0.8,
                        width: `${Math.min(100, (m.revenue / 500000) * 100)}%`,
                        borderRadius: 6, transition: "width .3s",
                        display: "flex", alignItems: "center", paddingLeft: 8,
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: colors.paper, whiteSpace: "nowrap" }}>
                          {t.icon} {t.label}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: t.color, fontSize: 11, fontWeight: 700, minWidth: 90, textAlign: "right" }}>{$(m.revenue)}</span>
                  </div>
                );
              })}
            </div>
          </Chart>
        </div>

        <Chart title={`Pedidos en ${mes}`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.line}` }}>
                  {["ID", "Fecha", "Región", "Unidades", "Total"].map(h => (
                    <th key={h} style={{ color: colors.muted, fontWeight: 700, padding: "6px 10px", textAlign: "left", fontSize: 10, letterSpacing: 0.8 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${colors.subtle}` }}>
                    <td style={{ padding: "8px 10px", color: colors.muted, fontWeight: 700 }}>{o.id}</td>
                    <td style={{ padding: "8px 10px", color: colors.muted }}>{o.fecha}</td>
                    <td style={{ padding: `8px 10px`, color: colors.muted }}>{o.region?.split(`(`)[0]?.trim()}</td>
                    <td style={{ padding: "8px 10px", color: colors.muted }}>{N(o.totalUnidades)}</td>
                    <td style={{ padding: "8px 10px", color: colors.purple, fontWeight: 700 }}>{$(o.totalPagar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Chart>
      </div>
    );
  }

  // ─── Vista principal ───────────────────────────────────────────────────────
  const growthPct = kpis.totalRevenue
    ? ((kpis.revenueNuevos / kpis.totalRevenue) * 100).toFixed(1)
    : 0;

  const tierPieData = TIERS.slice(0, 3).map(t => ({
    name: t.label, v: kpis.byTier[t.id] || 0, color: t.color,
  })).filter(t => t.v > 0);

  return (
    <div>
      {/* Header + filtros */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, flex: 1 }}>Distribuidores</div>
        <select value={mes} onChange={e => setMes(e.target.value)} style={selStyle}>
          {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={selectedTier} onChange={e => setSelectedTier(e.target.value)} style={selStyle}>
          <option value="todos">Todos los tiers</option>
          {TIERS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <KPI icon="👥" label="Total Distribuidores" value={N(kpis.total)} sub={`en ${mes}`} color={colors.purple} />
        <KPI icon="✦" label="Nuevos" value={N(kpis.nuevos)} sub={$(kpis.revenueNuevos)} color={colors.purple} />
        <KPI icon="⟳" label="Frecuentes" value={N(kpis.frecuentes)} sub={$(kpis.revenueFrecuentes)} color={colors.orange} />
        <KPI icon="🏆" label="Tier Oro" value={N(kpis.byTier.oro)} sub="≥ $500.000/mes" color={tiers.oro.fg} />
        <KPI icon="🥈" label="Tier Plata" value={N(kpis.byTier.plata)} sub="≥ $300.000/mes" color={tiers.plata.fg} />
        <KPI icon="🌿" label="Tier Verde" value={N(kpis.byTier.verde)} sub="≥ $150.000/mes" color={colors.purple} />
      </div>

      {/* Análisis de crecimiento */}
      <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: 1, marginBottom: 10 }}>
          📡 ANÁLISIS DE CRECIMIENTO — {mes}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>
              ¿Cómo está creciendo el canal este período?
            </div>
            <div style={{ fontSize: 13, color: colors.ink, marginBottom: 8 }}>
              {kpis.nuevos > kpis.frecuentes
                ? <><span style={{ color: colors.purple, fontWeight: 700 }}>↑ Expansión de canal:</span> El crecimiento viene principalmente de <strong>{kpis.nuevos} distribuidores nuevos</strong> vs {kpis.frecuentes} frecuentes.</>
                : kpis.nuevos === 0
                  ? <><span style={{ color: colors.orange, fontWeight: 700 }}>⟳ Base consolidada:</span> Sin distribuidores nuevos. El canal depende de <strong>{kpis.frecuentes} distribuidores frecuentes</strong>.</>
                  : <><span style={{ color: colors.orange, fontWeight: 700 }}>⟳ Profundización:</span> El crecimiento viene de <strong>{kpis.frecuentes} distribuidores frecuentes</strong> comprando más ({kpis.nuevos} nuevos este mes).</>
              }
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: kpis.revenueNuevos, background: colors.ok, borderRadius: 4, height: 10, transition: "flex .4s" }} title={`Nuevos: ${$(kpis.revenueNuevos)}`} />
              <div style={{ flex: kpis.revenueFrecuentes, background: colors.caution, borderRadius: 4, height: 10, transition: "flex .4s" }} title={`Frecuentes: ${$(kpis.revenueFrecuentes)}`} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 5, fontSize: 10, color: colors.muted }}>
              <span style={{ color: colors.purple }}>● Nuevos {growthPct}%</span>
              <span style={{ color: colors.orange }}>● Frecuentes {(100 - parseFloat(growthPct)).toFixed(1)}%</span>
            </div>
          </div>
          <div style={{ width: 160 }}>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={[
                  { name: "Nuevos", v: kpis.revenueNuevos || 0.01 },
                  { name: "Frecuentes", v: kpis.revenueFrecuentes || 0.01 },
                ]} dataKey="v" innerRadius={28} outerRadius={45}>
                  <Cell fill={colors.purple} />
                  <Cell fill={colors.orange} />
                </Pie>
                <Tooltip formatter={v => $(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {tierPieData.length > 0 && (
            <div style={{ width: 160 }}>
              <div style={{ fontSize: 10, color: colors.muted, marginBottom: 4, textAlign: "center" }}>POR TIER</div>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={tierPieData} dataKey="v" innerRadius={28} outerRadius={45}>
                    {tierPieData.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 9, color: colors.purple, textAlign: "center" }}>
                {tierPieData.map(t => <span key={t.name} style={{ marginRight: 6, color: t.color }}>● {t.name}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tendencia mensual */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: 1, marginBottom: 10 }}>TENDENCIA — NUEVOS VS FRECUENTES</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData} onClick={(state) => {
              const row = state?.activePayload?.[0]?.payload;
              if (row?.mes) setMes(row.mes);
            }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
              <XAxis dataKey="label" tick={{ fill: colors.purple, fontSize: 10 }} />
              <YAxis tick={{ fill: colors.purple, fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<TT />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: colors.muted }} />
              <Bar dataKey="nuevos" fill={colors.purple} radius={[3, 3, 0, 0]} name="Nuevos" stackId="a" />
              <Bar dataKey="frecuentes" fill={colors.orange} radius={[3, 3, 0, 0]} name="Frecuentes" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clasificación comercial */}
      <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: 1, flex: 1 }}>
            CLASIFICACIÓN COMERCIAL — PERFIL, ORIGEN Y CANAL
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["pedidos", "Pedidos"], ["revenue", "Revenue"]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setClassifMetric(id)}
                style={{
                  background: classifMetric === id ? colors.ink : "transparent",
                  color: classifMetric === id ? colors.paper : colors.muted,
                  border: `1px solid ${colors.line}`, borderRadius: 7, padding: "5px 10px",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
          Click en un mes para cambiar el período. Click en una categoría para filtrar tablas y gráficos.
        </div>
        {classifFilter && (
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, background: colors.ink, color: colors.ink, borderRadius: 6, padding: "4px 8px" }}>
              Filtro: {classifFilter.dim} · {classifFilter.value}
            </span>
            <button type="button" onClick={() => setClassifFilter(null)}
              style={{ background: "transparent", border: `1px solid ${colors.muted}`, color: colors.muted, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>
              Quitar filtro
            </button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.purple, letterSpacing: 1, marginBottom: 6 }}>PERFIL DE DISTRIBUIDOR · ÚLTIMOS MESES</div>
            <StackedMonthChart data={classifCharts.perfilTrend} keys={PERFIL_KEYS} colors={PERFIL_COLORS} dim="perfil" />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.purple, letterSpacing: 1, marginBottom: 6 }}>ORIGEN DEL PEDIDO · ÚLTIMOS MESES</div>
            <StackedMonthChart data={classifCharts.origenTrend} keys={ORIGEN_KEYS} colors={ORIGEN_COLORS} dim="origen" />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.purple, letterSpacing: 1, marginBottom: 6 }}>CANAL DE ADQUISICIÓN · LEADS NUEVOS · ÚLTIMOS MESES</div>
            <StackedMonthChart data={classifCharts.canalTrend} keys={CANAL_KEYS} colors={CANAL_COLORS} dim="canal" />
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted, letterSpacing: 1, margin: "16px 0 8px" }}>
          COMPOSICIÓN EN {mes} · {classifMetric === "revenue" ? "REVENUE" : "PEDIDOS"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: colors.muted, marginBottom: 4 }}>Perfil</div>
            <MonthMixChart data={classifCharts.perfilMes} colors={PERFIL_COLORS} dim="perfil" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: colors.muted, marginBottom: 4 }}>Origen</div>
            <MonthMixChart data={classifCharts.origenMes} colors={ORIGEN_COLORS} dim="origen" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: colors.muted, marginBottom: 4 }}>Canal {classifCharts.leadsCount ? `(${classifCharts.leadsCount} leads)` : "(sin leads)"}</div>
            <MonthMixChart data={classifCharts.canalMes} colors={CANAL_COLORS} dim="canal" />
          </div>
        </div>
      </div>

      {/* Tablas nuevo vs frecuente */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: colors.paper, border: `1px solid ${colors.ok}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.purple, letterSpacing: 1, marginBottom: 2 }}>
            ✦ DISTRIBUIDORES NUEVOS — {mes}
          </div>
          <div style={{ fontSize: 10, color: colors.muted, marginBottom: 10 }}>
            Primera compra registrada en este período · {newDist.length} distribuidores
          </div>
          <DistTable dists={newDist} emptyMsg="No hay distribuidores nuevos en este período" accentColor={colors.purple} />
        </div>
        <div style={{ background: colors.paper, border: `1px solid ${colors.caution}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.orange, letterSpacing: 1, marginBottom: 2 }}>
            ⟳ DISTRIBUIDORES FRECUENTES — {mes}
          </div>
          <div style={{ fontSize: 10, color: colors.caution, marginBottom: 10 }}>
            Clientes con historial previo al período · {frecDist.length} distribuidores
          </div>
          <DistTable dists={frecDist} emptyMsg="No hay distribuidores frecuentes en este período" accentColor={colors.orange} />
        </div>
      </div>

      {/* Tabla completa */}
      {filtered.length > 0 && (
        <div style={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "14px 16px", marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: 1, marginBottom: 10 }}>
            TODOS LOS DISTRIBUIDORES — {mes} {selectedTier !== "todos" ? `· TIER ${selectedTier.toUpperCase()}` : ""}
            <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 10, color: colors.muted }}>Haz clic en un distribuidor para ver su detalle</span>
          </div>
          <DistTable dists={filtered} emptyMsg="Sin datos para este filtro" />
        </div>
      )}
    </div>
  );
}