"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSesion, exigirPermiso, localParaOperar } from "@/lib/session";
import { puedeVer } from "@/lib/permisos";
import { precioDelDia } from "@/lib/precio";
import { registrarMovimiento, siguienteNumeroFactura } from "@/lib/inventario";
import { auditar } from "@/lib/auditoria";
import { facturarVenta } from "@/lib/factura-electronica";

const ItemSchema = z.object({
  categoriaId: z.number().int().positive(),
  descripcion: z.string().max(120).default(""),
  pesoCg: z.number().int().min(0).max(10_000_000), // hasta 100 kg
  cantidad: z.number().int().positive().max(10_000),
  precioGramo: z.number().int().min(0).max(100_000_000),
  hechura: z.number().int().min(0).max(100_000_000).default(0),
  piezaId: z.number().int().positive().optional(), // joya preciosa (categorías porPieza)
});

const VentaSchema = z.object({
  localId: z.number().int().positive().nullable(),
  clienteNombre: z.string().max(120).optional(),
  clienteDocumento: z.string().max(40).optional(),
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA"]),
  proveedorId: z.number().int().positive().nullable().optional(),
  canal: z.enum(["TIENDA", "REDES"]).default("TIENDA"),
  red: z.enum(["WHATSAPP", "INSTAGRAM", "FACEBOOK", "OTRA"]).optional(),
  redOtra: z.string().max(60).optional(),
  facturaElectronica: z.boolean().default(false),
  clienteTipoDoc: z.enum(["CC", "NIT", "CE", "PP"]).optional(),
  clienteCorreo: z.string().max(120).optional(),
  items: z.array(ItemSchema).min(1, "Agregue al menos una pieza").max(100),
});

export type NuevaVentaInput = z.infer<typeof VentaSchema>;

export async function crearVenta(input: NuevaVentaInput): Promise<{ error?: string; id?: number }> {
  const s = await requireSesion();
  if (!puedeVer(s, "vender")) return { error: "No tiene permiso para vender. Pídaselo al administrador." };
  const parsed = VentaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const v = parsed.data;

  if (v.facturaElectronica) {
    if (!v.clienteNombre?.trim()) return { error: "Para la factura electrónica escriba el nombre del cliente." };
    if (!v.clienteDocumento?.replace(/\D/g, "")) return { error: "Para la factura electrónica escriba el número de documento." };
    if (!/^\S+@\S+\.\S+$/.test(v.clienteCorreo?.trim() ?? "")) return { error: "Escriba un correo válido: allá le llega la factura al cliente." };
  }

  if (v.canal === "REDES" && !v.red) return { error: "Toque por cuál red se hizo la venta." };
  if (v.red === "OTRA" && !v.redOtra?.trim()) return { error: "Escriba por cuál red se hizo la venta." };

  // Solo una transferencia puede llegar a la cuenta de un proveedor, y el proveedor debe estar activo.
  const proveedorId = v.metodoPago === "TRANSFERENCIA" ? v.proveedorId ?? null : null;
  if (proveedorId && !(await db.proveedor.findFirst({ where: { id: proveedorId, activo: true } })))
    return { error: "Ese proveedor ya no está activo. Escoja otra cuenta." };


  let localId: number;
  try {
    localId = localParaOperar(s, v.localId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const categorias = await db.categoria.findMany({ where: { id: { in: v.items.map((i) => i.categoriaId) } } });
  const catMap = new Map(categorias.map((c) => [c.id, c]));

  // El vendedor vende al precio que puso el administrador: aquí se impone, sin importar lo que mande la pantalla.
  if (s.rol !== "ADMIN") {
    const oficial = (await precioDelDia()).valor;
    for (const i of v.items) {
      const c = catMap.get(i.categoriaId);
      if (!c || c.esServicio || c.porPieza) continue; // trabajos: el valor que se cobra; joyas: su propio precio
      i.precioGramo = c.controlaPeso ? oficial : c.precioUnidadSugerido;
      i.hechura = 0;
      if (i.precioGramo <= 0) return { error: "El administrador todavía no ha puesto el precio del gramo de hoy." };
    }
  }

  // Joyas preciosas: peso y precio salen de la joya guardada, no de lo que mande la pantalla.
  const piezaIds = v.items.map((i) => i.piezaId).filter((id): id is number => !!id);
  if (new Set(piezaIds).size !== piezaIds.length) return { error: "Una joya está dos veces en la venta." };
  const piezas = await db.pieza.findMany({ where: { id: { in: piezaIds } } });
  const piezaMap = new Map(piezas.map((p) => [p.id, p]));
  for (const i of v.items) {
    const c = catMap.get(i.categoriaId);
    if (!c?.porPieza) continue;
    const p = i.piezaId ? piezaMap.get(i.piezaId) : undefined;
    if (!p || p.categoriaId !== c.id) return { error: `Escoja la joya de ${c.nombre} por su código.` };
    if (p.estado !== "DISPONIBLE") return { error: `La joya ${p.codigo} ya se vendió.` };
    if (p.localId !== localId) return { error: `La joya ${p.codigo} está en otro local.` };
  }

  const items = v.items.map((i) => {
    const c = catMap.get(i.categoriaId);
    if (!c) throw new Error("Categoría inválida");
    const pieza = c.porPieza && i.piezaId ? piezaMap.get(i.piezaId) : undefined;
    if (pieza) {
      return {
        ...i,
        pesoCg: pieza.pesoCg,
        cantidad: 1,
        precioGramo: pieza.precio, // en joyas preciosas es el precio de la pieza
        hechura: 0,
        subtotal: pieza.precio,
        controlaPeso: c.controlaPeso,
        esServicio: false,
        pieza,
      };
    }
    const subtotal = c.controlaPeso
      ? Math.round((i.pesoCg / 100) * i.precioGramo) + i.hechura
      : i.precioGramo * i.cantidad + i.hechura;
    return { ...i, pesoCg: c.controlaPeso ? i.pesoCg : 0, subtotal, controlaPeso: c.controlaPeso, esServicio: c.esServicio, pieza: undefined };
  });
  if (items.some((i) => i.controlaPeso && i.pesoCg <= 0)) return { error: "Indica el peso de cada pieza" };
  if (items.some((i) => i.esServicio && (i.subtotal <= 0 || !i.descripcion.trim())))
    return { error: "Escriba el valor y qué trabajo es en cada fabricación o reparación." };
  const total = items.reduce((a, i) => a + i.subtotal, 0);
  if (total > 2_000_000_000) return { error: "El total es demasiado alto. Revise el peso y el precio." };

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
          proveedorId,
          canal: v.canal,
          red: v.canal === "REDES" ? v.red : null,
          redOtra: v.canal === "REDES" && v.red === "OTRA" ? v.redOtra?.trim() : null,
          clienteTipoDoc: v.facturaElectronica ? v.clienteTipoDoc ?? "CC" : null,
          clienteCorreo: v.facturaElectronica ? v.clienteCorreo?.trim() || null : null,
          facturaElectronica: v.facturaElectronica,
          alegraEstado: v.facturaElectronica ? "PENDIENTE" : null,
          total,
        },
      });
      for (const i of items) {
        // Fabricación y reparación son trabajos: no salen del inventario ni tienen costo de mercancía.
        const { costoSalida } = i.esServicio
          ? { costoSalida: { medida: 0, valor: 0 } }
          : await registrarMovimiento(tx, {
              localId,
              categoriaId: i.categoriaId,
              usuarioId: s.id,
              tipo: "VENTA",
              pesoCg: -i.pesoCg,
              cantidad: -i.cantidad,
              referencia: numero,
              // Una joya preciosa sale con su costo exacto (o sin costo si no lo tiene).
              costoExacto: i.pieza ? { medida: i.pieza.costo > 0 ? i.pieza.pesoCg : 0, valor: i.pieza.costo } : undefined,
            });
        if (i.pieza) {
          // Solo si sigue disponible: evita vender la misma joya dos veces al mismo tiempo.
          const marcada = await tx.pieza.updateMany({ where: { id: i.pieza.id, estado: "DISPONIBLE" }, data: { estado: "VENDIDA" } });
          if (marcada.count === 0) throw new Error(`La joya ${i.pieza.codigo} ya se vendió.`);
        }
        await tx.ventaItem.create({
          data: {
            ventaId: venta.id,
            categoriaId: i.categoriaId,
            descripcion: i.descripcion,
            pesoCg: i.pesoCg,
            cantidad: i.cantidad,
            precioGramo: i.precioGramo,
            hechura: i.hechura,
            subtotal: i.subtotal,
            costoMedida: costoSalida.medida,
            costo: costoSalida.valor,
            piezaId: i.pieza?.id ?? null,
          },
        });
      }
      return venta;
    }, { maxWait: 10_000, timeout: 20_000 }); // Neon puede tardar en "despertar"
    // Primero se guarda la venta; después se envía a Alegra. Si Alegra falla, la venta no se pierde.
    if (v.facturaElectronica) await facturarVenta(venta.id);
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
    const venta = await tx.venta.findUnique({ where: { id }, include: { items: { include: { categoria: true } } } });
    if (!venta || venta.estado === "ANULADA") throw new Error("La factura no existe o ya está anulada");
    await tx.venta.update({
      where: { id },
      data: { estado: "ANULADA", motivoAnulacion: motivo, anuladaPorId: s.id, anuladaEn: new Date() },
    });
    await auditar(s, "VENTA_ANULADA", {
      entidad: "Venta",
      entidadId: id,
      detalle: { numero: venta.numero, total: venta.total, motivo },
    }, tx);
    for (const i of venta.items.filter((i) => !i.categoria.esServicio)) {
      await registrarMovimiento(tx, {
        localId: venta.localId,
        categoriaId: i.categoriaId,
        usuarioId: s.id,
        tipo: "ANULACION",
        pesoCg: i.pesoCg,
        cantidad: i.cantidad,
        referencia: venta.numero,
        nota: `Anulación: ${motivo}`,
        // Vuelve al inventario con el mismo costo con que salió.
        costo: { medida: i.costoMedida, valor: i.costo },
      });
      // La joya preciosa vuelve a estar disponible para la venta.
      if (i.piezaId) await tx.pieza.update({ where: { id: i.piezaId }, data: { estado: "DISPONIBLE" } });
    }
  });
  revalidatePath("/", "layout");
  redirect(`/ventas/${id}`);
}

/** Vuelve a enviar a Alegra una venta cuya factura electrónica quedó pendiente o con error. */
export async function reintentarFactura(form: FormData) {
  const s = await exigirPermiso("vender", "facturas");
  const id = Number(form.get("id"));
  const venta = await db.venta.findUnique({ where: { id }, select: { localId: true } });
  if (!venta || (s.rol !== "ADMIN" && venta.localId !== s.localId)) throw new Error("La venta no existe");
  await facturarVenta(id);
  revalidatePath(`/ventas/${id}`);
}
