import {
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  FileBarChart,
  Home,
  Receipt,
  Settings,
  Store,
  ShoppingBag,
  Truck,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Permiso } from "@/lib/permisos";

/** `permiso`: lo necesita un vendedor para ver el módulo. `admin`: solo el administrador. */
export type Modulo = {
  href: string;
  label: string;
  detalle: string;
  icon: LucideIcon;
  admin?: boolean;
  permiso?: Permiso;
  /** Solo en el menú de los vendedores (el administrador tiene su Inicio). */
  soloVendedor?: boolean;
  /** Nombre corto para la barra de abajo del celular (si el normal es largo). */
  corto?: string;
};

/**
 * Cada módulo con su nombre e ícono oficial. El menú y los accesos del inicio salen de aquí,
 * así un módulo tiene el mismo ícono en todo el sitio.
 */
export const MODULOS = {
  mostrador: { href: "/mostrador", label: "Mi mostrador", corto: "Mostrador", detalle: "Precio del día y mis ventas", icon: Store, permiso: "vender", soloVendedor: true },
  inicio: { href: "/", label: "Inicio", detalle: "Resumen del día", icon: Home, permiso: "inicio" },
  vender: { href: "/ventas/nueva", label: "Vender", detalle: "Hacer una factura", icon: ShoppingBag, permiso: "vender" },
  inventario: { href: "/inventario", label: "Inventario", detalle: "Lo que hay en vitrina", icon: Boxes, permiso: "inventario" },
  gastos: { href: "/gastos", label: "Gastos", detalle: "Anotar lo que se gasta", icon: Wallet, permiso: "gastos" },
  arqueo: { href: "/arqueo", label: "Arqueo", detalle: "Contar la mercancía", icon: ClipboardCheck, permiso: "arqueo" },
  facturas: { href: "/ventas", label: "Facturas", detalle: "Ventas ya hechas", icon: Receipt, permiso: "facturas" },
  reportes: { href: "/reportes", label: "Reportes", detalle: "Cierre y gráficos", icon: FileBarChart, permiso: "reportes" },
  traslados: { href: "/traslados", label: "Traslados", detalle: "Mover entre locales", icon: ArrowLeftRight, admin: true },
  proveedores: { href: "/proveedores", label: "Proveedores", detalle: "A quién le compramos", icon: Truck, admin: true },
  admin: { href: "/admin", label: "Configuración", corto: "Ajustes", detalle: "Usuarios e historial", icon: Settings, admin: true },
  // Para todos (sin permiso): tamaño de letra y clave. En el celular es la única forma de llegar.
  cuenta: { href: "/mi-cuenta", label: "Mi cuenta", detalle: "Letra y clave", icon: UserRound },
} satisfies Record<string, Modulo>;

export const PRINCIPALES: Modulo[] = [MODULOS.mostrador, MODULOS.inicio, MODULOS.vender, MODULOS.inventario, MODULOS.gastos, MODULOS.arqueo];
export const OTROS: Modulo[] = [MODULOS.facturas, MODULOS.reportes, MODULOS.traslados, MODULOS.proveedores, MODULOS.admin, MODULOS.cuenta];

export function esActivo(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/ventas") return path === "/ventas" || /^\/ventas\/(\d+|historial)/.test(path);
  return path.startsWith(href);
}

/** ¿Este usuario ve el módulo en el menú? El ADMIN ve todo; el vendedor, lo que tenga permitido. */
export function moduloVisible(m: Modulo, rol: string, permisos: string[]): boolean {
  if (rol === "ADMIN") return !m.soloVendedor;
  if (m.admin) return false;
  return !m.permiso || permisos.includes(m.permiso);
}
