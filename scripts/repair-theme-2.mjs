import fs from "fs";
import path from "path";

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    if (["node_modules", ".next", ".open-next", ".wrangler", "public", "scripts", "lib"].includes(f)) continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, a);
    else if (/\.jsx$/.test(f)) a.push(p);
  }
  return a;
}

for (const file of walk(".")) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  s = s.replace(/(\?|:)\s*\$\{((?:colors|chart|tiers)[^}]+)\}/g, "$1 $2");
  s = s.replace(/([,{])\s*([A-Za-z]+)\s*:\s*\$\{((?:colors|chart|tiers)[^}]+)\}/g, "$1 $2: $3");
  s = s.replace(/(\s)([A-Za-z]+)=\$\{((?:colors|chart)[^}]+)\}/g, "$1$2={$3}");
  s = s.replace(/([A-Za-z]+)=`([A-Za-z0-9_]+)`/g, '$1="$2"');
  s = s.replace(/`1px solid colors\.([A-Za-z]+)`/g, "`1px solid ${colors.$1}`");
  s = s.replace(/border:"none`,/g, 'border:"none",');
  s = s.replace(/background:"transparent`,/g, 'background:"transparent",');
  if (s !== orig) {
    fs.writeFileSync(file, s);
    console.log(file);
  }
}
