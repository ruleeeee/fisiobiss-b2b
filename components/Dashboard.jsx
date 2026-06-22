// components/Dashboard.jsx
import { useState, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { $, N, P, PIE_COLORS, PRODUCTS as FALLBACK_PRODUCTS } from "../lib/constants";

const selStyle = { background: "#0D1F12", border: "1px solid #1A3520", color: "#E8F5EE", padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" };

const parseDate = (fechaRaw) => {
  if (!fechaRaw) return { month: "", day: "" };
  const str = String(fechaRaw).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return { month: str.slice(0, 7), day: str.slice(8, 10) };
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    let y = parts[2];
    if (y.length === 2) y = "20" + y;
    return { month: `${y}-${m}`, day: d };
  }
  return { month: str.slice(0, 7), day: "01" };
};

export default function Dashboard({ orders = [], syncing = false, products: propProducts }) {
  const PRODUCTS = propProducts?.length ? propProducts : FALLBACK_PRODUCTS;

  const processedOrders = useMemo(() => {
    return orders.map(o => {
      const { month, day } = parseDate(o.fecha);
      
      const finalUnidades = o.totalUnidades > 0 
        ? o.totalUnidades 
        : (o.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);

      let calcCogs = 0;
      let calcSubtotal = 0;

      (o.items || []).forEach(it => {
        let searchName = it.name
          .replace("Cap. ", "Cápsulas ")
          .replace("Ext. ", "Extracto ")
          .replace("Gom. ", "Gomitas ")
          .replace("Pol. ", "Polvo ");
        
        if (searchName === "Cápsulas Desincha +") searchName = "Cápsula Desincha +";

        const prodData = PRODUCTS.find(p => p.name === searchName || p.name === it.name) || {};
        const costoReal = prodData.costo || it.costo || 0;
        const precioReal = prodData.precio || it.precio || 0;

        calcCogs += (it.qty * costoReal);
        calcSubtotal += (it.qty * precioReal);
      });

      const finalTotal = o.totalPagar > 0 ? o.totalPagar : (calcSubtotal + (o.costoEnvio || 0));

      return {
        ...o,
        _month: month,
        _day: day,
        totalUnidades: finalUnidades,
        cogs: calcCogs,
        totalPagar: finalTotal
      };
    }).filter(o => o._month !== "");
  }, [orders]);

  const allMonths = useMemo(() => [...new Set(processedOrders.map(o => o._month))].sort().reverse(), [processedOrders]);
  const defaultMonth = allMonths.length > 0 ? allMonths[0] : new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(defaultMonth);
  const [vend, setVend] = useState("Todos");

  if (allMonths.length > 0 && !allMonths.includes(mes) && mes !== defaultMonth) setMes(allMonths[0]);

  const filteredOrders = useMemo(() => processedOrders.filter(o => {
    const mOk = o._month === mes;
    const vOk = vend === "Todos" || o.vendedor === vend;
    return mOk && vOk;
  }), [processedOrders, mes, vend]);

  const rev = filteredOrders.reduce((s, o) => s + (o.totalPagar || 0), 0);
  const units = filteredOrders.reduce((s, o) => s + (o.totalUnidades || 0), 0);
  const nPed = filteredOrders.length;
  const ticket = nPed ? rev / nPed : 0;
  
  const cogs = filteredOrders.reduce((s, o) => s + (o.cogs || 0), 0);
  const gross = rev / 1.19 - cogs;
  const margin = rev ? gross / (rev / 1.19) : 0;

  const regMap = {};
  filteredOrders.forEach(o => { 
    const k = o.region?.split("(")[0]?.trim() || "Otra"; 
    regMap[k] = (regMap[k] || 0) + (o.totalPagar || 0); 
  });
  const topReg = Object.entries(regMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  const dailyData = useMemo(() => {
    const dayMap = {};
    filteredOrders.forEach(o => { 
      const d = o._day;
      if (d) dayMap[d] = (dayMap[d] || 0) + (o.totalPagar || 0); 
    });
    return Object.keys(dayMap).sort((a, b) => +a - +b).map(d => ({ dia: +d, ventas: dayMap[d] }));
  }, [filteredOrders]);

  const monthData = useMemo(() => {
    const mMap = {};
    processedOrders.forEach(o => {
      const m = o._month; 
      if (!m) return;
      if (!mMap[m]) mMap[m] = { mes: m, rev: 0, profit: 0, pedidos: 0 };
      mMap[m].rev += (o.totalPagar || 0);
      mMap[m].profit += (o.totalPagar || 0) / 1.19 - (o.cogs || 0);
      mMap[m].pedidos += 1;
    });
    return Object.values(mMap).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-8).map(m => ({ ...m, label: m.mes.slice(5) + "/" + m.mes.slice(2, 4) }));
  }, [processedOrders]);

  const skuData = useMemo(() => {
    const skuMap = {};
    filteredOrders.forEach(o => {
      (o.items || []).forEach(it => { 
        if (it.qty > 0) { 
          let searchName = it.name.replace("Cap. ", "Cápsulas ").replace("Ext. ", "Extracto ").replace("Gom. ", "Gomitas ").replace("Pol. ", "Polvo ");
          if (searchName === "Cápsulas Desincha +") searchName = "Cápsula Desincha +";
          const p = PRODUCTS.find(prod => prod.name === searchName || prod.name === it.name);
          const precioReal = p?.precio || it.precio || 0;
          skuMap[it.name] = (skuMap[it.name] || 0) + (it.qty * precioReal); 
        } 
      });
    });
    return Object.entries(skuMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([n, v]) => ({ name: n.replace("Cápsulas ", "Cap. ").replace("Extracto ", "Ext. ").replace("Gomitas ", "Gom. ").replace("Polvo ", "Pol. "), v }));
  }, [filteredOrders]);

  const regData = Object.entries(regMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, v]) => ({ name: n, v }));
  const allVendors = ["Todos", ...new Set(orders.map(o => o.vendedor).filter(Boolean))];

  const KPI = ({ icon, label, value, sub, color = "#52B788" }) => (
    <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 12, padding: "16px 18px", flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 10, color: "#5A8A66", fontWeight: 700, letterSpacing: 1, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>{label.toUpperCase()}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#4A7A56", marginTop: 5 }}>{sub}</div>}
    </div>
  );

  const Chart = ({ title, children }) => (
    <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#5A8A66", letterSpacing: 1, marginBottom: 12 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );

  const TT = ({ active, payload, label }) => active && payload?.length ? (
    <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#5A8A66", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || "#52B788", fontWeight: 700 }}>{p.name}: {$(p.value)}</div>)}
    </div>
  ) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, flex: 1 }}>Dashboard</div>
        <select value={mes} onChange={e => setMes(e.target.value)} style={selStyle}>
          {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={vend} onChange={e => setVend(e.target.value)} style={selStyle}>
          {allVendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <KPI icon="💰" label="Revenue Bruto" value={$(rev)} sub={`${nPed} pedidos`} color="#52B788" />
        <KPI icon="📈" label="Gross Profit" value={$(gross)} sub={`Margen ${P(margin)}`} color="#F0B429" />
        <KPI icon="📦" label="Unidades" value={N(units)} sub={`Ticket ${$(ticket)}`} color="#7EC8A4" />
        <KPI icon="🏆" label="Top Región" value={topReg} sub={$(regMap[topReg] || 0)} color="#E87040" />
        <KPI icon="📊" label="Total BBDD" value={N(processedOrders.length)} sub="pedidos históricos" color="#7A9B84" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        <Chart title={`Ventas Diarias — ${mes}`}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3520" />
              <XAxis dataKey="dia" tick={{ fill: "#4A7A56", fontSize: 10 }} />
              <YAxis tick={{ fill: "#4A7A56", fontSize: 10 }} tickFormatter={v => $(v).replace("$", "")} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="ventas" stroke="#52B788" fill="#52B788" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Chart>
        <Chart title="Por Región">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={regData} dataKey="v" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {regData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Chart>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Chart title="Tendencia Mensual">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3520" />
              <XAxis dataKey="label" tick={{ fill: "#4A7A56", fontSize: 10 }} />
              <YAxis tick={{ fill: "#4A7A56", fontSize: 10 }} tickFormatter={v => $(v).replace("$", "")} />
              <Tooltip content={<TT />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "#5A8A66" }} />
              <Line type="monotone" dataKey="rev" stroke="#52B788" strokeWidth={2} dot={{ r: 3, fill: "#52B788" }} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#F0B429" strokeWidth={2} dot={{ r: 3, fill: "#F0B429" }} strokeDasharray="5 5" name="Gross Profit" />
            </LineChart>
          </ResponsiveContainer>
        </Chart>
        <Chart title="Top SKUs — Revenue">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={skuData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3520" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#4A7A56", fontSize: 9 }} tickFormatter={v => $(v).replace("$", "")} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#7EC8A4", fontSize: 9 }} width={110} />
              <Tooltip content={<TT />} />
              <Bar dataKey="v" fill="#2E7D52" radius={[0, 4, 4, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Chart>
      </div>

      {/* ── TOP 10 DISTRIBUIDORES ── */}
      {(() => {
        const TIER_COLORS = { oro: "#B8860B", plata: "#8EA8B8", verde: "#52B788", sin: "#4A5568" };
        const TIER_ICONS  = { oro: "🏆", plata: "🥈", verde: "🌿", sin: "–" };
        const getTierDash = (rev) => {
          if (rev >= 500000) return { id: "oro",   label: "ORO",   color: "#B8860B" };
          if (rev >= 300000) return { id: "plata", label: "PLATA", color: "#8EA8B8" };
          if (rev >= 150000) return { id: "verde", label: "VERDE", color: "#52B788" };
          return { id: "sin", label: "S/T", color: "#4A5568" };
        };
        const distMap = {};
        filteredOrders.forEach(o => {
          const key = o.cliente?.trim();
          if (!key) return;
          distMap[key] = (distMap[key] || 0) + (o.totalPagar || 0);
        });
        const top10 = Object.entries(distMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([nombre, rev]) => ({ nombre, rev, tier: getTierDash(rev) }));
        if (!top10.length) return null;
        return (
          <Chart title={`Top 10 Distribuidores — ${mes}`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top10.map(d => ({ name: d.nombre.length > 18 ? d.nombre.slice(0, 17) + "…" : d.nombre, v: d.rev, tier: d.tier.id }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1A3520" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4A7A56", fontSize: 9 }} tickFormatter={v => $(v).replace("$", "")} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#7EC8A4", fontSize: 9 }} width={130} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div style={{ background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                    <div style={{ color: "#5A8A66", marginBottom: 4 }}>{label}</div>
                    <div style={{ color: "#52B788", fontWeight: 700 }}>Revenue: {$(payload[0].value)}</div>
                    <div style={{ color: TIER_COLORS[payload[0].payload.tier] || "#52B788", fontSize: 10 }}>
                      Tier: {TIER_ICONS[payload[0].payload.tier]} {payload[0].payload.tier.toUpperCase()}
                    </div>
                  </div>
                ) : null} />
                <Bar dataKey="v" radius={[0, 4, 4, 0]} name="Revenue">
                  {top10.map((d, i) => <Cell key={i} fill={d.tier.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 10, color: "#5A8A66", justifyContent: "flex-end" }}>
              <span style={{ color: "#B8860B" }}>🏆 Oro ≥$500k</span>
              <span style={{ color: "#8EA8B8" }}>🥈 Plata ≥$300k</span>
              <span style={{ color: "#52B788" }}>🌿 Verde ≥$150k</span>
              <span style={{ color: "#4A5568" }}>– Sin tier</span>
            </div>
          </Chart>
        );
      })()}
    </div>
  );
}