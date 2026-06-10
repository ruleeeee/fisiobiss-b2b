// lib/clientIdentity.js
// ─────────────────────────────────────────────────────────────────────────────
// Identidad de clientes por teléfono y/o email (union-find).
//
// Reglas:
//  - El TELÉFONO es el identificador primario: misma identidad si coincide el tel.
//  - El EMAIL es secundario: misma identidad si coincide el email.
//  - Si un pedido tiene ambos, se unen los grupos de ese tel y ese email.
//  - El nombre NUNCA se usa para identificar.
//  - El grupo muestra TODOS los nombres, teléfonos y correos registrados.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza un teléfono chileno a "9XXXXXXXX" (9 dígitos, empieza en 9).
 * Acepta cualquier formato:
 *   +569XXXXXXXX, 569XXXXXXXX, 9XXXXXXXX  → extrae últimos 9 dígitos
 *   XXXXXXXX (8 dígitos sin el 9 inicial)  → le agrega el "9" al frente
 *   "xxxx xxxx" con o sin espacios         → ídem
 * Retorna null si no puede extraerse un número válido.
 */
export function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");

  // Caso 1: 11+ dígitos (ej. +56987654321) → tomar los últimos 9
  if (digits.length >= 11) {
    const last9 = digits.slice(-9);
    return last9.startsWith("9") ? last9 : null;
  }

  // Caso 2: exactamente 9 dígitos que empiezan en 9 → ya está bien
  if (digits.length === 9 && digits.startsWith("9")) {
    return digits;
  }

  // Caso 3: 10 dígitos que empiezan en 56 (ej. 5698765432) → últimos 9
  if (digits.length === 10 && digits.startsWith("56")) {
    const last9 = digits.slice(-9);
    return last9.startsWith("9") ? last9 : null;
  }

  // Caso 4: 8 dígitos (número sin el 9 inicial, ej. "87654321" o "8765 4321")
  if (digits.length === 8) {
    return "9" + digits;
  }

  // Caso 5: 9 dígitos que NO empiezan en 9 (raro, pero por si acaso)
  // → no podemos asumir nada, descartar
  return null;
}

/**
 * Normaliza email: lowercase + trim. Retorna null si no parece email válido.
 */
export function normalizeEmail(raw) {
  if (!raw) return null;
  const e = String(raw).trim().toLowerCase();
  return e.length > 3 && e.includes("@") ? e : null;
}

// ─── Union-Find con path compression ──────────────────────────────────────────
function makeUF() {
  const parent = {};
  const find = (x) => {
    if (!(x in parent)) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra; // ra queda como raíz
  };
  const root = (x) => find(x);
  return { find, union, root };
}

/**
 * Construye el índice de clientes a partir de una lista de pedidos.
 *
 * @param {Array} orders  Array de { id, telefono, email, cliente, fecha }
 * @returns {{ orderKeyMap, groups }}
 *   orderKeyMap: { [orderId]: clientKey }
 *   groups: { [clientKey]: {
 *     nombres: string[],      — todos los nombres usados (deduplicados)
 *     telefonos: string[],    — todos los teléfonos normalizados
 *     emails: string[],       — todos los emails normalizados
 *     nombre: string,         — nombre canónico (del pedido más reciente)
 *     telefono: string|null,  — primer tel disponible
 *     email: string|null,     — primer email disponible
 *     orderIds: string[],
 *   }}
 */
export function buildClientIndex(orders) {
  const uf = makeUF();

  // Nodos: uno por orderId + uno por "phone:X" y "email:X"
  // Esto evita el bug de orden: unimos los nodos de contacto directamente,
  // no los orderIds entre sí, para que el union sea idempotente y correcto.

  const byPhone = {}; // normalizedPhone → node key "phone:X"
  const byEmail = {}; // normalizedEmail → node key "email:X"

  // Paso 1: registrar nodos de contacto y unir pedido ↔ contacto
  orders.forEach(o => {
    if (!o.id) return;
    const oid = `ord:${o.id}`;
    uf.find(oid); // inicializar

    const phone = normalizePhone(o.telefono);
    const email = normalizeEmail(o.email);

    if (phone) {
      const pNode = `phone:${phone}`;
      uf.find(pNode); // inicializar
      if (!byPhone[phone]) byPhone[phone] = pNode;
      uf.union(oid, pNode); // pedido ↔ su tel
    }

    if (email) {
      const eNode = `email:${email}`;
      uf.find(eNode); // inicializar
      if (!byEmail[email]) byEmail[email] = eNode;
      uf.union(oid, eNode); // pedido ↔ su email
    }

    // Si el pedido tiene ambos, unir los nodos de tel y email entre sí
    // Esto cubre el caso: pedido A (tel+email1), pedido B (tel+email2) → mismo grupo
    if (phone && email) {
      uf.union(`phone:${phone}`, `email:${email}`);
    }
  });

  // Paso 2: recolectar orderIds por raíz
  const orderById = {};
  orders.forEach(o => { if (o.id) orderById[o.id] = o; });

  const rootToOids = {}; // root → [orderId, ...]
  orders.forEach(o => {
    if (!o.id) return;
    const root = uf.root(`ord:${o.id}`);
    if (!rootToOids[root]) rootToOids[root] = [];
    rootToOids[root].push(o.id);
  });

  // Paso 3: construir orderKeyMap y groups
  const orderKeyMap = {};
  const groups = {};

  Object.entries(rootToOids).forEach(([, memberIds]) => {
    // clientKey = ID del pedido más antiguo del grupo (estabilidad)
    const sorted = [...memberIds].sort((a, b) => {
      const fa = String(orderById[a]?.fecha || "").trim();
      const fb = String(orderById[b]?.fecha || "").trim();
      return fa.localeCompare(fb);
    });
    const clientKey = `cid:${sorted[0]}`;

    // Recolectar todos los nombres, teléfonos y emails del grupo
    const nombres = [];
    const telefonos = [];
    const emails = [];
    const namesSet = new Set();
    const telsSet = new Set();
    const mailsSet = new Set();

    // Recorrer por orden cronológico para que "más reciente" sea el último
    sorted.forEach(oid => {
      const o = orderById[oid];
      if (!o) return;
      const n = o.cliente?.trim();
      const t = normalizePhone(o.telefono);
      const m = normalizeEmail(o.email);
      if (n && !namesSet.has(n)) { namesSet.add(n); nombres.push(n); }
      if (t && !telsSet.has(t))  { telsSet.add(t);  telefonos.push(t); }
      if (m && !mailsSet.has(m)) { mailsSet.add(m);  emails.push(m); }
    });

    // Nombre canónico = más reciente (último en sorted)
    const nombre = nombres[nombres.length - 1] || "Sin nombre";

    memberIds.forEach(oid => { orderKeyMap[oid] = clientKey; });

    groups[clientKey] = {
      nombre,
      nombres,
      telefono: telefonos[0] || null,
      telefonos,
      email:    emails[0] || null,
      emails,
      orderIds: memberIds,
    };
  });

  return { orderKeyMap, groups };
}