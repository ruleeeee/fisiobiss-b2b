"use client";
import { useRef, useState } from "react";
import { colors, fonts } from "../lib/theme";
import { $ } from "../lib/constants";
import { quoteTotals } from "../lib/quote";

export default function QuotationView({ order, onClose, embedded = false, closeLabel = "Cerrar" }) {
  const shotRef = useRef(null);
  const [saving, setSaving] = useState(false);
  if (!order) return null;

  const downloadPng = async () => {
    if (!shotRef.current || saving) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(shotRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#FFFFFF",
      });
      const a = document.createElement("a");
      const safe = String(order.id || "cotizacion").replace(/[^\w.-]+/g, "_");
      a.href = dataUrl;
      a.download = `Cotizacion_${safe}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setSaving(false);
    }
  };

  const { total, lines, subtotal, envioLabel } = quoteTotals(order);

  const card = (
    <div className="quote-light">
    <div ref={shotRef} style={{
      background: "#FFFFFF",
      color: colors.ink,
      width: "100%",
      maxWidth: "100%",
      borderRadius: 12,
      padding: "22px 24px",
      border: `1px solid ${colors.line}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colors.line}`, paddingBottom: 16, marginBottom: 18, gap: 16 }}>
        <div>
          <img src="/brand/logo-oficial.png" alt="Fisiobiss" style={{ height: 64, width: "auto", display: "block" }} />
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: colors.purple }}>COTIZACIÓN</div>
          <div style={{ marginTop: 4, fontSize: 13, color: colors.muted }}>Santiago, Chile</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: colors.orange, fontFamily: fonts.mono }}>{order.id}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>Fecha: {order.fecha}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: colors.purple, letterSpacing: 1, marginBottom: 8 }}>DATOS DEL CLIENTE</div>
        <div><span style={{ color: colors.muted }}>Cliente:</span> {order.cliente || "—"}</div>
        {order.telefono ? <div><span style={{ color: colors.muted }}>Teléfono:</span> {order.telefono}</div> : null}
        {order.email ? <div><span style={{ color: colors.muted }}>Email:</span> {order.email}</div> : null}
        {order.direccion ? <div><span style={{ color: colors.muted }}>Dirección:</span> {order.direccion}</div> : null}
        {order.region ? <div><span style={{ color: colors.muted }}>Región:</span> {order.region}</div> : null}
        {order.comuna ? <div><span style={{ color: colors.muted }}>Comuna:</span> {order.comuna}</div> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 120px", gap: 8, padding: "0 0 8px", borderBottom: `1px solid ${colors.line}`, marginBottom: 8 }}>
        {["Producto", "Precio", "Cant.", "Subtotal"].map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 700, color: colors.muted, letterSpacing: 1, textAlign: h === "Producto" ? "left" : "right" }}>{h.toUpperCase()}</div>
        ))}
      </div>
      {lines.map(i => (
        <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 120px", gap: 8, padding: "8px 0", borderBottom: `1px solid ${colors.subtle}`, fontSize: 13 }}>
          <div style={{ color: colors.ink }}>{i.name}</div>
          <div style={{ textAlign: "right", color: colors.muted, fontFamily: fonts.mono }}>{$(i.displayPrecio)}</div>
          <div style={{ textAlign: "right", color: colors.muted, fontFamily: fonts.mono }}>{i.qty}</div>
          <div style={{ textAlign: "right", fontWeight: 700, color: colors.purple, fontFamily: fonts.mono }}>{$(i.displaySub)}</div>
        </div>
      ))}

      <div style={{ borderTop: `1px solid ${colors.line}`, marginTop: 12, paddingTop: 14 }}>
        {[
          ["Subtotal productos", $(subtotal)],
          ["Envío", envioLabel],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, fontFamily: fonts.mono }}>{value}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
          <div style={{ fontSize: 11, color: colors.muted, letterSpacing: 1, fontWeight: 700 }}>TOTAL A CANCELAR</div>
          <div style={{ fontSize: 26, fontWeight: 500, color: colors.purple, fontFamily: fonts.mono }}>{$(total)}</div>
        </div>
      </div>

    </div>
      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={downloadPng} disabled={saving}
          style={{ flex: 1, minWidth: 180, padding: "12px 14px", cursor: saving ? "wait" : "pointer", fontWeight: 700, background: colors.purple, color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 13 }}>
          {saving ? "Generando imagen…" : "Descargar cotización"}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}
            style={{ flex: 1, minWidth: 160, padding: `12px 14px`, background: colors.paper, color: colors.muted, border: `1px solid ${colors.line}`, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            {closeLabel}
          </button>
        )}
      </div>
    </div>
  );

  if (embedded) return card;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20,16,18,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      {card}
    </div>
  );
}
