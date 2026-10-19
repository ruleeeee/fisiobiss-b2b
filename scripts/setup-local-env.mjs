import { existsSync, readFileSync, writeFileSync } from "node:fs";

const jsonPath = "service-account.json";
const sheetPath = "sheet-id.txt";

if (!existsSync(jsonPath) || !existsSync(sheetPath)) {
  console.error("Faltan service-account.json y sheet-id.txt en la carpeta del proyecto.");
  process.exit(1);
}

const key = JSON.parse(readFileSync(jsonPath, "utf8"));
let sheet = readFileSync(sheetPath, "utf8").trim();
const fromUrl = sheet.match(/\/d\/([a-zA-Z0-9-_]+)/);
if (fromUrl) sheet = fromUrl[1];

if (!key.client_email || !key.private_key || !sheet) {
  console.error("El JSON o el id de la hoja no son válidos.");
  process.exit(1);
}

const privateKey = String(key.private_key).replace(/\r?\n/g, "\\n");
const env = [
  `GOOGLE_SERVICE_ACCOUNT_EMAIL=${key.client_email}`,
  `GOOGLE_PRIVATE_KEY="${privateKey}"`,
  `GOOGLE_SHEET_ID=${sheet}`,
  "GOOGLE_DRIVE_FOLDER_ID=1zSfRLyvyEDV9q9CwJwU7lk_WxgC5EDah",
  "GOOGLE_DRIVE_IMPERSONATE=distribuidores@fisiobiss.cl",
  "",
].join("\n");

writeFileSync(".env.local", env);
console.log("Listo: .env.local");
