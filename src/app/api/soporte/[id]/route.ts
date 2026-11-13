import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/session";

const noEncontrado = () => new NextResponse("No encontrado", { status: 404 });

/** Entrega el recibo de un gasto solo a quien tiene sesión y permiso sobre ese local. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getSesion();
  if (!s) return new NextResponse("No autorizado", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return noEncontrado();

  const gasto = await db.gasto.findUnique({
    where: { id },
    select: { soporte: true, localId: true },
  });
  if (!gasto?.soporte) return noEncontrado();
  // Un vendedor solo ve recibos de su local (404 para no revelar que existe).
  if (s.rol !== "ADMIN" && gasto.localId !== s.localId) return noEncontrado();

  // Solo se descargan archivos de nuestro almacenamiento de Vercel Blob.
  let url: URL;
  try {
    url = new URL(gasto.soporte);
  } catch {
    return noEncontrado();
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".blob.vercel-storage.com")
  )
    return noEncontrado();

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok || !r.body) return noEncontrado();

  return new NextResponse(r.body, {
    headers: {
      "Content-Type":
        r.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
