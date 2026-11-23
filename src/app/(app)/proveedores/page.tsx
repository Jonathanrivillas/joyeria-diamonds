import { Pencil, Plus, Save, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  Alert,
  Card,
  CardHeader,
  Disclosure,
  EmptyState,
  Icon,
  Input,
  LabeledValue,
  PageContainer,
  PageHeader,
  StatusBadge,
  SubmitButton,
  cn,
} from "@/components/ui";
import { cop, plural } from "@/lib/format";
import { alternarProveedor, guardarProveedor } from "./actions";

type Proveedor = { id: number; nombre: string; documento: string; telefono: string; notas: string };

/** Mismos campos para crear y para editar. */
function CamposProveedor({ p }: { p?: Proveedor }) {
  return (
    <>
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <Input label="Nombre" name="nombre" defaultValue={p?.nombre} required placeholder="Ej: Japón" />
      <Input label="NIT o cédula (si lo tiene)" name="documento" defaultValue={p?.documento} inputMode="numeric" />
      <Input label="Teléfono (si lo tiene)" name="telefono" defaultValue={p?.telefono} inputMode="tel" />
      <Input label="Notas (si quiere)" name="notas" defaultValue={p?.notas} placeholder="Ej: oro 18k, cuenta Bancolombia..." />
    </>
  );
}

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  // Los activos primero; dentro de cada grupo, por nombre.
  const [proveedores, llego, pagado] = await Promise.all([
    db.proveedor.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }] }),
    // Plata de ventas de la joyería que llegó a la cuenta de cada proveedor (solo ventas activas).
    db.venta.groupBy({ by: ["proveedorId"], where: { estado: "ACTIVA", proveedorId: { not: null } }, _sum: { total: true }, _count: true }),
    // Lo que la joyería le ha pagado a cada proveedor (gastos "Pago a proveedor" activos).
    db.gasto.groupBy({ by: ["proveedorId"], where: { estado: "ACTIVO", proveedorId: { not: null } }, _sum: { monto: true }, _count: true }),
  ]);
  const llegoA = new Map(llego.map((x) => [x.proveedorId, { total: x._sum.total ?? 0, n: x._count }]));
  const pagadoA = new Map(pagado.map((x) => [x.proveedorId, { total: x._sum.monto ?? 0, n: x._count }]));

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Proveedores"
        help="Las personas o empresas a quienes la joyería les compra oro, insumos o servicios. Después podrá escogerlos al anotar gastos, al ingresar mercancía y en las ventas que les pagan a ellos."
      />

      {sp.ok && <Alert tone="success">{sp.ok}</Alert>}
      {sp.error && <Alert tone="danger">{sp.error}</Alert>}

      {/* Lista (no tabla) para que se acomode a cualquier ancho sin desplazarse de lado. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          {proveedores.length === 0 ? (
            <EmptyState icon={Truck} title="Todavía no hay proveedores." description="Agregue el primero con el formulario." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {proveedores.map((p) => {
                const entro = llegoA.get(p.id) ?? { total: 0, n: 0 };
                const salio = pagadoA.get(p.id) ?? { total: 0, n: 0 };
                const diferencia = entro.total - salio.total;
                return (
                <li key={p.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-lg font-semibold">{p.nombre}</p>
                      {(p.documento || p.telefono) && (
                        <p className="text-base text-neutral-600">{[p.documento && `NIT/C.C. ${p.documento}`, p.telefono && `Tel. ${p.telefono}`].filter(Boolean).join(" · ")}</p>
                      )}
                      {p.notas && <p className="text-sm text-neutral-500">{p.notas}</p>}
                    </div>
                    <StatusBadge status={p.activo ? "HABILITADO" : "INACTIVO"} />
                    <form action={alternarProveedor}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton size="sm" variant={p.activo ? "danger-outline" : "secondary"} loadingText="Un momento...">
                        {p.activo ? "Desactivar" : "Activar"}
                      </SubmitButton>
                    </form>
                  </div>
                  <div className="grid grid-cols-1 gap-2 rounded-xl bg-neutral-50 p-3 sm:grid-cols-3">
                    <LabeledValue label="Le llegó de nuestras ventas">
                      <p className="text-lg font-semibold tabular-nums">{cop(entro.total)}</p>
                      <p className="text-sm text-neutral-500">{plural(entro.n, "venta", "ventas")}</p>
                    </LabeledValue>
                    <LabeledValue label="Le hemos pagado">
                      <p className="text-lg font-semibold tabular-nums">{cop(salio.total)}</p>
                      <p className="text-sm text-neutral-500">{plural(salio.n, "pago", "pagos")}</p>
                    </LabeledValue>
                    <LabeledValue label="Diferencia">
                      <p className={cn("text-lg font-bold tabular-nums", diferencia > 0 ? "text-success-700" : diferencia < 0 && "text-danger-700")}>
                        {cop(diferencia)}
                      </p>
                      <p className="text-sm text-neutral-500">lo que le llegó menos lo pagado</p>
                    </LabeledValue>
                  </div>
                  <Disclosure title="Editar datos" icon={Pencil}>
                    <form action={guardarProveedor} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <CamposProveedor p={p} />
                      <div className="sm:col-span-2">
                        <SubmitButton loadingText="Guardando...">
                          <Icon icon={Save} /> Guardar cambios
                        </SubmitButton>
                      </div>
                    </form>
                  </Disclosure>
                </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Agregar proveedor" icon={Plus} />
          <form action={guardarProveedor} className="space-y-4 p-5">
            <CamposProveedor />
            <SubmitButton block loadingText="Guardando...">
              <Icon icon={Plus} /> Agregar
            </SubmitButton>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
