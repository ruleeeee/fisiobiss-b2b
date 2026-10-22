"use client";
import { useRef, useState } from "react";
import { colors, fonts } from "../lib/theme";
import { $ } from "../lib/constants";
import { quotePresentation } from "../lib/quote";

function MoneyValue({ net, gross, mode, role = "sum", minus = false }) {
  const value = mode === "neto" ? net : gross;
  const sign = minus ? "− " : "";
  if (mode === "ambos") {
    const size = role === "total" ? 18 : 13;
    const tone = minus ? colors.orange : role === "price" ? colors.muted : role === "line" ? colors.purple : colors.ink;
    return (
      <div style={{ textAlign: "right", fontFamily: fonts.mono, lineHeight: 1.3 }}>
        <div style={{ fontSize: size, fontWeight: 700, color: tone }}>{sign}{$(net)} <span style={{ fontSize: 9, fontWeight: 700, color: colors.muted }}>neto</span></div>
        <div style={{ fontSize: size, fontWeight: 700, color: tone }}>{sign}{$(gross)} <span style={{ fontSize: 9, fontWeight: 700, color: colors.muted }}>bruto</span></div>
      </div>
    );
  }
  const tone = minus ? colors.orange : role === "price" ? colors.muted : role === "line" || role === "total" ? colors.purple : colors.ink;
  if (role === "price") {
    return <div style={{ textAlign: "right", color: tone, fontFamily: fonts.mono }}>{sign}{$(value)}</div>;
  }
  if (role === "line") {
    return <div style={{ textAlign: "right", fontWeight: 700, color: tone, fontFamily: fonts.mono }}>{sign}{$(value)}</div>;
  }
  if (role === "total") {
    return <div style={{ textAlign: "right", fontSize: 26, fontWeight: 500, color: tone, fontFamily: fonts.mono }}>{sign}{$(value)}</div>;
  }
  return <div style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: tone, fontFamily: fonts.mono }}>{sign}{$(value)}</div>;
}

export default function QuotationView({ order, onClose, embedded = false, closeLabel = "Cerrar", taxMode = "bruto" }) {
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

  const quote = quotePresentation(order, taxMode);
  const { lines, envioLabel, envioIsText } = quote;
  const priceHeader = taxMode === "neto" ? "Precio neto" : "Precio";
  const subHeader = taxMode === "neto" ? "Subtotal neto" : "Subtotal";
  const subtotalLabel = taxMode === "neto" ? "Subtotal productos (neto)" : "Subtotal productos";
  const totalLabel = taxMode === "neto" ? "TOTAL NETO (sin IVA)" : "TOTAL A CANCELAR";
  const cols = taxMode === "ambos" ? "1fr 148px 64px 156px" : "1fr 110px 80px 120px";

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

      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 8, padding: "0 0 8px", borderBottom: `1px solid ${colors.line}`, marginBottom: 8 }}>
        {["Producto", priceHeader, "Cant.", subHeader].map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 700, color: colors.muted, letterSpacing: 1, textAlign: h === "Producto" ? "left" : "right" }}>{h.toUpperCase()}</div>
        ))}
      </div>
      {lines.map(i => (
        <div key={i.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 8, padding: "8px 0", borderBottom: `1px solid ${colors.subtle}`, fontSize: 13, alignItems: "center" }}>
          <div style={{ color: colors.ink }}>{i.name}</div>
          <MoneyValue net={i.precioNeto} gross={i.precioBruto} mode={taxMode} role="price" />
          <div style={{ textAlign: "right", color: colors.muted, fontFamily: fonts.mono }}>{i.qty}</div>
          <MoneyValue net={i.subNeto} gross={i.subBruto} mode={taxMode} role="line" />
        </div>
      ))}

      <div style={{ borderTop: `1px solid ${colors.line}`, marginTop: 12, paddingTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>{subtotalLabel}</div>
          <MoneyValue net={quote.subtotalNeto} gross={quote.subtotalBruto} mode={taxMode} />
        </div>
        {quote.descuentoBruto > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
            <div style={{ fontSize: 12, color: colors.orange, fontWeight: 700 }}>
              {quote.descuentoPct > 0 ? `Descuento ${quote.descuentoPct}%` : "Descuento"}
            </div>
            <MoneyValue net={quote.descuentoNeto} gross={quote.descuentoBruto} mode={taxMode} minus />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>Envío</div>
          {envioIsText
            ? <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, fontFamily: fonts.mono }}>{envioLabel}</div>
            : <MoneyValue net={quote.envioNeto} gross={quote.envioBruto} mode={taxMode} />}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 12 }}>
          <div style={{ fontSize: 11, color: colors.muted, letterSpacing: 1, fontWeight: 700 }}>{totalLabel}</div>
          <MoneyValue net={quote.totalNeto} gross={quote.totalBruto} mode={taxMode} role="total" />
        </div>
        {taxMode === "neto" && (
          <div style={{ marginTop: 10, fontSize: 11, color: colors.muted }}>Valores netos, sin IVA.</div>
        )}
        {taxMode === "ambos" && (
          <div style={{ marginTop: 10, fontSize: 11, color: colors.muted }}>Neto sin IVA · Bruto con IVA 19%</div>
        )}
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
