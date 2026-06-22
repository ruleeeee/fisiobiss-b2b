// app/api/products/route.js
// GET  → retorna catálogo de productos (Sheet PRODUCTOS o fallback desde constants)
// PUT  → guarda catálogo de productos en Sheet PRODUCTOS
import { getProducts, saveProducts } from "@/lib/googleSheets";
import { PRODUCTS } from "@/lib/constants";

export async function GET() {
  try {
    const products = await getProducts();
    return Response.json({ products: products ?? PRODUCTS });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return Response.json({ products: PRODUCTS });
  }
}

export async function PUT(req) {
  try {
    const { products } = await req.json();
    if (!Array.isArray(products)) return Response.json({ error: "Formato inválido" }, { status: 400 });
    await saveProducts(products);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/products]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}