import { LogOut, UserRound } from "lucide-react";
import { requireSesion, getAlcance } from "@/lib/session";
import { LETRAS } from "@/lib/permisos";
import { Sidebar } from "@/components/layout/sidebar";
import { LocalSelector } from "@/components/layout/local-selector";
import { Button, Icon, SubmitButton } from "@/components/ui";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const rol = s.rol === "ADMIN" ? "Administrador" : "Vendedor";
  // Tamaño de letra que escogió la persona en "Mi cuenta". Todo el diseño usa rem, así que basta
  // con cambiar el tamaño base de la página para que crezca todo en proporción.
  const letra = LETRAS.find((l) => l.clave === s.letra)?.porcentaje ?? 100;

  return (
    <div className="flex min-h-screen">
      {letra !== 100 && <style>{`html{font-size:${letra}%}`}</style>}
      <Sidebar rol={s.rol} permisos={s.permisos ?? []} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Una sola línea: el nombre del local se acorta (…) antes que bajar "Salir" a otra línea. */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <LocalSelector
              esAdmin={s.rol === "ADMIN"}
              localId={localId}
              locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
            />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="hidden text-right sm:block">
              <span className="block font-semibold leading-tight">{s.nombre}</span>
              {/* El rol solo si no es lo mismo que el nombre (ej. usuario "Administrador"). */}
              {rol !== s.nombre && <span className="block text-sm text-neutral-500">{rol}</span>}
            </p>
            <span className="hidden sm:inline-flex">
              <Button variant="secondary" href="/mi-cuenta" icon={UserRound}>
                Mi cuenta
              </Button>
            </span>
            <form action={logout}>
              <SubmitButton variant="secondary" loadingText="Saliendo...">
                <Icon icon={LogOut} />
                Salir
              </SubmitButton>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
