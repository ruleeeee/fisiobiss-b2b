import fs from "fs";
import path from "path";

const token = String.raw`(?:colors\.[A-Za-z]+|chart\[\d+\]|tiers\.[A-Za-z]+\.[A-Za-z]+)`;
const only = new RegExp(`^(${token})$`);
const splitRe = new RegExp(`(${token})`, "g");

function rewriteQuoted(s) {
  return s.replace(new RegExp(`(["'])([^"'\\\\]*\\b(?:colors|chart|tiers)\\.[^"'\\\\]*)\\1`, "g"), (full, q, inner) => {
    if (only.test(inner)) return inner;
    const parts = inner.split(splitRe);
    const body = parts.map(p => (only.test(p) ? "${" + p + "}" : p)).join("");
    return "`" + body + "`";
  });
}

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    if (["node_modules", ".next", ".open-next", ".wrangler", "public", "scripts"].includes(f)) continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, a);
    else if (/\.(jsx|js)$/.test(f) && !p.endsWith(`${path.sep}theme.js`)) a.push(p);
  }
  return a;
}

for (const file of walk(".")) {
  let s = fs.readFileSync(file, "utf8");
  const next = rewriteQuoted(s);
  if (next !== s) {
    fs.writeFileSync(file, next);
    console.log("fixed", file);
  }
}
