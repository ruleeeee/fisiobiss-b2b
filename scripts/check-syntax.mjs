import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    if (["node_modules", ".next", ".open-next", ".wrangler", "public"].includes(f)) continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, a);
    else if (/\.js$/.test(f)) a.push(p);
  }
  return a;
}

const bad = [];
for (const f of walk(".")) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) bad.push(f);
}
console.log(bad.join("\n") || "ok");
