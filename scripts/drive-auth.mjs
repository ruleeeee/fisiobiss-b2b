import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}`;
const jsonPath = "oauth-client.json";

if (!existsSync(jsonPath)) {
  console.error("Falta oauth-client.json en la carpeta del proyecto.");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
const creds = raw.installed || raw.web || raw;
const clientId = creds.client_id;
const clientSecret = creds.client_secret;
if (!clientId || !clientSecret) {
  console.error("oauth-client.json no tiene client_id y client_secret.");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

function saveEnv(refreshToken) {
  const path = ".env.local";
  const lines = existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/) : [];
  const set = new Map([
    ["GOOGLE_OAUTH_CLIENT_ID", clientId],
    ["GOOGLE_OAUTH_CLIENT_SECRET", clientSecret],
    ["GOOGLE_OAUTH_REFRESH_TOKEN", refreshToken],
  ]);
  const kept = lines.filter((line) => {
    const key = line.split("=")[0];
    return line.trim() && !set.has(key);
  });
  for (const [key, value] of set) kept.push(`${key}=${value}`);
  writeFileSync(path, `${kept.join("\n")}\n`);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", REDIRECT);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(err || "No llegó el código de Google.");
    server.close();
    process.exit(1);
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }),
  });
  const data = await tokenRes.json();
  if (!data.refresh_token) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Google no entregó un permiso permanente. Cierra esta ventana y avisa en el chat.");
    console.error(data.error_description || data.error || "sin refresh_token");
    server.close();
    process.exit(1);
  }
  saveEnv(data.refresh_token);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<p>Drive conectado. Ya puedes cerrar esta ventana.</p>");
  console.log("Listo: Drive quedó conectado en .env.local");
  server.close();
  setTimeout(() => process.exit(0), 200);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Elige la cuenta Vicente (fisiobissb2b@gmail.com) en la ventana que se abre.");
  spawn("powershell", ["-NoProfile", "-Command", `Start-Process '${authUrl.toString()}'`], {
    detached: true,
    stdio: "ignore",
  }).unref();
});
