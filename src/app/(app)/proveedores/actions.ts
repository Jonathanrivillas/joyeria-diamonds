"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { auditar } from "@/lib/auditoria";

/** Crea o edita un proveedor. Los mensajes vuelven a la página en la dirección (?ok= / ?error=). */
export async function guardarProveedor(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id")) || null;
  const data = {
    nombre: String(form.get("nombre") || "").trim().replace(/\s+/g, " "),
    documento: String(form.get("documento") || "").trim(),
    telefono: String(form.get("telefono") || "").trim(),
    notas: String(form.get("notas") || "").trim(),
  };
  const volver = (clave: "ok" | "error", msg: string) => redirect(`/proveedores?${clave}=${encodeURIComponent(msg)}`);

  if (data.nombre.length < 2) volver("error", "Escriba el nombre del proveedor.");
  if (data.nombre.length > 80 || data.documento.length > 30 || data.telefono.length > 30 || data.notas.length > 200)
    volver("error", "Algún dato es demasiado largo. Revise y vuelva a intentar.");

  // Sin importar mayúsculas: "Japón" y "japón" son el mismo proveedor.
  const repetido = await db.proveedor.findFirst({
    where: { nombre: { equals: data.nombre, mode: "insensitive" }, ...(id ? { NOT: { id } } : {}) },
  });
  if (repetido) volver("error", `Ya existe un proveedor llamado "${repetido.nombre}".`);

  if (id) {
    const antes = await db.proveedor.findUnique({ where: { id } });
    if (!antes) volver("error", "Ese proveedor no existe.");
    await db.proveedor.update({ where: { id }, data });
    await auditar(s, "PROVEEDOR_EDITADO", { entidad: "Proveedor", entidadId: id, detalle: { antes, despues: data } });
  } else {
    const nuevo = await db.proveedor.create({ data });
    await auditar(s, "PROVEEDOR_CREADO", { entidad: "Proveedor", entidadId: nuevo.id, detalle: data });
  }
  revalidatePath("/proveedores");
  volver("ok", id ? `Se guardaron los cambios de ${data.nombre}.` : `Listo, ${data.nombre} quedó en la lista.`);
}

/** Los proveedores no se borran (sus compras y gastos quedan en el historial): se desactivan. */
export async function alternarProveedor(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id"));
  const p = await db.proveedor.findUnique({ where: { id } });
  if (!p) return;
  await db.proveedor.update({ where: { id }, data: { activo: !p.activo } });
  await auditar(s, p.activo ? "PROVEEDOR_DESACTIVADO" : "PROVEEDOR_ACTIVADO", { entidad: "Proveedor", entidadId: id, detalle: { nombre: p.nombre } });
  revalidatePath("/proveedores");
}
