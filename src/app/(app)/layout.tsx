import { requireSesion, getAlcance } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { LocalSelector } from "@/components/local-selector";
import { logout } from "@/app/login/actions";
import { LogOut } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);

  return (
    <div className="flex min-h-screen">
      <Sidebar rol={s.rol} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
          <LocalSelector
            esAdmin={s.rol === "ADMIN"}
            localId={localId}
            locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
          />
          <div className="flex items-center gap-3">
            <p className="hidden text-right sm:block">
              <span className="block font-semibold leading-tight">{s.nombre}</span>
              <span className="block text-sm text-stone-500">{s.rol === "ADMIN" ? "Administrador" : "Vendedor"}</span>
            </p>
            <form action={logout}>
              <button className="btn-secondary min-h-[2.75rem] px-4">
                <LogOut className="h-5 w-5" /> Salir
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
