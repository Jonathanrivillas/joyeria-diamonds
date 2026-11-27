/* Verificación de integridad: el saldo (Existencia) debe ser igual a la suma del kardex,
 * y una venta + anulación debe dejar el inventario igual. Uso: npx tsx scripts/verificar.ts */
import { PrismaClient } from "@prisma/client";
import { registrarMovimiento, siguienteNumeroFactura } from "../src/lib/inventario";

const db = new PrismaClient();

async function consistencia() {
  const ex = await db.existencia.findMany();
  const sumas = await db.movimiento.groupBy({ by: ["localId", "categoriaId"], _sum: { pesoCg: true, cantidad: true } });
  const m = new Map(sumas.map((s) => [`${s.localId}-${s.categoriaId}`, s._sum]));
  let errores = 0;
  for (const e of ex) {
    const s = m.get(`${e.localId}-${e.categoriaId}`);
    if ((s?.pesoCg ?? 0) !== e.pesoCg || (s?.cantidad ?? 0) !== e.cantidad) {
      errores++;
      console.log("✗ Inconsistencia", e, s);
    }
  }
  console.log(errores === 0 ? `✓ Kardex = saldo en ${ex.length} existencias` : `✗ ${errores} inconsistencias`);
  return errores;
}

async function main() {
  let fallos = await consistencia();

  // La prueba de venta + anulación escribe en la base y gasta un número de factura:
  // solo en bases de desarrollo (las mismas que permite scripts/datos.ts).
  const servidor = (process.env.DATABASE_URL ?? "").replace(/^[a-z]+:\/\/[^@]*@/, "").split(/[/:?]/)[0];
  const permitidos = (process.env.DATOS_PERMITIDOS_HOSTS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (process.env.NODE_ENV === "production" || !permitidos.some((p) => servidor.includes(p))) {
    console.log("· Prueba de venta y anulación omitida: esta base no está marcada como de desarrollo (solo se revisó el kardex).");
    if (fallos) process.exit(1);
    return;
  }

  const cadenas = await db.categoria.findUniqueOrThrow({ where: { nombre: "Cadenas" } });
  const vend = await db.usuario.findFirstOrThrow({ where: { rol: "VENDEDOR", activo: true, localId: { not: null } } });
  const localId = vend.localId!;
  const admin = await db.usuario.findFirstOrThrow({ where: { rol: "ADMIN", activo: true } });
  const antes = await db.existencia.findUniqueOrThrow({ where: { localId_categoriaId: { localId, categoriaId: cadenas.id } } });

  // Venta de 5,20 g de Cadenas
  const numero = await db.$transaction(async (tx) => {
    const numero = await siguienteNumeroFactura(tx, localId);
    await registrarMovimiento(tx, { localId, categoriaId: cadenas.id, usuarioId: vend.id, tipo: "VENTA", pesoCg: -520, cantidad: -1, referencia: numero });
    return numero;
  });
  const despues = await db.existencia.findUniqueOrThrow({ where: { id: antes.id } });
  const okVenta = despues.pesoCg === antes.pesoCg - 520 && despues.cantidad === antes.cantidad - 1;
  console.log(okVenta ? `✓ Venta ${numero}: Cadenas bajó 5,20 g` : "✗ Venta no descontó bien");

  // Anulación
  await db.$transaction((tx) =>
    registrarMovimiento(tx, { localId, categoriaId: cadenas.id, usuarioId: admin.id, tipo: "ANULACION", pesoCg: 520, cantidad: 1, referencia: numero })
  );
  const restaurado = await db.existencia.findUniqueOrThrow({ where: { id: antes.id } });
  const okAnul = restaurado.pesoCg === antes.pesoCg && restaurado.cantidad === antes.cantidad;
  console.log(okAnul ? "✓ Anulación restauró el inventario" : "✗ Anulación no restauró");

  // Sin existencia suficiente → debe fallar
  let bloqueado = false;
  try {
    await db.$transaction((tx) =>
      registrarMovimiento(tx, { localId, categoriaId: cadenas.id, usuarioId: vend.id, tipo: "VENTA", pesoCg: -(antes.pesoCg + 1), cantidad: -1 })
    );
  } catch (e) {
    bloqueado = true;
    console.log("✓ Venta sin existencia bloqueada:", (e as Error).message);
  }
  if (!bloqueado) console.log("✗ Permitió vender sin existencia");

  fallos += (await consistencia()) + (okVenta ? 0 : 1) + (okAnul ? 0 : 1) + (bloqueado ? 0 : 1);
  if (fallos) process.exit(1);
}

main().finally(() => db.$disconnect());
