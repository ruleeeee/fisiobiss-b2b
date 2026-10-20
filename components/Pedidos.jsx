import { useState, useMemo } from "react";
import { $, N, P } from "../lib/constants";
 
const selStyle={background:"#0D1F12",border:"1px solid #1A3520",color:"#E8F5EE",padding:"8px 12px",borderRadius:8,fontSize:13,cursor:"pointer"};
const inpStyle={background:"#0A1A0C",border:"1px solid #1A3520",color:"#90CBF9",padding:"9px 12px",borderRadius:8,fontSize:13,width:"100%",boxSizing:"border-box"};
const card={background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,padding:"18px 20px",marginBottom:14};
function Empty({msg}){return <div style={{padding:"32px 20px",textAlign:"center",color:"#3A6A46",fontSize:13}}>📭 {msg}</div>}
 
export default function Pedidos({ orders, deleteOrder, notify }) {
  const [search, setSearch]   = useState("");
  const [fMes,   setFMes]     = useState("");
  const [fVend,  setFVend]    = useState("Todos");
  const [detail, setDetail]   = useState(null);
  const [page,   setPage]     = useState(1);
  const PER_PAGE = 20;
 
  const allMonths=[...new Set(orders.map(o=>o.fecha?.slice(0,7)).filter(Boolean))].sort().reverse();
  const allVendors=["Todos",...new Set(orders.map(o=>o.vendedor).filter(Boolean))];
 
  // 1. Filtrado original
  const filtered = useMemo(()=>orders.filter(o=>{
    const s=search.toLowerCase();
    const mS=!s||o.id?.toLowerCase().includes(s)||o.cliente?.toLowerCase().includes(s)||o.region?.toLowerCase().includes(s);
    const mM=!fMes||o.fecha?.startsWith(fMes);
    const mV=fVend==="Todos"||o.vendedor===fVend;
    return mS&&mM&&mV;
  }),[orders,search,fMes,fVend]);
 
  // 2. Ordenamiento inteligente (Del más nuevo al más antiguo según el número de ID)
  const sortedOrders = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const numA = parseInt(String(a.id).match(/\d+/)?.[0] || 0, 10);
      const numB = parseInt(String(b.id).match(/\d+/)?.[0] || 0, 10);
      return numB - numA; 
    });
  }, [filtered]);
 
  // 3. Paginación aplicada a la lista ordenada
  const pages = Math.ceil(sortedOrders.length/PER_PAGE);
  const paged = sortedOrders.slice((page-1)*PER_PAGE, page*PER_PAGE);
 
  const delOrder = async (id, e) => {
    e.stopPropagation();
    if(!confirm(`¿Eliminar pedido ${id}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteOrder(id);
      notify(`Pedido ${id} eliminado`);
    } catch(err) {
      notify("Error al eliminar pedido","err");
    }
  };
 
  if(detail) return <OrderDetail order={detail} onClose={()=>setDetail(null)}/>;
 
  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontSize:22,fontWeight:800,flex:1}}>Pedidos</div>
        <span style={{fontSize:12,color:"#3A6A46"}}>{sortedOrders.length} resultados</span>
      </div>
 
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
          placeholder="🔍 Buscar ID, cliente, región..."
          style={{...inpStyle,flex:1,minWidth:180}}/>
        <select value={fMes} onChange={e=>{setFMes(e.target.value);setPage(1);}} style={selStyle}>
          <option value="">Todos los meses</option>
          {allMonths.map(m=><option key={m}>{m}</option>)}
        </select>
        <select value={fVend} onChange={e=>{setFVend(e.target.value);setPage(1);}} style={selStyle}>
          {allVendors.map(v=><option key={v}>{v}</option>)}
        </select>
      </div>
 
      <div style={{background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"100px 85px 1fr 110px 85px 110px 44px",gap:10,
          padding:"9px 16px",borderBottom:"1px solid #1A3520",background:"#0A1A0C"}}>
          {["ID","Fecha","Cliente / Región","Vendedor","Uds.","Total",""].map(h=>(
            <div key={h} style={{fontSize:9,fontWeight:700,color:"#3A6A46",letterSpacing:1}}>{h.toUpperCase()}</div>
          ))}
        </div>
 
        {paged.length===0 ? <Empty msg="Sin resultados"/> : (
          <div>
            {paged.map((o,i)=>(
              <div key={o.id} onClick={()=>setDetail(o)}
                style={{display:"grid",gridTemplateColumns:"100px 85px 1fr 110px 85px 110px 44px",
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
                <div onClick={e=>delOrder(o.id,e)} style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <button style={{background:"transparent",border:"1px solid #3A1010",color:"#A03030",
                    borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,display:"flex",
                    alignItems:"center",justifyContent:"center",lineHeight:1}}
                    title="Eliminar pedido">
                    🗑
                  </button>
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
 
      {/* Recuadro Inferior de Resumen */}
      <div style={{
        background: "#0D1F12", border: "1px solid #1A3520", padding: "14px 20px", 
        borderRadius: "8px", display: "flex", justifyContent: "space-between", 
        alignItems: "center", marginTop: "16px", color: "#7EC8A4", fontSize: "14px", fontWeight: 600
      }}>
         <div>Filtrados: <span style={{color: "#E8F5EE", fontWeight: 700}}>{sortedOrders.length} pedidos</span></div>
         <div>Revenue: <span style={{color: "#52B788", fontWeight: 700}}>{$(sortedOrders.reduce((acc, o) => acc + (o.totalPagar || 0), 0))}</span></div>
         <div>Unidades: <span style={{color: "#E8F5EE", fontWeight: 700}}>{N(sortedOrders.reduce((acc, o) => acc + (o.totalUnidades || 0), 0))}</span></div>
      </div>
    </div>
  );
}
 
function OrderDetail({order,onClose}){
  // El total de la lista es TOTAL A PAGAR (incluye descuento o total manual).
  // Las líneas se valoran al precio de catálogo; si no cierran con ese total,
  // la diferencia se muestra aparte para que ambos montos coincidan.
  const liveItems    = (order.items||[]).filter(it=>it.qty>0);
  const lineSubtotal = liveItems.reduce((s,it)=>s+it.qty*it.precio, 0);
  const costoEnvio   = order.costoEnvio||0;
  const calculado    = lineSubtotal + costoEnvio;
  const totalPagar   = order.totalPagar > 0 ? order.totalPagar : calculado;
  const ajuste       = Math.round(calculado - totalPagar);
  const pct          = lineSubtotal ? Math.round((ajuste / lineSubtotal) * 100) : 0;
  const esDescuento  = ajuste > 1 && lineSubtotal > 0
    && Math.abs(ajuste - Math.round(lineSubtotal * pct / 100)) <= 1;
  const cogs         = liveItems.reduce((s,it)=>s+it.qty*(it.costo||0), 0);
  const gp           = totalPagar/1.19 - cogs;
  const mg           = totalPagar ? gp/(totalPagar/1.19) : 0;
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
            ["Vendedor",order.vendedor],["Medio de Pago",order.medioPago],
            ["Perfil de distribuidor",order.perfilDistribuidor],
            ["Origen",order.origenPedido],
            ["Canal de adquisición",order.canalAdquisicion],
            ["N° pedido cliente",order.nPedidoCliente]].map(([l,v])=>v&&v!=="nan"?(
            <div key={l} style={{marginBottom:8}}>
              <div style={{fontSize:9,color:"#3A6A46",letterSpacing:1,fontWeight:700}}>{l.toUpperCase()}</div>
              <div style={{fontSize:13,color:"#E8F5EE",marginTop:2}}>{v}</div>
            </div>
          ):null)}
          {order.comprobante ? (
            <div style={{marginTop:10}}>
              <div style={{fontSize:9,color:"#3A6A46",letterSpacing:1,fontWeight:700}}>COMPROBANTE</div>
              <a href={order.comprobante} target="_blank" rel="noreferrer"
                style={{fontSize:13,color:"#F0B429",marginTop:2,display:"inline-block"}}>
                Ver comprobante
              </a>
            </div>
          ) : null}
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
                <span>Envío</span><span>{$(costoEnvio)}</span>
              </div>
              {Math.abs(ajuste) > 1 && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5,color:"#F0B429"}}>
                  <span>{esDescuento ? `Descuento ${pct}%` : "Ajuste"}</span>
                  <span>{$(-ajuste)}</span>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:18,fontWeight:800}}>
                <span>Total</span><span style={{color:"#52B788"}}>{$(totalPagar)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#3A6A46",marginTop:6}}>
                <span>Gross Profit est.</span>
                <span style={{color:"#F0B429"}}>{$(gp)} ({P(mg)})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}