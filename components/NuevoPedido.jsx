import { useMemo, useState } from "react";
import {
  $, N, today,
  PRODUCTS as FALLBACK_PRODUCTS, REGIONS as FALLBACK_REGIONS,
  VENDORS, PAGOS, PERFILES_DIST, ORIGENES_PEDIDO, CANALES_ADQUISICION,
} from "../lib/constants";
import QuotationView from "./QuotationView";

const inpStyle={background:"#0A1A0C",border:"1px solid #1A3520",color:"#90CBF9",padding:"9px 12px",borderRadius:8,fontSize:13,width:"100%",boxSizing:"border-box"};
const labelSt={fontSize:10,color:"#5A8A66",fontWeight:700,letterSpacing:1,marginBottom:4,display:"block"};
const card={background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,padding:"18px 20px",marginBottom:14};

const Field=({label,children})=><div><label style={labelSt}>{label}</label>{children}</div>;

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildKnownClients(orders) {
  const map = {};
  (orders || []).forEach(o => {
    const name = o.cliente?.trim();
    if (!name) return;
    const key = foldName(name);
    const num = parseInt(String(o.id).match(/\d+/)?.[0] || "0", 10);
    if (!map[key]) {
      map[key] = { key, nombre: name, count: 0, latest: o, latestNum: num };
    }
    map[key].count += 1;
    if (num >= map[key].latestNum) {
      map[key].latest = o;
      map[key].latestNum = num;
      map[key].nombre = name;
    }
  });
  return Object.values(map);
}

export default function NuevoPedido({ nextId, addOrder, notify, setView, regions: propRegions, products: propProducts, orders = [] }) {
  const REGIONS = propRegions?.length ? propRegions : FALLBACK_REGIONS;
  const PRODUCTS = propProducts?.length ? propProducts : FALLBACK_PRODUCTS;
  const prods = PRODUCTS.filter(p=>p.active);
  const emptyItems = ()=>prods.map(p=>({...p,qty:0,regalo:0}));
  const knownClients = useMemo(() => buildKnownClients(orders), [orders]);

  const blankForm = () => ({
    fecha:today(),vendedor:"Vicente",cliente:"",telefono:"",email:"",
    direccion:"",region:"Metropolitana (RM)",items:emptyItems(),
    medioPago:"Transferencia",notas:"",
    perfilDistribuidor:"",origenPedido:"Lead nuevo",
    canalAdquisicion:"",nPedidoCliente:"",
  });

  const [f, setF] = useState(blankForm);
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [descuentoPct, setDescuentoPct] = useState("");
  const [totalManual, setTotalManual] = useState("");
  const [file, setFile] = useState(null);
  const [quoteMode, setQuoteMode] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setF(x => ({ ...x, [name]: value }));
  };

  const setQty=(id,field,val)=>setF(x=>({...x,items:x.items.map(it=>it.id===id?{...it,[field]:Math.max(0,+val||0)}:it)}));

  const envio=(REGIONS.find(r=>r.name===f.region)||{}).envio||0;
  const active=f.items.filter(it=>it.qty>0);
  const subtotal=active.reduce((s,it)=>s+it.qty*it.precio,0);
  const totalUds=active.reduce((s,it)=>s+it.qty,0);
  const pct = Math.min(100, Math.max(0, +descuentoPct||0));
  const baseParaDescuento = subtotal;
  const descuentoVal = pct > 0 ? Math.round(baseParaDescuento * pct / 100) : 0;
  const totalCalculado = baseParaDescuento - descuentoVal + envio;
  const total = totalManual !== "" ? Math.max(0, +totalManual||0) : totalCalculado;
  const cogs=active.reduce((s,it)=>s+it.qty*it.costo,0);
  const orderId=`PED-${String(nextId).padStart(3,"0")}`;

  const selectedCount = f.items.filter(it => it.qty > 0 || it.regalo > 0).length;
  const filteredProds=f.items.filter(it=>{
    const matchesSearch=!search||it.name.toLowerCase().includes(search.toLowerCase());
    const matchesSelected=!onlySelected||it.qty>0||it.regalo>0;
    return matchesSearch && matchesSelected;
  });

  const nameMatches = useMemo(() => {
    const q = foldName(f.cliente);
    if (q.length < 2) return [];
    return knownClients
      .filter(c => c.key.includes(q) || foldName(c.nombre).includes(q))
      .slice(0, 8);
  }, [f.cliente, knownClients]);

  const applyClient = (c, { onlyIfNew } = {}) => {
    const last = c.latest || {};
    setF(x => {
      if (onlyIfNew && x.origenPedido === "Cliente antiguo") return x;
      return {
        ...x,
        cliente: c.nombre,
        telefono: last.telefono || x.telefono,
        email: last.email || x.email,
        direccion: last.direccion || x.direccion,
        region: last.region || x.region,
        perfilDistribuidor: last.perfilDistribuidor || x.perfilDistribuidor,
        origenPedido: "Cliente antiguo",
        canalAdquisicion: "",
        nPedidoCliente: `${c.count + 1}° Pedido`,
      };
    });
    setNameOpen(false);
  };

  const onClienteChange = (e) => {
    const value = e.target.value;
    setF(x => {
      const next = { ...x, cliente: value };
      const match = knownClients.find(c => c.key === foldName(value));
      if (!match && x.origenPedido === "Cliente antiguo" && !value.trim()) {
        next.origenPedido = "Lead nuevo";
        next.nPedidoCliente = "";
      }
      return next;
    });
    setNameOpen(true);
  };

  const quoteOrder = {
    ...f,
    id: orderId,
    subtotal,
    costoEnvio: envio,
    totalPagar: total,
    items: active,
  };

  const guardar = async () => {
    if(!f.cliente.trim()){notify("Cliente es obligatorio","err");return;}
    if(active.length===0){notify("Agrega al menos un producto","err");return;}

    setIsSaving(true);
    const order={
      ...f,
      id:orderId,
      subtotal,
      costoEnvio:envio,
      descuento:descuentoVal,
      totalPagar:total,
      totalUnidades:totalUds,
      cogs,
      canalAdquisicion: f.origenPedido === "Lead nuevo" ? f.canalAdquisicion : "",
      nPedidoCliente: f.origenPedido === "Cliente antiguo" ? f.nPedidoCliente : "",
    };

    try {
      await addOrder(order, file);
      setF(blankForm());
      setSearch("");
      setOnlySelected(false);
      setDescuentoPct("");
      setTotalManual("");
      setFile(null);
      setQuoteMode(false);
      setView("pedidos");
    } catch {
      // El aviso de error lo muestra quien llama a addOrder.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{maxWidth:920}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:22,fontWeight:800}}>Nuevo Pedido</div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button type="button" onClick={()=>setQuoteMode(v=>!v)}
            style={{background:quoteMode?"#2A3A1A":"#0A1A0C",border:"1px solid #F0B429",
              color:"#F0B429",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:800,cursor:"pointer"}}>
            {quoteMode ? "Volver a editar" : "Mostrar como cotización"}
          </button>
          <div style={{background:"#0D1F12",border:"1px solid #2D5A3A",borderRadius:8,padding:"8px 18px",fontSize:15,fontWeight:800,color:"#F0B429"}}>
            ID: {orderId}
          </div>
        </div>
      </div>

      {quoteMode ? (
        <>
        <QuotationView
          order={quoteOrder}
          embedded
          onClose={()=>setQuoteMode(false)}
          closeLabel="Volver a editar"
        />
        <button onClick={guardar} disabled={isSaving} style={{width:"100%",background:"#1A5E2A",color:"#fff",border:"none",
          borderRadius:10,padding:"14px",marginTop:14,fontSize:15,fontWeight:800,cursor:isSaving?"not-allowed":"pointer", opacity:isSaving?0.5:1}}>
          {isSaving ? "GUARDANDO..." : `💾 GUARDAR PEDIDO — ${orderId}`}
        </button>
        </>
      ) : (
      <>
      <div style={card}>
        <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>DATOS DEL CLIENTE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Field label="Fecha"><input type="date" name="fecha" value={f.fecha} onChange={handleInputChange} style={inpStyle}/></Field>
          <Field label="Vendedor">
            <select name="vendedor" value={f.vendedor} onChange={handleInputChange} style={inpStyle}>
              {VENDORS.map(v=><option key={v}>{v}</option>)}
            </select>
          </Field>
          <div style={{position:"relative"}}>
            <Field label="Cliente *">
              <input name="cliente" value={f.cliente} onChange={onClienteChange}
                onFocus={()=>setNameOpen(true)}
                onBlur={e=>{
                  const value = e.target.value;
                  setTimeout(()=>{
                    setNameOpen(false);
                    const match = knownClients.find(c => c.key === foldName(value));
                    if (match) applyClient(match, { onlyIfNew: true });
                  },180);
                }}
                autoComplete="off"
                style={{...inpStyle,borderColor:!f.cliente?"#7B1D1D":"#1A3520"}} placeholder="Nombre completo"/>
            </Field>
            {nameOpen && nameMatches.length > 0 && (
              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,background:"#0A1A0C",border:"1px solid #2D5A3A",borderRadius:8,marginTop:4,maxHeight:220,overflowY:"auto"}}>
                {nameMatches.map(c => (
                  <button key={c.key} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>applyClient(c)}
                    style={{display:"block",width:"100%",textAlign:"left",background:"transparent",border:"none",color:"#E8F5EE",padding:"8px 12px",cursor:"pointer",fontSize:12}}>
                    <div style={{fontWeight:700}}>{c.nombre}</div>
                    <div style={{fontSize:10,color:"#5A8A66"}}>
                      {c.count} pedido{c.count===1?"":"s"} · {c.latest?.telefono || "sin teléfono"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Field label="Teléfono"><input name="telefono" value={f.telefono} onChange={handleInputChange} style={inpStyle} placeholder="56 9 XXXX XXXX"/></Field>
          <Field label="Email"><input name="email" value={f.email} onChange={handleInputChange} style={inpStyle} type="email"/></Field>
          <Field label="Región">
            <select name="region" value={f.region} onChange={handleInputChange} style={inpStyle}>
              {REGIONS.map(r=><option key={r.name}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={{marginTop:10}}>
          <label style={labelSt}>Dirección</label>
          <input name="direccion" value={f.direccion} onChange={handleInputChange} style={inpStyle} placeholder="Calle, número, depto., ciudad"/>
        </div>
      </div>

      <div style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1}}>PRODUCTOS</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button type="button" onClick={()=>setOnlySelected(v=>!v)}
              style={{background:onlySelected?"#1A5E2A":"#0A1A0C",border:"1px solid #2D5A3A",
                color:onlySelected?"#fff":"#7EC8A4",borderRadius:8,padding:"6px 10px",fontSize:12,
                fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
              Seleccionados{selectedCount?` (${selectedCount})`:""}
            </button>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filtrar producto..."
              style={{...inpStyle,width:200,padding:"6px 10px",fontSize:12}}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 70px 90px",gap:8,padding:"0 4px 6px",borderBottom:"1px solid #1A3520",marginBottom:4}}>
          {["Producto","Precio","Cantidad","Regalo","Subtotal"].map(h=>(
            <div key={h} style={{fontSize:9,fontWeight:700,color:"#3A6A46",letterSpacing:1}}>{h.toUpperCase()}</div>
          ))}
        </div>
        <div style={{maxHeight:340,overflowY:"auto"}}>
          {filteredProds.length===0 && (
            <div style={{padding:"18px 4px",fontSize:12,color:"#3A6A46"}}>
              {onlySelected ? "Todavía no hay productos con cantidad." : "Ningún producto coincide."}
            </div>
          )}
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

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>RESUMEN</div>
          {[["Subtotal Productos",$(subtotal)],["Costo de Envío",$(envio)],["Total Unidades",N(totalUds)]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:9,fontSize:13}}>
              <span style={{color:"#5A8A66"}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}

          <div style={{marginBottom:9}}>
            <label style={{fontSize:10,color:"#5A8A66",fontWeight:700,letterSpacing:1,marginBottom:4,display:"block"}}>DESCUENTO (%)</label>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{position:"relative",flex:1}}>
                <input
                  type="number" min="0" max="100" step="1"
                  value={descuentoPct}
                  onChange={e=>{ setDescuentoPct(e.target.value); setTotalManual(""); }}
                  placeholder="0"
                  style={{...inpStyle,borderColor:"#2A3A1A",color:"#F0B429",fontSize:13,padding:"6px 28px 6px 10px"}}
                />
                <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#F0B429",fontSize:13,fontWeight:700,pointerEvents:"none"}}>%</span>
              </div>
              {[5,10,15,20,30].map(p=>(
                <button key={p} type="button" onClick={()=>{ setDescuentoPct(String(p)); setTotalManual(""); }}
                  style={{background:+descuentoPct===p?"#2A3A1A":"transparent",border:"1px solid #2A3A1A",
                    color:+descuentoPct===p?"#F0B429":"#3A6A46",borderRadius:6,padding:"5px 8px",
                    cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                  {p}%
                </button>
              ))}
              {descuentoPct && (
                <button type="button" onClick={()=>setDescuentoPct("")}
                  style={{background:"transparent",border:"1px solid #3A1010",color:"#A03030",
                    borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11}}>✕</button>
              )}
            </div>
            {pct>0 && (
              <div style={{fontSize:11,color:"#F0B429",marginTop:4}}>
                − {$(descuentoVal)} ({pct}% sobre productos {$(baseParaDescuento)}) + envío {$(envio)}
              </div>
            )}
          </div>

          <div style={{borderTop:"1px solid #1A3520",marginTop:12,paddingTop:12}}>
            {totalManual!=="" && (
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#3A6A46",marginBottom:6}}>
                <span>Total calculado</span><span style={{textDecoration:"line-through"}}>{$(totalCalculado)}</span>
              </div>
            )}
            <div style={{marginBottom:10}}>
              <label style={{fontSize:10,color:"#52B788",fontWeight:700,letterSpacing:1,marginBottom:4,display:"block"}}>TOTAL FINAL (editable)</label>
              <input
                type="number" min="0"
                value={totalManual}
                onChange={e=>{ setTotalManual(e.target.value); setDescuentoPct(""); }}
                placeholder={String(totalCalculado)}
                style={{...inpStyle,borderColor:"#2D5A3A",color:"#52B788",fontSize:16,fontWeight:800,padding:"8px 10px"}}
              />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:20,fontWeight:800}}>
              <span style={{color:"#7EC8A4"}}>TOTAL</span><span style={{color:"#52B788"}}>{$(total)}</span>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>INFORMACIÓN ADICIONAL</div>
          <div style={{marginBottom:10}}>
            <label style={labelSt}>Medio de Pago</label>
            <select name="medioPago" value={f.medioPago} onChange={handleInputChange} style={inpStyle}>
              {PAGOS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{marginBottom:10}}>
            <label style={labelSt}>Perfil de distribuidor</label>
            <select name="perfilDistribuidor" value={f.perfilDistribuidor} onChange={handleInputChange} style={inpStyle}>
              <option value="">Seleccionar...</option>
              {PERFILES_DIST.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{marginBottom:10}}>
            <label style={labelSt}>Origen del pedido</label>
            <select name="origenPedido" value={f.origenPedido} onChange={handleInputChange} style={inpStyle}>
              {ORIGENES_PEDIDO.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          {f.origenPedido === "Lead nuevo" && (
            <div style={{marginBottom:10}}>
              <label style={labelSt}>Canal de adquisición</label>
              <select name="canalAdquisicion" value={f.canalAdquisicion} onChange={handleInputChange} style={inpStyle}>
                <option value="">Seleccionar...</option>
                {CANALES_ADQUISICION.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          )}
          {f.origenPedido === "Cliente antiguo" && (
            <div style={{marginBottom:10}}>
              <label style={labelSt}>Número de pedido del cliente</label>
              <input name="nPedidoCliente" value={f.nPedidoCliente} onChange={handleInputChange} style={inpStyle} placeholder="ej: 9° Pedido"/>
            </div>
          )}
          <div style={{marginBottom:10}}>
            <label style={labelSt}>Notas</label>
            <textarea name="notas" value={f.notas} onChange={handleInputChange}
              style={{...inpStyle,height:52,resize:"none"}} placeholder="Observaciones..."/>
          </div>
          <div>
            <label style={labelSt}>Comprobante</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={e=>setFile(e.target.files?.[0]||null)}
              style={{...inpStyle,padding:"8px 10px",color:"#7EC8A4"}}/>
            <div style={{fontSize:11,color:"#3A6A46",marginTop:4}}>
              {file ? file.name : "PDF, JPG o PNG. Se guarda como Comprobante_" + orderId}
            </div>
          </div>
        </div>
      </div>

      <button onClick={guardar} disabled={isSaving} style={{width:"100%",background:"#1A5E2A",color:"#fff",border:"none",
        borderRadius:10,padding:"14px",fontSize:15,fontWeight:800,cursor:isSaving?"not-allowed":"pointer", opacity:isSaving?0.5:1}}>
        {isSaving ? "GUARDANDO..." : `💾 GUARDAR PEDIDO — ${orderId}`}
      </button>
      </>
      )}
    </div>
  );
}
