// lib/constants.js

export const C = {
  bg:       "#080805",
  card:     "#2A251F",
  cardB:    "#473E32",
  cardH:    "#342E27",
  nav:      "#130F0A",
  inputBg:  "#1A1510",
  inputB:   "#473E32",
  text:     "#FDFDFD",
  sub:      "#A39A84",
  muted:    "#655C45",
  cream:    "#E2DCD0",
  beige:    "#C1BAAA",
  gold:     "#887C5F",
  accent:   "#8E2BFF",
  accentD:  "rgba(142,43,255,.15)",
  orange:   "#C56E3C",
  red:      "#99321B",
  green:    "#8A9B3D",
  purple:   "#6B4B8F",
  blue:     "#4E5A9A",
};

export const CHART_COLORS = ["#8E2BFF", "#C56E3C", "#8A9B3D", "#6B4B8F", "#4E5A9A", "#99321B"];

export const REGIONS = [
  { name: "Metropolitana", envio: 4500 },
  { name: "Valparaíso", envio: 5500 },
  { name: "Biobío", envio: 6500 },
  { name: "Antofagasta", envio: 7500 },
  { name: "Araucanía", envio: 6500 },
  { name: "O'Higgins", envio: 5500 },
  { name: "Maule", envio: 5500 },
  { name: "Coquimbo", envio: 6000 },
  { name: "Los Lagos", envio: 7000 },
  { name: "Los Ríos", envio: 7000 },
  { name: "Tarapacá", envio: 8000 },
  { name: "Atacama", envio: 6500 },
  { name: "Arica y Parinacota", envio: 8500 },
  { name: "Ñuble", envio: 6000 },
  { name: "Aysén", envio: 9500 },
  { name: "Magallanes", envio: 9900 }
];

export const VENDEDORES_PRESET = ["Jose Luis", "Francisca", "Javier", "Canal Directo"];

export const PRODUCTS_PRESET = [
  { id: "FBS-SKU-001", name: "Cápsulas Melena de León", precio: 10116, costo: 3040 },
  { id: "FBS-SKU-002", name: "Cápsulas Omega 3", precio: 11293, costo: 3940 },
  { id: "FBS-SKU-003", name: "Cápsulas Magnesio", precio: 8675, costo: 3040 },
  { id: "FBS-SKU-004", name: "Cápsulas Mix Fungi", precio: 10116, costo: 3840 },
  { id: "FBS-SKU-005", name: "Cápsulas Ashwagandha", precio: 6738, costo: 3040 }
];

export const $ = (n) => typeof n === "number" ? "$" + Math.round(n).toLocaleString("es-CL") : "$0";
export const N = (n) => Math.round(n || 0).toLocaleString("es-CL");
export const P = (n) => ((n || 0) * 100).toFixed(1) + "%";
export const today = () => new Date().toISOString().split("T")[0];

export function getQuickRange(qf) {
  const now = new Date();
  const y = now.getFullYear();
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (qf) {
    case "today": return { from: today(), to: today() };
    case "week": {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      return { from: fmt(s), to: today() };
    }
    case "month":
      return { from: `${y}-${pad(now.getMonth() + 1)}-01`, to: today() };
    case "year":
      return { from: `${y}-01-01`, to: today() };
    default:
      return null;
  }
}

export function filterByDate(orders, qf, from, to) {
  if (!qf || qf === "all") return orders;
  const range = qf === "custom" ? { from, to } : getQuickRange(qf);
  if (!range) return orders;
  return orders.filter(o => o.fecha >= range.from && o.fecha <= range.to);
}