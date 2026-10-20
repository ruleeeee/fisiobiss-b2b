import { $ } from "../lib/constants";
import { downloadQuotePdf, quoteTotals } from "../lib/quote";

export default function QuotationView({ order, onClose, embedded = false, closeLabel = "Cerrar" }) {
  if (!order) return null;

  const { total, lines } = quoteTotals(order);

  const card = (
    <div style={{
      background: "#0D1F12",
      color: "#E8F5EE",
      width: "100%",
      maxWidth: 920,
      borderRadius: 12,
      padding: "22px 24px",
      border: "1px solid #1A3520",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1A3520", paddingBottom: 16, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, color: "#52B788" }}>FISIOBISS · COTIZACIÓN</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#7EC8A4" }}>Santiago, Chile</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#F0B429", fontFamily: "monospace" }}>{order.id}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#5A8A66" }}>Fecha: {order.fecha}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#52B788", letterSpacing: 1, marginBottom: 8 }}>DATOS DEL CLIENTE</div>
        <div><span style={{ color: "#5A8A66" }}>Cliente:</span> {order.cliente || "—"}</div>
        {order.telefono ? <div><span style={{ color: "#5A8A66" }}>Teléfono:</span> {order.telefono}</div> : null}
        {order.email ? <div><span style={{ color: "#5A8A66" }}>Email:</span> {order.email}</div> : null}
        {order.direccion ? <div><span style={{ color: "#5A8A66" }}>Dirección:</span> {order.direccion}</div> : null}
        {order.region ? <div><span style={{ color: "#5A8A66" }}>Región:</span> {order.region}</div> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 120px", gap: 8, padding: "0 0 8px", borderBottom: "1px solid #1A3520", marginBottom: 8 }}>
        {["Producto", "Precio", "Cant.", "Subtotal"].map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "#3A6A46", letterSpacing: 1, textAlign: h === "Producto" ? "left" : "right" }}>{h.toUpperCase()}</div>
        ))}
      </div>
      {lines.map(i => (
        <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 120px", gap: 8, padding: "8px 0", borderBottom: "1px solid #0D1A0F", fontSize: 13 }}>
          <div style={{ color: "#E8F5EE" }}>{i.name}</div>
          <div style={{ textAlign: "right", color: "#7EC8A4" }}>{$(i.displayPrecio)}</div>
          <div style={{ textAlign: "right", color: "#7EC8A4" }}>{i.qty}</div>
          <div style={{ textAlign: "right", fontWeight: 700, color: "#52B788" }}>{$(i.displaySub)}</div>
        </div>
      ))}

      <div style={{ borderTop: "1px solid #2D5A3A", marginTop: 12, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 11, color: "#5A8A66", letterSpacing: 1, fontWeight: 700 }}>TOTAL A CANCELAR</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#52B788" }}>{$(total)}</div>
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => downloadQuotePdf(order)}
          style={{ flex: 1, minWidth: 180, padding: "12px 14px", cursor: "pointer", fontWeight: 800, background: "#0A1A0C", color: "#F0B429", border: "1px solid #F0B429", borderRadius: 10, fontSize: 13 }}>
          Descargar cotización
        </button>
        {onClose && (
          <button type="button" onClick={onClose}
            style={{ flex: 1, minWidth: 160, padding: "12px 14px", background: "#0A1A0C", color: "#7EC8A4", border: "1px solid #2D5A3A", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            {closeLabel}
          </button>
        )}
      </div>
    </div>
  );

  if (embedded) return card;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      {card}
    </div>
  );
}
