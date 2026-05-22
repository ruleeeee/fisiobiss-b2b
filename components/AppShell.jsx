import { C } from "../lib/constants";

export default function AppShell({ children, view, setView }) {
  const navItems = [
    { id: "dashboard", label: "📊 Dashboard", color: "#52B788" },
    { id: "nuevo", label: "🛒 Nuevo Pedido", color: C.accent },
    { id: "pedidos", label: "📦 Pedidos", color: C.orange },
    { id: "rentabilidad", label: "📈 Rentabilidad", color: C.blue },
    { id: "setup", label: "⚙️ Configuración", color: C.gold }
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: C.bg, color: C.text, fontFamily: "sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: "240px", backgroundColor: C.nav, borderRight: `1px solid ${C.cardB}`, padding: "20px 0" }}>
        <div style={{ padding: "0 20px 20px 20px", borderBottom: `1px solid ${C.cardB}`, marginBottom: "20px" }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#52B788", letterSpacing: "1px" }}>🌿 FISIOBISS</div>
          <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>Canal Mayorista B2B</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "0 10px" }}>
          {navItems.map(item => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  display: "flex", alignItems: "center", width: "100%", padding: "12px 16px",
                  borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600",
                  textAlign: "left", transition: "all 0.2s",
                  backgroundColor: active ? item.color : "transparent",
                  color: active ? C.bg : C.sub
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}