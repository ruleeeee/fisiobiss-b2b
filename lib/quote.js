import { $ } from "./constants";

export function quoteLines(items, total) {
  const paid = (items || []).filter(it => it.qty > 0);
  const lineSum = paid.reduce((s, it) => s + it.qty * it.precio, 0);
  const target = Math.max(0, Math.round(total || 0));
  if (!paid.length) return [];
  if (lineSum <= 0) {
    return paid.map(it => ({
      ...it,
      displayPrecio: it.precio,
      displaySub: it.qty * it.precio,
    }));
  }
  let remaining = target;
  return paid.map((it, i) => {
    const isLast = i === paid.length - 1;
    const rawSub = it.qty * it.precio;
    const sub = isLast ? remaining : Math.round(rawSub * target / lineSum);
    remaining -= sub;
    return {
      ...it,
      displayPrecio: it.qty ? Math.round(sub / it.qty) : 0,
      displaySub: sub,
    };
  });
}

export function quoteTotals(order) {
  const envio = order?.costoEnvio || 0;
  const total = order?.totalPagar > 0 ? order.totalPagar : (order?.subtotal || 0) + envio;
  return { envio, total, lines: quoteLines(order?.items, total) };
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

function pageContent(order, { total, lines }, page, pageCount) {
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
  text(50, 792, "FISIOBISS", 18, "F2");
  text(50, 774, "Cotizacion B2B  |  Santiago, Chile", 10);
  textRight(545, 792, String(order.id || ""), 12, "F2");
  textRight(545, 774, `Fecha: ${order.fecha || ""}`, 10);
  rule(50, 762, 545);

  let y = 738;
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
  y -= 22;
  text(300, y, "Total a cancelar", 12, "F2");
  textRight(545, y, $(total), 14, "F2");
  y -= 28;
  text(50, 40, "Documento generado para el cliente. No incluye condiciones internas.", 8);
  text(430, 40, `Pagina ${page} de ${pageCount}`, 8);
  return ops.join("\n");
}

export function downloadQuotePdf(order) {
  const data = quoteTotals(order);
  const content = pageContent(order, data, 1, 1);
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontB = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const streamBody = `${content}\n`;
  const contents = add(`<< /Length ${streamBody.length} >>\nstream\n${streamBody}endstream`);
  const page = add(`<< /Type /Page /Parent 999 0 R /MediaBox [0 0 595 842] /Contents ${contents} 0 R /Resources << /Font << /F1 ${font} 0 R /F2 ${fontB} 0 R >> >> >>`);
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
