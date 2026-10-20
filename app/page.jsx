"use client";
import { colors } from "../lib/theme";
import { C } from "../lib/constants";
import { useEffect, useState } from "react";
import { useOrders } from "../hooks/useFirestore";
import { useRegions } from "../hooks/useRegions";
import { useProducts } from "../hooks/useProducts";
import { addOrder, deleteOrder } from "../lib/db";
 
// Componentes
import AppShell    from "../components/AppShell";
import Dashboard   from "../components/Dashboard";
import NuevoPedido from "../components/NuevoPedido";
import Pedidos     from "../components/Pedidos";
import Distribuidores from "../components/Distribuidores";
import DistribuidoresActivos from "../components/DistribuidoresActivos";
import Rentabilidad from "../components/Rentabilidad";
import Setup       from "../components/Setup";
import ConnError   from "../components/ui/ConnError";
 
export default function Home() {
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
 
  // ── Data hook (Google Sheets via API Routes) ──
  const {
    orders, nextId, loading, error,
    syncing, lastSync,
    refresh, addLocalOrder, removeLocalOrder,
  } = useOrders();

  // ── Regiones / costos de envío ────────────────
  const { regions, setRegions, updateRegions } = useRegions();

  // ── Productos / catálogo con precios ─────────
  const { products, setProducts, updateProducts } = useProducts();
 
  // ── Handlers ─────────────────────────────────
  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };
 
  useEffect(() => {
    if (view === "nuevo") refresh();
  }, [view]);

  const handleAddOrder = async (order, file) => {
    try {
      const saved = await addOrder(order, file);
      addLocalOrder({ ...order, id: saved.id, comprobante: saved.comprobante || "" });
      await refresh();
      if (saved.comprobanteError) {
        notify(`✅ ${saved.id} guardado. El comprobante no se subió: ${saved.comprobanteError}`, "err");
      } else {
        notify(`✅ ${saved.id} guardado en Google Sheets`);
      }
      return saved;
    } catch (err) {
      notify("❌ Error al guardar: " + err.message, "err");
      refresh();
      throw err;
    }
  };
 
  const handleDeleteOrder = async (id) => {
    try {
      removeLocalOrder(id);
      await deleteOrder(id);
      notify(`Pedido ${id} eliminado`);
    } catch (err) {
      notify("❌ Error al eliminar: " + err.message, "err");
      refresh();
    }
  };

  const handleSaveRegions = async (newRegions) => {
    try {
      await updateRegions(newRegions);
      notify("✅ Costos de envío guardados en Google Sheets");
    } catch (err) {
      notify("⚠️ Cambios aplicados en sesión (error al guardar en Sheet)", "warn");
    }
  };

  const handleSaveProducts = async (newProducts) => {
    try {
      await updateProducts(newProducts);
      notify("✅ Productos guardados en Google Sheets");
    } catch (err) {
      notify("⚠️ Cambios aplicados en sesión (error al guardar en Sheet)", "warn");
    }
  };

  // ── Pantallas de estado ───────────────────────
  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <span style={{ fontSize:40 }}>🌿</span>
      <span style={{ color:C.accent, fontFamily:"monospace", fontSize:13, letterSpacing:2 }}>
        SINCRONIZANDO CON GOOGLE SHEETS...
      </span>
      <div style={{ width:200, height:2, background:C.card, borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:"40%", height:"100%", background:C.accent,
          animation:"slide 1.2s ease-in-out infinite" }}/>
      </div>
      <style>{"@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}"}</style>
    </div>
  );
 
  if (error) return <ConnError error={error} onRetry={refresh}/>;
 
  return (
    <>
      <AppShell
        view={view}
        setView={setView}
        ordersCount={orders.length}
        syncing={syncing}
        lastSync={lastSync}
        onRefresh={refresh}
      >
        {view === "dashboard"    && (
          <Dashboard orders={orders} syncing={syncing} products={products}/>
        )}
        {view === "nuevo"        && (
          <NuevoPedido
            nextId={nextId}
            addOrder={handleAddOrder}
            notify={notify}
            setView={setView}
            regions={regions}
            products={products}
            orders={orders}
          />
        )}
        {view === "pedidos"      && (
          <Pedidos
            orders={orders}
            deleteOrder={handleDeleteOrder}
            notify={notify}
          />
        )}
        {view === "distribuidores" && <Distribuidores orders={orders} />}
        {view === "activos" && <DistribuidoresActivos orders={orders} />}
        {view === "rentabilidad" && <Rentabilidad orders={orders} products={products}/>}
        {view === "setup"        && (
          <Setup
            onSeed={refresh}
            notify={notify}
            regions={regions}
            setRegions={setRegions}
            onSaveRegions={handleSaveRegions}
            products={products}
            setProducts={setProducts}
            onSaveProducts={handleSaveProducts}
          />
        )}
      </AppShell>
 
      {/* Toast de notificaciones */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, right:24,
          background: toast.type === `ok` ? colors.ink : toast.type === `warn` ? colors.caution : colors.warn,
          color:colors.paper, padding:"13px 20px", borderRadius:10,
          zIndex:9999, fontSize:13, fontWeight:600,
          boxShadow:"0 4px 24px rgba(20,16,18,.12)",
          display:"flex", alignItems:"center", gap:8,
        }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}