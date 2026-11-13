import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Gem, Home, ShoppingBag, Ban } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion } from "@/lib/session";
import { cop, gramos, fechaHora, METODOS_PAGO } from "@/lib/format";
import { PageHeader, EstadoBadge, Aviso } from "@/components/ui";
import { BotonImprimir } from "@/components/boton-imprimir";
import { BotonConfirmar } from "@/components/confirmar";
import { anularVenta } from "../actions";

export default async function VentaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nueva?: string; cambio?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await requireSesion();
  const v = await db.venta.findUnique({
    where: { id: Number(id) },
    include: { local: true, usuario: true, items: { include: { categoria: true } } },
  });
  if (!v) notFound();
  if (s.rol !== "ADMIN" && v.localId !== s.localId) notFound();

  const peso = v.items.reduce((a, i) => a + i.pesoCg, 0);
  const cambio = Number(sp.cambio) || 0;

  return (
    <div className="mx-auto max-w-3xl">
      {sp.nueva ? (
        <div className="no-print mb-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-2 text-2xl font-bold text-emerald-900">¡Venta guardada!</h1>
          <p className="mt-1 text-lg text-emerald-800">
            Factura {v.numero} por {cop(v.total)}. Las piezas ya se descontaron del inventario.
          </p>
          {cambio > 0 && (
            <p className="mx-auto mt-4 w-fit rounded-xl bg-white px-6 py-3 text-2xl font-bold text-emerald-900">
              Recuerde devolver: {cop(cambio)}
            </p>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <BotonImprimir texto="Imprimir factura" grande />
            <Link href="/ventas/nueva" className="btn-primary btn-grande">
              <ShoppingBag className="h-6 w-6" /> Hacer otra venta
            </Link>
            <Link href="/" className="btn-secondary btn-grande">
              <Home className="h-6 w-6" /> Ir al inicio
            </Link>
          </div>
        </div>
      ) : (
        <PageHeader titulo={`Factura ${v.numero}`} volver={{ href: "/ventas", texto: "Volver a las facturas" }}>
          <BotonImprimir texto="Imprimir" />
        </PageHeader>
      )}

      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <Gem className="h-9 w-9 text-oro-600" />
            <div>
              <p className="text-xl font-bold">{v.local.nombre}</p>
              <p className="text-base text-stone-500">{v.local.direccion}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold">{v.numero}</p>
            <p className="text-base text-stone-500">{fechaHora(v.fecha)}</p>
            <div className="mt-1"><EstadoBadge estado={v.estado} /></div>
          </div>
        </div>

        <div className="grid gap-4 py-4 text-base sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-stone-500">Cliente</p>
            <p>{v.clienteNombre ?? "Consumidor final"}</p>
            {v.clienteDocumento && <p className="text-stone-500">C.C. {v.clienteDocumento}</p>}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-500">Atendió</p>
            <p>{v.usuario.nombre}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-500">Forma de pago</p>
            <p>{METODOS_PAGO[v.metodoPago]}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th>Pieza</th>
                <th className="num">Peso</th>
                <th className="num">Cant.</th>
                <th className="num">Precio</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {v.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className="font-semibold">{i.categoria.nombre}</span>
                    {i.descripcion && <span className="block text-sm text-stone-500">{i.descripcion}</span>}
                    {i.hechura > 0 && <span className="block text-sm text-stone-500">Incluye hechura {cop(i.hechura)}</span>}
                  </td>
                  <td className="num">{i.categoria.controlaPeso ? gramos(i.pesoCg) : "—"}</td>
                  <td className="num">{i.cantidad}</td>
                  <td className="num">{cop(i.precioGramo)}{i.categoria.controlaPeso ? " /g" : ""}</td>
                  <td className="num font-semibold">{cop(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1 text-base">
            <div className="flex justify-between"><span className="text-stone-500">Peso total</span><span>{gramos(peso)}</span></div>
            <div className="flex justify-between border-t-2 border-stone-200 pt-2 text-2xl font-bold">
              <span>Total</span><span className="text-oro-800">{cop(v.total)}</span>
            </div>
          </div>
        </div>

        {v.estado === "ANULADA" && (
          <div className="mt-6">
            <Aviso tipo="error">Esta factura fue anulada. Motivo: {v.motivoAnulacion}</Aviso>
          </div>
        )}
      </div>

      {s.rol === "ADMIN" && v.estado === "ACTIVA" && (
        <div className="no-print mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-stone-300 p-5">
          <p className="text-base text-stone-600">¿Se equivocó en esta factura? Puede anularla y las piezas vuelven al inventario.</p>
          <BotonConfirmar
            action={anularVenta}
            claseBoton="btn-secondary text-red-700"
            textoBoton={<><Ban className="h-5 w-5" /> Anular factura</>}
            titulo={`¿Anular la factura ${v.numero}?`}
            mensaje={<>La venta de {cop(v.total)} quedará anulada y las piezas vuelven al inventario. Esto no se puede deshacer.</>}
            textoConfirmar="Sí, anular la factura"
            campos={{ id: v.id }}
          >
            <div>
              <label className="label">¿Por qué la anula?</label>
              <input name="motivo" className="input" required placeholder="Ej: se digitó mal el peso" />
            </div>
          </BotonConfirmar>
        </div>
      )}
    </div>
  );
}
