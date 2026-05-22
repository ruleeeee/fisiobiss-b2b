import { C } from "../../lib/constants";

export default function DateFilter({ dateFilter, setDateFilter, dateFrom, setDateFrom, dateTo, setDateTo }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
      {["all", "today", "week", "month", "year", "custom"].map((q) => (
        <button
          key={q}
          onClick={() => setDateFilter(q)}
          style={{
            padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
            border: "none", cursor: "pointer",
            backgroundColor: dateFilter === q ? C.accent : C.cardB,
            color: C.text
          }}
        >
          {q === "all" ? "Todo" : q === "today" ? "Hoy" : q === "week" ? "Semana" : q === "month" ? "Mes" : q === "year" ? "Año" : "Personalizado"}
        </button>
      ))}

      {dateFilter === "custom" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} 
                 style={{ backgroundColor: C.inputBg, border: `1px solid ${C.inputB}`, color: C.text, padding: "4px 8px", borderRadius: "6px" }} />
          <span style={{ color: C.muted }}>a</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} 
                 style={{ backgroundColor: C.inputBg, border: `1px solid ${C.inputB}`, color: C.text, padding: "4px 8px", borderRadius: "6px" }} />
        </div>
      )}
    </div>
  );
}