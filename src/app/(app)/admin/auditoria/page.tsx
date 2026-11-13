import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { cop, fechaHora, gramos } from "@/lib/format";
import { PageHeader, Vacio } from "@/components/ui";

const POR_PAGINA = 50;

const ACCIONES: Record<string, string> = {
    VENTA_ANULADA: "Anuló una factura",
    GASTO_ANULADO: "Anuló un gasto",
    ENTRADA_MERCANCIA: "Ingresó mercancía",
    TRASLADO: "Hizo un traslado",
    ARQUEO_CERRADO: "Terminó un arqueo",
    ARQUEO_CERRADO_CON_AJUSTES: "Terminó un arqueo y corrigió el inventario",
    CATEGORIA_CREADA: "Creó una categoría",
    CATEGORIA_EDITADA: "Cambió una categoría o sus precios",
    LOCAL_GUARDADO: "Guardó los datos de un local",
    USUARIO_CREADO: "Creó un usuario",
    USUARIO_ACTUALIZADO: "Cambió un usuario o su contraseña",
    USUARIO_DESACTIVADO: "Desactivó un usuario",
    USUARIO_ACTIVADO: "Activó un usuario",
};

type D = Record<string, unknown>;

/** Explica en palabras sencillas el detalle de cada acción. */
function resumen(accion: string, d: D | null): string {
    if (!d) return "";
    switch (accion) {
        case "VENTA_ANULADA":
            return `Factura ${d.numero} por ${cop(Number(d.total))}. Motivo: ${d.motivo}`;
        case "GASTO_ANULADO":
            return `«${d.justificacion}» por ${cop(Number(d.monto))}. Motivo: ${d.motivo}`;
        case "ENTRADA_MERCANCIA":
        case "TRASLADO":
            return `${d.categoria}: ${gramos(Number(d.pesoCg))}, ${d.cantidad} pieza(s)`;
        case "ARQUEO_CERRADO":
        case "ARQUEO_CERRADO_CON_AJUSTES": {
            const n = Array.isArray(d.diferencias) ? d.diferencias.length : 0;
            return n ? `${n} categoría(s) con diferencia` : "Todo estaba igual";
        }
        case "CATEGORIA_CREADA":
        case "CATEGORIA_EDITADA":
            return String((d.despues as D | undefined)?.nombre ?? "");
        case "USUARIO_CREADO":
        case "USUARIO_ACTUALIZADO":
        case "USUARIO_DESACTIVADO":
        case "USUARIO_ACTIVADO":
            return String(d.email ?? "");
        case "LOCAL_GUARDADO":
            return String(d.nombre ?? "");
        default:
            return JSON.stringify(d);
    }
}

export default async function AuditoriaPage({
    searchParams,
}: {
    searchParams: Promise<{ pagina?: string }>;
}) {
    await requireAdmin();
    const pagina = Math.max(1, Number((await searchParams).pagina) || 1);
    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [registros, total, fallidos] = await Promise.all([
        db.auditoria.findMany({ orderBy: { fecha: "desc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
        db.auditoria.count(),
        db.intentoLogin.groupBy({
            by: ["email"],
            where: { exito: false, fecha: { gte: hace7Dias } },
            _count: { _all: true },
            _max: { fecha: true },
            orderBy: { _count: { email: "desc" } },
            take: 10,
        }),
    ]);
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                titulo="Historial de cambios"
                subtitulo="Quién hizo qué y cuándo"
                volver={{ href: "/admin", texto: "Volver a Administración" }}
                ayuda="Aquí queda anotado todo lo delicado: facturas y gastos anulados, cambios de precios, usuarios, entradas, traslados y arqueos. Nada de esto se puede borrar."
            />

            {fallidos.length > 0 && (
                <section className="card border-2 border-amber-200 bg-amber-50 p-5">
                    <h2 className="mb-2 text-lg font-bold">Intentos de entrada fallidos (últimos 7 días)</h2>
                    <ul className="space-y-1 text-base">
                        {fallidos.map((f) => (
                            <li key={f.email}>
                                <b>{f.email || "(sin correo)"}</b>: {f._count._all} intento(s)
                                {f._max.fecha && <>, el último {fechaHora(f._max.fecha)}</>}
                            </li>
                        ))}
                    </ul>
                    <p className="ayuda">Si ve muchos intentos con un correo que no reconoce, alguien podría estar tratando de entrar.</p>
                </section>
            )}

            <div className="card overflow-x-auto">
                {registros.length === 0 ? (
                    <Vacio texto="Todavía no hay nada anotado." />
                ) : (
                    <table className="tabla">
                        <thead>
                            <tr>
                                <th>Cuándo</th>
                                <th>Quién</th>
                                <th>Qué hizo</th>
                                <th>Detalle</th>
                                <th className="hidden md:table-cell">Conexión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registros.map((r) => (
                                <tr key={r.id}>
                                    <td className="whitespace-nowrap">{fechaHora(r.fecha)}</td>
                                    <td>{r.usuarioNombre ?? "—"}</td>
                                    <td className="font-semibold">{ACCIONES[r.accion] ?? r.accion}</td>
                                    <td className="text-stone-600">{resumen(r.accion, r.detalle as unknown as D | null)}</td>
                                    <td className="hidden text-sm text-stone-500 md:table-cell">{r.ip}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {paginas > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {pagina > 1 && (
                        <Link href={`/admin/auditoria?pagina=${pagina - 1}`} className="btn-secondary">← Más recientes</Link>
                    )}
                    <span className="text-base text-stone-600">Página {pagina} de {paginas}</span>
                    {pagina < paginas && (
                        <Link href={`/admin/auditoria?pagina=${pagina + 1}`} className="btn-secondary">Más antiguos →</Link>
                    )}
                </div>
            )}
        </div>
    );
}
