export const colors = {
  bg: "var(--bg)",
  paper: "var(--paper)",
  subtle: "var(--subtle)",
  ink: "var(--ink)",
  muted: "var(--muted)",
  line: "var(--line)",
  purple: "var(--purple)",
  purpleSoft: "var(--purple-soft)",
  orange: "var(--orange)",
  orangeSoft: "var(--orange-soft)",
  ok: "var(--ok)",
  okSoft: "var(--ok-soft)",
  warn: "var(--warn)",
  warnSoft: "var(--warn-soft)",
  caution: "var(--caution)",
  cautionSoft: "var(--caution-soft)",
};

export const tiers = {
  oro:   { fg: "var(--orange)", bg: "var(--orange-soft)", label: "ORO" },
  plata: { fg: "var(--muted)", bg: "var(--subtle)", label: "PLATA" },
  verde: { fg: "var(--ok)", bg: "var(--ok-soft)", label: "VERDE" },
  sin:   { fg: "var(--muted)", bg: "var(--subtle)", label: "SIN NIVEL" },
};

export const orderStatus = {
  "Pendiente":     { fg: "var(--caution)", bg: "var(--caution-soft)" },
  "Shipit Creado": { fg: "var(--purple)", bg: "var(--purple-soft)" },
  "Despachado":    { fg: "var(--indigo)", bg: "var(--indigo-soft)" },
  "Entregado":     { fg: "var(--ok)", bg: "var(--ok-soft)" },
};

export const chart = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const fonts = {
  body: "var(--font-poppins), system-ui, sans-serif",
  mono: "var(--font-mono), ui-monospace, Consolas, monospace",
};

export const radius = { sm: 6, md: 10, lg: 14 };
