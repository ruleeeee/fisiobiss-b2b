// lib/firestore.js
// ─────────────────────────────────────────────────────────────
// All Firestore read/write operations for Fisiobiss B2B
// ─────────────────────────────────────────────────────────────
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, onSnapshot, writeBatch,
  query, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const ORDERS_COL = "orders";
const CONFIG_COL = "config";
const CONFIG_DOC = "app";

// ── CONFIG ──────────────────────────────────────────────────
export async function getNextId() {
  try {
    const snap = await getDoc(doc(db, CONFIG_COL, CONFIG_DOC));
    return snap.exists() ? (snap.data().nextId ?? 1) : 1;
  } catch {
    return 1;
  }
}

export async function setNextId(nextId) {
  await setDoc(doc(db, CONFIG_COL, CONFIG_DOC), { nextId }, { merge: true });
}

// ── ORDERS ──────────────────────────────────────────────────

/** Add a single new order */
export async function addOrder(order) {
  const ref = doc(db, ORDERS_COL, order.id);
  await setDoc(ref, {
    ...order,
    createdAt: serverTimestamp(),
  });
  // Increment nextId in config
  const currentNext = await getNextId();
  const orderNum = parseInt(order.id.replace("PED-", "")) || currentNext;
  await setNextId(Math.max(currentNext, orderNum + 1));
}

/** Update full order document */
export async function updateOrder(order) {
  const ref = doc(db, ORDERS_COL, order.id);
  await setDoc(ref, { ...order, updatedAt: serverTimestamp() }, { merge: true });
}

/** Update only the status field of an order */
export async function updateOrderStatus(orderId, estado) {
  const ref = doc(db, ORDERS_COL, orderId);
  await updateDoc(ref, { estado, updatedAt: serverTimestamp() });
}

/** Delete an order */
export async function deleteOrder(orderId) {
  await deleteDoc(doc(db, ORDERS_COL, orderId));
}

/** Get all orders once (no real-time) */
export async function getAllOrders() {
  const q = query(collection(db, ORDERS_COL), orderBy("fecha", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

/**
 * Real-time listener for all orders.
 * Returns an unsubscribe function.
 * @param {(orders: object[], nextId: number) => void} callback
 */
export function subscribeToOrders(callback) {
  const q = query(collection(db, ORDERS_COL), orderBy("fecha", "asc"));
  return onSnapshot(q, async (snap) => {
    const orders = snap.docs.map(d => {
      const data = d.data();
      // Convert Firestore Timestamps to ISO strings if needed
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
      };
    });
    const nextId = await getNextId();
    callback(orders, nextId);
  });
}

// ── SEED (bulk import) ──────────────────────────────────────

/**
 * Delete all existing orders and write a fresh batch.
 * Firestore limit: 500 ops per batch → we chunk by 400.
 */
export async function seedOrders(orders) {
  // 1. Delete all existing orders
  const existing = await getDocs(collection(db, ORDERS_COL));
  const deleteBatch = writeBatch(db);
  existing.forEach(d => deleteBatch.delete(d.ref));
  await deleteBatch.commit();

  // 2. Write new orders in chunks of 400
  const CHUNK = 400;
  for (let i = 0; i < orders.length; i += CHUNK) {
    const chunk = orders.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    chunk.forEach(order => {
      const ref = doc(db, ORDERS_COL, order.id);
      batch.set(ref, { ...order, seeded: true });
    });
    await batch.commit();
  }

  // 3. Update config nextId
  const maxNum = orders.reduce((max, o) => {
    const n = parseInt((o.id || "").replace("PED-", "")) || 0;
    return Math.max(max, n);
  }, 0);
  await setNextId(maxNum + 1);

  return orders.length;
}

// ── PRODUCTS CONFIG ──────────────────────────────────────────

/** Save custom product catalog to Firestore */
export async function saveProducts(products) {
  await setDoc(doc(db, CONFIG_COL, "products"), { list: products }, { merge: false });
}

/** Get custom product catalog (falls back to local constants if not found) */
export async function getProducts() {
  const snap = await getDoc(doc(db, CONFIG_COL, "products"));
  return snap.exists() ? snap.data().list : null;
}
