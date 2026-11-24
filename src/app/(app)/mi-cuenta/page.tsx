import { Check, KeyRound } from "lucide-react";
import { requireSesion } from "@/lib/session";
import { LETRAS } from "@/lib/permisos";
import { Button, Card, CardHeader, Icon, LabeledValue, PageContainer, PageHeader, SubmitButton, cn } from "@/components/ui";
import { guardarLetra } from "./actions";

/** Lo de cada persona: tamaño de letra y su clave. */
export default async function MiCuentaPage() {
  const s = await requireSesion();
  const actual = s.letra ?? "NORMAL";

  return (
    <PageContainer width="fluid" className="space-y-6">
      <PageHeader title="Mi cuenta" help="Ajuste el sistema a su gusto. Estos cambios son solo para usted." />

      {/* Pantalla ancha: letra y datos lado a lado. En celular, una debajo de otra. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Tamaño de la letra" description="Si le cuesta leer, escoja una letra más grande. Cambia en todas las pantallas." />
        <form action={guardarLetra} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          {LETRAS.map((l) => {
            const escogida = actual === l.clave;
            return (
              <SubmitButton
                key={l.clave}
                name="letra"
                value={l.clave}
                variant={escogida ? "primary" : "secondary"}
                className="h-auto flex-col gap-1 py-5"
                loadingText="Guardando..."
                aria-pressed={escogida}
              >
                {/* La muestra "Aa" se ve del tamaño que tendrá la letra. */}
                <span className="font-bold leading-none" style={{ fontSize: `${(l.porcentaje / 100) * 2}rem` }}>
                  Aa
                </span>
                <span className="flex items-center gap-1 text-lg">
                  {escogida && <Icon icon={Check} size="sm" />}
                  {l.nombre}
                </span>
              </SubmitButton>
            );
          })}
        </form>
      </Card>

      <Card>
        <CardHeader title="Mis datos" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-1">
          <LabeledValue label="Nombre">{s.nombre}</LabeledValue>
          <LabeledValue label="Correo para entrar">{s.email}</LabeledValue>
        </div>
        <div className={cn("border-t border-neutral-100 p-5")}>
          <Button href="/cambiar-clave" variant="secondary" icon={KeyRound}>
            Cambiar mi clave
          </Button>
        </div>
      </Card>
      </div>
    </PageContainer>
  );
}
