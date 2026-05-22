import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { C, $, N, P } from "../lib/constants";
import { s } from "./ui/shared";

export default function Dashboard({ orders }) {
  // Lógica de agregación para gráficos
  const kpis = orders.reduce((acc, o) => {
    acc.ventas += o.totalPagar || 0;
    acc.unidades += o.totalUnidades || 0;
    acc.costo += o.cogs || 0;
    return acc;
  }, { ventas: 0, unidades: 0, costo: 0 });

  const margenTotal = kpis.ventas - kpis.costo;
  const porcMargen = kpis.ventas ? margenTotal / kpis.ventas : 0;

  // Renderizar gráficos resumidos por fecha
  const chartData = orders.slice(0, 10).reverse().map(o => ({
    name: o.id,
    Ventas: o.totalPagar,
    Margen: o.totalPagar - o.cogs
  }));

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Análisis General</h2>
      
      {/* Grid de KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={s.card}>
          <div style={{ fontSize: 12, color: C.sub }}>INGRESO TOTAL</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#52B788", marginTop: 4 }}>{$(kpis.ventas)}</div>
        </div>
        <div style={s.card}>
          <div style={{ fontSize: 12, color: C.sub }}>UNIDADES VENDIDAS</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.accent, marginTop: 4 }}>{N(kpis.unidades)} und</div>
        </div>
        <div style={s.card}>
          <div style={{ fontSize: 12, color: C.sub }}>UTILIDAD BRUTA</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.orange, marginTop: 4 }}>{$(margenTotal)}</div>
        </div>
        <div style={s.card}>
          <div style={{ fontSize: 12, color: C.sub }}>MARGEN COMERCIAL</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.blue, marginTop: 4 }}>{P(porcMargen)}</div>
        </div>
      </div>

      {/* Gráfico */}
      <div style={{ ...s.card, height: 350 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: C.cream }}>Evolución de Pedidos Recientes</div>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.cardB} />
            <XAxis dataKey="name" stroke={C.sub} />
            <YAxis stroke={C.sub} />
            <Tooltip contentStyle={{ backgroundColor: C.card, border: `1px solid ${C.cardB}` }} />
            <Legend />
            <Area type="monotone" dataKey="Ventas" stroke="#52B788" fill="rgba(82,183,136,0.1)" strokeWidth={2} />
            <Area type="monotone" dataKey="Margen" stroke={C.orange} fill="rgba(197,110,60,0.1)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}