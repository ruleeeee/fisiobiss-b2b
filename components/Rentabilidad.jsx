import { C, $, P } from "../lib/constants";
import { s } from "./ui/shared";

export default function Rentabilidad({ orders }) {
  const t = orders.reduce((acc, o) => {
    acc.v += o.subtotal || 0;
    acc.e += o.costoEnvio || 0;
    acc.c += o.cogs || 0;
    acc.tot += o.totalPagar || 0;
    return acc;
  }, { v: 0, e: 0, c: 0, tot: 0 });

  const utilidad = t.v - t.c;
  const margen = t.v ? (utilidad / t.v) : 0;

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.blue, marginBottom: 20 }}>Estado de Resultados (P&L)</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.cardB}`, paddingBottom: 6 }}>
          <span>Ingresos Operacionales (Venta Bruta B2B)</span>\n          <span style={{ fontWeight: "700", color: "#52B788" }}>{$(t.v)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.cardB}`, paddingBottom: 6 }}>
          <span>Costo de los Bienes Vendidos (COGS - Fungi Stock)</span>\n          <span style={{ fontWeight: "700", color: C.red }}>-{$(t.c)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${C.cardB}`, paddingBottom: 6, fontSize: 16, fontWeight: "700" }}>
          <span>Utilidad Bruta</span>\n          <span style={{ color: C.orange }}>{$(utilidad)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, fontSize: 14, fontWeight: "600", color: C.sub }}>
          <span>Margen Bruto Porcentual</span>\n          <span>{P(margen)}</span>
        </div>
      </div>
    </div>
  );
}