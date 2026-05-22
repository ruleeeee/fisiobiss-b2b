// components/Setup.jsx
import { useState } from "react";
import { $, P, PRODUCTS, REGIONS, VENDORS } from "../lib/constants";

const inpStyle={background:"#0A1A0C",border:"1px solid #1A3520",color:"#90CBF9",padding:"9px 12px",borderRadius:8,fontSize:13,width:"100%",boxSizing:"border-box"};
const card={background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,padding:"18px 20px",marginBottom:14};

export default function Setup() {
  const [sub,setSub]=useState("productos");
  
  // Como simplificación usamos el array constante. 
  // Si deseas guardarlos en Firebase, deberás importar saveProducts de firestore.js
  const prods = PRODUCTS; 

  return (
    <div>
      <div style={{fontSize:22,fontWeight:800,marginBottom:18}}>Parámetros del Sistema</div>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {[["productos","📦 Productos & SKUs"],["regiones","🌎 Regiones"],["vendedores","👤 Vendedores"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setSub(id)} style={{background:sub===id?"#1A5E2A":"transparent",
            color:sub===id?"#fff":"#5A8A66",border:`1px solid ${sub===id?"#2D7A3A":"#1A3520"}`,
            borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:600}}>
            {lbl}
          </button>
        ))}
      </div>

      {sub==="productos"&&(
        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>CATÁLOGO DE PRODUCTOS (Solo Lectura)</div>
          <div style={{display:"grid",gridTemplateColumns:"80px 2fr 120px 120px 70px",gap:8,marginBottom:8}}>
            {["SKU","Nombre","Precio B2B","Costo Neto","Margen"].map(h=>(
              <div key={h} style={{fontSize:9,fontWeight:700,color:"#3A6A46",letterSpacing:1}}>{h.toUpperCase()}</div>
            ))}
          </div>
          <div style={{maxHeight:420,overflowY:"auto"}}>
            {prods.map((p,i)=>{
              const mg=p.precio?(p.precio-p.costo)/p.precio:0;
              return (
                <div key={p.id} style={{display:"grid",gridTemplateColumns:"80px 2fr 120px 120px 70px",
                  gap:8,padding:"5px 0",borderBottom:"1px solid #0D1A0F",opacity:p.active?1:0.4}}>
                  <div style={{fontSize:10,color:"#F0B429",fontFamily:"monospace",display:"flex",alignItems:"center"}}>{p.id}</div>
                  <div style={{...inpStyle,padding:"5px 8px",fontSize:11,border:"none"}}>{p.name}</div>
                  <div style={{...inpStyle,padding:"5px 8px",fontSize:11,border:"none"}}>{p.precio}</div>
                  <div style={{...inpStyle,padding:"5px 8px",fontSize:11,border:"none"}}>{p.costo}</div>
                  <div style={{fontSize:11,fontWeight:700,color:mg>=0.55?"#52B788":"#F0B429",display:"flex",alignItems:"center",justifyContent:"center"}}>{P(mg)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sub==="regiones"&&(
        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>REGIONES Y COSTOS DE ENVÍO</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,marginBottom:8}}>
            {["Región","Costo Envío (CLP)"].map(h=>(
              <div key={h} style={{fontSize:9,fontWeight:700,color:"#3A6A46",letterSpacing:1}}>{h.toUpperCase()}</div>
            ))}
          </div>
          {REGIONS.map((r)=>(
            <div key={r.name} style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,
              padding:"8px 0",borderBottom:"1px solid #0D1A0F"}}>
              <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center"}}>{r.name}</div>
              <div style={{fontSize:13,fontWeight:700,color:"#F0B429",display:"flex",alignItems:"center"}}>{$(r.envio)}</div>
            </div>
          ))}
        </div>
      )}

      {sub==="vendedores"&&(
        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>EQUIPO DE VENTAS</div>
          {VENDORS.map((v,i)=>(
            <div key={i} style={{padding:"10px 0",borderBottom:"1px solid #0D1A0F",fontSize:13,fontWeight:500}}>
              👤 {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}