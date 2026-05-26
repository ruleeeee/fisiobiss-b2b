// lib/googleSheets.js
// Compatible con Cloudflare Workers: usa fetch + Web Crypto API
// NO usa google-auth-library ni google-spreadsheet (incompatibles con CF Workers)

import { PRODUCTS } from "./constants.js";

const SHEET_NAME     = "BD_VENTAS";
const HEADER_ROW_NUM = 3; // fila 3 tiene los headers (1-indexed)

const PRODUCTOS_SHEET = [
  "Cap. Melena de León","Cap. Omega 3","Cap. Magnesio","Cap. Mix Fungi","Cap. Ashwagandha",
  "Ext. Melena de León","Ext. Reishi","Ext. Cola de Pavo","Ext. Cordyceps","Cafe Melena",
  "Pol. Melena","Pol. Mix 7 Hongos","Creatina","Exploradores","Cap. Desincha +","PolvoHidromaqui",
  "Descansa +","Gom. Melena de León","Gom. Reishi","Gom. Ashwagandha",
  "Gom. Cola de Pavo","Libera +","Gudly Not Stress","Gudly Microbiota Balance"
];

// ─── Auth con Web Crypto API ─────────────────────────────────────────────────

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function b64url(input) {
  let str = typeof input === "string" ? btoa(input) : btoa(String.fromCharCode(...new Uint8Array(input)));
  return str.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

let _token = null;
let _tokenExp = 0;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_token && now < _tokenExp - 60) return _token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss:   email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  }));

  const sigInput = `${header}.${payload}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", pemToArrayBuffer(key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(sigInput));
  const jwt = `${sigInput}.${b64url(sig)}`;

  const res  = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  _token    = data.access_token;
  _tokenExp = now + (data.expires_in || 3600);
  return _token;
}

// ─── Sheets REST helpers ──────────────────────────────────────────────────────

const sheetId = () => process.env.GOOGLE_SHEET_ID;
const baseUrl = () => `https://sheets.googleapis.com/v4/spreadsheets/${sheetId()}`;

async function sGet(path) {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`Sheets GET ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sPost(path, body) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getAccessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Sheets POST ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sPut(path, body) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${await getAccessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Sheets PUT ${res.status}: ${await res.text()}`);
  return res.json();
}

// Convierte número de columna (0-indexed) → letra(s): 0→A, 25→Z, 26→AA
function colLetter(n) {
  let r = "";
  for (n++; n > 0; n = Math.floor((n - 1) / 26))
    r = String.fromCharCode(65 + ((n - 1) % 26)) + r;
  return r;
}

// ─── Headers ─────────────────────────────────────────────────────────────────

let _hdr = null; // array de nombres
let _hMap = null; // nombre → índice

async function getHeaderMap() {
  if (_hdr) return { hdr: _hdr, hMap: _hMap };
  const enc  = encodeURIComponent(`${SHEET_NAME}!A${HEADER_ROW_NUM}:${HEADER_ROW_NUM}`);
  const data = await sGet(`/values/${enc}`);
  _hdr  = data.values?.[0] || [];
  _hMap = {};
  _hdr.forEach((h, i) => { _hMap[h] = i; });
  return { hdr: _hdr, hMap: _hMap };
}

function getCell(row, hMap, name) {
  const i = hMap[name];
  return (i !== undefined && i >= 0) ? (row[i] || "") : "";
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseNum(val) {
  if (typeof val === "number") return val;
  const s = String(val ?? "").trim();
  if (!s) return 0;
  // Quita todo menos dígitos, signo y separadores
  const cleaned = s.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return 0;
  // Formato chileno: "." es separador de miles, "," es decimal.
  // Si hay coma, los puntos son siempre miles y la coma es decimal.
  // Si solo hay puntos en grupos de 3 (ej. "3.500", "1.234.567"), son miles.
  let normalized;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  } else {
    normalized = cleaned;
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function rowToOrder(row, hMap) {
  const items = [];
  PRODUCTOS_SHEET.forEach(prod => {
    const qty = parseInt(getCell(row, hMap, prod), 10) || 0;
    if (qty > 0) {
      let searchName = prod
        .replace("Cap. ", "Cápsulas ").replace("Ext. ", "Extracto ")
        .replace("Gom. ", "Gomitas ").replace("Pol. ", "Polvo ");
      if (searchName === "Cápsulas Desincha +") searchName = "Cápsula Desincha +";
      const p = PRODUCTS.find(x => x.name === searchName || x.name === prod) || {};
      items.push({ id: p.id || prod, name: prod, qty, precio: p.precio || 0, costo: p.costo || 0, regalo: 0 });
    }
  });

  const costoEnvio        = parseNum(getCell(row, hMap, "COSTO ENVÍO"));
  const sheetSubtotal     = parseNum(getCell(row, hMap, "SUBTOTAL PROD."));
  const sheetTotalPagar   = parseNum(getCell(row, hMap, "TOTAL A PAGAR"));
  const sheetTotalUnids   = parseNum(getCell(row, hMap, "TOTAL UNIDADES"));

  const computedSubtotal  = items.reduce((s, it) => s + it.qty * it.precio, 0);
  const computedUnidades  = items.reduce((s, it) => s + it.qty + (it.regalo || 0), 0);

  const itemsEdited = sheetTotalUnids > 0 && sheetTotalUnids !== computedUnidades;

  const subtotal      = (itemsEdited || sheetSubtotal   === 0) ? computedSubtotal       : sheetSubtotal;
  const totalPagar    = (itemsEdited || sheetTotalPagar === 0) ? (subtotal + costoEnvio) : sheetTotalPagar;
  const totalUnidades = computedUnidades > 0 ? computedUnidades : sheetTotalUnids;
  const cogs          = items.reduce((s, it) => s + it.qty * (it.costo || 0), 0);

  return {
    id:            getCell(row, hMap, "ID Pedido"),
    fecha:         getCell(row, hMap, "Fecha"),
    vendedor:      getCell(row, hMap, "Vendedor"),
    cliente:       getCell(row, hMap, "Nombre Cliente"),
    telefono:      getCell(row, hMap, "Teléfono"),
    email:         getCell(row, hMap, "Email"),
    direccion:     getCell(row, hMap, "Dirección"),
    region:        getCell(row, hMap, "Región"),
    estado:        getCell(row, hMap, "ESTADO DESPACHO") || "Pendiente",
    medioPago:     getCell(row, hMap, "MEDIO PAGO") || "Transferencia",
    costoEnvio, subtotal, totalPagar, totalUnidades, items, cogs,
    notas: "", timestamp: "",
  };
}

function orderToValues(o, hdr) {
  const row = new Array(hdr.length).fill("");
  const set = (name, val) => {
    const i = hdr.indexOf(name);
    if (i >= 0) row[i] = val ?? "";
  };
  set("ID Pedido",       o.id);
  set("Fecha",           o.fecha);
  set("Vendedor",        o.vendedor);
  set("Nombre Cliente",  o.cliente);
  set("Teléfono",        o.telefono);
  set("Email",           o.email);
  set("Dirección",       o.direccion);
  set("Región",          o.region);
  set("SUBTOTAL PROD.",  o.subtotal      ?? 0);
  set("COSTO ENVÍO",     o.costoEnvio    ?? 3500);
  set("TOTAL A PAGAR",   o.totalPagar    ?? ((o.subtotal ?? 0) + (o.costoEnvio ?? 0)));
  set("ESTADO DESPACHO", o.estado        ?? "Pendiente");
  set("TOTAL UNIDADES",  o.totalUnidades ?? 0);
  set("MES",             o.fecha ? String(o.fecha).slice(0, 7) : "");
  set("MEDIO PAGO",      o.medioPago     ?? "Transferencia");
  (o.items || []).forEach(it => {
    if (it.qty > 0) {
      const col = it.name
        .replace(/^Cápsulas /, "Cap. ").replace(/^Cápsula /,  "Cap. ")
        .replace(/^Extracto /, "Ext. ").replace(/^Gomitas /,  "Gom. ")
        .replace(/^Polvo /,    "Pol. ");
      set(col, it.qty);
    }
  });
  return row;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function getAllOrders() {
  const { hMap } = await getHeaderMap();
  const enc  = encodeURIComponent(`${SHEET_NAME}!A${HEADER_ROW_NUM + 1}:ZZ`);
  const data = await sGet(`/values/${enc}`);
  return (data.values || [])
    .filter(row => {
      const c = getCell(row, hMap, "Nombre Cliente");
      return c && c.trim() !== "";
    })
    .map(row => rowToOrder(row, hMap))
    .filter(o => o.id && o.id.trim() !== "");
}

export async function getNextId() {
  const orders = await getAllOrders();
  if (!orders.length) return 1;
  const max = Math.max(...orders.map(o => parseInt(String(o.id).match(/\d+/)?.[0] || 0, 10)));
  return max + 1;
}

export async function addOrder(order) {
  const { hdr } = await getHeaderMap();
  const values  = orderToValues(order, hdr);
  const range   = `${SHEET_NAME}!A:${colLetter(hdr.length - 1)}`;
  const enc     = encodeURIComponent(range);
  await sPost(`/values/${enc}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { values: [values] });
}

export async function updateOrderStatus(orderId, estado) {
  const { hMap } = await getHeaderMap();
  const orders   = await getAllOrders();
  const idx      = orders.findIndex(o => o.id === orderId);
  if (idx < 0) throw new Error(`Pedido ${orderId} no encontrado`);
  const sheetRow = HEADER_ROW_NUM + 1 + idx;
  const col      = colLetter(hMap["ESTADO DESPACHO"] ?? 0);
  const enc      = encodeURIComponent(`${SHEET_NAME}!${col}${sheetRow}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values: [[estado]] });
}

export async function updateOrder(order) {
  const { hdr, hMap } = await getHeaderMap();
  const orders = await getAllOrders();
  const idx    = orders.findIndex(o => o.id === order.id);
  if (idx < 0) throw new Error(`Pedido ${order.id} no encontrado`);
  const sheetRow = HEADER_ROW_NUM + 1 + idx;
  const lastCol  = colLetter(hdr.length - 1);
  const enc      = encodeURIComponent(`${SHEET_NAME}!A${sheetRow}:${lastCol}${sheetRow}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values: [orderToValues(order, hdr)] });
}

export async function deleteOrder(orderId) {
  const { hdr, hMap } = await getHeaderMap();
  const orders = await getAllOrders();
  const idx    = orders.findIndex(o => o.id === orderId);
  if (idx < 0) throw new Error(`Pedido ${orderId} no encontrado`);
  const sheetRow = HEADER_ROW_NUM + 1 + idx;
  const lastCol  = colLetter(hdr.length - 1);
  const enc      = encodeURIComponent(`${SHEET_NAME}!A${sheetRow}:${lastCol}${sheetRow}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values: [new Array(hdr.length).fill("")] });
}