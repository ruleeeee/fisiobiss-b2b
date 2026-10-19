import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\n/)
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const keys = ["GOOGLE_DRIVE_WEBAPP_URL", "GOOGLE_DRIVE_WEBAPP_SECRET"];

function put(name, value) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["wrangler", "secret", "put", name], {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { out += chunk; });
    child.on("close", (code) => {
      const safe = out.split(value).join("[set]").slice(0, 400);
      if (code === 0) resolve(safe);
      else reject(new Error(`${name} ${safe}`));
    });
    child.stdin.write(value);
    child.stdin.end();
  });
}

for (const name of keys) {
  if (!env[name]) {
    console.error(`falta ${name}`);
    process.exit(1);
  }
  const result = await put(name, env[name]);
  console.log(name, result.includes("Success") || result.includes("success") ? "ok" : "enviado");
}
