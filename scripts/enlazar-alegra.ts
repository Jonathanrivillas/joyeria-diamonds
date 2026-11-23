/* Crea en Alegra un producto por cada tipo de pieza que aún no esté enlazado.
 * Se puede correr varias veces: solo crea los que falten.
 * Uso: npx tsx --env-file=.env scripts/enlazar-alegra.ts */
import { PrismaClient } from "@prisma/client";
import { crearProductoAlegra } from "../src/lib/alegra";

const db = new PrismaClient();

async function main() {
  const pendientes = await db.categoria.findMany({
    where: { alegraItemId: null },
    orderBy: { orden: "asc" },
  });
  if (pendientes.length === 0) return console.log("✅ Todos los tipos de pieza ya están enlazados");

  for (const c of pendientes) {
    const id = await crearProductoAlegra(c.nombre);
    await db.categoria.update({ where: { id: c.id }, data: { alegraItemId: id } });
    console.log(`✅ ${c.nombre} → producto Alegra ${id}`);
  }
}

main()
  .catch((e) => console.error("❌", e.message))
  .finally(() => db.$disconnect());
