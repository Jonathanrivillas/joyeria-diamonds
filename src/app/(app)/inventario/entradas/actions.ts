"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { registrarMovimiento } from "@/lib/inventario";
import { cop, gramos, parseCOP, parseGramos } from "@/lib/format";
import { aISO, parseFechaISO } from "@/lib/fechas";
import { auditar } from "@/lib/auditoria";

export type EstadoForm = { error?: string; ok?: string } | undefined;

/**
 * Ingreso de mercancía. Si es una compra (proveedor + precio), guarda el costo en el inventario
 * (para calcular la ganancia al vender) y anota el gasto "Pago a proveedor" por el total,
 * porque la compra se paga al ingresarla.
 */
export async function registrarEntrada(
  _prev: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const s = await requireAdmin();
  const localId = Number(form.get("localId"));
  const categoriaId = Number(form.get("categoriaId"));
  const pesoCg = parseGramos(String(form.get("peso") || "0"));
  const cantidad = Number(form.get("cantidad") || 0);
  const nota = String(form.get("nota") || "").trim();
  const proveedorId = Number(form.get("proveedorId")) || null;
  const precio = parseCOP(String(form.get("precio") || "0")); // por gramo, o por pieza si no controla peso
  const fechaTxt = String(form.get("fecha") || "");

  if (!localId || !categoriaId)
    return { error: "Escoja el local y el tipo de pieza." };
  const cat = await db.categoria.findUnique({ where: { id: categoriaId } });
  if (!cat || cat.esServicio) return { error: "Ese tipo de pieza no existe." };
  if (cat.porPieza) return { error: "Las joyas preciosas se registran una por una en Inventario → Joyas preciosas." };
  if (Number.isNaN(pesoCg) || pesoCg < 0)
    return {
      error: "El peso no se entiende. Escriba solo el número, ej: 5,20",
    };
  if (cat.controlaPeso && pesoCg <= 0)
    return { error: "Escriba cuánto pesa lo que llegó." };
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    return { error: "Escriba cuántas piezas son." };
  if (pesoCg > 100_000_000 || cantidad > 100_000)
    return { error: "El número es demasiado alto. Revíselo." };
  if (nota.length > 300)
    return { error: "La nota es muy larga (máximo 300 letras)." };

  // Compra: con proveedor el precio es obligatorio, y al revés.
  const proveedor = proveedorId ? await db.proveedor.findFirst({ where: { id: proveedorId, activo: true } }) : null;
  if (proveedorId && !proveedor) return { error: "Ese proveedor ya no está activo." };
  if (proveedor && precio <= 0)
    return { error: `Escriba a cómo se compró ${cat.controlaPeso ? "el gramo" : "cada pieza"}.` };
  if (!proveedor && precio > 0) return { error: "Escoja a cuál proveedor se le compró." };
  const valor = precio > 0 ? (cat.controlaPeso ? Math.round((pesoCg / 100) * precio) : precio * cantidad) : 0;
  if (valor > 2_000_000_000) return { error: "El total de la compra es demasiado alto. Revise el peso y el precio." };

  // Fecha en que llegó: hoy (con la hora actual) o un día anterior (a mediodía). Nunca en el futuro.
  const hoy = aISO(new Date());
  if (fechaTxt && !/^\d{4}-\d{2}-\d{2}$/.test(fechaTxt)) return { error: "La fecha no se entiende." };
  if (fechaTxt > hoy) return { error: "La fecha no puede ser después de hoy." };
  const fecha = !fechaTxt || fechaTxt === hoy ? new Date() : new Date(parseFechaISO(fechaTxt).getTime() + 12 * 3600_000);

  const peso = cat.controlaPeso ? pesoCg : 0;
  const notaFinal =
    nota || (proveedor ? `Compra a ${proveedor.nombre} · ${cop(precio)} ${cat.controlaPeso ? "el gramo" : "c/u"}` : "Ingreso de mercancía");

  await db.$transaction(async (tx) => {
    await registrarMovimiento(tx, {
      localId,
      categoriaId,
      usuarioId: s.id,
      tipo: "ENTRADA",
      pesoCg: peso,
      cantidad,
      nota: notaFinal,
      fecha,
      proveedorId: proveedor?.id,
      costo: valor > 0 ? { medida: cat.controlaPeso ? peso : cantidad, valor } : undefined,
    });
    if (proveedor && valor > 0) {
      await tx.gasto.create({
        data: {
          localId,
          usuarioId: s.id,
          tipo: "PROVEEDOR",
          proveedorId: proveedor.id,
          monto: valor,
          fecha,
          justificacion: `Compra de ${cat.controlaPeso ? gramos(peso) : `${cantidad} pzs`} de ${cat.nombre} a ${cop(precio)} ${cat.controlaPeso ? "el gramo" : "c/u"} (ingreso de mercancía)`,
        },
      });
    }
    await auditar(
      s,
      "ENTRADA_MERCANCIA",
      {
        entidad: "Categoria",
        entidadId: categoriaId,
        detalle: {
          localId,
          categoria: cat.nombre,
          pesoCg: peso,
          cantidad,
          nota: notaFinal,
          proveedor: proveedor?.nombre ?? null,
          precio,
          valor,
          fecha: fecha.toISOString(),
        },
      },
      tx,
    );
  });
  revalidatePath("/", "layout");
  return {
    ok: proveedor
      ? `Listo. Se sumó al inventario de ${cat.nombre} y se anotó el pago de ${cop(valor)} a ${proveedor.nombre} en Gastos.`
      : `Listo. Se sumó al inventario de ${cat.nombre}.`,
  };
}
