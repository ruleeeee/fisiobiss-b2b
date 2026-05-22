import { updateOrderStatus, deleteOrder } from "../lib/firestore";
import { C, $ } from "../lib/constants";

export default function Pedidos({ orders, setQuotationOrder }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.cardB}`, color: C.sub }}>
            <th style={{ padding: "12px" }}>ID</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Región</th>
            <th>Total</th>
            <th>Estado</th>
            <th style={{ textAlign: "right" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} style={{ borderBottom: `1px solid ${C.cardB}`, transform: "all 0.2s" }}>
              <td style={{ padding: "12px", fontWeight: "700", color: "#52B788" }}>{o.id}</td>
              <td>{o.fecha}</td>
              <td style={{ fontWeight: "600" }}>{o.cliente}</td>
              <td>{o.region}</td>
              <td style={{ color: C.cream, fontWeight: "700" }}>{$(o.totalPagar)}</td>
              <td>
                <select 
                  value={o.status} 
                  onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                  style={{ backgroundColor: o.status === "Entregado" ? "rgba(138,155,61,0.2)" : "rgba(197,110,60,0.2)", color: o.status === "Entregado" ? C.green : C.orange, border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "700" }}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </td>
              <td style={{ textAlign: "right" }}>
                <button onClick={() => setQuotationOrder(o)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", marginRight: "10px", fontWeight: "600" }}>📄 Nota</button>
                <button onClick={() => { if(confirm("¿Eliminar?")) deleteOrder(o.id); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontWeight: "600" }}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}