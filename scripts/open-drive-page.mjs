import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const raw = JSON.parse(readFileSync("oauth-client.json", "utf8"));
const creds = raw.installed || raw.web || raw;
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", creds.client_id);
authUrl.searchParams.set("redirect_uri", "http://127.0.0.1:53682");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const html = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${authUrl.toString().replaceAll("&", "&amp;")}"><p>Abriendo Google...</p>`;
writeFileSync("abrir-drive.html", html);
spawn("cmd", ["/c", "start", "", "abrir-drive.html"], { detached: true, stdio: "ignore" }).unref();
console.log("opened");
