"use client";

import clsx from "clsx";
import { Printer } from "lucide-react";

export function BotonImprimir({ texto = "Imprimir", grande }: { texto?: string; grande?: boolean }) {
  return (
    <button className={clsx("btn-secondary", grande && "btn-grande")} onClick={() => window.print()}>
      <Printer className={grande ? "h-6 w-6" : "h-5 w-5"} /> {texto}
    </button>
  );
}
