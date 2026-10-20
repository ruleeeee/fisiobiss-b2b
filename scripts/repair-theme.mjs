import fs from "fs";
import path from "path";

const token = String.raw`(?:colors\.[A-Za-z]+|chart\[\d+\]|tiers\.[A-Za-z]+\.[A-Za-z]+)`;
const only = new RegExp(`^(${token})$`);
const splitRe = new RegExp(`(${token})`, "g");

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    if (["node_modules", ".next", ".open-next", ".wrangler", "public", "scripts"].includes(f)) continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, a);
    else if (/\.(jsx|js)$/.test(f) && !p.endsWith(`${path.sep}theme.js`)) a.push(p);
  }
  return a;
}

function repair(s) {
  s = s.replace(/\$\{(colors\.[A-Za-z]+|chart\[\d+\]|tiers\.[A-Za-z]+\.[A-Za-z]+)\}/g, "$1");
  s = s.replace(/`/g, '"');
  s = s.replace(/"([^"\n]*\b(?:colors|chart|tiers)\.[^"\n]*)"/g, (full, inner) => {
    if (only.test(inner)) return inner;
    splitRe.lastIndex = 0;
    if (!splitRe.test(inner)) return full;
    splitRe.lastIndex = 0;
    const parts = inner.split(splitRe);
    const body = parts.map(p => (only.test(p) ? "${" + p + "}" : p)).join("");
    return "`" + body + "`";
  });
  return s;
}

for (const file of walk(".")) {
  const s = fs.readFileSync(file, "utf8");
  const next = repair(s);
  if (next !== s) {
    fs.writeFileSync(file, next);
    console.log("repaired", file);
  }
}
