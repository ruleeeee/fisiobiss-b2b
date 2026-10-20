import { colors } from "../lib/theme";

export default function BrandLockup({ height = 36 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ background: "#fff", borderRadius: 8, display: "inline-flex", lineHeight: 0 }}>
        <img
          src="/brand/isotipo.png"
          alt=""
          style={{ height, width: "auto", display: "block", mixBlendMode: "multiply" }}
        />
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{
          fontSize: Math.round(height * 0.42),
          fontWeight: 800,
          letterSpacing: 1.4,
          color: colors.ink,
        }}>FISIOBISS</span>
        <span style={{
          marginTop: 3,
          fontSize: Math.max(9, Math.round(height * 0.22)),
          fontWeight: 700,
          letterSpacing: 2.4,
          color: colors.purple,
        }}>B2B</span>
      </span>
    </span>
  );
}
