import { LogOut, KeyRound } from "lucide-react";
import { requireSesion, getAlcance } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { LocalSelector } from "@/components/layout/local-selector";
import { Button } from "@/components/ui";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const rol = s.rol === "ADMIN" ? "Administrador" : "Vendedor";

  return (
    <div className="flex min-h-screen">
      <Sidebar rol={s.rol} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
          <LocalSelector
            esAdmin={s.rol === "ADMIN"}
            localId={localId}
            locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
          />
          <div className="flex items-center gap-3">
            <p className="hidden text-right sm:block">
              <span className="block font-semibold leading-tight">{s.nombre}</span>
              {/* El rol solo si no es lo mismo que el nombre (ej. usuario "Administrador"). */}
              {rol !== s.nombre && <span className="block text-sm text-neutral-500">{rol}</span>}
            </p>
            <span className="hidden sm:inline-flex">
              <Button variant="secondary" href="/cambiar-clave" icon={KeyRound}>
                Mi clave
              </Button>
            </span>
            <form action={logout}>
              <Button type="submit" variant="secondary" icon={LogOut}>
                Salir
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
