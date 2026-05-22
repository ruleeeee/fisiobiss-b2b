// app/api/orders/route.js
// GET  → devuelve todos los pedidos
// POST → agrega un pedido nuevo
import { getAllOrders, addOrder } from "@/lib/googleSheets";

export async function GET() {
  try {
    const orders = await getAllOrders();
    return Response.json({ orders });
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const order = await req.json();
    if (!order?.id) return Response.json({ error: "Falta el ID del pedido" }, { status: 400 });
    await addOrder(order);
    return Response.json({ success: true, id: order.id });
  } catch (err) {
    console.error("[POST /api/orders]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
