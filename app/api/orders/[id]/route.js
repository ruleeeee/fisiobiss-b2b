// app/api/orders/[id]/route.js
// PATCH  → actualiza solo el estado
// PUT    → actualiza pedido completo
// DELETE → elimina un pedido
import { updateOrderStatus, updateOrder, deleteOrder } from "@/lib/googleSheets";

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { estado } = await req.json();
    if (!estado) return Response.json({ error: "Falta el campo estado" }, { status: 400 });
    await updateOrderStatus(id, estado);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/orders/:id]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const order = await req.json();
    await updateOrder({ ...order, id });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/orders/:id]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await deleteOrder(id);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/orders/:id]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
