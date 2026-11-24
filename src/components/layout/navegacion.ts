import {
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  FileBarChart,
  Home,
  Receipt,
  Settings,
  ShoppingBag,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Permiso } from "@/lib/permisos";

/** `permiso`: lo necesita un vendedor para ver el módulo. `admin`: solo el administrador. */
export type Modulo = { href: string; label: string; detalle: string; icon: LucideIcon; admin?: boolean; permiso?: Permiso };

/**
 * Cada módulo con su nombre e ícono oficial. El menú y los accesos del inicio salen de aquí,
 * así un módulo tiene el mismo ícono en todo el sitio.
 */
export const MODULOS = {
  inicio: { href: "/", label: "Inicio", detalle: "Resumen del día", icon: Home, permiso: "inicio" },
  vender: { href: "/ventas/nueva", label: "Vender", detalle: "Hacer una factura", icon: ShoppingBag, permiso: "vender" },
  inventario: { href: "/inventario", label: "Inventario", detalle: "Lo que hay en vitrina", icon: Boxes, permiso: "inventario" },
  gastos: { href: "/gastos", label: "Gastos", detalle: "Anotar lo que se gasta", icon: Wallet, permiso: "gastos" },
  arqueo: { href: "/arqueo", label: "Arqueo", detalle: "Contar la mercancía", icon: ClipboardCheck, permiso: "arqueo" },
  facturas: { href: "/ventas", label: "Facturas", detalle: "Ventas ya hechas", icon: Receipt, permiso: "facturas" },
  reportes: { href: "/reportes", label: "Reportes", detalle: "Cierre y gráficos", icon: FileBarChart, permiso: "reportes" },
  traslados: { href: "/traslados", label: "Traslados", detalle: "Mover entre locales", icon: ArrowLeftRight, admin: true },
  proveedores: { href: "/proveedores", label: "Proveedores", detalle: "A quién le compramos", icon: Truck, admin: true },
  admin: { href: "/admin", label: "Configuración", detalle: "Usuarios e historial", icon: Settings, admin: true },
} satisfies Record<string, Modulo>;

export const PRINCIPALES: Modulo[] = [MODULOS.inicio, MODULOS.vender, MODULOS.inventario, MODULOS.gastos, MODULOS.arqueo];
export const OTROS: Modulo[] = [MODULOS.facturas, MODULOS.reportes, MODULOS.traslados, MODULOS.proveedores, MODULOS.admin];

export function esActivo(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/ventas") return path === "/ventas" || /^\/ventas\/(\d+|historial)/.test(path);
  return path.startsWith(href);
}

/** ¿Este usuario ve el módulo en el menú? El ADMIN ve todo; el vendedor, lo que tenga permitido. */
export function moduloVisible(m: Modulo, rol: string, permisos: string[]): boolean {
  if (rol === "ADMIN") return true;
  if (m.admin) return false;
  return !m.permiso || permisos.includes(m.permiso);
}
