/**
 * Repara celdas puntuales de BD_VENTAS.
 * Solo sobreescribe:
 *   - COSTO ENVÍO cuando el formato es fecha
 *   - TOTAL A PAGAR cuando esa fila quedó vacía
 *   - COMUNA cuando está vacía
 * No borra filas, no limpia rangos y no toca el resto de las columnas.
 */
import { readFileSync, existsSync } from "node:fs";
import { REGIONS } from "../lib/constants.js";
import { foldGeoName, inferComuna, matchComunaName } from "../lib/comunas.js";
import { getAccessToken } from "../lib/googleSheets.js";

const SHEET_ID = "11pwLRnJvYgKpHHL405YOMDIN6OuZT5INon01lQL9Olg";
const SHEET_NAME = "BD_VENTAS";
const HEADER_ROW = 3;
const CREDIBLE_MAX = 20000;

function loadEnv() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val.replace(/\\n/g, "\n");
  }
}

function colLetter(n) {
  let r = "";
  for (n++; n > 0; n = Math.floor((n - 1) / 26)) {
    r = String.fromCharCode(65 + ((n - 1) % 26)) + r;
  }
  return r;
}

function foldHeader(name) {
  return foldGeoName(name);
}

function colOf(hdr, name) {
  const target = foldHeader(name);
  return hdr.findIndex(h => foldHeader(h) === target);
}

const base = () => `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

async function api(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${base()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function values(range, render) {
  const q = new URLSearchParams({ valueRenderOption: render || "UNFORMATTED_VALUE" });
  const data = await api(`/values/${encodeURIComponent(range)}?${q}`);
  return data.values || [];
}

function isCurrencyText(value) {
  return /\$|CLP/i.test(String(value ?? ""));
}

function isDateText(value) {
  const t = String(value ?? "").trim();
  if (!t || isCurrencyText(t)) return false;
  if (/^\d{4}-\d{1,2}-\d{1,2}([ T].*)?$/.test(t)) return true;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(t)) return true;
  return false;
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function regionTariff(regionName, regions) {
  const target = foldGeoName(regionName);
  const hit = regions.find(r => foldGeoName(r.name) === target);
  return hit ? Number(hit.envio) || 0 : null;
}

async function loadRegions() {
  try {
    const rows = await values("REGIONES!A2:B80", "UNFORMATTED_VALUE");
    const parsed = rows
      .filter(r => r[0] && String(r[0]).trim())
      .map(r => ({ name: String(r[0]).trim(), envio: Number(r[1]) || 0 }));
    if (parsed.length) return parsed;
  } catch {
    // La hoja REGIONES puede no existir. Se usan las tarifas del código.
  }
  return REGIONS.map(r => ({ name: r.name, envio: r.envio }));
}

async function moneyFormat(envioCol, formattedRows) {
  const fallback = { type: "NUMBER", pattern: '"$"#.##0' };
  const idx = formattedRows.findIndex(row => isCurrencyText(row?.[envioCol]));
  if (idx < 0) return fallback;
  const row = HEADER_ROW + 1 + idx;
  const cell = `${SHEET_NAME}!${colLetter(envioCol)}${row}`;
  const meta = await api(`?ranges=${encodeURIComponent(cell)}&includeGridData=true&fields=sheets.data.rowData.values.userEnteredFormat.numberFormat`);
  const fmt = meta.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]?.userEnteredFormat?.numberFormat;
  if (!fmt?.type || fmt.type === "DATE" || fmt.type === "DATE_TIME" || fmt.type === "TIME") return fallback;
  return { type: fmt.type, pattern: fmt.pattern || fallback.pattern };
}

async function sheetNumericId() {
  const meta = await api("?fields=sheets.properties");
  const sheet = (meta.sheets || []).find(s => s.properties?.title === SHEET_NAME);
  if (!sheet) throw new Error(`No está la pestaña ${SHEET_NAME}`);
  return sheet.properties.sheetId;
}

async function writeCells(data) {
  for (let i = 0; i < data.length; i += 80) {
    const chunk = data.slice(i, i + 80);
    await api("/values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "RAW", data: chunk }),
    });
  }
}

async function formatCells(sheetId, cells, format) {
  const requests = cells.map(({ row, col }) => ({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: row - 1,
        endRowIndex: row,
        startColumnIndex: col,
        endColumnIndex: col + 1,
      },
      cell: { userEnteredFormat: { numberFormat: format } },
      fields: "userEnteredFormat.numberFormat",
    },
  }));
  for (let i = 0; i < requests.length; i += 80) {
    await api(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({ requests: requests.slice(i, i + 80) }),
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeComuna(direccion, region) {
  const regionName = String(region || "").replace(/\s*\([^)]*\)\s*$/, "");
  const q = `${direccion}, ${regionName}, Chile`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=cl&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "FisiobissB2B/1.0 (reparacion local de comunas)",
      "Accept-Language": "es",
    },
  });
  if (!res.ok) return "";
  const hits = await res.json();
  for (const hit of hits || []) {
    const addr = hit.address || {};
    const candidates = [addr.city, addr.town, addr.municipality, addr.village, addr.suburb, addr.city_district, addr.hamlet, addr.county];
    for (const candidate of candidates) {
      const match = matchComunaName(candidate, region);
      if (match) return match;
    }
  }
  return "";
}

async function main() {
  loadEnv();
  process.env.GOOGLE_SHEET_ID = SHEET_ID;
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error("Falta .env.local con la cuenta de servicio. No se escribió nada en el sheet.");
    process.exitCode = 2;
    return;
  }

  const hdr = (await values(`${SHEET_NAME}!A${HEADER_ROW}:${HEADER_ROW}`, "FORMATTED_VALUE"))[0] || [];
  const idCol = colOf(hdr, "ID Pedido");
  const regionCol = colOf(hdr, "Región");
  const addressCol = colOf(hdr, "Dirección");
  const comunaCol = colOf(hdr, "COMUNA");
  const subtotalCol = colOf(hdr, "SUBTOTAL PROD.");
  const envioCol = colOf(hdr, "COSTO ENVÍO");
  const totalCol = colOf(hdr, "TOTAL A PAGAR");
  const needed = { idCol, regionCol, addressCol, comunaCol, subtotalCol, envioCol, totalCol };
  const missing = Object.entries(needed).filter(([, i]) => i < 0).map(([name]) => name);
  if (missing.length) throw new Error(`Faltan columnas: ${missing.join(", ")}`);

  const lastCol = colLetter(hdr.length - 1);
  const range = `${SHEET_NAME}!A${HEADER_ROW + 1}:${lastCol}`;
  const [rawRows, formattedRows, regions] = await Promise.all([
    values(range, "UNFORMATTED_VALUE"),
    values(range, "FORMATTED_VALUE"),
    loadRegions(),
  ]);

  const valueWrites = [];
  const formatTargets = [];
  const envioFixes = [];

  rawRows.forEach((raw, i) => {
    const formatted = formattedRows[i] || [];
    const id = String(raw[idCol] || formatted[idCol] || "").trim();
    if (!id) return;
    const sheetRow = HEADER_ROW + 1 + i;
    const formattedEnvio = formatted[envioCol];
    const rawEnvio = raw[envioCol];
    if (!isDateText(formattedEnvio) && !isDateText(rawEnvio)) return;

    const rawIsSerial = typeof rawEnvio === "number" && Number.isFinite(rawEnvio);
    let next = null;
    if (rawIsSerial && rawEnvio >= 0 && rawEnvio <= CREDIBLE_MAX) next = rawEnvio;
    else {
      const tariff = regionTariff(raw[regionCol] || formatted[regionCol], regions);
      if (tariff == null) {
        envioFixes.push(`${id}: envío con formato fecha y sin tarifa de región; no se tocó`);
        return;
      }
      next = tariff;
    }

    valueWrites.push({
      range: `${SHEET_NAME}!${colLetter(envioCol)}${sheetRow}`,
      values: [[next]],
    });
    formatTargets.push({ row: sheetRow, col: envioCol });

    const rawTotal = raw[totalCol];
    const totalEmpty = rawTotal == null || String(rawTotal).trim() === "";
    const subtotal = asNumber(raw[subtotalCol]);
    if (totalEmpty && subtotal != null && !isDateText(formatted[subtotalCol])) {
      valueWrites.push({
        range: `${SHEET_NAME}!${colLetter(totalCol)}${sheetRow}`,
        values: [[subtotal + next]],
      });
      formatTargets.push({ row: sheetRow, col: totalCol });
    }
    envioFixes.push(`${id} fila ${sheetRow}: envío ${JSON.stringify(formattedEnvio)} -> ${next}`);
  });

  const format = await moneyFormat(envioCol, formattedRows);
  const numericSheetId = formatTargets.length ? await sheetNumericId() : null;
  if (valueWrites.length) await writeCells(valueWrites);
  if (formatTargets.length) await formatCells(numericSheetId, formatTargets, format);

  const comunaWrites = [];
  const unresolved = [];
  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const formatted = formattedRows[i] || [];
    const id = String(raw[idCol] || formatted[idCol] || "").trim();
    if (!id) continue;
    const current = String(raw[comunaCol] || formatted[comunaCol] || "").trim();
    if (current) continue;
    const region = String(raw[regionCol] || formatted[regionCol] || "").trim();
    const direccion = String(raw[addressCol] || formatted[addressCol] || "").trim();
    let comuna = inferComuna(direccion, region);
    if (!comuna && direccion) {
      await sleep(1100);
      comuna = await geocodeComuna(direccion, region);
    }
    if (!comuna) {
      unresolved.push(`${id} | ${region} | ${direccion}`);
      continue;
    }
    const sheetRow = HEADER_ROW + 1 + i;
    comunaWrites.push({
      range: `${SHEET_NAME}!${colLetter(comunaCol)}${sheetRow}`,
      values: [[comuna]],
    });
    console.log(`${id}: comuna -> ${comuna}`);
  }
  if (comunaWrites.length) await writeCells(comunaWrites);

  console.log(`Envíos corregidos: ${envioFixes.length}`);
  envioFixes.forEach(line => console.log(line));
  console.log(`Comunas escritas: ${comunaWrites.length}`);
  console.log(`Comunas sin resolver: ${unresolved.length}`);
  unresolved.forEach(line => console.log(line));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
