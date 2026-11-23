/* Deja el sistema en 0 para empezar a usarlo de verdad.
 * BORRA: ventas, gastos, movimientos (kardex), arqueos, traslados, joyas preciosas,
 *        historial de cambios, intentos de inicio de sesión y todos los usuarios menos ADMIN_QUE_QUEDA.
 * PONE EN 0: el inventario de cada local (gramos, piezas y costos) y la numeración de facturas.
 * CONSERVA: ese administrador, locales, tipos de pieza (con su enlace a Alegra), proveedores y precio del gramo.
 *
 * No se puede deshacer: haga antes una rama de respaldo en Neon.
 * Uso: npx tsx --env-file=.env scripts/dejar-en-cero.ts --si-borrar-todo */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** El único usuario que se conserva. */
const ADMIN_QUE_QUEDA = "adminprueba@joyeria.com";

async function main() {
  const admin = await db.usuario.findUnique({ where: { email: ADMIN_QUE_QUEDA } });
  if (!admin || admin.rol !== "ADMIN" || !admin.activo) {
    console.log(`❌ No se borró nada: no existe un administrador activo con el correo ${ADMIN_QUE_QUEDA}.`);
    return;
  }
  if (!process.argv.includes("--si-borrar-todo")) {
    console.log(`No se borró nada. Se conservaría el usuario ${admin.nombre} (${admin.email}).`);
    console.log("Para confirmar, agregue --si-borrar-todo al final del comando.");
    return;
  }

  const r = await db.$transaction(
    async (tx) => {
      // En este orden por las relaciones entre tablas.
      const lineas = await tx.ventaItem.deleteMany();
      const ventas = await tx.venta.deleteMany();
      const joyas = await tx.pieza.deleteMany();
      const gastos = await tx.gasto.deleteMany();
      const movimientos = await tx.movimiento.deleteMany();
      await tx.arqueoDetalle.deleteMany();
      const arqueos = await tx.arqueo.deleteMany();
      await tx.trasladoItem.deleteMany();
      const traslados = await tx.traslado.deleteMany();
      const historial = await tx.auditoria.deleteMany();
      await tx.intentoLogin.deleteMany();
      const existencias = await tx.existencia.updateMany({ data: { pesoCg: 0, cantidad: 0, medidaConCosto: 0, costoTotal: 0 } });
      const locales = await tx.local.updateMany({ data: { consecutivo: 0 } });
      // El historial del precio del gramo se conserva, a nombre del administrador que queda.
      await tx.precioGramo.updateMany({ where: { usuarioId: { not: admin.id } }, data: { usuarioId: admin.id } });
      const usuarios = await tx.usuario.deleteMany({ where: { id: { not: admin.id } } });
      // Primer registro del historial nuevo: queda constancia de que se dejó en cero.
      await tx.auditoria.create({
        data: { accion: "DATOS_EN_CERO", usuarioId: admin.id, usuarioNombre: admin.nombre, detalle: { motivo: "Inicio de operación real" } },
      });
      return { lineas, ventas, joyas, gastos, movimientos, arqueos, traslados, historial, existencias, locales, usuarios };
    },
    { maxWait: 10_000, timeout: 60_000 },
  );

  console.log("✅ Listo. Se borró:");
  console.log(`   ${r.ventas.count} ventas (${r.lineas.count} líneas), ${r.gastos.count} gastos, ${r.movimientos.count} movimientos`);
  console.log(`   ${r.arqueos.count} arqueos, ${r.traslados.count} traslados, ${r.joyas.count} joyas preciosas, ${r.historial.count} registros del historial`);
  console.log(`   Inventario en 0 en ${r.existencias.count} existencias. Facturas de ${r.locales.count} locales empiezan otra vez en 000001.`);
  console.log(`   ${r.usuarios.count} usuarios borrados. Queda solo ${admin.nombre} (${admin.email}).`);
  console.log("   Se conservaron locales, tipos de pieza, proveedores y precio del gramo.");
}

main()
  .catch((e) => console.error("❌ No se borró nada:", e.message))
  .finally(() => db.$disconnect());
