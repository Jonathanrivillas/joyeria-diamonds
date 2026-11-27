import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/session";
import { puedeVer } from "@/lib/permisos";
import { leerSoporte } from "@/lib/soportes";

const noEncontrado = () => new NextResponse("No encontrado", { status: 404 });

/** Cabeceras para mostrar un recibo: sin caché, sin adivinar el tipo y sin poder ejecutar nada. */
const cabeceras = (mime: string) => ({
  "Content-Type": mime,
  "Content-Disposition": "inline",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  // El recibo es una foto o un PDF: no puede cargar scripts ni otras páginas.
  "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; object-src 'self'; plugin-types application/pdf",
});

/** Entrega el recibo de un gasto solo a quien tiene sesión y permiso sobre ese local. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSesion();
  if (!s || s.debeCambiarClave) return new NextResponse("Su sesión terminó. Vuelva a entrar al sistema.", { status: 401 });
  if (!puedeVer(s, "gastos")) return noEncontrado();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return noEncontrado();

  const gasto = await db.gasto.findUnique({ where: { id }, select: { soporte: true, localId: true } });
  if (!gasto?.soporte) return noEncontrado();
  // Un vendedor solo ve recibos de su local (404 para no revelar que existe).
  if (s.rol !== "ADMIN" && gasto.localId !== s.localId) return noEncontrado();

  // Recibos nuevos: en el disco del servidor.
  if (!gasto.soporte.startsWith("https://")) {
    const archivo = await leerSoporte(gasto.soporte);
    if (!archivo) return noEncontrado();
    return new NextResponse(new Uint8Array(archivo.bytes), { headers: cabeceras(archivo.mime) });
  }

  // Recibos viejos en Vercel Blob (mientras no se pasen al disco con scripts/migrar-recibos.ts).
  let url: URL;
  try {
    url = new URL(gasto.soporte);
  } catch {
    return noEncontrado();
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".blob.vercel-storage.com")) return noEncontrado();
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok || !r.body) return noEncontrado();
  return new NextResponse(r.body, { headers: cabeceras(r.headers.get("content-type") ?? "application/octet-stream") });
}
