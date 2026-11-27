/* Pasa los recibos de gastos que están en Vercel Blob (https://…) al disco del servidor
 * (SOPORTES_DIR) y actualiza Gasto.soporte. Se puede correr varias veces: solo toca los que
 * todavía apuntan a Vercel. Hágalo ANTES de cerrar la cuenta de Vercel.
 * Uso: npx tsx --env-file=.env scripts/migrar-recibos.ts */
import { PrismaClient } from "@prisma/client";
import { detectarTipoArchivo } from "../src/lib/archivos";
import { guardarSoporte } from "../src/lib/soportes";

const db = new PrismaClient();

async function main() {
  const pendientes = await db.gasto.findMany({ where: { soporte: { startsWith: "https://" } }, select: { id: true, localId: true, soporte: true } });
  console.log(`Recibos en Vercel por pasar al disco: ${pendientes.length}`);
  let ok = 0;
  for (const g of pendientes) {
    try {
      const url = new URL(g.soporte!);
      if (!url.hostname.endsWith(".blob.vercel-storage.com")) throw new Error("no es de Vercel Blob");
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Vercel respondió ${r.status}`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const tipo = detectarTipoArchivo(bytes);
      if (!tipo) throw new Error("no es una foto ni un PDF reconocible");
      const rel = await guardarSoporte(g.localId, bytes, tipo.ext);
      await db.gasto.update({ where: { id: g.id }, data: { soporte: rel } });
      ok++;
      console.log(`✅ Gasto ${g.id} → ${rel}`);
    } catch (e) {
      console.log(`❌ Gasto ${g.id}: ${(e as Error).message} (queda como estaba; puede volver a correr el script)`);
    }
  }
  console.log(`Listo: ${ok} de ${pendientes.length} recibos pasados al disco.`);
}

main()
  .catch((e) => {
    console.error("❌", e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
