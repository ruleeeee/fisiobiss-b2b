// components/Pedidos.jsx
import { useState, useMemo } from "react";
import { $, N, P, ESTADOS } from "../lib/constants";

const selStyle={background:"#0D1F12",border:"1px solid #1A3520",color:"#E8F5EE",padding:"8px 12px",borderRadius:8,fontSize:13,cursor:"pointer"};
const inpStyle={background:"#0A1A0C",border:"1px solid #1A3520",color:"#90CBF9",padding:"9px 12px",borderRadius:8,fontSize:13,width:"100%",boxSizing:"border-box"};
const card={background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,padding:"18px 20px",marginBottom:14};
function Empty({msg}){return <div style={{padding:"32px 20px",textAlign:"center",color:"#3A6A46",fontSize:13}}>📭 {msg}</div>}

export default function Pedidos({ orders, updateStatus, notify }) {
  const [search, setSearch]   = useState("");
  const [fEst,   setFEst]     = useState("Todos");
  const [fMes,   setFMes]     = useState("");
  const [fVend,  setFVend]    = useState("Todos");
  const [detail, setDetail]   = useState(null);
  const [page,   setPage]     = useState(1);
  const PER_PAGE = 20;

  const allMonths=[...new Set(orders.map(o=>o.fecha?.slice(0,7)).filter(Boolean))].sort().reverse();
  const allVendors=["Todos",...new Set(orders.map(o=>o.vendedor).filter(Boolean))];

  const filtered = useMemo(()=>orders.filter(o=>{
    const s=search.toLowerCase();
    const mS=!s||o.id?.toLowerCase().includes(s)||o.cliente?.toLowerCase().includes(s)||o.region?.toLowerCase().includes(s);
    const mE=fEst==="Todos"||o.estado===fEst;
    const mM=!fMes||o.fecha?.startsWith(fMes);
    const mV=fVend==="Todos"||o.vendedor===fVend;
    return mS&&mE&&mM&&mV;
  }),[orders,search,fEst,fMes,fVend]);

  const pages = Math.ceil(filtered.length/PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const updEst = async (id, est) => {
    try {
      await updateStatus(id, est);
      if(detail?.id===id) setDetail(d=>({...d,estado:est}));
      notify(`Estado → ${est}`);
    } catch(err) {
      notify("Error al actualizar","err");
    }
  };

  const estColor={"Pendiente":"#E87040","Shipit Creado":"#4A90D9","Despachado":"#F0B429","Entregado":"#52B788"};

  if(detail) return <OrderDetail order={detail} onClose={()=>setDetail(null)} onUpdateEst={updEst}/>;

  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontSize:22,fontWeight:800,flex:1}}>Pedidos</div>
        <span style={{fontSize:12,color:"#3A6A46"}}>{filtered.length} resultados</span>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
          placeholder="🔍 Buscar ID, cliente, región..."
          style={{...inpStyle,flex:1,minWidth:180}}/>
        <select value={fMes} onChange={e=>{setFMes(e.target.value);setPage(1);}} style={selStyle}>
          <option value="">Todos los meses</option>
          {allMonths.map(m=><option key={m}>{m}</option>)}
        </select>
        <select value={fEst} onChange={e=>{setFEst(e.target.value);setPage(1);}} style={selStyle}>
          <option value="Todos">Todos los estados</option>
          {ESTADOS.map(e=><option key={e}>{e}</option>)}
        </select>
        <select value={fVend} onChange={e=>{setFVend(e.target.value);setPage(1);}} style={selStyle}>
          {allVendors.map(v=><option key={v}>{v}</option>)}
        </select>
      </div>

      <div style={{background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"100px 85px 1fr 110px 85px 110px 120px",gap:10,
          padding:"9px 16px",borderBottom:"1px solid #1A3520",background:"#0A1A0C"}}>
          {["ID","Fecha","Cliente / Región","Vendedor","Uds.","Total","Estado"].map(h=>(
            <div key={h} style={{fontSize:9,fontWeight:700,color:"#3A6A46",letterSpacing:1}}>{h.toUpperCase()}</div>
          ))}
        </div>

        {paged.length===0 ? <Empty msg="Sin resultados"/> : (
          <div>
            {paged.map((o,i)=>(
              <div key={o.id} onClick={()=>setDetail(o)}
                style={{display:"grid",gridTemplateColumns:"100px 85px 1fr 110px 85px 110px 120px",
                  gap:10,padding:"11px 16px",cursor:"pointer",transition:"background .1s",
                  borderBottom:"1px solid #0D1A0F",background:i%2?"transparent":"rgba(255,255,255,.01)"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(82,183,136,.05)"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2?"transparent":"rgba(255,255,255,.01)"}>
                <div style={{fontSize:11,fontWeight:700,color:"#F0B429",fontFamily:"monospace"}}>{o.id}</div>
                <div style={{fontSize:11,color:"#3A6A46"}}>{o.fecha}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"#E8F5EE"}}>{o.cliente||"—"}</div>
                  <div style={{fontSize:10,color:"#3A6A46"}}>{o.region?.split("(")[0]?.trim()||""}</div>
                </div>
                <div style={{fontSize:11,color:"#7EC8A4"}}>{o.vendedor||"—"}</div>
                <div style={{fontSize:12,fontWeight:600,color:"#7EC8A4"}}>{N(o.totalUnidades)}</div>
                <div style={{fontSize:12,fontWeight:700,color:"#52B788"}}>{$(o.totalPagar)}</div>
                <div onClick={e=>e.stopPropagation()}>
                  <select value={o.estado||"Pendiente"}
                    onChange={e=>updEst(o.id,e.target.value)}
                    style={{background:"transparent",border:`1px solid ${estColor[o.estado]||"#E87040"}`,
                      color:estColor[o.estado]||"#E87040",padding:"4px 6px",borderRadius:6,
                      fontSize:10,fontWeight:700,cursor:"pointer",width:"100%"}}>
                    {ESTADOS.map(e=><option key={e} style={{background:"#0D1F12",color:"#E8F5EE"}}>{e}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {pages>1 && (
          <div style={{display:"flex",justifyContent:"center",gap:6,padding:"12px",borderTop:"1px solid #1A3520"}}>
            {Array.from({length:pages},(_,i)=>(
              <button key={i} onClick={()=>setPage(i+1)}
                style={{background:page===i+1?"#1A5E2A":"transparent",color:page===i+1?"#fff":"#3A6A46",
                  border:"1px solid #1A3520",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12}}>
                {i+1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDetail({order,onClose,onUpdateEst}){
  const gp=order.totalPagar/1.19-(order.cogs||0);
  const mg=order.totalPagar?gp/(order.totalPagar/1.19):0;
  return (
    <div>
      <button onClick={onClose} style={{background:"transparent",border:"1px solid #1A3520",color:"#5A8A66",
        padding:"7px 14px",borderRadius:7,cursor:"pointer",marginBottom:14,fontSize:13}}>
        ← Volver a Pedidos
      </button>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontSize:20,fontWeight:800,color:"#F0B429",fontFamily:"monospace"}}>{order.id}</span>
            <span style={{fontSize:12,color:"#3A6A46"}}>{order.fecha}</span>
          </div>
          {[["Cliente",order.cliente],["Teléfono",order.telefono],["Email",order.email],
            ["Región",order.region],["Dirección",order.direccion],
            ["Vendedor",order.vendedor],["Medio de Pago",order.medioPago]].map(([l,v])=>v&&v!=="nan"?(
            <div key={l} style={{marginBottom:8}}>
              <div style={{fontSize:9,color:"#3A6A46",letterSpacing:1,fontWeight:700}}>{l.toUpperCase()}</div>
              <div style={{fontSize:13,color:"#E8F5EE",marginTop:2}}>{v}</div>
            </div>
          ):null)}
        </div>
        <div>
          <div style={card}>
            <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:12}}>PRODUCTOS</div>
            {(order.items||[]).filter(it=>it.qty>0).map(it=>(
              <div key={it.id} style={{display:"flex",justifyContent:"space-between",marginBottom:7,fontSize:12}}>
                <span style={{color:"#7EC8A4"}}>{it.name} ×{it.qty}{it.regalo>0?` (+${it.regalo} regalo)`:""}</span>
                <span style={{fontWeight:600}}>{$(it.qty*it.precio)}</span>
              </div>
            ))}
            <div style={{borderTop:"1px solid #1A3520",marginTop:10,paddingTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5,color:"#3A6A46"}}>
                <span>Envío</span><span>{$(order.costoEnvio)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:18,fontWeight:800}}>
                <span>Total</span><span style={{color:"#52B788"}}>{$(order.totalPagar)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#3A6A46",marginTop:6}}>
                <span>Gross Profit est.</span>
                <span style={{color:"#F0B429"}}>{$(gp)} ({P(mg)})</span>
              </div>
            </div>
          </div>
          <div style={card}>
            <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:10}}>ESTADO DESPACHO</div>
            <select value={order.estado||"Pendiente"} onChange={e=>onUpdateEst(order.id,e.target.value)}
              style={{...inpStyle,fontWeight:700,fontSize:14}}>
              {ESTADOS.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}