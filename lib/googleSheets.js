// lib/googleSheets.js
// Compatible con Cloudflare Workers: usa fetch + Web Crypto API
// NO usa google-auth-library ni google-spreadsheet (incompatibles con CF Workers)

import { PRODUCTS } from "./constants.js";
import { normalizePhone } from "./clientIdentity.js";

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

const GOOGLE_SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive";

const _tokens = new Map();

export function sheetsConfigured() {
  const email = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "");
  const key = String(process.env.GOOGLE_PRIVATE_KEY || "");
  const id = String(process.env.GOOGLE_SHEET_ID || "");
  return email.includes("@") && key.includes("BEGIN PRIVATE KEY") && id.length >= 10;
}

export function applySheetCredentials({ email, privateKey, sheetId }) {
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = email;
  process.env.GOOGLE_PRIVATE_KEY = privateKey;
  process.env.GOOGLE_SHEET_ID = sheetId;
  _tokens.clear();
  _hdrCache = null;
  _hdrCacheTime = 0;
  _ventasSheetId = undefined;
  _ventasColCount = 0;
  _moneyFormat = undefined;
}

export async function getAccessToken(options = {}) {
  const scope = options.scope || GOOGLE_SCOPES;
  const subject = options.subject || "";
  const cacheKey = `${scope}|${subject}`;
  const now = Math.floor(Date.now() / 1000);
  const cached = _tokens.get(cacheKey);
  if (cached && now < cached.exp - 60) return cached.token;

  if (!sheetsConfigured()) {
    throw new Error("Google Sheets no está configurado en local");
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const claims = {
    iss:   email,
    scope,
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  };
  if (subject) claims.sub = subject;

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));

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
  if (!data.access_token) {
    const reason = data.error_description || data.error || "sin detalle";
    if (String(data.error) === "unauthorized_client") {
      throw new Error("Falta autorizar la delegación de dominio para Drive. En admin.google.com agrega el ID de cliente de la cuenta de servicio con el alcance https://www.googleapis.com/auth/drive");
    }
    throw new Error(`Auth failed: ${reason}`);
  }
  _tokens.set(cacheKey, { token: data.access_token, exp: now + (data.expires_in || 3600) });
  return data.access_token;
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
async function foldHeader(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function buildHeaderMap(hdr) {
  const hMap = {};
  hdr.forEach((h, i) => {
    if (h == null || String(h).trim() === "") return;
    if (hMap[h] === undefined) hMap[h] = i;
    const folded = foldHeader(h);
    if (folded && hMap[folded] === undefined) hMap[folded] = i;
  });
  return hMap;
}

function colIndex(hMap, name) {
  if (!hMap || name == null) return -1;
  if (hMap[name] !== undefined) return hMap[name];
  const folded = foldHeader(name);
  return hMap[folded] !== undefined ? hMap[folded] : -1;
}

async function getHeaderMap(forceRefresh = false) {
  const now = Date.now();
  const cacheValid = _hdrCache && (now - _hdrCacheTime) < HEADER_CACHE_TTL_MS;

  if (!forceRefresh && cacheValid) return _hdrCache;

  const enc  = encodeURIComponent(`${SHEET_NAME}!A${HEADER_ROW_NUM}:${HEADER_ROW_NUM}`);
  const data = await sGet(`/values/${enc}`);
  const hdr  = data.values?.[0] || [];
  const hMap = buildHeaderMap(hdr);

  _hdrCache     = { hdr, hMap };
  _hdrCacheTime = now;
  return _hdrCache;
}

function getCell(row, hMap, name) {
  const i = colIndex(hMap, name);
  if (i < 0) return "";
  const v = row[i];
  return v === undefined || v === null ? "" : v;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

// Serial de Google Sheets / Excel: días desde 1899-12-30.
function formatSheetDate(val) {
  if (typeof val === "number" && Number.isFinite(val)) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(val) * 86400000;
    const d = new Date(ms);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(val ?? "");
}

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

function rowToOrder(row, hMap, catalog = PRODUCTS) {
  const items = [];
  PRODUCTOS_SHEET.forEach(prod => {
    const qty = parseInt(getCell(row, hMap, prod), 10) || 0;
    if (qty > 0) {
      let searchName = prod
        .replace("Cap. ", "Cápsulas ").replace("Ext. ", "Extracto ")
        .replace("Gom. ", "Gomitas ").replace("Pol. ", "Polvo ");
      if (searchName === "Cápsulas Desincha +") searchName = "Cápsula Desincha +";
      const p = catalog.find(x => x.name === searchName || x.name === prod)
        || PRODUCTS.find(x => x.name === searchName || x.name === prod)
        || {};
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
    fecha:         formatSheetDate(getCell(row, hMap, "Fecha")),
    vendedor:      getCell(row, hMap, "Vendedor"),
    cliente:       getCell(row, hMap, "Nombre Cliente"),
    telefono:      getCell(row, hMap, "Teléfono"),
    email:         getCell(row, hMap, "Email"),
    direccion:     getCell(row, hMap, "Dirección"),
    region:        getCell(row, hMap, "Región"),
    comuna:        getCell(row, hMap, "COMUNA") || "",
    estado:        getCell(row, hMap, "ESTADO DESPACHO") || "",
    medioPago:     getCell(row, hMap, "MEDIO PAGO") || "Transferencia",
    perfilDistribuidor: getCell(row, hMap, "PERFIL DISTRIBUIDOR") || "",
    origenPedido:  getCell(row, hMap, "ORIGEN") || "",
    canalAdquisicion: getCell(row, hMap, "CANAL ADQUISICION") || "",
    nPedidoCliente: getCell(row, hMap, "N° PEDIDO CLIENTE") || "",
    costoEnvio, subtotal, totalPagar, totalUnidades, items, cogs,
    notas: "", timestamp: "",
    comprobante: getCell(row, hMap, "COMPROBANTE"),
  };
}

function finiteNum(val, fallback) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const n = Number(String(val ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function sheetProductColumn(name) {
  return String(name || "")
    .replace(/^Cápsulas /, "Cap. ").replace(/^Cápsula /, "Cap. ")
    .replace(/^Extracto /, "Ext. ").replace(/^Gomitas /, "Gom. ")
    .replace(/^Polvo /, "Pol. ");
}

const MONEY_HEADERS = ["SUBTOTAL PROD.", "COSTO ENVÍO", "TOTAL A PAGAR"];
const FALLBACK_MONEY_FORMAT = { type: "NUMBER", pattern: '"$"#.##0' };

/** Celdas que la app escribe. No arma una fila vacía: no toca ESTADO ni fórmulas ajenas. */
function orderWritePlan(o, hMap) {
  const subtotal = finiteNum(o.subtotal, 0);
  const costoEnvio = finiteNum(o.costoEnvio, 0);
  const totalPagar = finiteNum(o.totalPagar, subtotal + costoEnvio);
  const raw = [];
  const text = [];
  const dates = [];
  const put = (bucket, name, val) => {
    const col = colIndex(hMap, name);
    if (col < 0) return;
    bucket.push({ col, val });
  };

  put(text, "ID Pedido", o.id ?? "");
  if (o.fecha) put(dates, "Fecha", o.fecha);
  put(text, "Vendedor", o.vendedor ?? "");
  put(text, "Nombre Cliente", o.cliente ?? "");
  const phoneNorm = normalizePhone(o.telefono);
  put(text, "Teléfono", phoneNorm || o.telefono || "");
  put(text, "Email", o.email ? String(o.email).trim().toLowerCase() : "");
  put(text, "Dirección", o.direccion ?? "");
  put(text, "Región", o.region ?? "");
  put(text, "COMUNA", o.comuna || "");
  put(raw, "SUBTOTAL PROD.", subtotal);
  put(raw, "COSTO ENVÍO", costoEnvio);
  put(raw, "TOTAL A PAGAR", totalPagar);
  put(raw, "TOTAL UNIDADES", finiteNum(o.totalUnidades, 0));
  put(text, "MES", o.fecha ? String(o.fecha).slice(0, 7) : "");
  put(text, "MEDIO PAGO", o.medioPago ?? "Transferencia");
  if (o.comprobante) put(text, "COMPROBANTE", o.comprobante);
  put(text, "PERFIL DISTRIBUIDOR", o.perfilDistribuidor || "");
  put(text, "ORIGEN", o.origenPedido || "");
  put(text, "CANAL ADQUISICION", o.origenPedido === "Lead nuevo" ? (o.canalAdquisicion || "") : "");
  put(text, "N° PEDIDO CLIENTE", o.origenPedido === "Cliente antiguo" ? (o.nPedidoCliente || "") : "");

  (o.items || []).forEach(it => {
    const qty = Number(it.qty) || 0;
    if (qty <= 0) return;
    put(raw, sheetProductColumn(it.name), qty);
  });

  return { raw, text, dates };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function getAllOrders() {
  // Lectura: usa caché con TTL corto (30s está bien para leer)
  const [{ hMap }, catalog] = await Promise.all([getHeaderMap(false), getProducts()]);
  const enc  = encodeURIComponent(`${SHEET_NAME}!A${HEADER_ROW_NUM + 1}:ZZ`);
  // UNFORMATTED_VALUE: algunas celdas de COSTO ENVÍO quedaron con formato fecha.
  // El valor formateado de 3500 es "1909-07-31" y el de 6000 es "1916-06-04";
  // parseNum se quedaba con el año. El número real sigue siendo 3500 o 6000.
  // Las fechas llegan como serial y se convierten en formatSheetDate.
  const data = await sGet(`/values/${enc}?valueRenderOption=UNFORMATTED_VALUE`);
  const prices = catalog?.length ? catalog : PRODUCTS;
  return (data.values || [])
    .filter(row => {
      const c = getCell(row, hMap, "Nombre Cliente");
      return c && c.trim() !== "";
    })
    .map(row => rowToOrder(row, hMap, prices))
    .filter(o => o.id && o.id.trim() !== "");
}

function orderNum(id) {
  const n = parseInt(String(id ?? "").match(/\d+/)?.[0] || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

function formatOrderId(n) {
  return `PED-${String(n).padStart(3, "0")}`;
}

/** Último pedido real (tiene ID y cliente) y la fila siguiente para escribir. */
async function readOrderSlots(hMap) {
  const idCol     = colIndex(hMap, "ID Pedido");
  const clientCol = colIndex(hMap, "Nombre Cliente");
  if (idCol < 0 || clientCol < 0) throw new Error("No están las columnas ID Pedido o Nombre Cliente");
  const end       = colLetter(Math.max(idCol, clientCol));
  const enc       = encodeURIComponent(`${SHEET_NAME}!A${HEADER_ROW_NUM + 1}:${end}`);
  const data      = await sGet(`/values/${enc}`);
  const rows      = data.values || [];
  let max = 0;
  let lastReal = -1;
  rows.forEach((row, i) => {
    const id     = String(row?.[idCol] || "").trim();
    const client = String(row?.[clientCol] || "").trim();
    if (!id || !client) return;
    lastReal = i;
    max = Math.max(max, orderNum(id));
  });
  return {
    nextNum: max + 1,
    nextRow: HEADER_ROW_NUM + 1 + lastReal + 1,
  };
}

async function sheetRowForId(orderId, hMap) {
  const idCol = colIndex(hMap, "ID Pedido");
  if (idCol < 0) throw new Error("No está la columna ID Pedido");
  const col   = colLetter(idCol);
  const enc   = encodeURIComponent(`${SHEET_NAME}!${col}${HEADER_ROW_NUM + 1}:${col}`);
  const data  = await sGet(`/values/${enc}`);
  const rows  = data.values || [];
  const idx   = rows.findIndex(r => String(r?.[0] || "").trim() === String(orderId).trim());
  return idx < 0 ? -1 : HEADER_ROW_NUM + 1 + idx;
}

async function ensureHeaderColumns(hdr, names) {
  const missing = names.filter(n => colIndex(buildHeaderMap(hdr), n) < 0);
  if (!missing.length) return hdr;
  const start = hdr.length;
  const startCol = colLetter(start);
  const endCol = colLetter(start + missing.length - 1);
  const enc = encodeURIComponent(`${SHEET_NAME}!${startCol}${HEADER_ROW_NUM}:${endCol}${HEADER_ROW_NUM}`);
  await sPut(`/values/${enc}?valueInputOption=RAW`, { values: [missing] });
  const next = [...hdr, ...missing];
  const hMap = buildHeaderMap(next);
  _hdrCache     = { hdr: next, hMap };
  _hdrCacheTime = Date.now();
  return next;
}

async function ensureOrderColumns(hdr) {
  return ensureHeaderColumns(hdr, [
    "COMPROBANTE",
    "PERFIL DISTRIBUIDOR",
    "ORIGEN",
    "CANAL ADQUISICION",
    "N° PEDIDO CLIENTE",
    "COMUNA",
  ]);
}

export async function getNextId() {
  const { hMap } = await getHeaderMap(false);
  const { nextNum } = await readOrderSlots(hMap);
  return nextNum;
}

async function putCells(row, cells, valueInputOption) {
  if (!cells.length) return;
  await sPost("/values:batchUpdate", {
    valueInputOption,
    data: cells.map(c => ({
      range: `${SHEET_NAME}!${colLetter(c.col)}${row}`,
      values: [[c.val]],
    })),
  });
}

let _ventasSheetId;
let _ventasColCount = 0;
async function ventasSheetMeta() {
  if (_ventasSheetId != null) return { sheetId: _ventasSheetId, colCount: _ventasColCount };
  const meta = await sGet("?fields=sheets.properties");
  const sheet = (meta.sheets || []).find(s => s.properties?.title === SHEET_NAME);
  _ventasSheetId = sheet?.properties?.sheetId ?? null;
  _ventasColCount = sheet?.properties?.gridProperties?.columnCount || 60;
  return { sheetId: _ventasSheetId, colCount: _ventasColCount };
}
async function ventasSheetId() {
  return (await ventasSheetMeta()).sheetId;
}

let _moneyFormat;
async function referenceMoneyFormat(hMap) {
  if (_moneyFormat) return _moneyFormat;
  const col = colIndex(hMap, "COSTO ENVÍO");
  if (col < 0) return FALLBACK_MONEY_FORMAT;
  const letter = colLetter(col);
  const range = encodeURIComponent(`${SHEET_NAME}!${letter}${HEADER_ROW_NUM + 1}:${letter}`);
  const meta = await sGet(`?ranges=${range}&includeGridData=true&fields=sheets.data.rowData.values.userEnteredFormat.numberFormat`);
  const rows = meta.sheets?.[0]?.data?.[0]?.rowData || [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const fmt = rows[i]?.values?.[0]?.userEnteredFormat?.numberFormat;
    if (!fmt?.type) continue;
    if (fmt.type === "DATE" || fmt.type === "DATE_TIME" || fmt.type === "TIME") continue;
    if (fmt.type === "NUMBER" || fmt.type === "CURRENCY") {
      _moneyFormat = { type: fmt.type, pattern: fmt.pattern || FALLBACK_MONEY_FORMAT.pattern };
      return _moneyFormat;
    }
  }
  _moneyFormat = FALLBACK_MONEY_FORMAT;
  return _moneyFormat;
}

const ROW_GREEN = { red: 0.94509804, green: 0.972549, blue: 0.9137255 };
const TOTAL_GREEN = { red: 0.105882354, green: 0.36862746, blue: 0.1254902 };
const WHITE = { red: 1, green: 1, blue: 1 };

async function applyMoneyFormat(sheetRow, hMap) {
  const sheetId = await ventasSheetId();
  if (sheetId == null) return;
  const format = await referenceMoneyFormat(hMap);
  const requests = MONEY_HEADERS.map(name => {
    const col = colIndex(hMap, name);
    if (col < 0) return null;
    const isTotal = name === "TOTAL A PAGAR";
    const userEnteredFormat = { numberFormat: format, backgroundColor: isTotal ? TOTAL_GREEN : ROW_GREEN };
    let fields = "userEnteredFormat.numberFormat,userEnteredFormat.backgroundColor";
    if (isTotal) {
      userEnteredFormat.textFormat = { foregroundColor: WHITE, bold: true };
      fields += ",userEnteredFormat.textFormat.foregroundColor,userEnteredFormat.textFormat.bold";
    }
    return {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: sheetRow - 1,
          endRowIndex: sheetRow,
          startColumnIndex: col,
          endColumnIndex: col + 1,
        },
        cell: { userEnteredFormat },
        fields,
      },
    };
  }).filter(Boolean);
  if (!requests.length) return;
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Sheets format ${res.status}: ${await res.text()}`);
}

function hasFill(color) {
  if (!color) return false;
  return (color.red || 0) + (color.green || 0) + (color.blue || 0) > 0;
}

/** Última fila de arriba que sí tiene el fondo verde del total. */
async function styledTemplateRow(beforeRow, hMap) {
  const col = colIndex(hMap, "TOTAL A PAGAR");
  const end = beforeRow - 1;
  if (col < 0 || end < HEADER_ROW_NUM + 1) return 0;
  const start = Math.max(HEADER_ROW_NUM + 1, end - 40);
  const range = encodeURIComponent(`${SHEET_NAME}!${colLetter(col)}${start}:${colLetter(col)}${end}`);
  const meta = await sGet(`?ranges=${range}&includeGridData=true&fields=sheets.data.rowData.values.userEnteredFormat.backgroundColor`);
  const rows = meta.sheets?.[0]?.data?.[0]?.rowData || [];
  for (let i = rows.length - 1; i >= 0; i--) {
    if (hasFill(rows[i]?.values?.[0]?.userEnteredFormat?.backgroundColor)) return start + i;
  }
  return 0;
}

async function copyRowFormat(fromRow, toRow, colCount) {
  if (!fromRow || fromRow < HEADER_ROW_NUM + 1 || fromRow === toRow || colCount < 1) return;
  const sheetId = await ventasSheetId();
  if (sheetId == null) return;
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        copyPaste: {
          source: {
            sheetId,
            startRowIndex: fromRow - 1,
            endRowIndex: fromRow,
            startColumnIndex: 0,
            endColumnIndex: colCount,
          },
          destination: {
            sheetId,
            startRowIndex: toRow - 1,
            endRowIndex: toRow,
            startColumnIndex: 0,
            endColumnIndex: colCount,
          },
          pasteType: "PASTE_FORMAT",
        },
      }],
    }),
  });
  if (!res.ok) throw new Error(`Sheets copy format ${res.status}: ${await res.text()}`);
}

async function writeOrderRow(sheetRow, order, hMap, { templateRow = 0, colCount = 0 } = {}) {
  const plan = orderWritePlan(order, hMap);
  await putCells(sheetRow, plan.raw, "RAW");
  await putCells(sheetRow, plan.text, "RAW");
  await putCells(sheetRow, plan.dates, "USER_ENTERED");
  if (templateRow) {
    try {
      await copyRowFormat(templateRow, sheetRow, colCount);
    } catch (err) {
      console.error("[sheets] no se copió el formato de la fila", err?.message || err);
    }
  }
  await applyMoneyFormat(sheetRow, hMap);
}

export async function addOrder(order) {
  // Escribe celda por celda. No usa append ni una fila llena de vacíos:
  // eso corría columnas y borraba formato, fórmulas y el total.
  const { hdr, hMap } = await getHeaderMap(true);
  const headers = await ensureOrderColumns(hdr);
  const map = buildHeaderMap(headers);
  const slot = await readOrderSlots(map);
  const id = formatOrderId(slot.nextNum);
  const templateRow = await styledTemplateRow(slot.nextRow, map);
  const { colCount } = await ventasSheetMeta();
  await writeOrderRow(slot.nextRow, { ...order, id }, map, {
    templateRow,
    colCount: Math.max(headers.length, colCount),
  });
  return {
    id,
    row: slot.nextRow,
    comprobanteCol: colIndex(map, "COMPROBANTE"),
  };
}

export async function setOrderComprobante(row, colIndex, url) {
  if (colIndex < 0 || !row) return;
  const enc = encodeURIComponent(`${SHEET_NAME}!${colLetter(colIndex)}${row}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values: [[url]] });
}

export async function updateOrderStatus(orderId, estado) {
  const { hMap } = await getHeaderMap(true);
  const sheetRow = await sheetRowForId(orderId, hMap);
  if (sheetRow < 0) throw new Error(`Pedido ${orderId} no encontrado`);
  const colIdx = colIndex(hMap, "ESTADO DESPACHO");
  if (colIdx < 0) throw new Error("No está la columna ESTADO DESPACHO");
  const enc = encodeURIComponent(`${SHEET_NAME}!${colLetter(colIdx)}${sheetRow}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values: [[estado]] });
}

export async function updateOrder(order) {
  const { hdr, hMap } = await getHeaderMap(true);
  const headers = await ensureOrderColumns(hdr);
  const map = buildHeaderMap(headers);
  const sheetRow = await sheetRowForId(order.id, map);
  if (sheetRow < 0) throw new Error(`Pedido ${order.id} no encontrado`);
  await writeOrderRow(sheetRow, order, map);
}

export async function deleteOrder(orderId) {
  const { hdr, hMap } = await getHeaderMap(true);
  const sheetRow = await sheetRowForId(orderId, hMap);
  if (sheetRow < 0) throw new Error(`Pedido ${orderId} no encontrado`);
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
// ─── Productos / Catálogo ─────────────────────────────────────────────────────
// Se almacenan en una hoja llamada "PRODUCTOS" con columnas: SKU | Nombre | Precio | Costo | Activo
// Si la hoja no existe o está vacía, se usan los valores de constants.js como fallback.

const PRODUCTS_SHEET = "PRODUCTOS";

export async function getProducts() {
  try {
    const enc  = encodeURIComponent(`${PRODUCTS_SHEET}!A2:E200`);
    const data = await sGet(`/values/${enc}`);
    const rows = data.values || [];
    if (!rows.length) return null; // hoja vacía → usar fallback
    return rows
      .filter(r => r[0] && r[0].trim())
      .map(r => ({
        id:     r[0].trim(),
        name:   r[1]?.trim() || "",
        precio: parseInt(r[2]) || 0,
        costo:  parseInt(r[3]) || 0,
        active: r[4] !== "false" && r[4] !== "0",
      }));
  } catch {
    return null; // hoja no existe todavía → usar fallback
  }
}

async function ensureProductsSheet() {
  try {
    const meta   = await sGet("");
    const sheets = meta.sheets || [];
    const exists = sheets.some(s => s.properties?.title === PRODUCTS_SHEET);
    if (!exists) {
      const token = await getAccessToken();
      await fetch(`${baseUrl()}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: PRODUCTS_SHEET } } }],
        }),
      });
    }
  } catch {
    // Si falla la comprobación, intentamos escribir igual
  }
}

export async function saveProducts(products) {
  await ensureProductsSheet();
  const values = [
    ["SKU", "Nombre", "Precio B2B", "Costo Neto", "Activo"],
    ...products.map(p => [p.id, p.name, p.precio, p.costo, p.active ? "true" : "false"]),
  ];
  const enc = encodeURIComponent(`${PRODUCTS_SHEET}!A1:E${values.length}`);
  await sPut(`/values/${enc}?valueInputOption=USER_ENTERED`, { values });
}