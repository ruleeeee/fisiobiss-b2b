// hooks/useOrders.js
// ─────────────────────────────────────────────────────────────────
// Reemplaza el hook de Firebase por polling a la API de Google Sheets.
// Se actualiza cada 30 segundos automáticamente.
// ─────────────────────────────────────────────────────────────────
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getAllOrders, getNextId } from "../lib/db";
 
const POLL_INTERVAL = 30_000; // 30 segundos
 
export function useOrders() {
  const [orders,  setOrders]  = useState([]);
  const [nextId,  setNextId]  = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync,setLastSync]= useState(null);
  const timerRef = useRef(null);
 
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const [orderList, id] = await Promise.all([getAllOrders(), getNextId()]);
      setOrders(orderList);
      setNextId(id);
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      console.error("useOrders fetch error:", err);
      if (!silent) setError(err);
    } finally {
      setLoading(false);
      if (!silent) setSyncing(false);
    }
  }, []);
 
  // Carga inicial + polling
  useEffect(() => {
    fetchOrders(false);
    timerRef.current = setInterval(() => fetchOrders(true), POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchOrders]);
 
  /** Fuerza una re-sincronización manual (retorna Promise) */
  const refresh = () => fetchOrders(false);
 
  /** Actualiza el estado localmente sin esperar al próximo poll */
  const updateLocalStatus = (id, estado) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, estado } : o));
  };
 
  /** Agrega un pedido localmente (optimistic update) */
  const addLocalOrder = (order) => {
    setOrders(prev => [...prev, order]);
    setNextId(n => n + 1);
  };
 
  /** Elimina un pedido localmente (optimistic update) */
  const removeLocalOrder = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  return {
    orders,
    nextId,
    loading,
    error,
    syncing,
    lastSync,
    refresh,
    updateLocalStatus,
    addLocalOrder,
    removeLocalOrder,
  };
}
 
// Exportación legacy para compatibilidad con el nombre anterior
export { useOrders as useFirestore };