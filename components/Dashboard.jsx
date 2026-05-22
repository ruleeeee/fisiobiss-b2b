// components/Dashboard.jsx
import { useState, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { $, N, P, PIE_COLORS } from "../lib/constants";

const selStyle={background:"#0D1F12",border:"1px solid #1A3520",color:"#E8F5EE",padding:"8px 12px",borderRadius:8,fontSize:13,cursor:"pointer"};

function Empty({msg}){return <div style={{padding:"32px 20px",textAlign:"center",color:"#3A6A46",fontSize:13}}>📭 {msg}</div>}

export default function Dashboard({ orders }) {
  const allMonths = useMemo(()=>[...new Set(orders.map(o=>o.fecha?.slice(0,7)).filter(Boolean))].sort().reverse(),[orders]);
  const [mes, setMes]   = useState(allMonths[0]||new Date().toISOString().slice(0,7));
  const [vend, setVend] = useState("Todos");

  const filteredOrders = useMemo(()=>orders.filter(o=>{
    const mOk = !mes||o.fecha?.startsWith(mes);
    const vOk = vend==="Todos"||o.vendedor===vend;
    return mOk&&vOk;
  }),[orders,mes,vend]);

  const rev    = filteredOrders.reduce((s,o)=>s+(o.totalPagar||0),0);
  const units  = filteredOrders.reduce((s,o)=>s+(o.totalUnidades||0),0);
  const nPed   = filteredOrders.length;
  const ticket = nPed?rev/nPed:0;
  const cogs   = filteredOrders.reduce((s,o)=>s+(o.cogs||0),0);
  const gross  = rev/1.19-cogs;
  const margin = rev?gross/(rev/1.19):0;

  // Top region
  const regMap={};
  filteredOrders.forEach(o=>{ const k=o.region?.split("(")[0]?.trim()||"?"; regMap[k]=(regMap[k]||0)+(o.totalPagar||0); });
  const topReg = Object.entries(regMap).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-";

  // Daily data
  const dayMap={};
  filteredOrders.forEach(o=>{ const d=o.fecha?.split("-")[2]; if(d) dayMap[d]=(dayMap[d]||0)+(o.totalPagar||0); });
  const dailyData = Object.keys(dayMap).sort((a,b)=>+a-+b).map(d=>({dia:+d,ventas:dayMap[d]}));

  // Monthly trend
  const mMap={};
  orders.forEach(o=>{
    const m=o.fecha?.slice(0,7); if(!m)return;
    if(!mMap[m])mMap[m]={mes:m,rev:0,profit:0,pedidos:0};
    mMap[m].rev+=(o.totalPagar||0);
    mMap[m].profit+=(o.totalPagar||0)/1.19-(o.cogs||0);
    mMap[m].pedidos+=1;
  });
  const monthData=Object.values(mMap).sort((a,b)=>a.mes.localeCompare(b.mes)).slice(-8)
    .map(m=>({...m,label:m.mes.slice(5)+"/"+m.mes.slice(2,4)}));

  // SKU breakdown
  const skuMap={};
  filteredOrders.forEach(o=>(o.items||[]).forEach(it=>{ if(it.qty>0){ skuMap[it.name]=(skuMap[it.name]||0)+it.qty*it.precio; }}));
  const skuData=Object.entries(skuMap).sort((a,b)=>b[1]-a[1]).slice(0,8)
    .map(([n,v])=>({name:n.replace("Cápsulas ","Cap. ").replace("Extracto ","Ext. ").replace("Gomitas ","Gom. ").replace("Polvo ","Pol. "),v}));

  // Region pie
  const regData=Object.entries(regMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>({name:n,v}));
  const allVendors=["Todos",...new Set(orders.map(o=>o.vendedor).filter(Boolean))];

  const KPI=({icon,label,value,sub,color="#52B788"})=>(
    <div style={{background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,padding:"16px 18px",flex:1,minWidth:130}}>
      <div style={{fontSize:10,color:"#5A8A66",fontWeight:700,letterSpacing:1,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
        <span style={{fontSize:16}}>{icon}</span>{label.toUpperCase()}
      </div>
      <div style={{fontSize:24,fontWeight:800,color,lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#4A7A56",marginTop:5}}>{sub}</div>}
    </div>
  );

  const Chart=({title,children})=>(
    <div style={{background:"#0D1F12",border:"1px solid #1A3520",borderRadius:12,padding:"16px 18px"}}>
      <div style={{fontSize:11,fontWeight:700,color:"#5A8A66",letterSpacing:1,marginBottom:12}}>{title.toUpperCase()}</div>
      {children}
    </div>
  );

  const TT=({active,payload,label})=>active&&payload?.length?(
    <div style={{background:"#0D1F12",border:"1px solid #1A3520",borderRadius:8,padding:"8px 12px",fontSize:12}}>
      <div style={{color:"#5A8A66",marginBottom:4}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color||"#52B788",fontWeight:700}}>{p.name}: {$(p.value)}</div>)}
    </div>
  ):null;

  return (
    <div>
      {/* Header row */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{fontSize:22,fontWeight:800,flex:1}}>Dashboard</div>
        <select value={mes} onChange={e=>setMes(e.target.value)} style={selStyle}>
          {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={vend} onChange={e=>setVend(e.target.value)} style={selStyle}>
          {allVendors.map(v=><option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* KPI row */}
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <KPI icon="💰" label="Revenue Bruto" value={$(rev)} sub={`${nPed} pedidos`} color="#52B788"/>
        <KPI icon="📈" label="Gross Profit" value={$(gross)} sub={`Margen ${P(margin)}`} color="#F0B429"/>
        <KPI icon="📦" label="Unidades" value={N(units)} sub={`Ticket ${$(ticket)}`} color="#7EC8A4"/>
        <KPI icon="🏆" label="Top Región" value={topReg} sub={$(regMap[topReg]||0)} color="#E87040"/>
        <KPI icon="📊" label="Total BBDD" value={N(orders.length)} sub="pedidos históricos" color="#7A9B84"/>
      </div>

      {/* Charts row 1 */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <Chart title={`Ventas Diarias — ${mes}`}>
          {dailyData.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52B788" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#52B788" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A3520"/>
                <XAxis dataKey="dia" tick={{fill:"#4A7A56",fontSize:10}}/>
                <YAxis tick={{fill:"#4A7A56",fontSize:10}} tickFormatter={v=>$(v).replace("$","")}/>
                <Tooltip content={<TT/>}/>
                <Area type="monotone" dataKey="ventas" stroke="#52B788" fill="url(#g1)" strokeWidth={2} name="Ventas"/>
              </AreaChart>
            </ResponsiveContainer>
          ):<Empty msg="Sin ventas en este período"/>}
        </Chart>

        <Chart title="Por Región">
          {regData.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={regData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="v">
                  {regData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={v=>[$(v),"Revenue"]} contentStyle={{background:"#0D1F12",border:"1px solid #1A3520",borderRadius:8}} labelStyle={{color:"#E8F5EE"}}/>
                <Legend iconSize={8} wrapperStyle={{fontSize:10,color:"#5A8A66"}}/>
              </PieChart>
            </ResponsiveContainer>
          ):<Empty msg="Sin datos"/>}
        </Chart>
      </div>

      {/* Charts row 2 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Chart title="Tendencia Mensual">
          {monthData.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A3520"/>
                <XAxis dataKey="label" tick={{fill:"#4A7A56",fontSize:10}}/>
                <YAxis tick={{fill:"#4A7A56",fontSize:10}} tickFormatter={v=>$(v).replace("$","")}/>
                <Tooltip content={<TT/>}/>
                <Legend iconSize={8} wrapperStyle={{fontSize:10,color:"#5A8A66"}}/>
                <Line type="monotone" dataKey="rev" stroke="#52B788" strokeWidth={2} dot={{r:3,fill:"#52B788"}} name="Revenue"/>
                <Line type="monotone" dataKey="profit" stroke="#F0B429" strokeWidth={2} dot={{r:3,fill:"#F0B429"}} strokeDasharray="5 5" name="Gross Profit"/>
              </LineChart>
            </ResponsiveContainer>
          ):<Empty msg="Sin datos"/>}
        </Chart>

        <Chart title="Top SKUs — Revenue">
          {skuData.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={skuData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1A3520" horizontal={false}/>
                <XAxis type="number" tick={{fill:"#4A7A56",fontSize:9}} tickFormatter={v=>$(v).replace("$","")}/>
                <YAxis type="category" dataKey="name" tick={{fill:"#7EC8A4",fontSize:9}} width={110}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="v" fill="#2E7D52" radius={[0,4,4,0]} name="Revenue"/>
              </BarChart>
            </ResponsiveContainer>
          ):<Empty msg="Sin datos"/>}
        </Chart>
      </div>
    </div>
  );
}