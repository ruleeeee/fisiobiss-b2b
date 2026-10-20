"use client";
import { colors, fonts } from "../../lib/theme";
import BrandLockup from "../../components/BrandLockup";
import { useState } from "react";
import { useRouter } from "next/navigation";
 
export default function LoginPage() {
  const router = useRouter();
  const [user, setUser]   = useState("");
  const [pass, setPass]   = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow]   = useState(false);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión.");
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch {
      setError("No se pudo conectar. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: colors.bg,
      fontFamily: fonts.body,
    }}>
      <div style={{
        position: "relative", width: "100%", maxWidth: 420,
        margin: "0 20px",
      }}>
        {/* Card */}
        <div style={{
          background: colors.paper,
          border: `1px solid ${colors.line}`,
          borderRadius: 16,
          padding: "40px 36px",
          boxShadow: "0 8px 24px rgba(20,16,18,.08)",
        }}>
          {/* Logo / Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <BrandLockup height={52} />
            <p style={{
              color: colors.muted, fontSize: 13, margin: "12px 0 0 0",
            }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>
 
          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Usuario */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: colors.muted, letterSpacing: 1, marginBottom: 6,
              }}>USUARIO</label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                required
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: colors.paper, border: `1px solid ${colors.line}`,
                  color: colors.ink, padding: "11px 14px",
                  borderRadius: 8, fontSize: 14, outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = colors.purple}
                onBlur={e  => e.target.style.borderColor = colors.line}
              />
            </div>
 
            {/* Contraseña */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: colors.muted, letterSpacing: 1, marginBottom: 6,
              }}>CONTRASEÑA</label>
              <div style={{ position: "relative" }}>
                <input
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: colors.paper, border: `1px solid ${colors.line}`,
                    color: colors.ink, padding: "11px 42px 11px 14px",
                    borderRadius: 8, fontSize: 14, outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = colors.purple}
                  onBlur={e  => e.target.style.borderColor = colors.line}
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    color: colors.muted, cursor: "pointer", fontSize: 16,
                    padding: 0, lineHeight: 1,
                  }}
                  title={show ? "Ocultar" : "Mostrar"}
                >
                  {show ? "👁️" : "👁️"}
                </button>
              </div>
            </div>
 
            {/* Error */}
            {error && (
              <div style={{
                background: colors.warnSoft, border: `1px solid ${colors.warn}`,
                borderRadius: 8, padding: "10px 14px",
                color: colors.warn, fontSize: 13, marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>⚠️</span> {error}
              </div>
            )}
 
            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px",
                background: loading ? colors.line : colors.purple,
                color: colors.paper, border: "none",
                borderRadius: 8, fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
                letterSpacing: 0.5,
              }}
            >
              {loading ? "Verificando..." : "Ingresar →"}
            </button>
          </form>
        </div>
 
        {/* Footer */}
        <p style={{
          textAlign: "center", color: colors.line, fontSize: 11,
          marginTop: 20, letterSpacing: 0.5,
        }}>
          © 2026 Fisiobiss SpA · Acceso restringido
        </p>
      </div>
    </div>
  );
}