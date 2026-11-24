import { History, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { cop, fechaHora, gramos } from "@/lib/format";
import { Card, CardBody, CardHeader, EmptyState, PageContainer, PageHeader, Pagination, Table, Td, Th, Tr } from "@/components/ui";

const POR_PAGINA = 50;

const ACCIONES: Record<string, string> = {
  VENTA_ANULADA: "Anuló una factura",
  GASTO_ANULADO: "Anuló un gasto",
  ENTRADA_MERCANCIA: "Ingresó mercancía",
  TRASLADO: "Hizo un traslado",
  ARQUEO_CERRADO: "Terminó un arqueo",
  ARQUEO_CERRADO_CON_AJUSTES: "Terminó un arqueo y corrigió el inventario",
  PRECIO_GRAMO_CAMBIADO: "Cambió el precio del gramo",
  CATEGORIA_CREADA: "Creó un tipo de pieza",
  CATEGORIA_EDITADA: "Cambió un tipo de pieza",
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
    case "PRECIO_GRAMO_CAMBIADO":
      return `De ${cop(Number(d.antes))} a ${cop(Number(d.despues))} el gramo`;
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

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
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
    <PageContainer>
      <PageHeader
        title="Historial de cambios"
        subtitle="Quién hizo qué y cuándo"
        back={{ href: "/admin", label: "Volver a Administración" }}
        help="Aquí queda anotado todo lo delicado: facturas y gastos anulados, cambios de precios, usuarios, entradas, traslados y arqueos. Nada de esto se puede borrar."
      />

      {fallidos.length > 0 && (
        <Card tone="warning" emphasis as="section">
          <CardHeader
            icon={ShieldAlert}
            title="Intentos de entrada fallidos (últimos 7 días)"
            description="Si ve muchos intentos con un correo que no reconoce, alguien podría estar tratando de entrar."
            className="border-warning-200"
          />
          <CardBody>
            <ul className="space-y-1 text-base">
              {fallidos.map((f) => (
                <li key={f.email}>
                  <b>{f.email || "(sin correo)"}</b>: {f._count._all} intento(s)
                  {f._max.fecha && <>, el último {fechaHora(f._max.fecha)}</>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        {registros.length === 0 ? (
          <EmptyState icon={History} title="Todavía no hay nada anotado." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cuándo y quién</Th>
                <Th>Qué hizo</Th>
                <Th className="hidden xl:table-cell">Conexión</Th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <span className="block sm:whitespace-nowrap">{fechaHora(r.fecha)}</span>
                    <span className="block text-sm text-neutral-500">{r.usuarioNombre ?? "—"}</span>
                  </Td>
                  <Td>
                    <span className="block font-semibold">{ACCIONES[r.accion] ?? r.accion}</span>
                    <span className="block text-neutral-600">{resumen(r.accion, r.detalle as unknown as D | null)}</span>
                  </Td>
                  <Td className="hidden text-sm text-neutral-500 xl:table-cell">{r.ip}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination
        page={pagina}
        pages={paginas}
        total={total}
        perPage={POR_PAGINA}
        href={(n) => `/admin/auditoria?pagina=${n}`}
        previousLabel="Más recientes"
        nextLabel="Más antiguos"
      />
    </PageContainer>
  );
}
