// lib/constants.js
export const C = {
  bg:      "#080805",
  card:    "#2A251F",
  cardB:   "#473E32",
  cardH:   "#342E27",
  nav:     "#130F0A",
  inputBg: "#1A1510",
  inputB:  "#473E32",
  text:    "#FDFDFD",
  sub:     "#A39A84",
  muted:   "#655C45",
  cream:   "#E2DCD0",
  beige:   "#C1BAAA",
  gold:    "#887C5F",
  accent:  "#8E2BFF",
  accentD: "rgba(142,43,255,.15)",
  orange:  "#C56E3C",
  red:     "#99321B",
  green:   "#8A9B3D",
  purple:  "#6B4B8F",
  blue:    "#4E5A9A",
};

export const PRODUCTS = [
  {id:"FBS-SKU-001",name:"Cápsulas Melena de León",precio:10116,costo:3040,active:true},
  {id:"FBS-SKU-002",name:"Cápsulas Omega 3",precio:11293,costo:3940,active:true},
  {id:"FBS-SKU-003",name:"Cápsulas Magnesio",precio:8675,costo:3040,active:true},
  {id:"FBS-SKU-004",name:"Cápsulas Mix Fungi",precio:10116,costo:3840,active:true},
  {id:"FBS-SKU-005",name:"Cápsulas Ashwagandha",precio:6738,costo:3040,active:true},
  {id:"FBS-SKU-006",name:"Extracto Melena de León",precio:9152,costo:3300,active:true},
  {id:"FBS-SKU-007",name:"Extracto Reishi",precio:9152,costo:3300,active:true},
  {id:"FBS-SKU-008",name:"Extracto Cola de Pavo",precio:9152,costo:3300,active:true},
  {id:"FBS-SKU-009",name:"Extracto Cordyceps",precio:9152,costo:3300,active:true},
  {id:"FBS-SKU-010",name:"Cafe Melena",precio:13745,costo:5500,active:true},
  {id:"FBS-SKU-011",name:"Polvo Melena",precio:8925,costo:2700,active:true},
  {id:"FBS-SKU-012",name:"Polvo Mix 7 Hongos",precio:9282,costo:3000,active:true},
  {id:"FBS-SKU-013",name:"Creatina",precio:10495,costo:8400,active:true},
  {id:"FBS-SKU-014",name:"Exploradores",precio:9995,costo:3500,active:true},
  {id:"FBS-SKU-015",name:"Cápsula Desincha +",precio:10638,costo:3600,active:true},
  {id:"FBS-SKU-016",name:"PolvoHidromaqui",precio:13249,costo:5000,active:true},
  {id:"FBS-SKU-017",name:"Descansa +",precio:17124,costo:6000,active:true},
  {id:"FBS-SKU-018",name:"Gomitas Melena de León",precio:11055,costo:3890,active:true},
  {id:"FBS-SKU-019",name:"Gomitas Reishi",precio:11055,costo:3890,active:true},
  {id:"FBS-SKU-020",name:"Gomitas Ashwagandha",precio:11055,costo:3890,active:true},
  {id:"FBS-SKU-021",name:"Gomitas Cola de Pavo",precio:11055,costo:3890,active:true},
  {id:"FBS-SKU-022",name:"Libera +",precio:12138,costo:5000,active:true},
  {id:"FBS-SKU-023",name:"Gudly Not Stress",precio:11305,costo:4600,active:true},
  {id:"FBS-SKU-024",name:"Gudly Microbiota Balance",precio:10829,costo:3900,active:true},
];

export const REGIONS = [
  {name:"Arica y Parinacota (XV)",envio:9500},{name:"Tarapacá (I)",envio:9500},
  {name:"Antofagasta (II)",envio:8000},{name:"Atacama (III)",envio:8000},
  {name:"Coquimbo (IV)",envio:6000},{name:"Valparaíso (V)",envio:5000},
  {name:"Metropolitana (RM)",envio:3500},{name:"O'Higgins (VI)",envio:5000},
  {name:"Maule (VII)",envio:5500},{name:"Ñuble (XVI)",envio:5000},
  {name:"Biobío (VIII)",envio:5000},{name:"Araucanía (IX)",envio:6000},
  {name:"Los Ríos (XIV)",envio:6000},{name:"Los Lagos (X)",envio:6000},
  {name:"Aysén (XI)",envio:9000},{name:"Magallanes (XII)",envio:9500},
  {name:"RETIRO LOCAL",envio:0},
];

export const VENDORS = ["Vicente","Isaías","María José","Isidora","Alexander","Jose Luis","Web","Otro"];
export const ESTADOS = ["Pendiente","Shipit Creado","Despachado","Entregado"];
export const PAGOS   = ["Transferencia","Link Web","Efectivo","Otro"];
export const PERFILES_DIST = ["Distribuidor natural", "Local", "Profesional de la salud"];
export const ORIGENES_PEDIDO = ["Lead nuevo", "Cliente antiguo"];
export const CANALES_ADQUISICION = ["Contacto Directo", "Meta", "TikTok", "Landing page"];
export const PIE_COLORS = ["#52B788","#F0B429","#4A90D9","#E87040","#9B59B6","#1ABC9C","#E74C3C","#3498DB"];

// Helpers de formato de la v3
export const $ = (n) => n!=null ? "$"+Math.round(n).toLocaleString("es-CL") : "$0";
export const N = (n) => Math.round(n||0).toLocaleString("es-CL");
export const P = (n) => ((n||0)*100).toFixed(1)+"%";
export const today = () => new Date().toISOString().split("T")[0];

// Filtro de fechas histórico (si lo usas)
export function filterByDate(orders, filterType, from, to) {
  // Aquí puedes dejar la lógica que tenías o devolver orders tal cual
  return orders; 
}