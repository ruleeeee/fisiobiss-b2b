import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applySheetCredentials, getAllOrders } from "@/lib/googleSheets";

function sheetIdFrom(input) {
  const raw = String(input || "").trim();
  const fromUrl = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) return fromUrl[1];
  return raw;
}

function upsertEnv(updates) {
  const file = path.join(process.cwd(), ".env.local");
  const lines = existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/) : [];
  const keys = new Set(Object.keys(updates));
  const kept = lines.filter(line => {
    const key = line.split("=")[0];
    return line.trim() && !line.trim().startsWith("#") && !keys.has(key);
  });
  for (const [key, value] of Object.entries(updates)) kept.push(`${key}=${value}`);
  writeFileSync(file, `${kept.join("\n")}\n`);
}

export async function POST(req) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "La cuenta de Google solo se carga en local." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const account = body?.serviceAccount;
    const sheetId = sheetIdFrom(body?.sheetId);
    const email = String(account?.client_email || "").trim();
    const privateKey = String(account?.private_key || "");

    if (!email.includes("@") || !privateKey.includes("BEGIN PRIVATE KEY")) {
      return Response.json({ error: "El JSON no es una cuenta de servicio de Google." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9-_]{20,}$/.test(sheetId)) {
      return Response.json({ error: "El ID de la hoja no es válido. Pega el enlace o el ID." }, { status: 400 });
    }

    applySheetCredentials({ email, privateKey, sheetId });
    await getAllOrders();

    const escapedKey = privateKey.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/"/g, '\\"');
    upsertEnv({
      GOOGLE_SERVICE_ACCOUNT_EMAIL: email,
      GOOGLE_PRIVATE_KEY: `"${escapedKey}"`,
      GOOGLE_SHEET_ID: sheetId,
    });

    return Response.json({ ok: true, email });
  } catch (err) {
    console.error("[POST /api/setup/sheets]", err?.message || err);
    return Response.json({ error: err?.message || "No se pudo conectar con la hoja." }, { status: 400 });
  }
}
