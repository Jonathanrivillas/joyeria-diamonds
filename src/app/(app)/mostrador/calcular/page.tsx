import { requirePermiso } from "@/lib/session";
import { precioDelDia } from "@/lib/precio";
import { cop } from "@/lib/format";
import { Alert, PageContainer, PageHeader } from "@/components/ui";
import { Calculadora } from "./calculadora";

/** "¿Cuánto vale?": precio de una pieza por su peso, al precio del gramo de hoy. No vende nada. */
export default async function CalcularPage() {
  await requirePermiso("vender");
  const precio = await precioDelDia();

  return (
    <PageContainer width="fluid" className="space-y-6">
      <PageHeader
        title="¿Cuánto vale?"
        subtitle={precio.valor > 0 ? <>Precio del gramo hoy: <span className="font-bold text-neutral-900">{cop(precio.valor)}</span></> : undefined}
        back={{ href: "/mostrador", label: "Volver a Mi mostrador" }}
      />
      {precio.valor > 0 ? (
        <Calculadora precioGramo={precio.valor} />
      ) : (
        <Alert tone="warning">El administrador todavía no ha puesto el precio del gramo de hoy.</Alert>
      )}
    </PageContainer>
  );
}
