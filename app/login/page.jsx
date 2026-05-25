"use client";
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
      justifyContent: "center", background: "#060F07",
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: "-20%", left: "-10%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(82,183,136,0.07) 0%, transparent 70%)",
        }}/>
        <div style={{
          position: "absolute", bottom: "-20%", right: "-10%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(26,94,42,0.1) 0%, transparent 70%)",
        }}/>
      </div>
 
      <div style={{
        position: "relative", width: "100%", maxWidth: 420,
        margin: "0 20px",
      }}>
        {/* Card */}
        <div style={{
          background: "#0D1F12",
          border: "1px solid #1A3520",
          borderRadius: 16,
          padding: "40px 36px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}>
          {/* Logo / Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              marginBottom: 8,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: "linear-gradient(135deg, #1A5E2A, #52B788)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>🌿</div>
              <div>
                <div style={{
                  fontSize: 20, fontWeight: 800, color: "#E8F5EE",
                  letterSpacing: 1,
                }}>FISIOBISS</div>
                <div style={{
                  fontSize: 10, color: "#3A6A46", letterSpacing: 2,
                  fontWeight: 600, marginTop: -2,
                }}>B2B MAYORISTA</div>
              </div>
            </div>
            <p style={{
              color: "#3A6A46", fontSize: 13, margin: "12px 0 0 0",
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
                color: "#3A6A46", letterSpacing: 1, marginBottom: 6,
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
                  background: "#0A1A0C", border: "1px solid #1A3520",
                  color: "#E8F5EE", padding: "11px 14px",
                  borderRadius: 8, fontSize: 14, outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#52B788"}
                onBlur={e  => e.target.style.borderColor = "#1A3520"}
              />
            </div>
 
            {/* Contraseña */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: "#3A6A46", letterSpacing: 1, marginBottom: 6,
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
                    background: "#0A1A0C", border: "1px solid #1A3520",
                    color: "#E8F5EE", padding: "11px 42px 11px 14px",
                    borderRadius: 8, fontSize: 14, outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#52B788"}
                  onBlur={e  => e.target.style.borderColor = "#1A3520"}
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    color: "#3A6A46", cursor: "pointer", fontSize: 16,
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
                background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
                borderRadius: 8, padding: "10px 14px",
                color: "#FCA5A5", fontSize: 13, marginBottom: 16,
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
                background: loading
                  ? "#1A3520"
                  : "linear-gradient(135deg, #1A5E2A, #2D8A4E)",
                color: "#E8F5EE", border: "none",
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
          textAlign: "center", color: "#1A3520", fontSize: 11,
          marginTop: 20, letterSpacing: 0.5,
        }}>
          © 2026 Fisiobiss SpA · Acceso restringido
        </p>
      </div>
    </div>
  );
}