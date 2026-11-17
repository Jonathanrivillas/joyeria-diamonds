import Image from "next/image";
import { cn } from "./cn";

/** Proporción del archivo public/logo.png (620 × 400). */
const ANCHO = 620;
const ALTO = 400;

const sizes = { sm: "h-8", md: "h-11", lg: "h-16", xl: "h-24" } as const;

/**
 * Logo oficial de la joyería (diamante). Fondo transparente: sobre fondos oscuros
 * se ve su halo blanco y sobre fondos claros solo el diamante gris.
 */
export function Logo({
  size = "md",
  priority,
  className,
}: {
  size?: keyof typeof sizes;
  /** Cárguelo de primero cuando está arriba en la pantalla (menú, login). */
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Logo de la joyería"
      width={ANCHO}
      height={ALTO}
      priority={priority}
      className={cn("w-auto shrink-0 select-none", sizes[size], className)}
    />
  );
}
