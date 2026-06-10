// components/AppShell.jsx
"use client";
import React from "react";
 
export default function AppShell({ children, view, setView, ordersCount, syncing, lastSync, onRefresh }) {
  const TABS = [
    {id:"dashboard",icon:"◈",label:"Dashboard"},
    {id:"nuevo",icon:"+",label:"Nuevo Pedido"},
    {id:"pedidos",icon:"≡",label:"Pedidos"},
    {id:"distribuidores",icon:"!",label:"Distribuidores"},
    {id:"rentabilidad",icon:"$",label:"Rentabilidad"},
    {id:"setup",icon:"⚙",label:"Parámetros"},
  ];
 
  return (
    <div style={{minHeight:"100vh",background:"#07100A",color:"#E8F5EE",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      {/* NAV SUPERIOR ESTILO v3 */}
      <nav style={{background:"#0C1A0F",borderBottom:"1px solid #1A3520",display:"flex",alignItems:"center",gap:0,padding:"0 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 0",marginRight:24}}>
          <span style={{fontSize:20}}>🌿</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#52B788",letterSpacing:3}}>FISIOBISS</div>
            <div style={{fontSize:9,color:"#4A7A56",letterSpacing:1}}>B2B MAYORISTA</div>
          </div>
        </div>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setView(t.id)} style={{
            background: view === t.id ? "#1A3520" : "transparent",
            color: view === t.id ? "#52B788" : "#5A8A66",
            border:"none", borderBottom: view === t.id ? "2px solid #52B788" : "2px solid transparent",
            padding:"16px 18px", cursor:"pointer", fontSize:13, fontWeight:600,
            display:"flex", alignItems:"center", gap:7, transition:"all .15s",
          }}>
            <span style={{fontSize:14}}>{t.icon}</span>{t.label}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10,fontSize:11}}>
          {syncing && <span style={{color:"#F0B429",animation:"pulse 1s infinite"}}>⟳ Sincronizando...</span>}
          {!syncing && lastSync && (
            <span style={{color:"#3A6A46"}}>
              ✓ {lastSync.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}
            </span>
          )}
          {onRefresh && (
            <button onClick={onRefresh} disabled={syncing}
              style={{background:"rgba(52,183,136,.1)",border:"1px solid #1A3520",
                color:"#52B788",padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>
              ⟳
            </button>
          )}
          <span style={{color:"#2A5A36"}}>{ordersCount || 0} pedidos</span>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            title="Cerrar sesión"
            style={{
              background:"transparent", border:"1px solid #1A3520",
              color:"#3A6A46", padding:"4px 10px", borderRadius:6,
              cursor:"pointer", fontSize:11,
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#E87040";e.currentTarget.style.color="#E87040";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#1A3520";e.currentTarget.style.color="#3A6A46";}}
          >
            ⎋ Salir
          </button>
        </div>
      </nav>
 
      {/* ÁREA DE CONTENIDO */}
      <div style={{padding:"20px 24px",maxWidth:1440,margin:"0 auto"}}>
        {children}
      </div>
    </div>
  );
}