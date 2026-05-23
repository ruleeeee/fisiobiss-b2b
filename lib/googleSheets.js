// lib/googleSheets.js
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { PRODUCTS } from "./constants";

const SHEET_ORDERS = "BD_VENTAS";

// Nombres exactos de las columnas (Corregido PolvoHidromaqui)
const PRODUCTOS_SHEET = [
  "Cap. Melena de León", "Cap. Omega 3", "Cap. Magnesio", "Cap. Mix Fungi", "Cap. Ashwagandha",
  "Ext. Melena de León", "Ext. Reishi", "Ext. Cola de Pavo", "Ext. Cordyceps", "Cafe Melena",
  "Pol. Melena", "Pol. Mix 7 Hongos", "Creatina", "Exploradores", "Cap. Desincha +", "PolvoHidromaqui",
  "Descansa +", "Gom. Melena de León", "Gom. Reishi", "Gom. Ashwagandha",
  "Gom. Cola de Pavo", "Libera +", "Gudly Not Stress", "Gudly Microbiota Balance", 
  "Nuevo SKU 01", "Nuevo SKU 02", "Nuevo SKU 03", "Nuevo SKU 04", "Nuevo SKU 05", "Nuevo SKU 06"
];

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

async function getOrdersSheet(doc) {
  let sheet = doc.sheetsByTitle[SHEET_ORDERS];
  if (!sheet) throw new Error("No se encontró la pestaña BD_VENTAS en el Google Sheet.");
  await sheet.loadHeaderRow(3);
  return sheet;
}

function parseNumber(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;
  const cleanStr = String(val).replace(/[\$\s\.]/g, '').replace(',', '.');
  return parseFloat(cleanStr) || 0;
}

function orderToRow(o) {
  const row = {
    "Fecha":          o.fecha       ?? "",
    "Vendedor":       o.vendedor    ?? "",
    "Nombre Cliente": o.cliente     ?? "",
    "Teléfono":       o.telefono    ?? "",
    "Email":          o.email       ?? "",
    "Dirección":      o.direccion   ?? "",
    "Región":         o.region      ?? "",
    "SUBTOTAL PROD.": o.subtotal    ?? 0,
    "COSTO ENVÍO":    o.costoEnvio  ?? 0,
    "TOTAL A PAGAR":  o.totalPagar  ?? 0,
    "ESTADO DESPACHO":o.estado      ?? "Pendiente",
    "TOTAL UNIDADES": o.totalUnidades ?? 0,
    "MES":            (o.fecha ?? "").slice(0, 7),
    "MEDIO PAGO":     o.medioPago   ?? "Transferencia"
  };

  if (o.items && Array.isArray(o.items)) {
    o.items.forEach(it => {
      if (it.qty > 0) row[it.name] = it.qty;
    });
  }
  return row;
}

function rowToOrder(row) {
  let items = [];
  PRODUCTOS_SHEET.forEach(prod => {
    const val = row.get(prod);
    const qty = parseInt(val, 10) || 0;
    
    if (qty > 0) {
      let searchName = prod
        .replace("Cap. ", "Cápsulas ")
        .replace("Ext. ", "Extracto ")
        .replace("Gom. ", "Gomitas ")
        .replace("Pol. ", "Polvo ");
      if (searchName === "Cápsulas Desincha +") searchName = "Cápsula Desincha +";
      
      const prodData = PRODUCTS.find(p => p.name === searchName || p.name === prod) || {};
      
      items.push({ 
        id: prodData.id || prod,
        name: prod, 
        qty: qty,
        precio: prodData.precio || 0,
        costo: prodData.costo || 0,
        regalo: 0
      });
    }
  });

  return {
    id:             row.get("ID Pedido")        ?? "",
    fecha:          row.get("Fecha")         ?? "",
    vendedor:       row.get("Vendedor")      ?? "",
    cliente:        row.get("Nombre Cliente")       ?? "",
    telefono:       row.get("Teléfono")      ?? "",
    email:          row.get("Email")         ?? "",
    direccion:      row.get("Dirección")     ?? "",
    region:         row.get("Región")        ?? "",
    estado:         row.get("ESTADO DESPACHO")        ?? "Pendiente",
    medioPago:      row.get("MEDIO PAGO")     ?? "Transferencia",
    subtotal:       parseNumber(row.get("SUBTOTAL PROD.")),
    costoEnvio:     parseNumber(row.get("COSTO ENVÍO")),
    totalPagar:     parseNumber(row.get("TOTAL A PAGAR")),
    totalUnidades:  parseInt(row.get("TOTAL UNIDADES"), 10) || 0,
    items,          
    cogs:           0, 
    notas:          "",
    timestamp:      "",
  };
}

export async function getAllOrders() {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  return rows
    .filter(r => r.get("Nombre Cliente") && r.get("Nombre Cliente").trim() !== "")
    .map(rowToOrder);
}

export async function addOrder(order) {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  const mapped = orderToRow(order);
  const emptyRow = rows.find(r => !r.get("Nombre Cliente") || r.get("Nombre Cliente").trim() === "");
  if (emptyRow) {
    Object.entries(mapped).forEach(([key, val]) => {
      if (val !== undefined && val !== null) emptyRow.set(key, val);
    });
    await emptyRow.save();
  } else {
    await sheet.addRow(mapped);
  }
}

export async function updateOrderStatus(orderId, estado) {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get("ID Pedido") === orderId);
  if (!row) throw new Error(`Pedido ${orderId} no encontrado`);
  row.set("ESTADO DESPACHO", estado);
  await row.save();
}

export async function updateOrder(order) {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get("ID Pedido") === order.id);
  if (!row) throw new Error(`Pedido ${order.id} no encontrado`);
  const mapped = orderToRow(order);
  Object.entries(mapped).forEach(([key, val]) => {
     if (val !== undefined && val !== null) row.set(key, val);
  });
  await row.save();
}

export async function deleteOrder(orderId) {
  const doc = await getDoc();
  const sheet = await getOrdersSheet(doc);
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get("ID Pedido") === orderId);
  if (!row) throw new Error(`Pedido ${orderId} no encontrado`);
  await row.delete();
}

export async function getNextId() {
  try {
    const doc = await getDoc();
    const sheet = await getOrdersSheet(doc);
    const rows = await sheet.getRows();
    let maxId = 0;
    for (const row of rows) {
      const pedId = row.get("ID Pedido");
      if (pedId && String(pedId).includes("PED-")) {
        const match = String(pedId).match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxId) maxId = num;
        }
      }
    }
    return maxId + 1;
  } catch (error) {
    console.error("Error obteniendo nextId:", error);
    return 1;
  }
}