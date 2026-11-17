import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

/** Lista con separadores, pensada para ir dentro de un <Card>. */
export function List({ className, children }: { className?: string; children: React.ReactNode }) {
  return <ul className={cn("divide-y divide-neutral-100", className)}>{children}</ul>;
}

/**
 * Fila de una lista: contenido principal a la izquierda (`title`, `meta`) y
 * un valor/acciones a la derecha (`end`). Con `href`, toda la fila es un enlace con flecha.
 */
export function ListItem({
  href,
  leading,
  title,
  meta,
  end,
  muted,
  className,
  children,
}: {
  href?: string;
  /** Algo al inicio de la fila: hora, número, ícono. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  /** Línea secundaria en gris. */
  meta?: React.ReactNode;
  end?: React.ReactNode;
  /** Atenúa la fila (ej. registros anulados). */
  muted?: boolean;
  className?: string;
  /** Contenido extra bajo el título (enlaces, notas). */
  children?: React.ReactNode;
}) {
  const inner = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-lg font-semibold", muted && "text-neutral-500 line-through")}>{title}</div>
        {meta && <div className="text-base text-neutral-500">{meta}</div>}
        {children}
      </div>
      {end && <div className="shrink-0 text-right">{end}</div>}
      {href && <Icon icon={ChevronRight} size="md" className="text-neutral-400" />}
    </>
  );
  const classes = cn("flex items-center gap-4 px-5 py-4", muted && "bg-neutral-50", className);
  return (
    <li>
      {href ? (
        <Link href={href} className={cn(classes, "transition hover:bg-neutral-50")}>
          {inner}
        </Link>
      ) : (
        <div className={classes}>{inner}</div>
      )}
    </li>
  );
}
