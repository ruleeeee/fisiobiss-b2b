import { $ } from "./constants";

export const IVA_FACTOR = 1.19;

export function shippingLabel(order) {
  if (order?.envioGratis) return "Envío Gratis";
  if (String(order?.region || "").trim().toUpperCase() === "RETIRO LOCAL") return "Retiro local";
  const envio = Number(order?.costoEnvio) || 0;
  if (envio <= 0) return "Envío Gratis";
  return $(envio);
}

export function quoteLines(items) {
  return (items || []).filter(it => it.qty > 0).map(it => ({
    ...it,
    displayPrecio: it.precio,
    displaySub: it.qty * (it.precio || 0),
  }));
}

export function quoteTotals(order) {
  const lines = quoteLines(order?.items);
  const subtotal = lines.reduce((s, it) => s + it.displaySub, 0);
  const envio = order?.envioGratis ? 0 : (Number(order?.costoEnvio) || 0);
  const hasTotal = order?.totalPagar !== undefined && order?.totalPagar !== null && order?.totalPagar !== "";
  const total = hasTotal ? Number(order.totalPagar) || 0 : subtotal + envio;
  const descuento = Math.max(0, Number(order?.descuento) || 0);
  const descuentoPct = Math.min(100, Math.max(0, Number(order?.descuentoPct) || 0));
  return { lines, subtotal, envio, total, descuento, descuentoPct, envioLabel: shippingLabel({ ...order, costoEnvio: envio }) };
}

export function quotePresentation(order, mode = "bruto") {
  const base = quoteTotals(order);
  const net = (n) => (Number(n) || 0) / IVA_FACTOR;
  const lines = base.lines.map(it => ({
    ...it,
    precioNeto: net(it.displayPrecio),
    precioBruto: Number(it.displayPrecio) || 0,
    subNeto: net(it.displaySub),
    subBruto: Number(it.displaySub) || 0,
  }));
  return {
    ...base,
    mode,
    lines,
    subtotalNeto: net(base.subtotal),
    subtotalBruto: base.subtotal,
    envioNeto: net(base.envio),
    envioBruto: base.envio,
    descuentoNeto: net(base.descuento),
    descuentoBruto: base.descuento,
    descuentoPct: base.descuentoPct,
    totalNeto: net(base.total),
    totalBruto: base.total,
    envioIsText: base.envio <= 0,
  };
}

const WINANSI = {
  Á: 0xC1, É: 0xC9, Í: 0xCD, Ó: 0xD3, Ú: 0xDA, Ñ: 0xD1, Ü: 0xDC,
  á: 0xE1, é: 0xE9, í: 0xED, ó: 0xF3, ú: 0xFA, ñ: 0xF1, ü: 0xFC,
  "°": 0xB0, "¿": 0xBF, "¡": 0xA1, "–": 0x96, "—": 0x97, "•": 0x95,
};

function pdfLiteral(str) {
  let out = "";
  for (const ch of String(str ?? "")) {
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else if (WINANSI[ch]) out += "\\" + WINANSI[ch].toString(8).padStart(3, "0");
    else if (ch.charCodeAt(0) > 127) out += "?";
    else out += ch;
  }
  return out;
}

function wrapText(text, maxChars) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  words.forEach(w => {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function bytesToBinaryString(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return s;
}

async function loadBwLogo(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  let minX = sw;
  let minY = sh;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const ink = data[i + 3] > 24 && (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245);
      if (!ink) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return null;
  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(sw - 1, maxX + pad);
  maxY = Math.min(sh - 1, maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const scale = Math.min(1, 360 / Math.max(w, h));
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  const out = document.createElement("canvas");
  out.width = dw;
  out.height = dh;
  const octx = out.getContext("2d", { willReadFrequently: true });
  octx.drawImage(canvas, minX, minY, w, h, 0, 0, dw, dh);
  const pixels = octx.getImageData(0, 0, dw, dh).data;
  const gray = new Uint8Array(dw * dh);
  for (let i = 0; i < dw * dh; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const a = pixels[i * 4 + 3];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = a < 24 || lum > 210 ? 255 : 0;
  }
  return { width: dw, height: dh, gray };
}

function pageContent(order, quote, page, pageCount, logo) {
  const { total, lines, subtotal, envioLabel } = quote;
  const ops = [];
  const text = (x, y, s, size = 11, font = "F1") => {
    ops.push(`BT /${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfLiteral(s)}) Tj ET`);
  };
  const textRight = (xRight, y, s, size = 11, font = "F1") => {
    const w = String(s ?? "").length * size * 0.5;
    text(xRight - w, y, s, size, font);
  };
  const rule = (x1, y, x2) => {
    ops.push(`${x1.toFixed(1)} ${y.toFixed(1)} m ${x2.toFixed(1)} ${y.toFixed(1)} l S`);
  };

  ops.push("0.15 w 0 G 0 g");
  const logoH = 46;
  const logoW = logo ? logoH * (logo.width / logo.height) : 0;
  const logoX = 50;
  const logoY = 790 - logoH;
  if (logo) {
    ops.push(`q ${logoW.toFixed(2)} 0 0 ${logoH.toFixed(2)} ${logoX.toFixed(2)} ${logoY.toFixed(2)} cm /Im1 Do Q`);
  }
  const textX = logo ? logoX + logoW + 12 : 50;
  text(textX, logoY + 26, "FISIOBISS", 16, "F2");
  text(textX, logoY + 10, "B2B", 9, "F2");
  text(textX + 36, logoY + 10, "Santiago, Chile", 9);
  textRight(545, logoY + 26, String(order.id || ""), 12, "F2");
  textRight(545, logoY + 10, `Fecha: ${order.fecha || ""}`, 10);
  const ruleY = logoY - 12;
  rule(50, ruleY, 545);

  let y = ruleY - 24;
  text(50, y, "DATOS DEL CLIENTE", 9, "F2");
  y -= 16;
  const clientRows = [
    ["Cliente", order.cliente || "-"],
    order.telefono && ["Telefono", order.telefono],
    order.email && ["Email", order.email],
    order.direccion && ["Direccion", order.direccion],
    order.region && ["Region", order.region],
  ].filter(Boolean);
  clientRows.forEach(([k, v]) => {
    text(50, y, `${k}:`, 10, "F2");
    const wrapped = wrapText(v, 70);
    wrapped.forEach((ln, i) => {
      text(120, y, ln, 10);
      if (i < wrapped.length - 1) y -= 13;
    });
    y -= 15;
  });

  y -= 8;
  rule(50, y, 545);
  y -= 18;
  text(50, y, "Producto", 9, "F2");
  textRight(400, y, "Precio", 9, "F2");
  textRight(455, y, "Cant.", 9, "F2");
  textRight(545, y, "Subtotal", 9, "F2");
  y -= 8;
  rule(50, y, 545);
  y -= 16;

  lines.forEach(it => {
    const nameLines = wrapText(it.name, 38);
    const rowH = Math.max(16, nameLines.length * 13);
    if (y - rowH < 80) {
      y = 80;
    }
    nameLines.forEach((ln, i) => text(50, y - i * 13, ln, 10));
    textRight(400, y, $(it.displayPrecio), 10);
    textRight(455, y, String(it.qty), 10);
    textRight(545, y, $(it.displaySub), 10);
    y -= rowH;
  });

  y -= 4;
  rule(50, y, 545);
  y -= 18;
  text(300, y, "Subtotal productos", 10, "F2");
  textRight(545, y, $(subtotal), 10);
  y -= 16;
  text(300, y, "Envío", 10, "F2");
  textRight(545, y, envioLabel, 10);
  y -= 20;
  text(300, y, "Total a cancelar", 12, "F2");
  textRight(545, y, $(total), 14, "F2");
  y -= 28;
  text(50, 40, "Documento generado para el cliente. No incluye condiciones internas.", 8);
  text(430, 40, `Pagina ${page} de ${pageCount}`, 8);
  return ops.join("\n");
}

export async function downloadQuotePdf(order) {
  const data = quoteTotals(order);
  let logo = null;
  try {
    logo = await loadBwLogo("/brand/isotipo.png");
  } catch {
    logo = null;
  }
  const content = pageContent(order, data, 1, 1, logo);
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontB = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const streamBody = `${content}\n`;
  const contents = add(`<< /Length ${streamBody.length} >>\nstream\n${streamBody}endstream`);
  let imageId = null;
  if (logo) {
    const bin = bytesToBinaryString(logo.gray);
    imageId = add(`<< /Type /Image /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${logo.gray.length} >>\nstream\n${bin}\nendstream`);
  }
  const xobj = imageId ? ` /XObject << /Im1 ${imageId} 0 R >>` : "";
  const page = add(`<< /Type /Page /Parent 999 0 R /MediaBox [0 0 595 842] /Contents ${contents} 0 R /Resources << /Font << /F1 ${font} 0 R /F2 ${fontB} 0 R >>${xobj} >> >>`);
  const pages = add(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);
  objects[page - 1] = objects[page - 1].replace("999 0 R", `${pages} 0 R`);
  const catalog = add(`<< /Type /Catalog /Pages ${pages} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(off => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = String(order.id || "cotizacion").replace(/[^\w.-]+/g, "_");
  a.href = url;
  a.download = `Cotizacion_${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
