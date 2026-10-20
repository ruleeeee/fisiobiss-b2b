import fs from "fs";
import path from "path";

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    if (["node_modules", ".next", ".open-next", ".wrangler", "public", "scripts"].includes(f)) continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, a);
    else if (/\.(jsx|js)$/.test(f)) a.push(p);
  }
  return a;
}

for (const file of walk(".")) {
  const s = fs.readFileSync(file, "utf8");
  const next = s.replace(/"([^"\n]*\$\{[^"\n]*)"/g, (_, inner) => "`" + inner + "`");
  if (next !== s) {
    fs.writeFileSync(file, next);
    console.log("templates", file);
  }
}
