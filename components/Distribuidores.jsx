// components/Distribuidores.jsx
import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { $, N, P, PIE_COLORS } from "../lib/constants";

// ─── Tier config (basado en inversión mensual) ─────────────────────────────────
const TIERS = [
  { id: "oro",   label: "ORO",   icon: "🏆", min: 500000, color: "#B8860B", bg: "#2A1F00", border: "#B8860B" },
  { id: "plata", label: "PLATA", icon: "🥈", min: 300000, color: "#8EA8B8", bg: "#0F1F2A", border: "#5A8098" },
  { id: "verde", label: "VERDE", icon: "🌿", min: 150000, color: "#52B788", bg: "#0D1F12", border: "#2A5A36" },
  { id: "sin",   label: "SIN TIER", icon: "–",  min: 0,      color: "#4A5568", bg: "#0F1418", border: "#2D3748" },
];

function getTier(monthlySpend) {
  if (monthlySpend >= 500000) return TIERS[0];
  if (monthlySpend >= 300000) return TIERS[1];
  if (monthlySpend >= 150000) return TIERS[2];
  return TIERS[3];
}

const selStyle = {
  background: "#0D1F12", border: "1px solid #1A3520", color: "#E8F5EE",
  padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
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

  // ─── Procesar todos los pedidos ────────────────────────────────────────────
  const processed = useMemo(() =>
    orders.map(o => ({ ...o, ...parseDate(o.fecha) })).filter(o => o.month),
    [orders]
  );

  // ─── Calcular gasto acumulado por distribuidor en el mes seleccionado ──────
  const distData = useMemo(() => {
    const inPeriod = processed.filter(o => o.month === mes);

    // Gasto total histórico por cliente (para detectar si es nuevo en el período)
    const historyBefore = {};
    processed.forEach(o => {
      if (o.month < mes) {
        const key = o.cliente?.trim();
        if (!key) return;
        if (!historyBefore[key]) historyBefore[key] = { firstMonth: o.month };
        else if (o.month < historyBefore[key].firstMonth) historyBefore[key].firstMonth = o.month;
      }
    });

    // Primer mes de compra de cada cliente (en TODO el historial)
    const firstPurchaseMonth = {};
    processed.forEach(o => {
      const key = o.cliente?.trim();
      if (!key) return;
      if (!firstPurchaseMonth[key] || o.month < firstPurchaseMonth[key]) {
        firstPurchaseMonth[key] = o.month;
      }
    });

    // Agrupar por cliente en el período seleccionado
    const distMap = {};
    inPeriod.forEach(o => {
      const key = o.cliente?.trim();
      if (!key) return;
      if (!distMap[key]) {
        distMap[key] = {
          nombre: key,
          region: o.region?.split("(")[0]?.trim() || "Otra",
          telefono: o.telefono || "",
          email: o.email || "",
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

    // Calcular tier y tipo (nuevo vs frecuente)
    return Object.values(distMap).map(d => {
      const tier = getTier(d.revenue);
      // Es NUEVO si su primera compra registrada en todo el historial es en este mes
      const isNew = d.firstPurchaseMonth === mes;
      return { ...d, tier, isNew };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [processed, mes]);

  // ─── KPIs del período ──────────────────────────────────────────────────────
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

  // ─── Tendencia mensual de distribuidores (nuevo vs recurrente) ────────────
  const trendData = useMemo(() => {
    const byMonth = {};
    const firstPurchase = {};
    processed.forEach(o => {
      const key = o.cliente?.trim();
      if (!key) return;
      if (!firstPurchase[key] || o.month < firstPurchase[key]) firstPurchase[key] = o.month;
    });

    allMonths.slice().reverse().forEach(m => {
      const inM = processed.filter(o => o.month === m);
      const clients = [...new Set(inM.map(o => o.cliente?.trim()).filter(Boolean))];
      const nuevos = clients.filter(c => firstPurchase[c] === m).length;
      const frecuentes = clients.filter(c => firstPurchase[c] !== m).length;
      const revenue = inM.reduce((s, o) => s + (o.totalPagar || 0), 0);
      byMonth[m] = { mes: m, label: m.slice(5) + "/" + m.slice(2, 4), nuevos, frecuentes, total: clients.length, revenue };
    });
    return Object.values(byMonth).slice(-8);
  }, [processed, allMonths]);

  // ─── Filtrar por tier ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (selectedTier === "todos") return distData;
    return distData.filter(d => d.tier.id === selectedTier);
  }, [distData, selectedTier]);

  const newDist = filtered.filter(d => d.isNew);
  const frecDist = filtered.filter(d => !d.isNew);

  // ─── Componentes locales ──────────────────────────────────────────────────
  const KPI = ({ icon, label, value, sub, color = "#52B788" }) => (
    <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, color: "#5A8A66", fontWeight: 700, letterSpacing: 1, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>{label.toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#4A7A56", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const Chart = ({ title, children }) => (
    <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#5A8A66", letterSpacing: 1, marginBottom: 10 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );

  const TT = ({ active, payload, label }) => active && payload?.length ? (
    <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#5A8A66", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || "#52B788", fontWeight: 700 }}>{p.name}: {p.value}</div>)}
    </div>
  ) : null;

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
      ? <div style={{ color: "#3A6A46", fontSize: 13, padding: "20px 0", textAlign: "center" }}>{emptyMsg}</div>
      : <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1A3520" }}>
              {["#", "Distribuidor", "Región", "Tier", "Pedidos", "Revenue", "Unidades"].map(h => (
                <th key={h} style={{ color: "#5A8A66", fontWeight: 700, padding: "6px 10px", textAlign: "left", fontSize: 10, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dists.map((d, i) => (
              <tr
                key={d.nombre}
                onClick={() => setSelectedDist(selectedDist?.nombre === d.nombre ? null : d)}
                style={{
                  borderBottom: "1px solid #111E14",
                  background: selectedDist?.nombre === d.nombre ? "#0F2A18" : "transparent",
                  cursor: "pointer", transition: "background .1s",
                }}
                onMouseEnter={e => { if (selectedDist?.nombre !== d.nombre) e.currentTarget.style.background = "#0D1F14"; }}
                onMouseLeave={e => { if (selectedDist?.nombre !== d.nombre) e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "8px 10px", color: "#3A6A46", fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: "8px 10px", color: "#E8F5EE", fontWeight: 600 }}>{d.nombre}</td>
                <td style={{ padding: "8px 10px", color: "#7EC8A4", fontSize: 11 }}>{d.region}</td>
                <td style={{ padding: "8px 10px" }}><TierBadge tier={d.tier} /></td>
                <td style={{ padding: "8px 10px", color: "#7EC8A4" }}>{d.pedidos}</td>
                <td style={{ padding: "8px 10px", color: accentColor || "#52B788", fontWeight: 700 }}>{$(d.revenue)}</td>
                <td style={{ padding: "8px 10px", color: "#5A8A66" }}>{N(d.unidades)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );

  // ─── Vista detalle distribuidor ───────────────────────────────────────────
  if (selectedDist) {
    const d = selectedDist;
    const monthlyHistory = useMemo ? null : null; // se calcula abajo
    const distHistory = processed.filter(o => o.cliente?.trim() === d.nombre);
    const histByMonth = {};
    distHistory.forEach(o => {
      if (!histByMonth[o.month]) histByMonth[o.month] = { mes: o.month, label: o.month.slice(5) + "/" + o.month.slice(2, 4), revenue: 0, pedidos: 0 };
      histByMonth[o.month].revenue += o.totalPagar || 0;
      histByMonth[o.month].pedidos += 1;
    });
    const histChartData = Object.values(histByMonth).sort((a, b) => a.mes.localeCompare(b.mes));

    // Tier histórico por mes
    const tierHistory = histChartData.map(m => ({ ...m, tier: getTier(m.revenue).label }));

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setSelectedDist(null)} style={{ ...selStyle, display: "flex", alignItems: "center", gap: 6 }}>
            ← Volver
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>{d.nombre}</div>
          <TierBadge tier={d.tier} size="lg" />
          <span style={{ fontSize: 11, color: d.isNew ? "#52B788" : "#F0B429", fontWeight: 700, background: d.isNew ? "#0D2A18" : "#2A1F00", padding: "4px 10px", borderRadius: 6, border: `1px solid ${d.isNew ? "#1A5A2A" : "#7A5000"}` }}>
            {d.isNew ? "✦ NUEVO" : "⟳ FRECUENTE"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <KPI icon="💰" label="Revenue" value={$(d.revenue)} sub={`en ${mes}`} color="#52B788" />
          <KPI icon="📦" label="Pedidos" value={d.pedidos} sub={`en ${mes}`} color="#7EC8A4" />
          <KPI icon="📊" label="Unidades" value={N(d.unidades)} sub={`en ${mes}`} color="#5A8A66" />
          <KPI icon="📅" label="1er Compra" value={d.firstPurchaseMonth} color="#F0B429" />
          <KPI icon="🗂" label="Total Pedidos" value={distHistory.length} sub="histórico" color="#9B59B6" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Chart title="Revenue Mensual">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={histChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A3520" />
                <XAxis dataKey="label" tick={{ fill: "#4A7A56", fontSize: 10 }} />
                <YAxis tick={{ fill: "#4A7A56", fontSize: 10 }} tickFormatter={v => $(v).replace("$", "")} />
                <Tooltip content={<TT />} />
                <Bar dataKey="revenue" fill="#52B788" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </Chart>
          <Chart title="Evolución de Tier">
            <div style={{ padding: "10px 0" }}>
              {histChartData.map(m => {
                const t = getTier(m.revenue);
                return (
                  <div key={m.mes} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ color: "#5A8A66", fontSize: 11, minWidth: 60 }}>{m.label}</span>
                    <div style={{ flex: 1, height: 24, background: "#0A1A0C", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: t.color, opacity: 0.8,
                        width: `${Math.min(100, (m.revenue / 500000) * 100)}%`,
                        borderRadius: 6, transition: "width .3s",
                        display: "flex", alignItems: "center", paddingLeft: 8,
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
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
                <tr style={{ borderBottom: "1px solid #1A3520" }}>
                  {["ID", "Fecha", "Región", "Unidades", "Total", "Estado"].map(h => (
                    <th key={h} style={{ color: "#5A8A66", fontWeight: 700, padding: "6px 10px", textAlign: "left", fontSize: 10, letterSpacing: 0.8 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #111E14" }}>
                    <td style={{ padding: "8px 10px", color: "#3A6A46", fontWeight: 700 }}>{o.id}</td>
                    <td style={{ padding: "8px 10px", color: "#7EC8A4" }}>{o.fecha}</td>
                    <td style={{ padding: "8px 10px", color: "#5A8A66" }}>{o.region?.split("(")[0]?.trim()}</td>
                    <td style={{ padding: "8px 10px", color: "#7EC8A4" }}>{N(o.totalUnidades)}</td>
                    <td style={{ padding: "8px 10px", color: "#52B788", fontWeight: 700 }}>{$(o.totalPagar)}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 10, color: "#4A7A56", background: "#0A1A0C", padding: "2px 7px", borderRadius: 4 }}>{o.estado}</span>
                    </td>
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
        <KPI icon="👥" label="Total Distribuidores" value={N(kpis.total)} sub={`en ${mes}`} color="#52B788" />
        <KPI icon="✦" label="Nuevos" value={N(kpis.nuevos)} sub={$(kpis.revenueNuevos)} color="#52B788" />
        <KPI icon="⟳" label="Frecuentes" value={N(kpis.frecuentes)} sub={$(kpis.revenueFrecuentes)} color="#F0B429" />
        <KPI icon="🏆" label="Tier Oro" value={N(kpis.byTier.oro)} sub="≥ $500.000/mes" color="#B8860B" />
        <KPI icon="🥈" label="Tier Plata" value={N(kpis.byTier.plata)} sub="≥ $300.000/mes" color="#8EA8B8" />
        <KPI icon="🌿" label="Tier Verde" value={N(kpis.byTier.verde)} sub="≥ $150.000/mes" color="#52B788" />
      </div>

      {/* Análisis de crecimiento */}
      <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#5A8A66", letterSpacing: 1, marginBottom: 10 }}>
          📡 ANÁLISIS DE CRECIMIENTO — {mes}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: "#7EC8A4", marginBottom: 6 }}>
              ¿Cómo está creciendo el canal este período?
            </div>
            <div style={{ fontSize: 13, color: "#E8F5EE", marginBottom: 8 }}>
              {kpis.nuevos > kpis.frecuentes
                ? <><span style={{ color: "#52B788", fontWeight: 700 }}>↑ Expansión de canal:</span> El crecimiento viene principalmente de <strong>{kpis.nuevos} distribuidores nuevos</strong> vs {kpis.frecuentes} frecuentes.</>
                : kpis.nuevos === 0
                  ? <><span style={{ color: "#F0B429", fontWeight: 700 }}>⟳ Base consolidada:</span> Sin distribuidores nuevos. El canal depende de <strong>{kpis.frecuentes} distribuidores frecuentes</strong>.</>
                  : <><span style={{ color: "#F0B429", fontWeight: 700 }}>⟳ Profundización:</span> El crecimiento viene de <strong>{kpis.frecuentes} distribuidores frecuentes</strong> comprando más ({kpis.nuevos} nuevos este mes).</>
              }
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: kpis.revenueNuevos, background: "#1A5A2A", borderRadius: 4, height: 10, transition: "flex .4s" }} title={`Nuevos: ${$(kpis.revenueNuevos)}`} />
              <div style={{ flex: kpis.revenueFrecuentes, background: "#7A5000", borderRadius: 4, height: 10, transition: "flex .4s" }} title={`Frecuentes: ${$(kpis.revenueFrecuentes)}`} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 5, fontSize: 10, color: "#5A8A66" }}>
              <span style={{ color: "#52B788" }}>● Nuevos {growthPct}%</span>
              <span style={{ color: "#F0B429" }}>● Frecuentes {(100 - parseFloat(growthPct)).toFixed(1)}%</span>
            </div>
          </div>
          <div style={{ width: 160 }}>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={[
                  { name: "Nuevos", v: kpis.revenueNuevos || 0.01 },
                  { name: "Frecuentes", v: kpis.revenueFrecuentes || 0.01 },
                ]} dataKey="v" innerRadius={28} outerRadius={45}>
                  <Cell fill="#52B788" />
                  <Cell fill="#F0B429" />
                </Pie>
                <Tooltip formatter={v => $(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {tierPieData.length > 0 && (
            <div style={{ width: 160 }}>
              <div style={{ fontSize: 10, color: "#5A8A66", marginBottom: 4, textAlign: "center" }}>POR TIER</div>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={tierPieData} dataKey="v" innerRadius={28} outerRadius={45}>
                    {tierPieData.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 9, color: "#4A7A56", textAlign: "center" }}>
                {tierPieData.map(t => <span key={t.name} style={{ marginRight: 6, color: t.color }}>● {t.name}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tendencia mensual */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5A8A66", letterSpacing: 1, marginBottom: 10 }}>TENDENCIA — NUEVOS VS FRECUENTES</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3520" />
              <XAxis dataKey="label" tick={{ fill: "#4A7A56", fontSize: 10 }} />
              <YAxis tick={{ fill: "#4A7A56", fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<TT />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "#5A8A66" }} />
              <Bar dataKey="nuevos" fill="#52B788" radius={[3, 3, 0, 0]} name="Nuevos" stackId="a" />
              <Bar dataKey="frecuentes" fill="#F0B429" radius={[3, 3, 0, 0]} name="Frecuentes" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tablas nuevo vs frecuente */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* NUEVOS */}
        <div style={{ background: "#0D1F12", border: "1px solid #1A5A2A", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#52B788", letterSpacing: 1, marginBottom: 2 }}>
            ✦ DISTRIBUIDORES NUEVOS — {mes}
          </div>
          <div style={{ fontSize: 10, color: "#3A6A46", marginBottom: 10 }}>
            Primera compra registrada en este período · {newDist.length} distribuidores
          </div>
          <DistTable dists={newDist} emptyMsg="No hay distribuidores nuevos en este período" accentColor="#52B788" />
        </div>

        {/* FRECUENTES */}
        <div style={{ background: "#0D1F12", border: "1px solid #7A5000", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#F0B429", letterSpacing: 1, marginBottom: 2 }}>
            ⟳ DISTRIBUIDORES FRECUENTES — {mes}
          </div>
          <div style={{ fontSize: 10, color: "#5A4020", marginBottom: 10 }}>
            Clientes con historial previo al período · {frecDist.length} distribuidores
          </div>
          <DistTable dists={frecDist} emptyMsg="No hay distribuidores frecuentes en este período" accentColor="#F0B429" />
        </div>
      </div>

      {/* Tabla completa */}
      {filtered.length > 0 && (
        <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 12, padding: "14px 16px", marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5A8A66", letterSpacing: 1, marginBottom: 10 }}>
            TODOS LOS DISTRIBUIDORES — {mes} {selectedTier !== "todos" ? `· TIER ${selectedTier.toUpperCase()}` : ""}
            <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 10, color: "#3A6A46" }}>Haz clic en un distribuidor para ver su detalle</span>
          </div>
          <DistTable dists={filtered} emptyMsg="Sin datos para este filtro" />
        </div>
      )}
    </div>
  );
}