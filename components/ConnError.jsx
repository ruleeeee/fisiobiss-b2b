import { C } from "../../lib/constants";

export default function ConnError({ error }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.red, marginBottom: 8 }}>Error de Conexión</div>
      <div style={{ fontSize: 13, color: C.sub, textAlign: "center", maxWidth: 400 }}>
        {error?.message || "No se pudo establecer comunicación con Firebase Firestore. Verifica tu archivo de configuración o reglas."}
      </div>
    </div>
  );
}