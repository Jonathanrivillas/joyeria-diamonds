import {
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  FileBarChart,
  Home,
  Receipt,
  Settings,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type Modulo = { href: string; label: string; detalle: string; icon: LucideIcon; admin?: boolean };

/**
 * Cada módulo con su nombre e ícono oficial. El menú y los accesos del inicio salen de aquí,
 * así un módulo tiene el mismo ícono en todo el sitio.
 */
export const MODULOS = {
  inicio: { href: "/", label: "Inicio", detalle: "Resumen del día", icon: Home },
  vender: { href: "/ventas/nueva", label: "Vender", detalle: "Hacer una factura", icon: ShoppingBag },
  inventario: { href: "/inventario", label: "Inventario", detalle: "Lo que hay en vitrina", icon: Boxes },
  gastos: { href: "/gastos", label: "Gastos", detalle: "Anotar lo que se gasta", icon: Wallet },
  arqueo: { href: "/arqueo", label: "Arqueo", detalle: "Contar la mercancía", icon: ClipboardCheck },
  facturas: { href: "/ventas", label: "Facturas", detalle: "Ventas ya hechas", icon: Receipt },
  reportes: { href: "/reportes", label: "Reportes", detalle: "Cierre y gráficos", icon: FileBarChart },
  traslados: { href: "/traslados", label: "Traslados", detalle: "Mover entre locales", icon: ArrowLeftRight, admin: true },
  admin: { href: "/admin", label: "Configuración", detalle: "Precios y usuarios", icon: Settings, admin: true },
} satisfies Record<string, Modulo>;

export const PRINCIPALES: Modulo[] = [MODULOS.inicio, MODULOS.vender, MODULOS.inventario, MODULOS.gastos, MODULOS.arqueo];
export const OTROS: Modulo[] = [MODULOS.facturas, MODULOS.reportes, MODULOS.traslados, MODULOS.admin];

export function esActivo(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/ventas") return path === "/ventas" || /^\/ventas\/\d+/.test(path);
  return path.startsWith(href);
}
