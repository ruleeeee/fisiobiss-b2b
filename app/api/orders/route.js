// app/api/orders/route.js
// GET  → devuelve todos los pedidos
// POST → agrega un pedido nuevo. El ID lo asigna el servidor.
import { getAllOrders, addOrder, setOrderComprobante } from "@/lib/googleSheets";
import { uploadComprobante } from "@/lib/drive";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/jpg"]);
const LIMIT = 5 * 1024 * 1024;

function fileProblem(file) {
  if (file.size > LIMIT) return "El comprobante supera 5 MB";
  const ext = String(file.name || "").split(".").pop()?.toLowerCase() || "";
  const okExt = ["pdf", "jpg", "jpeg", "png"].includes(ext);
  const okType = !file.type || ALLOWED.has(file.type);
  if (!okExt && !okType) return "El comprobante debe ser PDF, JPG o PNG";
  return null;
}

function fileMeta(file) {
  const extRaw = String(file.name || "").match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
  const ext = extRaw === "jpeg" ? "jpg" : (["pdf", "png", "jpg"].includes(extRaw) ? extRaw : "jpg");
  const mime = file.type || (ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg");
  return { ext, mime };
}

async function readPayload(req) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const raw = form.get("order");
    const order = JSON.parse(typeof raw === "string" ? raw : "{}");
    const file = form.get("file");
    const hasFile = file && typeof file.arrayBuffer === "function" && file.size > 0;
    return { order, file: hasFile ? file : null };
  }
  return { order: await req.json(), file: null };
}

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
    const { order, file } = await readPayload(req);
    if (!order || typeof order !== "object" || Array.isArray(order)) {
      return Response.json({ error: "Falta el pedido" }, { status: 400 });
    }
    if (file) {
      const problem = fileProblem(file);
      if (problem) return Response.json({ error: problem }, { status: 400 });
    }

    const { id: _id, comprobante: _comprobante, ...rest } = order;
    const saved = await addOrder(rest);

    let comprobante = "";
    let comprobanteError = null;
    if (file) {
      try {
        const { ext, mime } = fileMeta(file);
        const uploaded = await uploadComprobante({
          orderId: saved.id,
          name: `Comprobante_${saved.id}.${ext}`,
          mime,
          bytes: await file.arrayBuffer(),
        });
        comprobante = uploaded.webViewLink;
        await setOrderComprobante(saved.row, saved.comprobanteCol, comprobante);
      } catch (err) {
        comprobanteError = err instanceof Error ? err.message : "No se pudo subir el comprobante";
      }
    }

    return Response.json({ success: true, id: saved.id, comprobante, comprobanteError });
  } catch (err) {
    console.error("[POST /api/orders]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
