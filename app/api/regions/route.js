// app/api/regions/route.js
// GET  → retorna costos de envío (Sheet REGIONES o fallback desde constants)
// PUT  → guarda costos de envío en Sheet REGIONES
import { getRegions, saveRegions } from "@/lib/googleSheets";
import { REGIONS } from "@/lib/constants";

export async function GET() {
  try {
    const regions = await getRegions();
    return Response.json({ regions: regions ?? REGIONS });
  } catch (err) {
    console.error("[GET /api/regions]", err);
    return Response.json({ regions: REGIONS });
  }
}

export async function PUT(req) {
  try {
    const { regions } = await req.json();
    if (!Array.isArray(regions)) return Response.json({ error: "Formato inválido" }, { status: 400 });
    await saveRegions(regions);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/regions]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}