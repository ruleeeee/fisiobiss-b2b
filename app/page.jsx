"use client";

import { useState } from "react";
import { useFirestore } from "../hooks/useFirestore";
import { filterByDate } from "../lib/constants";

// Componentes modulares
import AppShell from "../components/AppShell";
import Dashboard from "../components/Dashboard";
import NuevoPedido from "../components/NuevoPedido";
import Pedidos from "../components/Pedidos";
import Rentabilidad from "../components/Rentabilidad";
import Setup from "../components/Setup";
import QuotationView from "../components/QuotationView";

// UI Atómicos
import ConnError from "../components/ui/ConnError";
import DateFilter from "../components/ui/DateFilter";

export default function Home() {
  const [view, setView] = useState("dashboard");
  const [quotationOrder, setQuotationOrder] = useState(null);
  
  // Estado de filtros de fecha
  const [dateFilter, setDateFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Hook personalizado de tiempo real
  const { orders, loading, error } = useFirestore();

  if (error) return <ConnError error={error} />;

  // Filtrar la data en caliente según los selectores de la UI
  const filteredOrders = filterByDate(orders, dateFilter, dateFrom, dateTo);

  return (
    <AppShell view={view} setView={setView}>
      {/* Barra superior de filtrado global */}
      {(view === "dashboard" || view === "pedidos" || view === "rentabilidad") && (
        <DateFilter 
          dateFilter={dateFilter} setDateFilter={setDateFilter}
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo} setDateTo={setDateTo}
        />
      )}

      {/* Ruteador de Vistas: Si está cargando, mostramos un texto sutil sin bloquear el menú */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", color: "#A39A84", fontSize: "14px" }}>
          ⏳ Sincronizando datos con la nube...
        </div>
      ) : (
        <>
          {view === "dashboard" && <Dashboard orders={filteredOrders} />}
          {view === "nuevo" && <NuevoPedido onOrderAdded={() => setView("pedidos")} />}
          {view === "pedidos" && <Pedidos orders={filteredOrders} setQuotationOrder={setQuotationOrder} />}
          {view === "rentabilidad" && <Rentabilidad orders={filteredOrders} />}
          {view === "setup" && <Setup />}
        </>
      )}

      {/* Modal flotante de Cotización (Imprimible) */}
      {quotationOrder && (
        <QuotationView order={quotationOrder} onClose={() => setQuotationOrder(null)} />
      )}
    </AppShell>
  );
}