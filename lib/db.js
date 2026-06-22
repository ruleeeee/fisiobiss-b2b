// lib/db.js
// ─────────────────────────────────────────────────────────────────
// Funciones cliente que llaman a las API Routes de Next.js.
// Este archivo se importa en componentes "use client".
// NUNCA importa google-spreadsheet ni credenciales directamente.
// ─────────────────────────────────────────────────────────────────

const BASE = "/api/orders";

/** Obtiene todos los pedidos */
export async function getAllOrders() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error al obtener pedidos");
  const data = await res.json();
  return data.orders ?? [];
}

/** Obtiene el nextId desde el servidor */
export async function getNextId() {
  const res = await fetch("/api/config");
  if (!res.ok) return 1;
  const data = await res.json();
  return data.nextId ?? 1;
}

/** Agrega un nuevo pedido */
export async function addOrder(order) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Error al guardar pedido");
  }
  return res.json();
}

/** Actualiza solo el estado de un pedido */
export async function updateOrderStatus(orderId, estado) {
  const res = await fetch(`${BASE}/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error("Error al actualizar estado");
  return res.json();
}

/** Actualiza un pedido completo */
export async function updateOrder(order) {
  const res = await fetch(`${BASE}/${order.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error("Error al actualizar pedido");
  return res.json();
}

/** Elimina un pedido */
export async function deleteOrder(orderId) {
  const res = await fetch(`${BASE}/${orderId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar pedido");
  return res.json();
}

/** Carga masiva de pedidos históricos */
export async function seedOrders(orders) {
  const res = await fetch(`${BASE}/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders }),
  });
  if (!res.ok) throw new Error("Error al cargar datos históricos");
  return res.json();
}

/** Obtiene costos de envío por región */
export async function getRegions() {
  const res = await fetch("/api/regions");
  if (!res.ok) throw new Error("Error al obtener regiones");
  const data = await res.json();
  return data.regions ?? [];
}

/** Guarda costos de envío por región */
export async function saveRegions(regions) {
  const res = await fetch("/api/regions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regions }),
  });
  if (!res.ok) throw new Error("Error al guardar regiones");
  return res.json();
}
/** Obtiene catálogo de productos */
export async function getProducts() {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Error al obtener productos");
  const data = await res.json();
  return data.products ?? [];
}

/** Guarda catálogo de productos */
export async function saveProducts(products) {
  const res = await fetch("/api/products", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products }),
  });
  if (!res.ok) throw new Error("Error al guardar productos");
  return res.json();
}