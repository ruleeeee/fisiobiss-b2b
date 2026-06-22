// components/Setup.jsx
import { useState } from "react";
import { $, P, REGIONS, VENDORS, PRODUCTS as FALLBACK_PRODUCTS } from "../lib/constants";

const inpStyle = { background: "#0A1A0C", border: "1px solid #1A3520", color: "#90CBF9", padding: "9px 12px", borderRadius: 8, fontSize: 13, width: "100%", boxSizing: "border-box" };
const card = { background: "#0D1F12", border: "1px solid #1A3520", borderRadius: 12, padding: "18px 20px", marginBottom: 14 };

export default function Setup({
  regions: propRegions, setRegions: propSetRegions, onSaveRegions,
  products: propProducts, setProducts: propSetProducts, onSaveProducts,
  notify
}) {
  const [sub, setSub] = useState("productos");
  const [newP, setNewP] = useState({ name: "", precio: "", costo: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Productos desde el hook global (ya vienen cargados desde la API)
  const prods = propProducts?.length ? propProducts : FALLBACK_PRODUCTS;
  const setProds = propSetProducts ?? (() => {});

  // Regiones desde el hook global
  const regions = propRegions ?? REGIONS;
  const setRegions = propSetRegions ?? (() => {});
  const [isSavingRegions, setIsSavingRegions] = useState(false);
  const [regionsSaved, setRegionsSaved] = useState(false);

  const updProd = (id, field, val) => {
    setProds(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: field === "name" ? val : +val || 0 } : p
    ));
  };

  const toggleP = (id) => {
    setProds(prev => prev.map(p =>
      p.id === id ? { ...p, active: !p.active } : p
    ));
  };

  const addP = () => {
    if (!newP.name.trim()) return;
    const nextNum = prods.length + 1;
    const id = `FBS-SKU-${String(nextNum).padStart(3, "0")}`;
    setProds(prev => [...prev, { id, name: newP.name, precio: +newP.precio || 0, costo: +newP.costo || 0, active: true }]);
    setNewP({ name: "", precio: "", costo: "" });
  };

  const updRegion = (name, val) => {
    setRegions(prev => prev.map(r => r.name === name ? { ...r, envio: Math.max(0, +val||0) } : r));
    setRegionsSaved(false);
  };

  const handleSaveRegions = async () => {
    setIsSavingRegions(true);
    setRegionsSaved(false);
    try {
      if (onSaveRegions) await onSaveRegions(regions);
      setRegionsSaved(true);
      setTimeout(() => setRegionsSaved(false), 3000);
    } catch (err) {
      if (notify) notify("❌ Error al guardar costos", "err");
    } finally {
      setIsSavingRegions(false);
    }
  };

  // Guardar productos via hook global → API → Google Sheets
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSaveProducts) {
        await onSaveProducts(prods);
      }
    } catch (err) {
      console.error("[Setup] handleSave:", err);
      if (notify) notify(`❌ Error al guardar: ${err.message}`, "err");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Parámetros del Sistema</div>

        {sub === "productos" && (
          <button onClick={handleSave} disabled={isSaving} style={{
            background: "#4A7A56", color: "#0A1A0C", border: "none",
            borderRadius: 8, padding: "10px 18px", cursor: isSaving ? "wait" : "pointer",
            fontSize: 14, fontWeight: 800, transition: "0.2s", opacity: isSaving ? 0.7 : 1
          }}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["productos", "📦 Productos & SKUs"], ["regiones", "🌎 Regiones"], ["vendedores", "👤 Vendedores"]].map(([id, lbl]) => (
          <button key={id} onClick={() => setSub(id)} style={{
            background: sub === id ? "#1A5E2A" : "transparent",
            color: sub === id ? "#fff" : "#5A8A66",
            border: `1px solid ${sub === id ? "#2D7A3A" : "#1A3520"}`,
            borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600
          }}>
            {lbl}
          </button>
        ))}
      </div>

      {sub === "productos" && (
        <div style={card}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#52B788", letterSpacing: 1, marginBottom: 14 }}>CATÁLOGO DE PRODUCTOS</div>

          <div style={{ display: "grid", gridTemplateColumns: "80px 2fr 120px 120px 70px 55px", gap: 8, marginBottom: 8 }}>
            {["SKU", "Nombre", "Precio B2B", "Costo Neto", "Margen", "Activo"].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "#3A6A46", letterSpacing: 1 }}>{h.toUpperCase()}</div>
            ))}
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {prods.map((p) => {
              const mg = p.precio ? (p.precio - p.costo) / p.precio : 0;
              return (
                <div key={p.id} style={{
                  display: "grid", gridTemplateColumns: "80px 2fr 120px 120px 70px 55px",
                  gap: 8, padding: "5px 0", borderBottom: "1px solid #0D1A0F", opacity: p.active ? 1 : 0.4
                }}>
                  <div style={{ fontSize: 10, color: "#F0B429", fontFamily: "monospace", display: "flex", alignItems: "center" }}>{p.id}</div>
                  <input
                    value={p.name}
                    onChange={e => updProd(p.id, "name", e.target.value)}
                    style={{ ...inpStyle, padding: "5px 8px", fontSize: 11 }}
                  />
                  <input
                    type="number"
                    value={p.precio}
                    onChange={e => updProd(p.id, "precio", e.target.value)}
                    style={{ ...inpStyle, padding: "5px 8px", fontSize: 11 }}
                  />
                  <input
                    type="number"
                    value={p.costo}
                    onChange={e => updProd(p.id, "costo", e.target.value)}
                    style={{ ...inpStyle, padding: "5px 8px", fontSize: 11 }}
                  />
                  <div style={{ fontSize: 11, fontWeight: 700, color: mg >= 0.55 ? "#52B788" : "#F0B429", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {P(mg)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <button onClick={() => toggleP(p.id)} style={{
                      background: p.active ? "#1A5E2A" : "transparent",
                      border: `1px solid ${p.active ? "#2D7A3A" : "#1A3520"}`,
                      color: p.active ? "#fff" : "#3A6A46",
                      borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 10
                    }}>
                      {p.active ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulario para agregar producto nuevo */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #1A3520" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#52B788", letterSpacing: 1, marginBottom: 10 }}>AGREGAR PRODUCTO</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10 }}>
              <input
                value={newP.name}
                onChange={e => setNewP(p => ({ ...p, name: e.target.value }))}
                placeholder="Nombre del producto"
                style={inpStyle}
              />
              <input
                type="number"
                value={newP.precio}
                onChange={e => setNewP(p => ({ ...p, precio: +e.target.value }))}
                placeholder="Precio B2B"
                style={inpStyle}
              />
              <input
                type="number"
                value={newP.costo}
                onChange={e => setNewP(p => ({ ...p, costo: +e.target.value }))}
                placeholder="Costo neto"
                style={inpStyle}
              />
              <button onClick={addP} style={{
                background: "#1A5E2A", color: "#fff", border: "none",
                borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap"
              }}>
                + Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {sub === "regiones" && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#52B788", letterSpacing: 1 }}>REGIONES Y COSTOS DE ENVÍO</div>
            <button onClick={handleSaveRegions} disabled={isSavingRegions} style={{
              background: regionsSaved ? "#0D1F12" : "#1A5E2A", color: regionsSaved ? "#52B788" : "#fff",
              border: `1px solid ${regionsSaved ? "#2D5A3A" : "#1A5E2A"}`,
              borderRadius: 8, padding: "7px 16px", cursor: isSavingRegions ? "wait" : "pointer",
              fontSize: 12, fontWeight: 700, transition: "0.2s", opacity: isSavingRegions ? 0.6 : 1
            }}>
              {isSavingRegions ? "Guardando..." : regionsSaved ? "✓ Guardado" : "💾 Confirmar Cambios"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
            {["Región", "Costo Envío (CLP)"].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "#3A6A46", letterSpacing: 1 }}>{h.toUpperCase()}</div>
            ))}
          </div>
          {regions.map((r) => (
            <div key={r.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, padding: "6px 0", borderBottom: "1px solid #0D1A0F", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" }}>{r.name}</div>
              <input
                type="number" min="0"
                value={r.envio}
                onChange={e => updRegion(r.name, e.target.value)}
                style={{ ...inpStyle, padding: "5px 10px", fontSize: 13, fontWeight: 700, color: "#F0B429", borderColor: "#2A3A1A", textAlign: "right" }}
              />
            </div>
          ))}
        </div>
      )}

      {sub === "vendedores" && (
        <div style={card}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#52B788", letterSpacing: 1, marginBottom: 14 }}>EQUIPO DE VENTAS</div>
          {VENDORS.map((v, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #0D1A0F", fontSize: 13, fontWeight: 500 }}>
              👤 {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}