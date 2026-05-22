// app/api/orders/seed/route.js
// POST → carga masiva de pedidos históricos (solo usar una vez)
import { seedOrders } from "@/lib/googleSheets";

export async function POST(req) {
  try {
    const { orders } = await req.json();
    if (!Array.isArray(orders) || orders.length === 0) {
      return Response.json({ error: "Se requiere un array de pedidos" }, { status: 400 });
    }
    const count = await seedOrders(orders);
    return Response.json({ success: true, count });
  } catch (err) {
    console.error("[POST /api/orders/seed]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
