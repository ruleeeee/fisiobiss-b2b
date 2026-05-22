// lib/googleSheets.js
// ─────────────────────────────────────────────────────────────────
// Capa de acceso a Google Sheets — solo se ejecuta en el servidor
// (Next.js API Routes). Nunca se importa en componentes cliente.
// ─────────────────────────────────────────────────────────────────
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// Nombre de las hojas en el Google Sheet
const SHEET_ORDERS = "BD_VENTAS";
const SHEET_CONFIG = "CONFIG";

// Columnas en BD_VENTAS (orden fijo — debe coincidir con el Sheet)
const HEADERS = [
  "PED_ID", "Fecha", "Vendedor", "Cliente", "Telefono", "Email",
  "Direccion", "Region", "Estado", "MedioPago",
  "Subtotal", "CostoEnvio", "TotalPagar", "TotalUnidades", "COGS",
  "Mes", "Items", "Notas", "Timestamp",
];

// ── AUTH & DOCUMENT ──────────────────────────────────────────────
function createAuth() {
  return new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getDoc() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, createAuth());
  await doc.loadInfo();
  return doc;
}

// ── SHEET HELPERS ────────────────────────────────────────────────

/** Obtiene (o crea) la hoja BD_VENTAS con los headers correctos */
async function getOrdersSheet(doc) {
  let sheet = doc.sheetsByTitle[SHEET_ORDERS];
  if (!sheet) {
    sheet = await doc.addSheet({ title: SHEET_ORDERS, headerValues: HEADERS });
    // Formato del header
    await sheet.loadCells("A1:S1");
    HEADERS.forEach((_, i) => {
      const cell = sheet.getCell(0, i);
      cell.backgroundColor = { red: 0.106, green: 0.369, blue: 0.125 };
      cell.textFormat = { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } };
    });
    await sheet.saveUpdatedCells();
  }
  return sheet;
}

/** Obtiene (o crea) la hoja CONFIG */
async function getConfigSheet(doc) {
  let sheet = doc.sheetsByTitle[SHEET_CONFIG];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: SHEET_CONFIG,
      headerValues: ["Key", "Value"],
    });
    // Valor inicial
    await sheet.addRow({ Key: "nextId", Value: "1" });
  }
  return sheet;
}

// ── MAPPERS ──────────────────────────────────────────────────────

/** Convierte un objeto order → fila plana para el Sheet */
function orderToRow(o) {
  return {
    PED_ID:       o.id          ?? "",
    Fecha:        o.fecha       ?? "",
    Vendedor:     o.vendedor    ?? "",
    Cliente:      o.cliente     ?? "",
    Telefono:     o.telefono    ?? "",
    Email:        o.email       ?? "",
    Direccion:    o.direccion   ?? "",
    Region:       o.region      ?? "",
    Estado:       o.estado      ?? "Pendiente",
    MedioPago:    o.medioPago   ?? "Transferencia",
    Subtotal:     o.subtotal    ?? 0,
    CostoEnvio:   o.costoEnvio  ?? 0,
    TotalPagar:   o.totalPagar  ?? 0,
    TotalUnidades: o.totalUnidades ?? 0,
    COGS:         o.cogs        ?? 0,
    Mes:          (o.fecha ?? "").slice(0, 7),
    Items:        JSON.stringify(o.items ?? []),
    Notas:        o.notas       ?? "",
    Timestamp:    o.timestamp   ?? new Date().toISOString(),
  };
}

/** Convierte una fila del Sheet → objeto order para el cliente */
function rowToOrder(row) {
  let items = [];
  try { items = JSON.parse(row.get("Items") || "[]"); } catch { /* skip */ }
  return {
    id:             row.get("PED_ID")        ?? "",
    fecha:          row.get("Fecha")         ?? "",
    vendedor:       row.get("Vendedor")      ?? "",
    cliente:        row.get("Cliente")       ?? "",
    telefono:       row.get("Telefono")      ?? "",
    email:          row.get("Email")         ?? "",
    direccion:      row.get("Direccion")     ?? "",
    region:         row.get("Region")        ?? "",
    estado:         row.get("Estado")        ?? "Pendiente",
    medioPago:      row.get("MedioPago")     ?? "Transferencia",
    subtotal:       parseFloat(row.get("Subtotal"))       || 0,
    costoEnvio:     parseFloat(row.get("CostoEnvio"))     || 0,
    totalPagar:     parseFloat(row.get("TotalPagar"))     || 0,
    totalUnidades:  parseInt(row.get("TotalUnidades"))    || 0,
    cogs:           parseFloat(row.get("COGS"))           || 0,
    items,
    notas:          row.get("Notas")        ?? "",
    timestamp:      row.get("Timestamp")    ?? "",
  };
}

// ── CRUD OPERATIONS ──────────────────────────────────────────────

/** Lee todos los pedidos del Sheet */
export async function getAllOrders() {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  return rows
    .filter(r => r.get("PED_ID"))   // omite filas vacías
    .map(rowToOrder);
}

/** Agrega un nuevo pedido */
export async function addOrder(order) {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  await sheet.addRow(orderToRow(order));
  // Incrementa nextId en CONFIG
  await incrementNextId(doc, order.id);
}

/** Actualiza solo el estado de un pedido */
export async function updateOrderStatus(orderId, estado) {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get("PED_ID") === orderId);
  if (!row) throw new Error(`Pedido ${orderId} no encontrado`);
  row.set("Estado", estado);
  await row.save();
}

/** Actualiza un pedido completo */
export async function updateOrder(order) {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get("PED_ID") === order.id);
  if (!row) throw new Error(`Pedido ${order.id} no encontrado`);
  const mapped = orderToRow(order);
  Object.entries(mapped).forEach(([key, val]) => row.set(key, val));
  await row.save();
}

/** Elimina un pedido */
export async function deleteOrder(orderId) {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get("PED_ID") === orderId);
  if (!row) throw new Error(`Pedido ${orderId} no encontrado`);
  await row.delete();
}

// ── CONFIG (nextId) ──────────────────────────────────────────────

export async function getNextId() {
  try {
    const doc = await getDoc();
    const sheet = await getConfigSheet(doc);
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get("Key") === "nextId");
    return row ? parseInt(row.get("Value")) || 1 : 1;
  } catch {
    return 1;
  }
}

async function incrementNextId(doc, lastOrderId) {
  const sheet = await getConfigSheet(doc);
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get("Key") === "nextId");
  const current = row ? parseInt(row.get("Value")) || 1 : 1;
  const fromOrder = parseInt((lastOrderId ?? "").replace("PED-", "")) || 0;
  const newVal = Math.max(current, fromOrder + 1);
  if (row) {
    row.set("Value", String(newVal));
    await row.save();
  } else {
    await sheet.addRow({ Key: "nextId", Value: String(newVal) });
  }
}

// ── SEED (carga masiva) ──────────────────────────────────────────

/**
 * Borra todo y carga los pedidos históricos de una vez.
 * Se llama una sola vez desde /api/orders/seed.
 */
export async function seedOrders(orders) {
  const doc = await getDoc();

  // Borra la hoja existente y la recrea con headers
  const existing = doc.sheetsByTitle[SHEET_ORDERS];
  if (existing) await existing.delete();
  const sheet = await doc.addSheet({ title: SHEET_ORDERS, headerValues: HEADERS });

  // Escribe en lotes de 200 filas (límite Google Sheets API)
  const CHUNK = 200;
  for (let i = 0; i < orders.length; i += CHUNK) {
    const rows = orders.slice(i, i + CHUNK).map(orderToRow);
    await sheet.addRows(rows);
  }

  // Actualiza nextId
  const maxNum = orders.reduce((max, o) => {
    const n = parseInt((o.id ?? "").replace("PED-", "")) || 0;
    return Math.max(max, n);
  }, 0);
  const configSheet = await getConfigSheet(doc);
  const rows = await configSheet.getRows();
  const cfgRow = rows.find(r => r.get("Key") === "nextId");
  if (cfgRow) { cfgRow.set("Value", String(maxNum + 1)); await cfgRow.save(); }
  else await configSheet.addRow({ Key: "nextId", Value: String(maxNum + 1) });

  return orders.length;
}
