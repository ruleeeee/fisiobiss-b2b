// app/api/config/route.js
// GET → devuelve nextId
import { getNextId } from "@/lib/googleSheets";

export async function GET() {
  try {
    const nextId = await getNextId();
    return Response.json({ nextId });
  } catch (err) {
    console.error("[GET /api/config]", err);
    return Response.json({ nextId: 1 });
  }
}
