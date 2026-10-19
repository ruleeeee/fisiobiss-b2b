import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const envPath = ".env.local";
const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split(/\r?\n/) : [];
const current = lines.find((line) => line.startsWith("GOOGLE_DRIVE_WEBAPP_SECRET="));
const secret = current ? current.slice("GOOGLE_DRIVE_WEBAPP_SECRET=".length) : randomBytes(24).toString("hex");

if (!current) {
  const kept = lines.filter((line) => line.trim());
  kept.push(`GOOGLE_DRIVE_WEBAPP_SECRET=${secret}`);
  writeFileSync(envPath, `${kept.join("\n")}\n`);
}

const script = `const FOLDER_ID = "1zSfRLyvyEDV9q9CwJwU7lk_WxgC5EDah";
const SECRET = "${secret}";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ error: "forbidden" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const bytes = Utilities.base64Decode(body.data);
    const blob = Utilities.newBlob(bytes, body.mime || "application/octet-stream", body.name || "comprobante");
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (err) {}
    return ContentService.createTextOutput(JSON.stringify({
      id: file.getId(),
      name: file.getName(),
      webViewLink: file.getUrl(),
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

writeFileSync("scripts/ComprobantesDrive.local.gs", script);
console.log("Listo: scripts/ComprobantesDrive.local.gs");
