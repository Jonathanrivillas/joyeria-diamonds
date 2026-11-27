import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Siempre en vivo (nunca de caché): es para saber si el sistema y la base responden AHORA.
export const dynamic = "force-dynamic";

/**
 * Para el monitor externo (ej. UptimeRobot): 200 si la app y la base responden, 503 si no.
 * No pide sesión y no muestra ningún dato del negocio.
 */
export async function GET() {
  const inicio = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ms: Date.now() - inicio }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(`[${new Date().toISOString()}] /api/salud: la base no responde`, e);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
