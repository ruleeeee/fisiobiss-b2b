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
    "ID Pedido":      o.id          ?? "",   // ← FIX: siempre escribir el ID
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
      if (it.qty > 0) {
        // Convertir nombre completo → nombre abreviado de columna en el sheet
        // Ej: "Cápsulas Melena de León" → "Cap. Melena de León"
        const colName = it.name
          .replace(/^Cápsulas /, "Cap. ")
          .replace(/^Cápsula /,  "Cap. ")
          .replace(/^Extracto /, "Ext. ")
          .replace(/^Gomitas /,  "Gom. ")
          .replace(/^Polvo /,    "Pol. ");
        row[colName] = it.qty;
      }
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
 
  // Recalcular totales desde los items en tiempo real:
  // así cualquier cambio de cantidad en el sheet se refleja correctamente.
  const costoEnvio    = parseNumber(row.get("COSTO ENVÍO"));
  const subtotal      = items.reduce((s, it) => s + it.qty * it.precio, 0);
  const totalPagar    = subtotal + costoEnvio;
  const totalUnidades = items.reduce((s, it) => s + it.qty + (it.regalo || 0), 0);
  const cogs          = items.reduce((s, it) => s + it.qty * (it.costo || 0), 0);
 
  return {
    id:            row.get("ID Pedido")        ?? "",
    fecha:         row.get("Fecha")            ?? "",
    vendedor:      row.get("Vendedor")         ?? "",
    cliente:       row.get("Nombre Cliente")   ?? "",
    telefono:      row.get("Teléfono")         ?? "",
    email:         row.get("Email")            ?? "",
    direccion:     row.get("Dirección")        ?? "",
    region:        row.get("Región")           ?? "",
    estado:        row.get("ESTADO DESPACHO")  ?? "Pendiente",
    medioPago:     row.get("MEDIO PAGO")       ?? "Transferencia",
    costoEnvio,
    subtotal,
    totalPagar,
    totalUnidades,
    items,
    cogs,
    notas:     "",
    timestamp: "",
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
 
// Copia el formato de la última fila de datos a la recién agregada,
// para que los nuevos pedidos mantengan los estilos del sheet.
async function copyLastRowFormat(auth, spreadsheetId, sheetId, dataRowCountBeforeAdd) {
  try {
    // Los headers están en la fila 3 (1-indexed) = índice 2 (0-indexed).
    // La primera fila de datos es índice 3 (0-indexed).
    // Con N filas de datos, la última estaba en índice 2 + N.
    // La nueva fila (recién agregada) está en índice 2 + N + 1 = N + 3.
    const sourceRowIndex = 2 + dataRowCountBeforeAdd;  // última fila de datos (0-indexed)
    const destRowIndex   = sourceRowIndex + 1;          // nueva fila (0-indexed)
 
    await auth.authorize();
    const token = await auth.getAccessToken();
 
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [{
            copyPaste: {
              source:      { sheetId, startRowIndex: sourceRowIndex,     endRowIndex: sourceRowIndex + 1, startColumnIndex: 0, endColumnIndex: 60 },
              destination: { sheetId, startRowIndex: destRowIndex,       endRowIndex: destRowIndex + 1,   startColumnIndex: 0, endColumnIndex: 60 },
              pasteType:        "PASTE_FORMAT",
              pasteOrientation: "NORMAL",
            },
          }],
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[copyLastRowFormat] No se pudo copiar formato (no crítico):", errText);
    }
  } catch (err) {
    console.warn("[copyLastRowFormat] Error no crítico:", err.message);
  }
}
 
export async function addOrder(order) {
  const auth = createAuth();
  const doc  = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
  await doc.loadInfo();
 
  const sheet = doc.sheetsByTitle[SHEET_ORDERS];
  if (!sheet) throw new Error("No se encontró la pestaña BD_VENTAS en el Google Sheet.");
  await sheet.loadHeaderRow(3);
 
  // Obtener el conteo de filas con datos ANTES de agregar (para calcular índices de formato)
  const existingRows = await sheet.getRows();
  const dataRowCountBeforeAdd = existingRows.length;
 
  // Siempre agregar al final (nunca rellenar filas vacías intermedias)
  const mapped = orderToRow(order);
  await sheet.addRow(mapped);
 
  // Copiar formato de la última fila anterior → nueva fila (error no crítico)
  await copyLastRowFormat(auth, process.env.GOOGLE_SHEET_ID, sheet.sheetId, dataRowCountBeforeAdd);
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