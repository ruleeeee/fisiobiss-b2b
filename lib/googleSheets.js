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

// ─── Headers — caché con TTL corto para lecturas ──────────────────────────────
// FIX: Reemplaza el caché infinito anterior (_hdr / _hMap que nunca expiraban)
// por un caché con TTL de 30s para lecturas, y fetch SIEMPRE FRESCO en escrituras.
// Esto evita que el mapa de columnas quede obsoleto cuando otro usuario tiene el
// sheet abierto y modifica (o simplemente toca) las columnas.

let _hdrCache     = null;  // { hdr, hMap }
let _hdrCacheTime = 0;
const HEADER_CACHE_TTL_MS = 30_000; // 30 segundos — solo para lecturas

/**
 * Obtiene el mapa de headers del sheet.
 * @param {boolean} forceRefresh — true en TODA operación de escritura para
 *   garantizar que el mapa de columnas esté actualizado sin importar qué
 *   usuario tenga el sheet abierto en ese momento.
 */
async function getHeaderMap(forceRefresh = false) {
  const now = Date.now();
  const cacheValid = _hdrCache && (now - _hdrCacheTime) < HEADER_CACHE_TTL_MS;

  if (!forceRefresh && cacheValid) return _hdrCache;

  const enc  = encodeURIComponent(`${SHEET_NAME}!A${HEADER_ROW_NUM}:${HEADER_ROW_NUM}`);
  const data = await sGet(`/values/${enc}`);
  const hdr  = data.values?.[0] || [];
  const hMap = {};
  hdr.forEach((h, i) => { hMap[h] = i; });

  _hdrCache     = { hdr, hMap };
  _hdrCacheTime = now;
  return _hdrCache;
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
  const cleaned = s.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return 0;
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
  // Lectura: usa caché con TTL corto (30s está bien para leer)
  const { hMap } = await getHeaderMap(false);
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
  // FIX: forceRefresh=true → siempre lee los headers reales del sheet antes de
  // escribir, ignorando cualquier caché. Esto garantiza que los datos se escriban
  // en las columnas correctas sin importar qué cuenta tenga el sheet abierto.
  const { hdr } = await getHeaderMap(true);
  const values  = orderToValues(order, hdr);
  const range   = `${SHEET_NAME}!A:${colLetter(hdr.length - 1)}`;
  const enc     = encodeURIComponent(range);
  await sPost(`/values/${enc}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { values: [values] });
}

export async function updateOrderStatus(orderId, estado) {
  // FIX: forceRefresh=true — misma razón que addOrder
  const { hMap } = await getHeaderMap(true);
  const orders   = await getAllOrders();
  const idx      = orders.findIndex(o => o.id === orderId);
  if (idx < 0) throw new Error(`Pedido ${orderId} no encontrado`);
  const sheetRow = HEADER_ROW_NUM + 1 + idx;
  const col      = colLetter(hMap["ESTADO DESPACHO"] ?? 0);
  const enc      = encodeURIComponent(`${SHEET_NAME}!${col}${sheetRow}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values: [[estado]] });
}

export async function updateOrder(order) {
  // FIX: forceRefresh=true — misma razón que addOrder
  const { hdr, hMap } = await getHeaderMap(true);
  const orders = await getAllOrders();
  const idx    = orders.findIndex(o => o.id === order.id);
  if (idx < 0) throw new Error(`Pedido ${order.id} no encontrado`);
  const sheetRow = HEADER_ROW_NUM + 1 + idx;
  const lastCol  = colLetter(hdr.length - 1);
  const enc      = encodeURIComponent(`${SHEET_NAME}!A${sheetRow}:${lastCol}${sheetRow}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values: [orderToValues(order, hdr)] });
}

export async function deleteOrder(orderId) {
  // FIX: forceRefresh=true — misma razón que addOrder
  const { hdr, hMap } = await getHeaderMap(true);
  const orders = await getAllOrders();
  const idx    = orders.findIndex(o => o.id === orderId);
  if (idx < 0) throw new Error(`Pedido ${orderId} no encontrado`);
  const sheetRow = HEADER_ROW_NUM + 1 + idx;
  const lastCol  = colLetter(hdr.length - 1);
  const enc      = encodeURIComponent(`${SHEET_NAME}!A${sheetRow}:${lastCol}${sheetRow}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values: [new Array(hdr.length).fill("")] });
}
// ─── Regiones / Costos de Envío ───────────────────────────────────────────────
// Se almacenan en una hoja llamada "REGIONES" con columnas: Región | Costo
// Si la hoja no existe o está vacía, se usan los valores de constants.js como fallback.

const REGIONS_SHEET = "REGIONES";

export async function getRegions() {
  try {
    const enc  = encodeURIComponent(`${REGIONS_SHEET}!A2:B50`);
    const data = await sGet(`/values/${enc}`);
    const rows = data.values || [];
    if (!rows.length) return null; // hoja vacía → usar fallback
    return rows
      .filter(r => r[0] && r[0].trim())
      .map(r => ({ name: r[0].trim(), envio: parseInt(r[1]) || 0 }));
  } catch {
    return null; // hoja no existe todavía → usar fallback
  }
}

async function ensureRegionsSheet() {
  // Verifica si la hoja REGIONES existe; si no, la crea.
  try {
    const meta = await sGet("");          // GET spreadsheet metadata
    const sheets = meta.sheets || [];
    const exists = sheets.some(s => s.properties?.title === REGIONS_SHEET);
    if (!exists) {
      const token = await getAccessToken();
      await fetch(`${baseUrl()}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: REGIONS_SHEET } } }],
        }),
      });
    }
  } catch {
    // Si falla la comprobación, intentamos escribir igual
  }
}

export async function saveRegions(regions) {
  await ensureRegionsSheet();
  // Escribe encabezado + filas. Siempre sobreescribe desde A1.
  const values = [
    ["Región", "Costo"],
    ...regions.map(r => [r.name, r.envio]),
  ];
  const enc = encodeURIComponent(`${REGIONS_SHEET}!A1:B${values.length}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values });
}