import { readFileSync, writeFileSync } from "node:fs";

const url = process.argv[2];
if (!url || !url.includes("/exec")) {
  console.error("Falta la URL /exec");
  process.exit(1);
}

const path = ".env.local";
const lines = readFileSync(path, "utf8")
  .split(/\r?\n/)
  .filter((line) => line.trim() && !line.startsWith("GOOGLE_DRIVE_WEBAPP_URL="));
lines.push(`GOOGLE_DRIVE_WEBAPP_URL=${url}`);
writeFileSync(path, `${lines.join("\n")}\n`);

const env = Object.fromEntries(lines.map((line) => {
  const i = line.indexOf("=");
  return [line.slice(0, i), line.slice(i + 1)];
}));
const secret = env.GOOGLE_DRIVE_WEBAPP_SECRET;
const payload = JSON.stringify({
  secret,
  name: "Comprobante_PRUEBA_CONEXION.txt",
  mime: "text/plain",
  data: Buffer.from("conexion ok").toString("base64"),
});
const send = (target) => fetch(target, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: payload,
  redirect: "manual",
});
let res = await send(url);
if (res.status >= 300 && res.status < 400) {
  const next = res.headers.get("location");
  res = await fetch(next);
}
const data = await res.json().catch(() => ({}));
if (!res.ok || data.error || !data.id) {
  console.error("prueba-fallo", data.error || res.status);
  process.exit(1);
}
console.log("prueba-ok");
