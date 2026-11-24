"use client";

import { useEffect } from "react";

/** Abre el diálogo de imprimir apenas carga la factura (botón "Reimprimir la última" de Mi mostrador). */
export function AutoImprimir() {
  useEffect(() => {
    // Una pausa corta para que la página termine de pintarse antes de imprimir.
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
