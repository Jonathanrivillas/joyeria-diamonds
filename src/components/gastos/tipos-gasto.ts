import { Hammer, HandCoins, MoreHorizontal, Package, PiggyBank, type LucideIcon } from "lucide-react";

export type GrupoGasto = {
  id: string;
  nombre: string;
  detalle: string;
  icon: LucideIcon;
  /** Si tiene subtipos, hay que escoger uno; el gasto se guarda con el id del subtipo. */
  subtipos?: { id: string; nombre: string }[];
};

/** Tipos de gasto con su ícono y ejemplo: iguales en el formulario y en la lista. */
export const GRUPOS_GASTO: GrupoGasto[] = [
  {
    id: "PRESUPUESTO",
    nombre: "Presupuesto",
    detalle: "Salud, nómina, arriendo, prestaciones",
    icon: PiggyBank,
    subtipos: [
      { id: "SALUD", nombre: "Salud" },
      { id: "NOMINA", nombre: "Nómina" },
      { id: "ARRIENDO", nombre: "Arriendo" },
      { id: "PRESTACIONES", nombre: "Prestaciones" },
    ],
  },
  { id: "TALLERES", nombre: "Talleres", detalle: "Arreglos y trabajos de taller", icon: Hammer },
  { id: "COMISIONES", nombre: "Comisiones", detalle: "Pago de comisiones", icon: HandCoins },
  { id: "INSUMOS", nombre: "Insumos", detalle: "Bolsas, estuches, aseo...", icon: Package },
];

/** Grupo al que pertenece un tipo guardado (un subtipo de Presupuesto, o el grupo mismo). */
export const grupoDeGasto = (tipo: string): GrupoGasto | undefined =>
  GRUPOS_GASTO.find((g) => g.id === tipo || g.subtipos?.some((s) => s.id === tipo));

export const iconoGasto = (tipo: string): LucideIcon => grupoDeGasto(tipo)?.icon ?? MoreHorizontal;
