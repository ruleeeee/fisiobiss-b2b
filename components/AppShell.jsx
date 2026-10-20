"use client";
import { colors, fonts } from "../lib/theme";
import BrandLockup from "./BrandLockup";
import React, { useEffect, useState } from "react";
 
export default function AppShell({ children, view, setView, ordersCount, syncing, lastSync, onRefresh }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    localStorage.setItem("fb2b_theme", next);
    setDark(next === "dark");
  };
  const TABS = [
    {id:"dashboard",icon:"◈",label:"Dashboard"},
    {id:"nuevo",icon:"+",label:"Nuevo Pedido"},
    {id:"pedidos",icon:"≡",label:"Pedidos"},
    {id:"distribuidores",icon:"!",label:"Distribuidores"},
    {id:"activos",icon:"⌖",label:"Distribuidores activos"},
    {id:"rentabilidad",icon:"$",label:"Rentabilidad"},
    {id:"setup",icon:"⚙",label:"Parámetros"},
  ];
 
  return (
    <div style={{minHeight:"100vh",background: colors.bg,color: colors.ink,fontFamily:fonts.body}}>
      {/* NAV SUPERIOR ESTILO v3 */}
      <nav style={{background:colors.paper,borderBottom:`1px solid ${colors.line}`,display:"flex",alignItems:"center",gap:0,padding:"0 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",marginRight:24}}>
          <BrandLockup height={40} />
        </div>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setView(t.id)} style={{
            background: view === t.id ? colors.purpleSoft : "transparent",
            color: view === t.id ? colors.purple : colors.muted,
            border:"none", borderBottom: view === t.id ? `2px solid ${colors.purple}` : "2px solid transparent",
            padding:"16px 18px", cursor:"pointer", fontSize:13, fontWeight:600,
            display:"flex", alignItems:"center", gap:7, transition:"all .15s",
          }}>
            <span style={{fontSize:14}}>{t.icon}</span>{t.label}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10,fontSize:11}}>
          {syncing && <span style={{color:colors.orange,animation:"pulse 1s infinite"}}>⟳ Sincronizando...</span>}
          {!syncing && lastSync && (
            <span style={{color:colors.muted}}>
              ✓ {lastSync.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}
            </span>
          )}
          {onRefresh && (
            <button onClick={onRefresh} disabled={syncing}
              style={{background:colors.purpleSoft,border:`1px solid ${colors.line}`,
                color:colors.purple,padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>
              ⟳
            </button>
          )}
          <span style={{color:colors.muted}}>{ordersCount || 0} pedidos</span>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            title="Cerrar sesión"
            style={{
              background:"transparent", border:`1px solid ${colors.line}`,
              color:colors.muted, padding:"4px 10px", borderRadius:6,
              cursor:"pointer", fontSize:11,
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=colors.orange;e.currentTarget.style.color=colors.orange;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=colors.line;e.currentTarget.style.color=colors.muted;}}
          >
            ⎋ Salir
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={dark}
            title={dark ? "Usar modo claro" : "Usar modo oscuro"}
            style={{
              background: dark ? colors.purpleSoft : colors.paper,
              border: `1px solid ${colors.line}`,
              color: colors.ink,
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {dark ? "☀ Claro" : "☾ Oscuro"}
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