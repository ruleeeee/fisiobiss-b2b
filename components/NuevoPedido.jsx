import { useState } from "react";
import { C, REGIONS, VENDEDORES_PRESET, PRODUCTS_PRESET, today } from "../lib/constants";
import { addOrder, getNextId } from "../lib/firestore";
import { s } from "./ui/shared";

export default function NuevoPedido({ onOrderAdded }) {
  const [vendedor, setVendedor] = useState(VENDEDORES_PRESET[0]);
  const [cliente, setCliente] = useState("");
  const [region, setRegion] = useState(REGIONS[0].name);
  const [items, setItems] = useState(PRODUCTS_PRESET.map(p => ({ ...p, qty: 0, regalo: 0 })));

  const handleCreate = async () => {
    if (!cliente.trim()) return alert("Escribe el nombre del cliente");
    
    const nextIdNum = await getNextId();
    const orderId = `PED-${String(nextIdNum).padStart(3, "0")}`;
    const selectedRegion = REGIONS.find(r => r.name === region);
    const selectedItems = items.filter(i => i.qty > 0 || i.regalo > 0);

    const subtotal = selectedItems.reduce((acc, i) => acc + (i.precio * i.qty), 0);
    const cogs = selectedItems.reduce((acc, i) => acc + (i.costo * (i.qty + i.regalo)), 0);
    const totalUnidades = selectedItems.reduce((acc, i) => acc + i.qty + i.regalo, 0);

    const orderObj = {
      id: orderId,
      fecha: today(),
      vendedor,
      cliente,
      region,
      status: "Pendiente",
      medioPago: "Transferencia",
      costoEnvio: selectedRegion.envio,
      subtotal,
      totalPagar: subtotal + selectedRegion.envio,
      totalUnidades,
      cogs,
      items: selectedItems
    };

    await addOrder(orderObj);
    alert(`Pedido ${orderId} creado con éxito!`);
    setCliente("");
    setItems(PRODUCTS_PRESET.map(p => ({ ...p, qty: 0, regalo: 0 })));
    if (onOrderAdded) onOrderAdded();
  };

  return (
    <div style={s.card}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#52B788" }}>Ingresar Orden Manual</h2>
      <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 12, color: C.sub }}>Cliente</label>
          <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} style={s.input} placeholder="Nombre de la tienda o contacto" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: C.sub }}>Vendedor</label>
            <select value={vendedor} onChange={e => setVendedor(e.target.value)} style={s.input}>
              {VENDEDORES_PRESET.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.sub }}>Región de Despacho</label>
            <select value={region} onChange={e => setRegion(e.target.value)} style={s.input}>
              {REGIONS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button onClick={handleCreate} style={s.btn}>Guardar e Inyectar Pedido</button>
    </div>
  );
}