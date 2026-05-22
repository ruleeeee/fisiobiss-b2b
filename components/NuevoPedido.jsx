// components/NuevoPedido.jsx
import { useState } from "react";
import { $, N, P, today, PRODUCTS, REGIONS, VENDORS, ESTADOS, PAGOS } from "../lib/constants";

const inpStyle={background:"#0A1A0C",border:"1px solid #1A3520",color:"#90CBF9",padding:"9px 12px",borderRadius:8,fontSize:13,width:"100%",boxSizing:"border-box"};
const labelSt={fontSize:10,color:"#5A8A66",fontWeight:700,letterSpacing:1,marginBottom:4,display:"block"};
const card={background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,padding:"18px 20px",marginBottom:14};

export default function NuevoPedido({ nextId, addOrder, notify, setView }) {
  const prods = PRODUCTS.filter(p=>p.active);
  const emptyItems = ()=>prods.map(p=>({...p,qty:0,regalo:0}));

  const [f, setF] = useState({
    fecha:today(),vendedor:"Vicente",cliente:"",telefono:"",email:"",
    direccion:"",region:"Metropolitana (RM)",items:emptyItems(),
    estado:"Pendiente",medioPago:"Transferencia",notas:""
  });
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const setQty=(id,field,val)=>setF(x=>({...x,items:x.items.map(it=>it.id===id?{...it,[field]:Math.max(0,+val||0)}:it)}));

  const envio=(REGIONS.find(r=>r.name===f.region)||{}).envio||0;
  const active=f.items.filter(it=>it.qty>0);
  const subtotal=active.reduce((s,it)=>s+it.qty*it.precio,0);
  const totalUds=active.reduce((s,it)=>s+it.qty,0);
  const total=subtotal+envio;
  const cogs=active.reduce((s,it)=>s+it.qty*it.costo,0);
  const gross=total/1.19-cogs;
  const margin=total?gross/(total/1.19):0;
  const orderId=`PED-${String(nextId).padStart(3,"0")}`;

  const filteredProds=f.items.filter(it=>!search||it.name.toLowerCase().includes(search.toLowerCase()));

  const guardar = async () => {
    if(!f.cliente.trim()){notify("Cliente es obligatorio","err");return;}
    if(active.length===0){notify("Agrega al menos un producto","err");return;}
    
    setIsSaving(true);
    const order={...f, id:orderId, subtotal, costoEnvio:envio, totalPagar:total, totalUnidades:totalUds, cogs };
    
    try {
      await addOrder(order);
      notify(`Pedido ${orderId} guardado ✓ en Firebase`);
      setF({fecha:today(),vendedor:"Vicente",cliente:"",telefono:"",email:"",direccion:"",region:"Metropolitana (RM)",items:emptyItems(),estado:"Pendiente",medioPago:"Transferencia",notas:""});
      setSearch("");
      setView("pedidos");
    } catch(err) {
      notify("Error guardando el pedido","err");
    } finally {
      setIsSaving(false);
    }
  };

  const Field=({label,children})=><div><label style={labelSt}>{label}</label>{children}</div>;

  return (
    <div style={{maxWidth:920}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontSize:22,fontWeight:800}}>Nuevo Pedido</div>
        <div style={{background:"#0D1F12",border:"1px solid #2D5A3A",borderRadius:8,padding:"8px 18px",fontSize:15,fontWeight:800,color:"#F0B429"}}>
          ID: {orderId}
        </div>
      </div>

      {/* Header fields */}
      <div style={{...card}}>
        <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>DATOS DEL CLIENTE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Field label="Fecha"><input type="date" value={f.fecha} onChange={e=>set("fecha",e.target.value)} style={inpStyle}/></Field>
          <Field label="Vendedor">
            <select value={f.vendedor} onChange={e=>set("vendedor",e.target.value)} style={inpStyle}>
              {VENDORS.map(v=><option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Cliente *"><input value={f.cliente} onChange={e=>set("cliente",e.target.value)} style={{...inpStyle,borderColor:!f.cliente?"#7B1D1D":"#1A3520"}} placeholder="Nombre completo"/></Field>
          <Field label="Teléfono"><input value={f.telefono} onChange={e=>set("telefono",e.target.value)} style={inpStyle} placeholder="56 9 XXXX XXXX"/></Field>
          <Field label="Email"><input value={f.email} onChange={e=>set("email",e.target.value)} style={inpStyle} type="email"/></Field>
          <Field label="Región">
            <select value={f.region} onChange={e=>set("region",e.target.value)} style={inpStyle}>
              {REGIONS.map(r=><option key={r.name}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={{marginTop:10}}>
          <label style={labelSt}>Dirección</label>
          <input value={f.direccion} onChange={e=>set("direccion",e.target.value)} style={inpStyle} placeholder="Calle, número, depto., ciudad"/>
        </div>
      </div>

      {/* Products */}
      <div style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1}}>PRODUCTOS</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filtrar producto..."
            style={{...inpStyle,width:200,padding:"6px 10px",fontSize:12}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 70px 90px",gap:8,padding:"0 4px 6px",borderBottom:"1px solid #1A3520",marginBottom:4}}>
          {["Producto","Precio","Cantidad","Regalo","Subtotal"].map(h=>(
            <div key={h} style={{fontSize:9,fontWeight:700,color:"#3A6A46",letterSpacing:1}}>{h.toUpperCase()}</div>
          ))}
        </div>
        <div style={{maxHeight:340,overflowY:"auto"}}>
          {filteredProds.map(it=>{
            const on=it.qty>0;
            return (
              <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 70px 90px",
                gap:8,padding:"5px 4px",borderRadius:6,marginBottom:1,
                background:on?"rgba(82,183,136,.06)":"transparent",transition:"background .1s"}}>
                <div style={{fontSize:12,color:on?"#E8F5EE":"#3A6A46",fontWeight:on?600:400,display:"flex",alignItems:"center"}}>{it.name}</div>
                <div style={{fontSize:11,color:"#4A7A56",display:"flex",alignItems:"center"}}>{$(it.precio)}</div>
                <input type="number" min="0" value={it.qty||""} placeholder="0"
                  onChange={e=>setQty(it.id,"qty",e.target.value)}
                  style={{...inpStyle,padding:"5px 8px",textAlign:"center",fontSize:13,
                    borderColor:on?"#2D5A3A":"#1A3520",background:on?"rgba(82,183,136,.12)":"#0A1A0C"}}/>
                <input type="number" min="0" value={it.regalo||""} placeholder="0"
                  onChange={e=>setQty(it.id,"regalo",e.target.value)}
                  style={{...inpStyle,padding:"5px 6px",textAlign:"center",fontSize:11,color:"#F0B429",borderColor:"#2A3A1A"}}/>
                <div style={{fontSize:12,fontWeight:700,color:on?"#52B788":"#2A4A2A",display:"flex",alignItems:"center"}}>
                  {on?$(it.qty*it.precio):"-"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary + Save */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>RESUMEN</div>
          {[["Subtotal Productos",$(subtotal)],["Costo de Envío",$(envio)],["Total Unidades",N(totalUds)]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:9,fontSize:13}}>
              <span style={{color:"#5A8A66"}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}
          <div style={{borderTop:"1px solid #1A3520",marginTop:12,paddingTop:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:20,fontWeight:800}}>
              <span style={{color:"#7EC8A4"}}>TOTAL</span><span style={{color:"#52B788"}}>{$(total)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#3A6A46",marginTop:8}}>
              <span>Gross Profit est.</span>
              <span style={{color:"#F0B429"}}>{$(gross)} ({P(margin)})</span>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>INFORMACIÓN ADICIONAL</div>
          <div style={{marginBottom:10}}>
            <label style={labelSt}>Estado Despacho</label>
            <select value={f.estado} onChange={e=>set("estado",e.target.value)} style={inpStyle}>
              {ESTADOS.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
          <div style={{marginBottom:10}}>
            <label style={labelSt}>Medio de Pago</label>
            <select value={f.medioPago} onChange={e=>set("medioPago",e.target.value)} style={inpStyle}>
              {PAGOS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Notas</label>
            <textarea value={f.notas} onChange={e=>set("notas",e.target.value)}
              style={{...inpStyle,height:52,resize:"none"}} placeholder="Observaciones..."/>
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:12}}>
        <button onClick={guardar} disabled={isSaving} style={{flex:1,background:"#1A5E2A",color:"#fff",border:"none",
          borderRadius:10,padding:"14px",fontSize:15,fontWeight:800,cursor:isSaving?"not-allowed":"pointer", opacity:isSaving?0.5:1}}>
          {isSaving ? "GUARDANDO..." : `💾 GUARDAR PEDIDO — ${orderId}`}
        </button>
      </div>
    </div>
  );
}