// app/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useFirestore } from "../hooks/useFirestore";
import { addOrder, updateOrderStatus } from "../lib/firestore"; // Importamos las ops de firebase

// Componentes modulares
import AppShell from "../components/AppShell";
import Dashboard from "../components/Dashboard";
import NuevoPedido from "../components/NuevoPedido";
import Pedidos from "../components/Pedidos";
import Rentabilidad from "../components/Rentabilidad";
import Setup from "../components/Setup";
import ConnError from "../components/ui/ConnError";

export default function Home() {
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  
  // Hook de Firebase
  const { orders, loading, error } = useFirestore();

  if (error) return <ConnError error={error} />;

  // Pantalla de carga v3
  if (loading || !orders) return (
    <div style={{minHeight:"100vh",background:"#07100A",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <span style={{fontSize:40}}>🌿</span>
      <span style={{color:"#52B788",fontFamily:"monospace",fontSize:13,letterSpacing:2}}>SINCRONIZANDO CON FIREBASE...</span>
    </div>
  );

  const notify = (msg, type="ok") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3200);
  };

  // Cálculo del siguiente ID basado en Firebase (emulando nextId local)
  const maxNum = orders.reduce((max, o) => {
    const n = parseInt((o.id || "").replace("PED-", "")) || 0;
    return Math.max(max, n);
  }, 0);
  const nextIdValue = maxNum + 1;

  return (
    <>
      <AppShell view={view} setView={setView} ordersCount={orders.length}>
        {view === "dashboard"    && <Dashboard orders={orders} />}
        {view === "nuevo"        && <NuevoPedido orders={orders} nextId={nextIdValue} addOrderFirebase={addOrder} notify={notify} setView={setView}/>}
        {view === "pedidos"      && <Pedidos orders={orders} updateStatusFirebase={updateOrderStatus} notify={notify} />}
        {view === "rentabilidad" && <Rentabilidad orders={orders} />}
        {view === "setup"        && <Setup />}
      </AppShell>

      {/* Tostada de notificaciones flotante de la v3 */}
      {toast && (
        <div style={{position:"fixed",bottom:24,right:24,background:toast.type==="ok"?"#1A5E2A":"#7B1D1D",
          color:"#fff",padding:"13px 20px",borderRadius:10,zIndex:9999,fontSize:13,fontWeight:600,
          boxShadow:"0 4px 24px rgba(0,0,0,.5)",display:"flex",alignItems:"center",gap:8,
          animation:"slideIn .2s ease"}}>
          {toast.type==="ok"?"✅":"❌"} {toast.msg}
        </div>
      )}
    </>
  );
}