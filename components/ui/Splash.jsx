import { colors } from "../../lib/theme.js";
import { C } from "../../lib/constants";

export default function Splash() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: colors.purple, marginBottom: 16, letterSpacing: 2 }}>
        🌿 FISIOBISS B2B
      </div>\n      <div style={{ fontSize: 13, color: C.sub }}>Cargando ecosistema en tiempo real...</div>\n    </div>
  );
}