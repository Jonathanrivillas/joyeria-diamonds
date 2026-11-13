"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSesion, localParaOperar } from "@/lib/session";
import { registrarMovimiento, siguienteNumeroFactura } from "@/lib/inventario";

const ItemSchema = z.object({
  categoriaId: z.number().int().positive(),
  descripcion: z.string().max(120).default(""),
  pesoCg: z.number().int().min(0),
  cantidad: z.number().int().positive(),
  precioGramo: z.number().int().min(0),
  hechura: z.number().int().min(0).default(0),
});

const VentaSchema = z.object({
  localId: z.number().int().positive().nullable(),
  clienteNombre: z.string().max(120).optional(),
  clienteDocumento: z.string().max(40).optional(),
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA"]),
  items: z.array(ItemSchema).min(1, "Agrega al menos un ítem"),
});

export type NuevaVentaInput = z.infer<typeof VentaSchema>;

export async function crearVenta(input: NuevaVentaInput): Promise<{ error?: string; id?: number }> {
  const s = await requireSesion();
  const parsed = VentaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const v = parsed.data;

  let localId: number;
  try {
    localId = localParaOperar(s, v.localId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const categorias = await db.categoria.findMany({ where: { id: { in: v.items.map((i) => i.categoriaId) } } });
  const catMap = new Map(categorias.map((c) => [c.id, c]));

  const items = v.items.map((i) => {
    const c = catMap.get(i.categoriaId);
    if (!c) throw new Error("Categoría inválida");
    const subtotal = c.controlaPeso
      ? Math.round((i.pesoCg / 100) * i.precioGramo) + i.hechura
      : i.precioGramo * i.cantidad + i.hechura;
    return { ...i, pesoCg: c.controlaPeso ? i.pesoCg : 0, subtotal, controlaPeso: c.controlaPeso };
  });
  if (items.some((i) => i.controlaPeso && i.pesoCg <= 0)) return { error: "Indica el peso de cada pieza" };
  const total = items.reduce((a, i) => a + i.subtotal, 0);

  try {
    const venta = await db.$transaction(async (tx) => {
      const numero = await siguienteNumeroFactura(tx, localId);
      const venta = await tx.venta.create({
        data: {
          numero,
          localId,
          usuarioId: s.id,
          clienteNombre: v.clienteNombre?.trim() || null,
          clienteDocumento: v.clienteDocumento?.trim() || null,
          metodoPago: v.metodoPago,
          total,
          items: {
            create: items.map((i) => ({
              categoriaId: i.categoriaId,
              descripcion: i.descripcion,
              pesoCg: i.pesoCg,
              cantidad: i.cantidad,
              precioGramo: i.precioGramo,
              hechura: i.hechura,
              subtotal: i.subtotal,
            })),
          },
        },
      });
      for (const i of items) {
        await registrarMovimiento(tx, {
          localId,
          categoriaId: i.categoriaId,
          usuarioId: s.id,
          tipo: "VENTA",
          pesoCg: -i.pesoCg,
          cantidad: -i.cantidad,
          referencia: numero,
        });
      }
      return venta;
    });
    revalidatePath("/", "layout");
    return { id: venta.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function anularVenta(form: FormData) {
  const s = await requireSesion();
  if (s.rol !== "ADMIN") throw new Error("Solo el administrador puede anular facturas");
  const id = Number(form.get("id"));
  const motivo = String(form.get("motivo") || "").trim();
  if (!motivo) throw new Error("Indica el motivo de la anulación");

  await db.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({ where: { id }, include: { items: true } });
    if (!venta || venta.estado === "ANULADA") throw new Error("La factura no existe o ya está anulada");
    await tx.venta.update({ where: { id }, data: { estado: "ANULADA", motivoAnulacion: motivo } });
    for (const i of venta.items) {
      await registrarMovimiento(tx, {
        localId: venta.localId,
        categoriaId: i.categoriaId,
        usuarioId: s.id,
        tipo: "ANULACION",
        pesoCg: i.pesoCg,
        cantidad: i.cantidad,
        referencia: venta.numero,
        nota: `Anulación: ${motivo}`,
      });
    }
  });
  revalidatePath("/", "layout");
  redirect(`/ventas/${id}`);
}
