import { PRODUCTS_PRESET } from "./constants";

export const SEED_DATA = {
  orders: [
    {
      id: "PED-001",
      fecha: "2025-11-17",
      vendedor: "Jose Luis",
      cliente: "Jose Luis Crespo Vergara",
      telefono: "56955814669",
      email: "joseluiscrespovergara5@gmail.com",
      direccion: "Pasaje mastil 11118, La Florida",
      region: "Metropolitana",
      status: "Entregado",
      medioPago: "Transferencia",
      costoEnvio: 4500,
      subtotal: 107310,
      totalPagar: 111810,
      totalUnidades: 12,
      cogs: 41640,
      items: [
        { id: "FBS-SKU-001", name: "Cápsulas Melena de León", precio: 10116, costo: 3040, qty: 3, regalo: 0 },
        { id: "FBS-SKU-002", name: "Cápsulas Omega 3", precio: 11293, costo: 3940, qty: 3, regalo: 0 },
        { id: "FBS-SKU-003", name: "Cápsulas Magnesio", precio: 8675, costo: 3040, qty: 3, regalo: 0 },
        { id: "FBS-SKU-004", name: "Cápsulas Mix Fungi", precio: 10116, costo: 3840, qty: 3, regalo: 0 }
      ]
    }
  ]
};