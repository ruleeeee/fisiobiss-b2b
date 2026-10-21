"use client";
import { useState } from "react";
import { colors } from "../../lib/theme";
import { C } from "../../lib/constants";

const DEFAULT_SHEET = "11pwLRnJvYgKpHHL405YOMDIN6OuZT5INon01lQL9Olg";

export default function ConnError({ error, onRetry }) {
  const msg = error?.message ?? String(error ?? "");
  const [sheetId, setSheetId] = useState(DEFAULT_SHEET);
  const [account, setAccount] = useState(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    setStatus("");
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed?.client_email || !parsed?.private_key) {
        setAccount(null);
        setFileName("");
        setStatus("Ese archivo no es el JSON de una cuenta de servicio.");
        return;
      }
      setAccount(parsed);
      setFileName(file.name);
    } catch {
      setAccount(null);
      setFileName("");
      setStatus("No se pudo leer el JSON.");
    }
  };

  const connect = async () => {
    if (!account || busy) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/setup/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId,
          serviceAccount: {
            client_email: account.client_email,
            private_key: account.private_key,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || "No se pudo conectar con la hoja.");
        return;
      }
      if (onRetry) onRetry();
      else window.location.reload();
    } catch {
      setStatus("No se pudo conectar con la hoja.");
    } finally {
      setBusy(false);
    }
  };

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

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, color: C.cream, marginBottom: 8, fontSize: 13 }}>
            Conectar la cuenta de Google del sheet
          </div>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, marginBottom: 10 }}>
            Sube el JSON de la cuenta de servicio (Google Cloud). No es la contraseña de Gmail. La cuenta tiene que ser editor de la hoja.
          </div>
          <label style={{ display: "block", fontSize: 11, color: C.sub, marginBottom: 4 }}>Archivo JSON</label>
          <input type="file" accept="application/json,.json" onChange={onFile}
            style={{ width: "100%", marginBottom: 10, fontSize: 12, color: C.text }} />
          {fileName && (
            <div style={{ fontSize: 12, color: C.cream, marginBottom: 10 }}>{fileName} · {account?.client_email}</div>
          )}
          <label style={{ display: "block", fontSize: 11, color: C.sub, marginBottom: 4 }}>Hoja de cálculo</label>
          <input value={sheetId} onChange={e => setSheetId(e.target.value)}
            placeholder="Enlace o ID de la hoja"
            style={{
              width: "100%", boxSizing: "border-box", marginBottom: 10,
              background: C.inputBg, color: C.text, border: `1px solid ${C.inputB}`,
              borderRadius: 8, padding: "9px 10px", fontSize: 12,
            }} />
          {status && (
            <div style={{ fontSize: 12, color: colors.warnSoft, marginBottom: 10 }}>{status}</div>
          )}
          <button type="button" onClick={connect} disabled={!account || busy}
            style={{
              width: "100%", background: C.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: 12, fontSize: 14, fontWeight: 700,
              cursor: !account || busy ? "not-allowed" : "pointer", opacity: !account || busy ? 0.6 : 1,
            }}>
            {busy ? "Conectando..." : "Conectar con el sheet"}
          </button>
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
          <div>• Al conectar, la cuenta queda guardada en <strong style={{color:C.cream}}>.env.local</strong> y la hoja se vuelve a leer</div>
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
