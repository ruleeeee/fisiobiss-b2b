import fs from "fs";
const files = [
  "components/Distribuidores.jsx",
  "components/Dashboard.jsx",
];
for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const next = s.replace(/color=\{(colors\.[A-Za-z]+)(?!\})/g, "color={$1}");
  fs.writeFileSync(f, next);
  console.log(f, s === next ? "unchanged" : "fixed");
}
