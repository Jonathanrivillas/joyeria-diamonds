import { cn } from "./cn";

/**
 * Tabla estándar. Va dentro de un <Card>; se desplaza horizontalmente en pantallas pequeñas.
 * Con `stickyHeader` el encabezado queda fijo al desplazar (en celular la tabla tiene alto máximo).
 */
export function Table({ className, stickyHeader, children }: { className?: string; stickyHeader?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto", stickyHeader && "max-h-[75vh] overflow-y-auto lg:max-h-none")}>
      <table className={cn("w-full border-separate border-spacing-0 text-base [&>tbody:last-child>tr:last-child>td]:border-b-0", stickyHeader && "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20", className)}>
        {children}
      </table>
    </div>
  );
}

type CellOptions = {
  numeric?: boolean;
  center?: boolean;
  /** Línea vertical a la izquierda para separar grupos de columnas. `strong` para el grupo principal. */
  divider?: boolean | "strong";
  /** Columna fija al desplazar horizontalmente (normalmente la primera). */
  sticky?: boolean;
};

const dividers = { soft: "border-l border-l-neutral-300", strong: "border-l-2 border-l-neutral-500" } as const;

function cellOptions({ numeric, center, divider, sticky }: CellOptions) {
  return cn(
    numeric && "text-right tabular-nums",
    center && "text-center",
    divider && dividers[divider === "strong" ? "strong" : "soft"],
    sticky && "sticky left-0 z-10"
  );
}

export function Th({
  numeric,
  center,
  divider,
  sticky,
  className,
  children,
  ...rest
}: CellOptions & React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-neutral-300 bg-neutral-50 px-3 py-3 sm:px-4 text-left text-base font-semibold text-neutral-700",
        cellOptions({ numeric, center, divider, sticky }),
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({
  numeric,
  center,
  divider,
  sticky,
  className,
  children,
  ...rest
}: CellOptions & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-neutral-300 px-3 py-3 sm:px-4",
        sticky && "bg-white group-hover:bg-neutral-50",
        cellOptions({ numeric, center, divider, sticky }),
        className
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

/** Fila con resaltado al pasar el mouse. */
export function Tr({ className, children }: { className?: string; children: React.ReactNode }) {
  return <tr className={cn("group transition-colors hover:bg-neutral-50", className)}>{children}</tr>;
}

/** Celda sin dato ("—" en gris claro). Se lee como "sin movimiento", no como un dato que falta. */
export function NoValue({ label = "Sin movimiento" }: { label?: string }) {
  return (
    <>
      <span aria-hidden className="text-neutral-400">
        —
      </span>
      <span className="sr-only">{label}</span>
    </>
  );
}
