"use client";

import { useSyncExternalStore } from "react";

/**
 * Local en el que se está haciendo la venta en curso.
 * La pantalla de venta lo publica y la barra superior lo muestra en lugar del selector "Viendo:",
 * para que no haya dos selectores de local que digan cosas distintas.
 */
let actual: string | null = null;
const avisar = new Set<() => void>();

export function publicarLocalVenta(nombre: string | null) {
  actual = nombre;
  avisar.forEach((f) => f());
}

export function useLocalVenta(): string | null {
  return useSyncExternalStore(
    (f) => {
      avisar.add(f);
      return () => avisar.delete(f);
    },
    () => actual,
    () => null
  );
}
