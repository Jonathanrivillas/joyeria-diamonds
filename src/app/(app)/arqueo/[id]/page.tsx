import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSesion } from "@/lib/session";
import { fechaHora } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { BotonImprimir } from "@/components/boton-imprimir";
import { ArqueoForm } from "./arqueo-form";

export default async function ArqueoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSesion();
  const a = await db.arqueo.findUnique({
    where: { id: Number(id) },
    include: {
      local: true,
      usuario: true,
      detalles: { include: { categoria: true }, orderBy: { categoria: { orden: "asc" } } },
    },
  });
  if (!a) notFound();
  if (s.rol !== "ADMIN" && a.localId !== s.localId) notFound();
  const cerrado = a.estado === "CERRADO";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo={cerrado ? "Resultado del arqueo" : "Arqueo del día"}
        subtitulo={`${a.local.nombre} · ${fechaHora(a.fecha)} · ${a.usuario.nombre}`}
        volver={{ href: "/arqueo", texto: "Volver a los arqueos" }}
        ayuda={
          cerrado
            ? undefined
            : "Cuente cada tipo de pieza. Si lo que contó es igual a lo que dice el sistema, toque «Está igual». Si no, toque «Es diferente» y escriba lo que contó."
        }
      >
        {cerrado && <BotonImprimir />}
      </PageHeader>
      <ArqueoForm
        arqueoId={a.id}
        cerrado={cerrado}
        ajustesAplicados={a.ajustesAplicados}
        esAdmin={s.rol === "ADMIN"}
        observacion={a.observacion ?? ""}
        detalles={a.detalles.map((d) => ({
          id: d.id,
          categoria: d.categoria.nombre,
          controlaPeso: d.categoria.controlaPeso,
          pesoSistemaCg: d.pesoSistemaCg,
          cantidadSistema: d.cantidadSistema,
          pesoContadoCg: d.pesoContadoCg,
          cantidadContada: d.cantidadContada,
          observacion: d.observacion ?? "",
        }))}
      />
    </div>
  );
}
