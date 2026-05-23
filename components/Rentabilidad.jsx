// components/Rentabilidad.jsx
import { useState, useMemo } from "react";
import { $, N, P, PRODUCTS } from "../lib/constants"; 

const selStyle={background:"#0D1F12",border:"1px solid #1A3520",color:"#E8F5EE",padding:"8px 12px",borderRadius:8,fontSize:13,cursor:"pointer"};
const inpStyle={background:"#0A1A0C",border:"1px solid #1A3520",color:"#90CBF9",padding:"9px 12px",borderRadius:8,fontSize:13,width:"100%",boxSizing:"border-box"};
const labelSt={fontSize:10,color:"#5A8A66",fontWeight:700,letterSpacing:1,marginBottom:4,display:"block"};
const card={background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,padding:"18px 20px",marginBottom:14};

const parseDate = (fechaRaw) => {
  if (!fechaRaw) return { month: "", day: "" };
  const str = String(fechaRaw).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return { month: str.slice(0, 7), day: str.slice(8, 10) };
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    let y = parts[2];
    if (y.length === 2) y = "20" + y;
    return { month: `${y}-${m}`, day: d };
  }
  return { month: str.slice(0, 7), day: "01" };
};

export default function Rentabilidad({ orders: allOrders }){
  
  const processedOrders = useMemo(() => {
    return allOrders.map(o => {
      const { month } = parseDate(o.fecha);
      let calcCogs = 0;
      let calcSubtotal = 0;

      const newItems = (o.items || []).map(it => {
        let searchName = it.name
          .replace("Cap. ", "Cápsulas ")
          .replace("Ext. ", "Extracto ")
          .replace("Gom. ", "Gomitas ")
          .replace("Pol. ", "Polvo ");
        
        if (searchName === "Cápsulas Desincha +") searchName = "Cápsula Desincha +";

        const prodData = PRODUCTS.find(p => p.name === searchName || p.name === it.name) || {};
        
        const costoReal = prodData.costo || it.costo || 0;
        const precioReal = prodData.precio || it.precio || 0;
        const nombreOficial = prodData.name || it.name; 

        calcCogs += (it.qty * costoReal);
        calcSubtotal += (it.qty * precioReal);

        return { ...it, name: nombreOficial, costoReal, precioReal };
      });

      const finalTotal = o.totalPagar > 0 ? o.totalPagar : (calcSubtotal + (o.costoEnvio || 0));

      return {
        ...o,
        _month: month,
        cogs: calcCogs,
        totalPagar: finalTotal,
        items: newItems
      };
    }).filter(o => o._month !== "");
  }, [allOrders]);

  const allMonths = useMemo(() => [...new Set(processedOrders.map(o => o._month))].sort().reverse(), [processedOrders]);
  const defaultMonth = allMonths.length > 0 ? allMonths[0] : "";
  const [mes, setMes] = useState(defaultMonth);
  const [publi, setPubli] = useState(0);
  const [otros, setOtros] = useState(0);

  if (allMonths.length > 0 && mes !== "" && !allMonths.includes(mes)) {
    setMes(allMonths[0]);
  }

  const orders = processedOrders.filter(o => !mes || o._month === mes);
  
  const revB = orders.reduce((s,o) => s + (o.totalPagar||0), 0);
  const revN = revB / 1.19;
  const cogs = orders.reduce((s,o) => s + (o.cogs||0), 0);
  const envios = orders.reduce((s,o) => s + (o.costoEnvio||0), 0);
  const gross = revN - cogs;
  const netto = gross - envios - publi - otros;
  const mG = revN ? gross / revN : 0;
  const mN = revN ? netto / revN : 0;
  const nPed = orders.length;
  const roas = publi ? revB / publi : 0;

  const skuMap = {};
  orders.forEach(o => (o.items || []).forEach(it => {
    if (it.qty > 0) {
      if (!skuMap[it.name]) skuMap[it.name] = { units: 0, rev: 0, cogs: 0 };
      skuMap[it.name].units += it.qty;
      skuMap[it.name].rev += (it.qty * it.precioReal);
      skuMap[it.name].cogs += (it.qty * it.costoReal);
    }
  }));

  const skuRows = Object.entries(skuMap).map(([n,v]) => ({
    name: n, 
    units: v.units, 
    rev: v.rev, 
    cogs: v.cogs,
    profit: (v.rev / 1.19) - v.cogs,
    margin: v.rev ? ((v.rev / 1.19) - v.cogs) / (v.rev / 1.19) : 0,
  })).sort((a,b) => b.profit - a.profit);

  const Row = ({ l, v, h }) => (
    <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #0D1A0F",fontSize:13}}>
      <span style={{color:"#5A8A66"}}>{l}</span>
      <span style={{fontWeight:700,color:h?"#52B788":"#E8F5EE"}}>{v}</span>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center"}}>
        <div style={{fontSize:22,fontWeight:800,flex:1}}>Rentabilidad</div>
        <select value={mes} onChange={e=>setMes(e.target.value)} style={selStyle}>
          {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
          <option value="">Todos los períodos (Histórico)</option>
        </select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:14}}>COSTOS VARIABLES (ingreso manual)</div>
          <div style={{marginBottom:10}}>
            <label style={labelSt}>Inversión Publicitaria (CLP)</label>
            <input type="number" value={publi} onChange={e=>setPubli(+e.target.value||0)} style={inpStyle} placeholder="0"/>
          </div>
          <div>
            <label style={labelSt}>Otros Costos Operativos (CLP)</label>
            <input type="number" value={otros} onChange={e=>setOtros(+e.target.value||0)} style={inpStyle} placeholder="0"/>
          </div>
          {publi>0&&(
            <div style={{marginTop:14,padding:12,background:"rgba(240,180,41,.06)",borderRadius:8,border:"1px solid #2A3A1A"}}>
              <div style={{fontSize:10,color:"#5A8A66",letterSpacing:1,marginBottom:4}}>ROAS</div>
              <div style={{fontSize:28,fontWeight:800,color:"#F0B429"}}>{roas.toFixed(1)}x</div>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:12}}>P&L — {mes||"Histórico"}</div>
          <Row l="Revenue Bruto (c/IVA)" v={$(revB)}/>
          <Row l="Revenue Neto (s/IVA)" v={$(revN)}/>
          <Row l={`− COGS (${nPed} pedidos)`} v={`(${$(cogs)})`}/>
          <Row l="= GROSS PROFIT" v={`${$(gross)} — ${P(mG)}`} h/>
          <Row l="− Costo de Envíos" v={`(${$(envios)})`}/>
          {publi>0&&<Row l="− Inversión Publicitaria" v={`(${$(publi)})`}/>}
          {otros>0&&<Row l="− Otros Costos" v={`(${$(otros)})`}/>}
          <div style={{padding:"12px 0",display:"flex",justifyContent:"space-between",fontSize:17,fontWeight:800}}>
            <span>= GANANCIA NETA</span>
            <span style={{color:netto>=0?"#52B788":"#E87040"}}>{$(netto)} — {P(mN)}</span>
          </div>
          <div style={{display:"flex",gap:12,marginTop:6}}>
            <div style={{flex:1,background:"rgba(82,183,136,.07)",borderRadius:8,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#3A6A46",marginBottom:3,letterSpacing:1}}>POR PEDIDO</div>
              <div style={{fontSize:15,fontWeight:800,color:"#F0B429"}}>{$(nPed?netto/nPed:0)}</div>
            </div>
            <div style={{flex:1,background:"rgba(82,183,136,.07)",borderRadius:8,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#3A6A46",marginBottom:3,letterSpacing:1}}>MARGEN NETO</div>
              <div style={{fontSize:15,fontWeight:800,color:mN>=0.4?"#52B788":mN>=0.2?"#F0B429":"#E87040"}}>{P(mN)}</div>
            </div>
          </div>
        </div>
      </div>

      {skuRows.length>0&&(
        <div style={card}>
          <div style={{fontSize:10,fontWeight:700,color:"#52B788",letterSpacing:1,marginBottom:12}}>RENTABILIDAD POR SKU</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 65px 120px 110px 110px 75px",gap:8,padding:"0 2px 8px",borderBottom:"1px solid #1A3520",marginBottom:4}}>
            {["SKU","Uds.","Revenue Neto","COGS","Gross Profit","Margen"].map(h=>(
              <div key={h} style={{fontSize:9,fontWeight:700,color:"#3A6A46",letterSpacing:1}}>{h.toUpperCase()}</div>
            ))}
          </div>
          <div style={{maxHeight:320,overflowY:"auto"}}>
            {skuRows.map((s,i)=>(
              <div key={s.name} style={{display:"grid",gridTemplateColumns:"2fr 65px 120px 110px 110px 75px",
                gap:8,padding:"7px 2px",borderBottom:"1px solid #0D1A0F",
                background:i%2?"transparent":"rgba(255,255,255,.01)"}}>
                <div style={{fontSize:12,fontWeight:600,color:"#E8F5EE"}}>{s.name}</div>
                <div style={{fontSize:12,color:"#7EC8A4",textAlign:"right"}}>{N(s.units)}</div>
                <div style={{fontSize:12,color:"#7EC8A4",textAlign:"right"}}>{$(s.rev/1.19)}</div>
                <div style={{fontSize:12,color:"#5A8A66",textAlign:"right"}}>{$(s.cogs)}</div>
                <div style={{fontSize:12,fontWeight:700,color:"#F0B429",textAlign:"right"}}>{$(s.profit)}</div>
                <div style={{fontSize:12,fontWeight:800,textAlign:"right",
                  color:s.margin>=0.55?"#52B788":s.margin>=0.40?"#F0B429":"#E87040"}}>{P(s.margin)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}