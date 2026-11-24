"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { registrarMovimiento } from "@/lib/inventario";
import { cop, gramos, parseCOP, parseGramos } from "@/lib/format";
import { auditar } from "@/lib/auditoria";
import { asegurarCategoriaJoyas, codigoAutomatico, TIPOS_JOYA } from "@/lib/joyas";

export type EstadoJoya = { error?: string; ok?: string } | undefined;

/**
 * Registra una joya preciosa con su código. Puede venir de:
 * - COMPRA: se le compró a un proveedor; guarda el costo y anota el gasto "Pago a proveedor".
 * - INVENTARIO: ya estaba en el inventario dentro de otro tipo de pieza (ej. Anillos-Esmeralda);
 *   se descuenta de allá y se suma aquí, así el total de gramos no cambia.
 * - OTRO: llega sin costo (ej. regalo, consignación).
 */
export async function registrarJoya(_prev: EstadoJoya, form: FormData): Promise<EstadoJoya> {
  const s = await requireAdmin();
  const localId = Number(form.get("localId"));
  const tipo = String(form.get("tipo") || "");
  const descripcion = String(form.get("descripcion") || "").trim();
  const codigoManual = String(form.get("codigo") || "").trim().toUpperCase();
  const pesoCg = parseGramos(String(form.get("peso") || ""));
  const precio = parseCOP(String(form.get("precio") || "0"));
  const origen = String(form.get("origen") || "");
  const proveedorId = Number(form.get("proveedorId")) || null;
  const costoCompra = parseCOP(String(form.get("costo") || "0"));
  const categoriaOrigenId = Number(form.get("categoriaOrigenId")) || null;

  if (!localId || !(await db.local.findUnique({ where: { id: localId } }))) return { error: "Escoja el local." };
  if (!TIPOS_JOYA[tipo]) return { error: "Toque qué tipo de joya es." };
  if (descripcion.length > 120) return { error: "La descripción es muy larga (máximo 120 letras)." };
  if (codigoManual && !/^[A-Z0-9-]{2,20}$/.test(codigoManual))
    return { error: "El código solo puede tener letras, números y guiones (ej. ESM-015)." };
  if (Number.isNaN(pesoCg) || pesoCg <= 0) return { error: "Escriba cuánto pesa la joya." };
  if (pesoCg > 10_000_000) return { error: "El peso es demasiado alto. Revíselo." };
  if (precio <= 0) return { error: "Escriba el precio de venta de la joya." };
  if (precio > 2_000_000_000 || costoCompra > 2_000_000_000) return { error: "El valor es demasiado alto. Revíselo." };
  if (!["COMPRA", "INVENTARIO", "OTRO"].includes(origen)) return { error: "Toque de dónde viene la joya." };

  const proveedor = origen === "COMPRA" && proveedorId ? await db.proveedor.findFirst({ where: { id: proveedorId, activo: true } }) : null;
  if (origen === "COMPRA" && !proveedor) return { error: "Toque a cuál proveedor se le compró." };
  if (origen === "COMPRA" && costoCompra <= 0) return { error: "Escriba cuánto costó la joya." };
  const catOrigen =
    origen === "INVENTARIO" && categoriaOrigenId ? await db.categoria.findUnique({ where: { id: categoriaOrigenId } }) : null;
  if (origen === "INVENTARIO" && (!catOrigen || catOrigen.esServicio || catOrigen.porPieza))
    return { error: "Toque de qué tipo de pieza del inventario sale." };

  if (codigoManual) {
    const repetido = await db.pieza.findFirst({ where: { codigo: { equals: codigoManual, mode: "insensitive" } } });
    if (repetido) return { error: `Ya hay una joya con el código ${repetido.codigo}.` };
  }

  const cat = await asegurarCategoriaJoyas();
  let codigo = "";
  try {
    await db.$transaction(
      async (tx) => {
        // Se crea primero para tener el id (el código automático sale de él).
        const pieza = await tx.pieza.create({
          data: {
            codigo: codigoManual || `TMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            tipo,
            descripcion,
            pesoCg,
            precio,
            localId,
            categoriaId: cat.id,
            proveedorId: proveedor?.id ?? null,
          },
        });
        codigo = codigoManual || codigoAutomatico(pieza.id);

        // Costo: el de la compra, o el que traía en el inventario viejo (si tenía).
        let costo = origen === "COMPRA" ? costoCompra : 0;
        if (catOrigen) {
          const { costoSalida } = await registrarMovimiento(tx, {
            localId,
            categoriaId: catOrigen.id,
            usuarioId: s.id,
            tipo: "RECLASIFICACION_SALIDA",
            pesoCg: catOrigen.controlaPeso ? -pesoCg : 0,
            cantidad: -1,
            referencia: codigo,
            nota: `Pasa a ${cat.nombre} como ${codigo}`,
          });
          costo = costoSalida.valor;
        }

        await tx.pieza.update({ where: { id: pieza.id }, data: { codigo, costo } });
        await registrarMovimiento(tx, {
          localId,
          categoriaId: cat.id,
          usuarioId: s.id,
          tipo: catOrigen ? "RECLASIFICACION_ENTRADA" : "ENTRADA",
          pesoCg,
          cantidad: 1,
          referencia: codigo,
          nota: [codigo, TIPOS_JOYA[tipo], descripcion, proveedor && `compra a ${proveedor.nombre}`, catOrigen && `venía de ${catOrigen.nombre}`]
            .filter(Boolean)
            .join(" · "),
          proveedorId: proveedor?.id,
          costo: costo > 0 ? { medida: pesoCg, valor: costo } : undefined,
        });

        if (proveedor) {
          await tx.gasto.create({
            data: {
              localId,
              usuarioId: s.id,
              tipo: "PROVEEDOR",
              proveedorId: proveedor.id,
              monto: costoCompra,
              justificacion: `Compra de joya preciosa ${codigo} (${TIPOS_JOYA[tipo]}${descripcion ? ` ${descripcion}` : ""}, ${gramos(pesoCg)})`,
            },
          });
        }

        await auditar(
          s,
          "JOYA_REGISTRADA",
          {
            entidad: "Pieza",
            entidadId: pieza.id,
            detalle: { codigo, tipo, descripcion, pesoCg, precio, costo, origen, proveedor: proveedor?.nombre ?? null, desde: catOrigen?.nombre ?? null },
          },
          tx,
        );
      },
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return {
    ok: `Listo, la joya quedó registrada con el código ${codigo}.${proveedor ? ` Se anotó el pago de ${cop(costoCompra)} a ${proveedor.nombre} en Gastos.` : ""}`,
  };
}

const volver = (clave: "ok" | "error", msg: string) => redirect(`/inventario/joyas?${clave}=${encodeURIComponent(msg)}`);

/** Cambia el precio de venta o la descripción de una joya que no se ha vendido. */
export async function editarJoya(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id"));
  const precio = parseCOP(String(form.get("precio") || "0"));
  const descripcion = String(form.get("descripcion") || "").trim();
  const antes = await db.pieza.findUnique({ where: { id } });
  if (!antes || antes.estado !== "DISPONIBLE") volver("error", "Esa joya ya no está disponible.");
  if (precio <= 0 || precio > 2_000_000_000) volver("error", "Escriba un precio válido.");
  if (descripcion.length > 120) volver("error", "La descripción es muy larga.");
  await db.pieza.update({ where: { id }, data: { precio, descripcion } });
  await auditar(s, "JOYA_EDITADA", {
    entidad: "Pieza",
    entidadId: id,
    detalle: { codigo: antes!.codigo, antes: { precio: antes!.precio, descripcion: antes!.descripcion }, despues: { precio, descripcion } },
  });
  revalidatePath("/inventario/joyas");
  volver("ok", `Se guardaron los cambios de ${antes!.codigo}.`);
}

/** Mueve una joya a otro local (queda como un traslado normal, con su costo). */
export async function moverJoya(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id"));
  const destinoId = Number(form.get("destinoId"));
  const p = await db.pieza.findUnique({ where: { id } });
  if (!p || p.estado !== "DISPONIBLE") volver("error", "Esa joya ya no está disponible.");
  const pieza = p!;
  if (!destinoId || destinoId === pieza.localId || !(await db.local.findUnique({ where: { id: destinoId } })))
    volver("error", "Escoja un local distinto al que tiene la joya.");

  try {
    await db.$transaction(async (tx) => {
      const t = await tx.traslado.create({
        data: {
          origenId: pieza.localId,
          destinoId,
          usuarioId: s.id,
          nota: `Joya ${pieza.codigo}`,
          items: { create: [{ categoriaId: pieza.categoriaId, pesoCg: pieza.pesoCg, cantidad: 1 }] },
        },
      });
      const ref = `TR-${t.id}`;
      const { costoSalida } = await registrarMovimiento(tx, {
        localId: pieza.localId,
        categoriaId: pieza.categoriaId,
        usuarioId: s.id,
        tipo: "TRASLADO_SALIDA",
        pesoCg: -pieza.pesoCg,
        cantidad: -1,
        referencia: ref,
        nota: pieza.codigo,
        costoExacto: { medida: pieza.costo > 0 ? pieza.pesoCg : 0, valor: pieza.costo },
      });
      await registrarMovimiento(tx, {
        localId: destinoId,
        categoriaId: pieza.categoriaId,
        usuarioId: s.id,
        tipo: "TRASLADO_ENTRADA",
        pesoCg: pieza.pesoCg,
        cantidad: 1,
        referencia: ref,
        nota: pieza.codigo,
        costo: costoSalida,
      });
      await tx.pieza.update({ where: { id: pieza.id }, data: { localId: destinoId } });
      await auditar(s, "JOYA_TRASLADADA", { entidad: "Pieza", entidadId: pieza.id, detalle: { codigo: pieza.codigo, origenId: pieza.localId, destinoId } }, tx);
    });
  } catch (e) {
    volver("error", (e as Error).message);
  }
  revalidatePath("/", "layout");
  volver("ok", `La joya ${pieza.codigo} se movió de local.`);
}
