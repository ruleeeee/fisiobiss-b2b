import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, writeBatch, query, orderBy, serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

const ORDERS_COL = "orders";
const CONFIG_COL = "config";
const CONFIG_DOC = "app";

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

export async function addOrder(order) {
  const ref = doc(db, ORDERS_COL, order.id);
  await setDoc(ref, {
    ...order,
    createdAt: serverTimestamp(),
  });
  const currentNext = await getNextId();
  const orderNum = parseInt(order.id.replace("PED-", "")) || currentNext;
  await setNextId(Math.max(currentNext, orderNum + 1));
}

export async function updateOrderStatus(id, status) {
  await updateDoc(doc(db, ORDERS_COL, id), { status });
}

export async function deleteOrder(id) {
  await deleteDoc(doc(db, ORDERS_COL, id));
}

export async function seedOrders(orders) {
  const existing = await getDocs(collection(db, ORDERS_COL));
  const deleteBatch = writeBatch(db);
  existing.forEach(d => deleteBatch.delete(d.ref));
  await deleteBatch.commit();

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

  const maxNum = orders.reduce((max, o) => {
    const n = parseInt((o.id || "").replace("PED-", "")) || 0;
    return Math.max(max, n);
  }, 0);
  await setNextId(maxNum + 1);

  return orders.length;
}

export async function saveProducts(products) {
  await setDoc(doc(db, CONFIG_COL, "products"), { list: products });
}

export async function getProducts() {
  const snap = await getDoc(doc(db, CONFIG_COL, "products"));
  return snap.exists() ? snap.data().list : null;
}