/* Restablece la clave de un usuario que la olvidó (y desbloquea su cuenta).
 * Genera una clave temporal al azar; al entrar, el sistema le pide cambiarla.
 * Uso: npx tsx --env-file=.env scripts/restablecer-clave.ts correo@ejemplo.com */
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/** 10 caracteres fáciles de leer y dictar (sin 0/O, 1/l/I). */
function claveTemporal() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => letras[randomInt(letras.length)]).join("");
}

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) return console.log("Escriba el correo: npx tsx --env-file=.env scripts/restablecer-clave.ts correo@ejemplo.com");

  const u = await db.usuario.findUnique({ where: { email } });
  if (!u) return console.log(`❌ No existe un usuario con el correo ${email}.`);

  const clave = claveTemporal();
  await db.usuario.update({
    where: { id: u.id },
    data: {
      passwordHash: await bcrypt.hash(clave, 10),
      debeCambiarClave: true, // al entrar, debe poner una clave nueva
      sesionVersion: { increment: 1 }, // cierra las sesiones abiertas con la clave vieja
      activo: true,
    },
  });
  // Quita el bloqueo por intentos fallidos.
  await db.intentoLogin.deleteMany({ where: { email } });
  await db.auditoria.create({
    data: { accion: "CLAVE_RESTABLECIDA", entidad: "Usuario", entidadId: u.id, usuarioNombre: "Script de soporte", detalle: { email } },
  });

  console.log(`✅ Clave restablecida para ${u.nombre} (${email}).`);
  console.log(`   Clave temporal: ${clave}`);
  console.log("   Al entrar, el sistema le pedirá cambiarla.");
}

main()
  .catch((e) => console.error("❌", e.message))
  .finally(() => db.$disconnect());
