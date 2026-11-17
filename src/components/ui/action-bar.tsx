import { cn } from "./cn";

/**
 * Barra fija abajo con el estado de un proceso y su acción principal
 * (ej. "3 piezas · $ 1.250.000  [Ver venta]"). En celular queda por encima del menú inferior.
 */
export function ActionBar({ summary, children, className }: { summary?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("no-print sticky bottom-24 z-20 lg:bottom-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-300 bg-white/95 p-3 pl-5 shadow-lg backdrop-blur">
        {summary && <div className="min-w-0 text-lg">{summary}</div>}
        <div className={cn("flex flex-wrap gap-3", !summary && "w-full [&>*]:flex-1")}>{children}</div>
      </div>
    </div>
  );
}
