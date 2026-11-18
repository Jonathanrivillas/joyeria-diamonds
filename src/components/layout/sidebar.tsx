"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button, Icon, Logo, LogoNombre, cn } from "@/components/ui";
import { OTROS, PRINCIPALES, esActivo, type Modulo } from "./navegacion";

function Enlace({ m, activo }: { m: Modulo; activo: boolean }) {
  return (
    <Link
      href={m.href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 transition",
        activo ? "bg-white text-neutral-950" : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
      )}
    >
      <Icon icon={m.icon} />
      <span>
        <span className="block text-base font-semibold leading-tight">{m.label}</span>
        {/* En pantallas bajas (laptop con zoom) se oculta la descripción para que el menú quepa sin desplazarse. */}
        <span className={cn("block text-sm leading-tight [@media(max-height:760px)]:hidden", activo ? "text-neutral-600" : "text-neutral-400")}>
          {m.detalle}
        </span>
      </span>
    </Link>
  );
}

export function Marca() {
  return (
    <div className="flex items-center gap-3 px-5 py-6 [@media(max-height:760px)]:py-4">
      <Logo size="md" priority />
      <div className="min-w-0 flex-1">
        <LogoNombre priority />
      </div>
    </div>
  );
}

export function Sidebar({ rol }: { rol: string }) {
  const path = usePathname();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setAbierto(false), [path]);
  const otros = OTROS.filter((m) => !m.admin || rol === "ADMIN");

  const contenido = (
    <>
      <Marca />
      <nav className="sin-barra flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Menú principal">
        {PRINCIPALES.map((m) => (
          <Enlace key={m.href} m={m} activo={esActivo(path, m.href)} />
        ))}
        <p className="px-3 pb-1 pt-5 text-sm font-semibold uppercase tracking-wide text-neutral-500 [@media(max-height:760px)]:pt-3">Más opciones</p>
        {otros.map((m) => (
          <Enlace key={m.href} m={m} activo={esActivo(path, m.href)} />
        ))}
      </nav>
    </>
  );

  const pestana = "flex flex-col items-center gap-0.5 py-2 text-sm font-semibold";

  return (
    <>
      {/* Computador: menú lateral fijo */}
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-neutral-950 lg:flex">{contenido}</aside>

      {/* Celular / tablet: barra inferior con lo principal + botón Menú */}
      <nav
        aria-label="Menú rápido"
        className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden"
      >
        {PRINCIPALES.slice(0, 4).map((m) => {
          const activo = esActivo(path, m.href);
          return (
            <Link key={m.href} href={m.href} aria-current={activo ? "page" : undefined} className={cn(pestana, activo ? "text-brand-800" : "text-neutral-600")}>
              <span className={cn("rounded-full px-4 py-1", activo && "bg-brand-100")}>
                <Icon icon={m.icon} size="md" />
              </span>
              {m.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setAbierto(true)} className={cn(pestana, "text-neutral-600")}>
          <span className="rounded-full px-4 py-1">
            <Icon icon={Menu} size="md" />
          </span>
          Menú
        </button>
      </nav>

      {abierto && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] animate-aparecer flex-col bg-neutral-950">
            <Button
              variant="ghost"
              icon={X}
              aria-label="Cerrar menú"
              onClick={() => setAbierto(false)}
              className="absolute right-3 top-5 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            />
            {contenido}
          </div>
        </div>
      )}
    </>
  );
}
