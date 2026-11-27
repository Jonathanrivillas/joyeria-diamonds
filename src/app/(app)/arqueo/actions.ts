"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSesion, exigirPermiso, localParaOperar } from "@/lib/session";
import { puedeVer } from "@/lib/permisos";
import { registrarMovimiento } from "@/lib/inventario";
import { auditar } from "@/lib/auditoria";
import { ErrorUsuario, mensajeSeguro } from "@/lib/errores";
import { z } from "zod";

const SIN_PERMISO_ARQUEO = "No tiene permiso para hacer arqueos. Pídaselo al administrador.";

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
  const s = await exigirPermiso("arqueo");
  const localId = localParaOperar(s, Number(form.get("localId")) || null);

  // Se bloquea la fila del local: con un doble clic (o dos personas a la vez) se abría dos veces.
  const arqueoId = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Local" WHERE id = ${localId} FOR UPDATE`;
    const abierto = await tx.arqueo.findFirst({ where: { localId, estado: "ABIERTO" } });
    if (abierto) return abierto.id;

    const [categorias, existencias] = await Promise.all([
      // Las joyas preciosas no se cuentan por gramos aquí: cada una tiene su código en su página.
      tx.categoria.findMany({ where: { activa: true, esServicio: false, porPieza: false }, orderBy: { orden: "asc" } }),
      tx.existencia.findMany({ where: { localId } }),
    ]);
    const ex = new Map(existencias.map((e) => [e.categoriaId, e]));
    // El total del sistema es la suma de lo que se va a contar (no de categorías inactivas).
    const totalSis = categorias.reduce((a, c) => a + (ex.get(c.id)?.pesoCg ?? 0), 0);

    const arqueo = await tx.arqueo.create({
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
    return arqueo.id;
  });
  redirect(`/arqueo/${arqueoId}`);
}

const ConteoSchema = z.object({
  arqueoId: z.number().int().positive(),
  observacion: z.string().max(500),
  detalles: z
    .array(
      z.object({
        id: z.number().int().positive(),
        pesoContadoCg: z.number().int().min(0).max(100_000_000).nullable(),
        cantidadContada: z.number().int().min(0).max(1_000_000).nullable(),
        observacion: z.string().max(300),
      }),
    )
    .max(500),
});

export type ConteoInput = z.infer<typeof ConteoSchema>;

const ERROR_CONTEO =
  "Los datos del conteo no son válidos. Recargue la página e intente de nuevo.";

async function guardar(
  s: { id: number; rol: string; localId: number | null },
  input: ConteoInput,
) {
  const arqueo = await db.arqueo.findUnique({
    where: { id: input.arqueoId },
    include: { detalles: true },
  });
  if (!arqueo) throw new ErrorUsuario("No se encontró ese arqueo. Vuelva a la lista de arqueos.");
  if (arqueo.estado !== "ABIERTO") throw new ErrorUsuario("Este arqueo ya se terminó.");
  if (s.rol !== "ADMIN" && arqueo.localId !== s.localId)
    throw new ErrorUsuario("Este arqueo es de otro local.");

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
  if (!puedeVer(s, "arqueo")) return { error: SIN_PERMISO_ARQUEO };
  const r = ConteoSchema.safeParse(input);
  if (!r.success) return { error: ERROR_CONTEO };
  input = r.data;
  try {
    await guardar(s, input);
  } catch (e) {
    return { error: mensajeSeguro(e, "guardarConteo") };
  }
  revalidatePath(`/arqueo/${input.arqueoId}`);
  return { ok: "Guardado. Puede salir y continuar el arqueo más tarde." };
}

export async function cerrarArqueo(
  input: ConteoInput,
  aplicarAjustes: boolean,
): Promise<{ error?: string }> {
  const s = await requireSesion();
  if (!puedeVer(s, "arqueo")) return { error: SIN_PERMISO_ARQUEO };
  const r = ConteoSchema.safeParse(input);
  if (!r.success) return { error: ERROR_CONTEO };
  input = r.data;
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
    await db.$transaction(async (tx) => {
      // Candado: solo un cierre puede pasar el arqueo de ABIERTO a CERRADO (evita aplicar los
      // ajustes dos veces con un doble clic).
      const tomado = await tx.arqueo.updateMany({
        where: { id: input.arqueoId, estado: "ABIERTO" },
        data: { estado: "CERRADO", ajustesAplicados: aplicarAjustes },
      });
      if (tomado.count === 0) throw new ErrorUsuario("Este arqueo ya se terminó.");

      const arqueo = await tx.arqueo.findUniqueOrThrow({
        where: { id: input.arqueoId },
        include: { detalles: { include: { categoria: true } } },
      });
      // Se revisa con lo guardado en la base, no con lo que mandó la pantalla: una fila sin contar
      // se habría ajustado a 0.
      if (arqueo.detalles.some((d) => d.pesoContadoCg === null || d.cantidadContada === null))
        throw new ErrorUsuario("Falta revisar algunas categorías antes de terminar.");

      // "Sistema" al cerrar = saldo ACTUAL (foto de apertura + todo lo que se vendió, ingresó o
      // trasladó mientras contaban). Antes se comparaba con la foto, y una venta hecha durante el
      // arqueo se descontaba dos veces al aplicar los ajustes.
      let totalSis = 0;
      let totalCont = 0;
      for (const d of arqueo.detalles) {
        await tx.$queryRaw`SELECT id FROM "Existencia" WHERE "localId" = ${arqueo.localId} AND "categoriaId" = ${d.categoriaId} FOR UPDATE`;
        const ex = await tx.existencia.findUnique({
          where: { localId_categoriaId: { localId: arqueo.localId, categoriaId: d.categoriaId } },
        });
        const pS = ex?.pesoCg ?? 0;
        const cS = ex?.cantidad ?? 0;
        const pC = d.pesoContadoCg ?? 0;
        const cC = d.cantidadContada ?? 0;
        totalSis += pS;
        totalCont += pC;
        if (pS !== d.pesoSistemaCg || cS !== d.cantidadSistema) {
          await tx.arqueoDetalle.update({
            where: { id: d.id },
            data: { pesoSistemaCg: pS, cantidadSistema: cS, estado: estadoDe(pS, cS, pC, cC) },
          });
          d.pesoSistemaCg = pS;
          d.cantidadSistema = cS;
        }
        // Las joyas preciosas se ajustan pieza por pieza en su página, no por gramos.
        if (!aplicarAjustes || d.categoria.porPieza) continue;
        const dp = pC - pS;
        const dc = cC - cS;
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
      await tx.arqueo.update({
        where: { id: arqueo.id },
        data: { pesoSistemaCg: totalSis, pesoContadoCg: totalCont },
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
    });
  } catch (e) {
    return { error: mensajeSeguro(e, "cerrarArqueo") };
  }
  revalidatePath("/", "layout");
  redirect(`/arqueo/${input.arqueoId}`);
}
