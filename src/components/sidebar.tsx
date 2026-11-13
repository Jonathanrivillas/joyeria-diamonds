"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Home,
  ShoppingBag,
  Receipt,
  Boxes,
  Wallet,
  ClipboardCheck,
  ArrowLeftRight,
  FileBarChart,
  Settings,
  Gem,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; detalle: string; icon: LucideIcon; admin?: boolean };

const PRINCIPALES: Item[] = [
  { href: "/", label: "Inicio", detalle: "Resumen del día", icon: Home },
  { href: "/ventas/nueva", label: "Vender", detalle: "Hacer una factura", icon: ShoppingBag },
  { href: "/inventario", label: "Inventario", detalle: "Lo que hay en vitrina", icon: Boxes },
  { href: "/gastos", label: "Gastos", detalle: "Anotar lo que se gasta", icon: Wallet },
  { href: "/arqueo", label: "Arqueo", detalle: "Contar la mercancía", icon: ClipboardCheck },
];

const OTROS: Item[] = [
  { href: "/ventas", label: "Facturas", detalle: "Ventas ya hechas", icon: Receipt },
  { href: "/reportes", label: "Reportes", detalle: "Cierre y gráficos", icon: FileBarChart },
  { href: "/traslados", label: "Traslados", detalle: "Mover entre locales", icon: ArrowLeftRight, admin: true },
  { href: "/admin", label: "Configuración", detalle: "Precios y usuarios", icon: Settings, admin: true },
];

function esActivo(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/ventas") return path === "/ventas" || /^\/ventas\/\d+/.test(path);
  return path.startsWith(href);
}

function Enlace({ i, activo, onClick }: { i: Item; activo: boolean; onClick?: () => void }) {
  return (
    <Link
      href={i.href}
      onClick={onClick}
      aria-current={activo ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2 transition",
        activo ? "bg-oro-600 text-white" : "text-stone-200 hover:bg-stone-800 hover:text-white"
      )}
    >
      <i.icon className="h-5 w-5 shrink-0" />
      <span>
        <span className="block text-base font-semibold leading-tight">{i.label}</span>
        <span className={clsx("block text-sm leading-tight", activo ? "text-oro-50" : "text-stone-400")}>{i.detalle}</span>
      </span>
    </Link>
  );
}

export function Sidebar({ rol }: { rol: string }) {
  const path = usePathname();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setAbierto(false), [path]);
  const otros = OTROS.filter((i) => !i.admin || rol === "ADMIN");

  const contenido = (
    <>
      <div className="flex items-center gap-3 px-5 py-6">
        <Gem className="h-8 w-8 text-oro-400" />
        <div>
          <p className="text-lg font-bold text-white">Joyería</p>
          <p className="text-sm text-stone-400">Inventario por gramos</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {PRINCIPALES.map((i) => (
          <Enlace key={i.href} i={i} activo={esActivo(path, i.href)} />
        ))}
        <p className="px-3 pb-1 pt-5 text-sm font-semibold uppercase tracking-wide text-stone-500">Más opciones</p>
        {otros.map((i) => (
          <Enlace key={i.href} i={i} activo={esActivo(path, i.href)} />
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Computador: menú lateral fijo */}
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-stone-900 lg:flex">{contenido}</aside>

      {/* Celular / tablet: barra inferior con lo principal + botón Menú */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden">
        {PRINCIPALES.slice(0, 4).map((i) => {
          const activo = esActivo(path, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={clsx("flex flex-col items-center gap-0.5 py-2 text-sm font-semibold", activo ? "text-oro-800" : "text-stone-600")}
            >
              <span className={clsx("rounded-full px-4 py-1", activo && "bg-oro-100")}>
                <i.icon className="h-6 w-6" />
              </span>
              {i.label}
            </Link>
          );
        })}
        <button onClick={() => setAbierto(true)} className="flex flex-col items-center gap-0.5 py-2 text-sm font-semibold text-stone-600">
          <span className="rounded-full px-4 py-1">
            <Menu className="h-6 w-6" />
          </span>
          Menú
        </button>
      </nav>

      {abierto && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-stone-900">
            <button onClick={() => setAbierto(false)} className="absolute right-3 top-5 rounded-lg p-2 text-stone-300 hover:bg-stone-800" aria-label="Cerrar menú">
              <X className="h-7 w-7" />
            </button>
            {contenido}
          </div>
        </div>
      )}
    </>
  );
}
