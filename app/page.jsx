"use client";
import { C } from "../lib/constants";
import { useState } from "react";
import { useOrders } from "../hooks/useFirestore";
import { useRegions } from "../hooks/useRegions";
import { useProducts } from "../hooks/useProducts";
import { addOrder, updateOrderStatus, deleteOrder } from "../lib/db";
 
// Componentes
import AppShell    from "../components/AppShell";
import Dashboard   from "../components/Dashboard";
import NuevoPedido from "../components/NuevoPedido";
import Pedidos     from "../components/Pedidos";
import Distribuidores from "../components/Distribuidores";
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
    refresh, updateLocalStatus, addLocalOrder, removeLocalOrder,
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
 
  const handleAddOrder = async (order) => {
    try {
      addLocalOrder(order);
      await addOrder(order);
      await refresh();
      notify(`✅ ${order.id} guardado en Google Sheets`);
    } catch (err) {
      notify("❌ Error al guardar: " + err.message, "err");
      refresh();
    }
  };
 
  const handleUpdateStatus = async (id, estado) => {
    try {
      updateLocalStatus(id, estado);
      await updateOrderStatus(id, estado);
      notify(`Estado actualizado → ${estado}`);
    } catch (err) {
      notify("❌ Error al actualizar estado", "err");
      refresh();
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
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style>
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
          />
        )}
        {view === "pedidos"      && (
          <Pedidos
            orders={orders}
            updateStatus={handleUpdateStatus}
            deleteOrder={handleDeleteOrder}
            notify={notify}
          />
        )}
        {view === "distribuidores" && <Distribuidores orders={orders} />}
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
          background: toast.type === "ok" ? "#1A5E2A" : toast.type === "warn" ? "#7A5000" : "#7B1D1D",
          color:"#fff", padding:"13px 20px", borderRadius:10,
          zIndex:9999, fontSize:13, fontWeight:600,
          boxShadow:"0 4px 24px rgba(0,0,0,.5)",
          display:"flex", alignItems:"center", gap:8,
        }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}