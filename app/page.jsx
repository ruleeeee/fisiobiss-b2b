"use client";
import { C } from "../lib/constants";
import { useState } from "react";
import { useOrders } from "../hooks/useFirestore";
import { addOrder, updateOrderStatus } from "../lib/db";
 
// Componentes
import AppShell    from "../components/AppShell";
import Dashboard   from "../components/Dashboard";
import NuevoPedido from "../components/NuevoPedido";
import Pedidos     from "../components/Pedidos";
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
    refresh, updateLocalStatus, addLocalOrder,
  } = useOrders();
 
  // ── Handlers ─────────────────────────────────
  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };
 
  const handleAddOrder = async (order) => {
    try {
      addLocalOrder(order);                     // optimistic update inmediato
      await addOrder(order);                    // guardar en Google Sheets (con ID ahora)
      await refresh();                          // sincronizar con el sheet para obtener datos reales
      notify(`✅ ${order.id} guardado en Google Sheets`);
    } catch (err) {
      notify("❌ Error al guardar: " + err.message, "err");
      refresh();                                // revertir en caso de error
    }
  };
 
  const handleUpdateStatus = async (id, estado) => {
    try {
      updateLocalStatus(id, estado);            // optimistic update
      await updateOrderStatus(id, estado);      // persist to Sheets
      notify(`Estado actualizado → ${estado}`);
    } catch (err) {
      notify("❌ Error al actualizar estado", "err");
      refresh();
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
          <Dashboard orders={orders} syncing={syncing}/>
        )}
        {view === "nuevo"        && (
          <NuevoPedido
            nextId={nextId}
            addOrder={handleAddOrder}
            notify={notify}
            setView={setView}
          />
        )}
        {view === "pedidos"      && (
          <Pedidos
            orders={orders}
            updateStatus={handleUpdateStatus}
            notify={notify}
          />
        )}
        {view === "rentabilidad" && <Rentabilidad orders={orders}/>}
        {view === "setup"        && <Setup onSeed={refresh} notify={notify}/>}
      </AppShell>
 
      {/* Toast de notificaciones */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, right:24,
          background: toast.type === "ok" ? "#1A5E2A" : "#7B1D1D",
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