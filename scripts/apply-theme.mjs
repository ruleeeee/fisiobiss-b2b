import fs from "fs";
import path from "path";

const map = new Map(Object.entries({
  "#52B788": "colors.purple",
  "#1A3520": "colors.line",
  "#5A8A66": "colors.muted",
  "#3A6A46": "colors.muted",
  "#F0B429": "colors.orange",
  "#7EC8A4": "colors.muted",
  "#0D1F12": "colors.paper",
  "#E8F5EE": "colors.ink",
  "#4A7A56": "colors.purple",
  "#FFFFFF": "colors.paper",
  "#FFF": "colors.paper",
  "#0A1A0C": "colors.paper",
  "#1A5E2A": "colors.ink",
  "#E87040": "colors.orange",
  "#2D5A3A": "colors.line",
  "#2A3A1A": "colors.line",
  "#0D1A0F": "colors.subtle",
  "#B8860B": "tiers.oro.fg",
  "#8EA8B8": "tiers.plata.fg",
  "#4A5568": "tiers.sin.fg",
  "#90CBF9": "colors.ink",
  "#7A5000": "colors.caution",
  "#000000": "colors.ink",
  "#000": "colors.ink",
  "#9B59B6": "colors.purple",
  "#7B1D1D": "colors.warn",
  "#111E14": "colors.subtle",
  "#1A5A2A": "colors.ok",
  "#473E32": "colors.line",
  "#4A90D9": "colors.purple",
  "#080805": "colors.bg",
  "#2A251F": "colors.ink",
  "#130F0A": "colors.bg",
  "#0C1A0F": "colors.paper",
  "#2A5A36": "colors.muted",
  "#3A1010": "colors.warnSoft",
  "#A03030": "colors.warn",
  "#2A1F00": "colors.orangeSoft",
  "#2D7A3A": "colors.ok",
  "#EF9A9A": "colors.warnSoft",
  "#3182BD": "colors.purple",
  "#07100A": "colors.bg",
  "#FDFDFD": "colors.paper",
  "#808080": "colors.muted",
  "#666666": "colors.muted",
  "#666": "colors.muted",
  "#060F07": "colors.bg",
  "#FCA5A5": "colors.warnSoft",
  "#2D8A4E": "colors.ok",
  "#E2DCD0": "colors.line",
  "#887C5F": "colors.muted",
  "#8E2BFF": "colors.purple",
  "#1ABC9C": "colors.ok",
  "#E74C3C": "colors.warn",
  "#3498DB": "colors.purple",
  "#7A9B84": "colors.muted",
  "#2E7D52": "colors.ok",
  "#2A4A2A": "colors.line",
  "#0F1F2A": "colors.paper",
  "#5A8098": "colors.muted",
  "#0F1418": "colors.bg",
  "#2D3748": "colors.ink",
  "#0F2A18": "colors.paper",
  "#0D1F14": "colors.subtle",
  "#0D2A18": "colors.subtle",
  "#5A4020": "colors.caution",
  "#CCCCCC": "colors.line",
  "#CCC": "colors.line",
  "#EEEEEE": "colors.subtle",
  "#EEE": "colors.subtle",
  "#473E20": "colors.line",
  "#342E27": "colors.ink",
  "#1A1510": "colors.bg",
  "#A39A84": "colors.muted",
  "#655C45": "colors.muted",
  "#C1BAAA": "colors.line",
  "#C56E3C": "colors.orange",
  "#99321B": "colors.warn",
  "#8A9B3D": "colors.ok",
  "#6B4B8F": "colors.purple",
  "#4E5A9A": "colors.purple",
  "#1F7A48": "colors.ok",
  "#6E9A78": "chart[0]",
  "#8FB396": "chart[1]",
  "#A8C4A4": "colors.okSoft",
  "#E4EFE4": "colors.subtle",
  "#7A9E82": "chart[3]",
  "#C5D9C4": "colors.okSoft",
  "#9BB8A0": "chart[4]",
  "#DCE8DC": "colors.paper",
  "#B7D4BE": "colors.purpleSoft",
  "#C8E6D4": "colors.orangeSoft",
  "#A8D8C4": "colors.okSoft",
  "#5EBEB0": "chart[2]",
  "#3D9A8C": "chart[3]",
}));

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
  const orig = s;
  s = s.replace(/rgba\(\s*52\s*,\s*183\s*,\s*136\s*,\s*[\d.]+\s*\)/g, "colors.purpleSoft");
  s = s.replace(/rgba\(\s*82\s*,\s*183\s*,\s*136[^)]*\)/g, "colors.purpleSoft");
  s = s.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*[\d.]+\s*\)/g, "\"rgba(20,16,18,.45)\"");
  s = s.replace(/(['"])#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\1/g, (full, _q, hex) => {
    const token = map.get("#" + hex.toUpperCase());
    return token || full;
  });
  s = s.replace(/#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g, (m) => map.get(m.toUpperCase()) || m);
  if (s === orig) continue;
  const needs = [];
  if (/\bcolors\./.test(s)) needs.push("colors");
  if (/\btiers\./.test(s)) needs.push("tiers");
  if (/\bchart\[/.test(s)) needs.push("chart");
  const rel = path.relative(path.dirname(file), "lib/theme.js").split(path.sep).join("/");
  const spec = rel.startsWith(".") ? rel : `./${rel}`;
  if (needs.length && !s.includes("lib/theme")) {
    s = `import { ${needs.join(", ")} } from "${spec}";\n` + s;
  }
  fs.writeFileSync(file, s);
  console.log("updated", file);
}
