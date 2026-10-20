"use client";
import { colors } from "../../lib/theme";
import { C } from "../../lib/constants";

export default function ConnError({ error, onRetry }) {
  const msg = error?.message ?? String(error ?? "");
  const isSheets = msg.includes("SHEET") || msg.includes("spreadsheet") || msg.includes("Google");

  return (
    <div style={{
      minHeight:"100vh", background:C.bg, display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24,
    }}>
      <div style={{
        background:C.card, border:`1px solid ${C.cardB}`, borderRadius:16,
        padding:36, maxWidth:560, width:"100%",
      }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <span style={{ fontSize:40 }}>⚠️</span>
          <div style={{ fontSize:20, fontWeight:800, color:colors.warnSoft, marginTop:10 }}>
            Error de conexión
          </div>
          <div style={{ fontSize:13, color:C.gold, marginTop:6 }}>
            No se pudo conectar con Google Sheets
          </div>
        </div>

        {/* Error message */}
        <div style={{
          background:C.nav, border:`1px solid ${colors.warn}`, borderRadius:8,
          padding:"12px 16px", marginBottom:20, fontSize:12, color:colors.warnSoft,
          fontFamily:"monospace", wordBreak:"break-word",
        }}>
          {msg || "Error desconocido"}
        </div>

        {/* Checklist */}
        <div style={{
          background:C.nav, border:`1px solid ${C.cardB}`, borderRadius:10,
          padding:18, marginBottom:20, fontSize:12, color:C.gold, lineHeight:1.9,
        }}>
          <div style={{ fontWeight:700, color:C.cream, marginBottom:10, fontSize:13 }}>
            🔧 Verifica estos puntos:
          </div>
          <div>• Archivo <strong style={{color:C.cream}}>.env.local</strong> tiene las 3 variables configuradas</div>
          <div>• <strong style={{color:C.cream}}>GOOGLE_SHEET_ID</strong> es el ID correcto del Sheet (no la URL completa)</div>
          <div>• La <strong style={{color:C.cream}}>Service Account</strong> tiene acceso como Editor al Google Sheet</div>
          <div>• La <strong style={{color:C.cream}}>Google Sheets API</strong> está habilitada en el proyecto GCP</div>
          <div>• La clave privada en <strong style={{color:C.cream}}>GOOGLE_PRIVATE_KEY</strong> incluye los saltos de línea (<code>\n</code>)</div>
          <div>• Reinicia el servidor después de cambiar <strong style={{color:C.cream}}>.env.local</strong></div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          {onRetry && (
            <button onClick={onRetry} style={{
              flex:1, background:C.accentD, border:`1px solid ${C.accent}`,
              color:C.accent, borderRadius:9, padding:12, fontSize:14,
              fontWeight:700, cursor:"pointer",
            }}>
              ⟳ Reintentar
            </button>
          )}
          <button onClick={() => window.location.reload()} style={{
            flex:1, background:"transparent", border:`1px solid ${C.cardB}`,
            color:C.gold, borderRadius:9, padding:12, fontSize:13, cursor:"pointer",
          }}>
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
}
