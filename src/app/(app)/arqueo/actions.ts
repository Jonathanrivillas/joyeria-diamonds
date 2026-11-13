"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSesion, localParaOperar } from "@/lib/session";
import { registrarMovimiento } from "@/lib/inventario";
import { auditar } from "@/lib/auditoria";

function estadoDe(
  pS: number,
  cS: number,
  pC: number | null,
  cC: number | null,
) {
  if (pC === null || cC === null) return null;
  if (pC === pS && cC === cS) return "OK";
  if (pC < pS || cC < cS) return "FALTA";
  return "SOBRA";
}

/** Abre el arqueo del día tomando una foto del saldo del sistema. */
export async function iniciarArqueo(form: FormData) {
  const s = await requireSesion();
  const localId = localParaOperar(s, Number(form.get("localId")) || null);

  const abierto = await db.arqueo.findFirst({
    where: { localId, estado: "ABIERTO" },
  });
  if (abierto) redirect(`/arqueo/${abierto.id}`);

  const [categorias, existencias] = await Promise.all([
    db.categoria.findMany({
      where: { activa: true },
      orderBy: { orden: "asc" },
    }),
    db.existencia.findMany({ where: { localId } }),
  ]);
  const ex = new Map(existencias.map((e) => [e.categoriaId, e]));
  const totalSis = existencias.reduce((a, e) => a + e.pesoCg, 0);

  const arqueo = await db.arqueo.create({
    data: {
      localId,
      usuarioId: s.id,
      pesoSistemaCg: totalSis,
      detalles: {
        create: categorias.map((c) => ({
          categoriaId: c.id,
          pesoSistemaCg: ex.get(c.id)?.pesoCg ?? 0,
          cantidadSistema: ex.get(c.id)?.cantidad ?? 0,
        })),
      },
    },
  });
  redirect(`/arqueo/${arqueo.id}`);
}

export type ConteoInput = {
  arqueoId: number;
  observacion: string;
  detalles: {
    id: number;
    pesoContadoCg: number | null;
    cantidadContada: number | null;
    observacion: string;
  }[];
};

async function guardar(
  s: { id: number; rol: string; localId: number | null },
  input: ConteoInput,
) {
  const arqueo = await db.arqueo.findUnique({
    where: { id: input.arqueoId },
    include: { detalles: true },
  });
  if (!arqueo) throw new Error("Arqueo no encontrado");
  if (arqueo.estado !== "ABIERTO") throw new Error("El arqueo ya está cerrado");
  if (s.rol !== "ADMIN" && arqueo.localId !== s.localId)
    throw new Error("Sin permiso");

  const mapa = new Map(input.detalles.map((d) => [d.id, d]));
  let totalCont = 0;
  await db.$transaction(
    arqueo.detalles.map((d) => {
      const n = mapa.get(d.id);
      const pC = n?.pesoContadoCg ?? null;
      const cC = n?.cantidadContada ?? null;
      totalCont += pC ?? 0;
      return db.arqueoDetalle.update({
        where: { id: d.id },
        data: {
          pesoContadoCg: pC,
          cantidadContada: cC,
          estado: estadoDe(d.pesoSistemaCg, d.cantidadSistema, pC, cC),
          observacion: n?.observacion?.trim() || null,
        },
      });
    }),
  );
  await db.arqueo.update({
    where: { id: arqueo.id },
    data: {
      pesoContadoCg: totalCont,
      observacion: input.observacion.trim() || null,
    },
  });
  return arqueo;
}

export async function guardarConteo(
  input: ConteoInput,
): Promise<{ error?: string; ok?: string }> {
  const s = await requireSesion();
  try {
    await guardar(s, input);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/arqueo/${input.arqueoId}`);
  return { ok: "Guardado. Puede salir y continuar el arqueo más tarde." };
}

export async function cerrarArqueo(
  input: ConteoInput,
  aplicarAjustes: boolean,
): Promise<{ error?: string }> {
  const s = await requireSesion();
  if (aplicarAjustes && s.rol !== "ADMIN")
    return {
      error: "Solo el administrador puede aplicar ajustes al inventario",
    };
  if (
    input.detalles.some(
      (d) => d.pesoContadoCg === null || d.cantidadContada === null,
    )
  ) {
    return { error: "Falta revisar algunas categorías antes de terminar." };
  }
  try {
    await guardar(s, input);
    await db.$transaction(
      async (tx) => {
        const arqueo = await tx.arqueo.findUniqueOrThrow({
          where: { id: input.arqueoId },
          include: { detalles: true },
        });
        if (aplicarAjustes) {
          for (const d of arqueo.detalles) {
            const dp = (d.pesoContadoCg ?? 0) - d.pesoSistemaCg;
            const dc = (d.cantidadContada ?? 0) - d.cantidadSistema;
            if (dp === 0 && dc === 0) continue;
            await registrarMovimiento(tx, {
              localId: arqueo.localId,
              categoriaId: d.categoriaId,
              usuarioId: s.id,
              tipo: "AJUSTE_ARQUEO",
              pesoCg: dp,
              cantidad: dc,
              referencia: `ARQ-${arqueo.id}`,
              nota: d.observacion ?? "Ajuste por arqueo",
              permitirNegativo: true,
            });
          }
        }
        await tx.arqueo.update({
          where: { id: arqueo.id },
          data: { estado: "CERRADO", ajustesAplicados: aplicarAjustes },
        });
        await auditar(
          s,
          aplicarAjustes ? "ARQUEO_CERRADO_CON_AJUSTES" : "ARQUEO_CERRADO",
          {
            entidad: "Arqueo",
            entidadId: arqueo.id,
            detalle: {
              localId: arqueo.localId,
              diferencias: arqueo.detalles
                .filter(
                  (d) =>
                    d.pesoContadoCg !== d.pesoSistemaCg ||
                    d.cantidadContada !== d.cantidadSistema,
                )
                .map((d) => ({
                  categoriaId: d.categoriaId,
                  sistemaCg: d.pesoSistemaCg,
                  contadoCg: d.pesoContadoCg,
                  sistemaCant: d.cantidadSistema,
                  contadaCant: d.cantidadContada,
                })),
            },
          },
          tx,
        );
      },
      { timeout: 20000 },
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  redirect(`/arqueo/${input.arqueoId}`);
}
