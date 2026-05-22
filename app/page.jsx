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
import Splash from "../components/ui/Splash";
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

  if (loading) return <Splash />;
  if (error) return <ConnError error={error} />;

  // Filtrar la data en caliente según los selectores de la UI
  const filteredOrders = filterByDate(orders, dateFilter, dateFrom, dateTo);

  return (
    <AppShell view={view} setView={setView}>
      {/* Barra superior de filtrado global (visible en todas las vistas analíticas) */}
      {(view === "dashboard" || view === "pedidos" || view === "rentabilidad") && (
        <DateFilter 
          dateFilter={dateFilter} setDateFilter={setDateFilter}
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo} setDateTo={setDateTo}
        />
      )}

      {/* Ruteador de Vistas */}
      {view === "dashboard" && <Dashboard orders={filteredOrders} />}
      {view === "nuevo" && <NuevoPedido onOrderAdded={() => setView("pedidos")} />}
      {view === "pedidos" && <Pedidos orders={filteredOrders} setQuotationOrder={setQuotationOrder} />}
      {view === "rentabilidad" && <Rentabilidad orders={filteredOrders} />}
      {view === "setup" && <Setup />}

      {/* Modal flotante de Cotización (Imprimible) */}
      {quotationOrder && (
        <QuotationView order={quotationOrder} onClose={() => setQuotationOrder(null)} />
      )}
    </AppShell>
  );
}