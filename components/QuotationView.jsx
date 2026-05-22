import { C, $, today } from "../lib/constants";

export default function QuotationView({ order, onClose }) {
  if (!order) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ backgroundColor: "#FFF", color: "#000", width: "100%", maxWidth: "600px", borderRadius: "8px", padding: "30px", fontFamily: "monospace", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px dashed #000", paddingBottom: "15px", marginBottom: "15px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px" }}>🌿 FISIOBISS SPA</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#444" }}>Santiago, Chile</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h4 style={{ margin: 0, color: "#99321B" }}>{order.id}</h4>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>Fecha: {order.fecha}</p>
          </div>
        </div>

        <div style={{ fontSize: "13px", marginBottom: "20px" }}>
          <strong>CLIENTE:</strong> {order.cliente}<br />
          <strong>REGISTRO DESPACHO:</strong> {order.region}<br />
          <strong>OPERADOR:</strong> {order.vendedor}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #000" }}>
              <th style={{ textAlign: "left", paddingBottom: "6px" }}>Detalle Producto</th>
              <th style={{ textAlign: "center" }}>Cant.</th>
              <th style={{ textAlign: "center" }}>Bonif.</th>
              <th style={{ textAlign: "right" }}>Subtot.</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map(i => (
              <tr key={i.id}>
                <td style={{ padding: "6px 0" }}>{i.name}</td>
                <td style={{ textAlign: "center" }}>{i.qty}</td>
                <td style={{ textAlign: "center" }}>{i.regalo || 0}</td>
                <td style={{ textAlign: "right" }}>{$(i.precio * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "2px dashed #000", paddingTop: "10px", textAlign: "right", fontSize: "14px" }}>
          <div>Neto Venta B2B: {$(order.subtotal)}</div>
          <div>Cargo Transporte: {$(order.costoEnvio)}</div>
          <div style={{ fontSize: "16px", fontWeight: "700", marginTop: "6px" }}>Total a Liquidar: {$(order.totalPagar)}</div>
        </div>

        <div style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
          <button onClick={() => window.print()} style={{ flex: 1, padding: "10px", cursor: "pointer", fontWeight: "700" }}>🖨️ Imprimir Nota</button>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", backgroundColor: "#333", color: "#fff", border: "none", cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}