import { Home, MoreHorizontal, Package, Users, Zap, type LucideIcon } from "lucide-react";

/** Tipos de gasto con su ícono y ejemplo: iguales en el formulario y en la lista. */
export const TIPOS_GASTO_UI: { id: string; nombre: string; detalle: string; icon: LucideIcon }[] = [
  { id: "INSUMOS", nombre: "Insumos", detalle: "Bolsas, estuches...", icon: Package },
  { id: "SERVICIOS", nombre: "Servicios", detalle: "Luz, internet...", icon: Zap },
  { id: "NOMINA", nombre: "Nómina", detalle: "Pago a empleados", icon: Users },
  { id: "ARRIENDO", nombre: "Arriendo", detalle: "Pago del local", icon: Home },
  { id: "OTROS", nombre: "Otro", detalle: "Cualquier otro", icon: MoreHorizontal },
];

export const iconoGasto = (tipo: string): LucideIcon => TIPOS_GASTO_UI.find((t) => t.id === tipo)?.icon ?? MoreHorizontal;
