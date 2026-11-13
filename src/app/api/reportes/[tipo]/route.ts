import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesion, getAlcance } from "@/lib/session";
import { aISO, finDia, inicioDia, parseFechaISO } from "@/lib/fechas";

function csv(filas: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // ";" y BOM para que Excel en español lo abra bien
  return "﻿" + filas.map((f) => f.map(esc).join(";")).join("\r\n");
}

const g = (cg: number) => (cg / 100).toFixed(2).replace(".", ",");

export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const s = await getSesion();
  if (!s) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = await getAlcance(s);
  const whereLocal = localId ? { localId } : {};
  const desde = inicioDia(parseFechaISO(req.nextUrl.searchParams.get("desde")));
  const hasta = finDia(parseFechaISO(req.nextUrl.searchParams.get("hasta")));

  let filas: (string | number | null)[][] = [];
  if (tipo === "ventas") {
    const items = await db.ventaItem.findMany({
      where: { venta: { ...whereLocal, fecha: { gte: desde, lte: hasta } } },
      include: { venta: { include: { local: true, usuario: true } }, categoria: true },
      orderBy: { venta: { fecha: "asc" } },
    });
    filas = [
      ["Factura", "Fecha", "Local", "Vendedor", "Cliente", "Pago", "Estado", "Categoría", "Descripción", "Peso (g)", "Cantidad", "Precio", "Hechura", "Subtotal"],
      ...items.map((i) => [
        i.venta.numero, i.venta.fecha.toLocaleString("es-CO"), i.venta.local.nombre, i.venta.usuario.nombre,
        i.venta.clienteNombre, i.venta.metodoPago, i.venta.estado, i.categoria.nombre, i.descripcion,
        g(i.pesoCg), i.cantidad, i.precioGramo, i.hechura, i.subtotal,
      ]),
    ];
  } else if (tipo === "gastos") {
    const gastos = await db.gasto.findMany({
      where: { ...whereLocal, fecha: { gte: desde, lte: hasta } },
      include: { local: true, usuario: true },
      orderBy: { fecha: "asc" },
    });
    filas = [
      ["Fecha", "Local", "Tipo", "Justificación", "Registró", "Monto"],
      ...gastos.map((x) => [x.fecha.toLocaleString("es-CO"), x.local.nombre, x.tipo, x.justificacion, x.usuario.nombre, x.monto]),
    ];
  } else if (tipo === "inventario") {
    const ex = await db.existencia.findMany({
      where: whereLocal,
      include: { local: true, categoria: true },
      orderBy: [{ localId: "asc" }, { categoria: { orden: "asc" } }],
    });
    filas = [
      ["Local", "Categoría", "Peso (g)", "Cantidad"],
      ...ex.map((e) => [e.local.nombre, e.categoria.nombre, g(e.pesoCg), e.cantidad]),
    ];
  } else {
    return NextResponse.json({ error: "Reporte no existe" }, { status: 404 });
  }

  return new NextResponse(csv(filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo}-${aISO(desde)}_${aISO(hasta)}.csv"`,
    },
  });
}
