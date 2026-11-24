import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "./cn";

/** Números a mostrar: la primera, la última y las vecinas de la actual, con "…" en los saltos. */
function numeros(page: number, pages: number): (number | "…")[] {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const lista = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  lista.forEach((n, i) => {
    if (i > 0 && n - lista[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/**
 * Paginación: "Mostrando 26–50 de 340", botones anterior/siguiente y números de página.
 * `href(n)` arma el enlace a la página n (debe conservar los filtros).
 * Con `total` y `perPage` muestra el rango de resultados.
 */
export function Pagination({
  page,
  pages,
  href,
  total,
  perPage,
  previousLabel = "Anterior",
  nextLabel = "Siguiente",
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
  total?: number;
  perPage?: number;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const rango =
    total !== undefined && perPage
      ? `Mostrando ${Math.min(total, (page - 1) * perPage + 1)}–${Math.min(total, page * perPage)} de ${total.toLocaleString("es-CO")}`
      : null;
  if (pages <= 1) return rango && total ? <p className="no-print text-center text-base text-neutral-500">{rango}</p> : null;

  return (
    <nav className="no-print flex flex-col items-center gap-3" aria-label="Paginación">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {page > 1 && (
          <Button variant="secondary" href={href(page - 1)} icon={ArrowLeft}>
            <span className="hidden sm:inline">{previousLabel}</span>
          </Button>
        )}
        {numeros(page, pages).map((n, i) =>
          n === "…" ? (
            <span key={`s${i}`} className="px-1 text-neutral-400">
              …
            </span>
          ) : (
            <Link
              key={n}
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              aria-label={`Página ${n}`}
              className={cn(
                "flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-base font-semibold tabular-nums transition",
                n === page ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              )}
            >
              {n}
            </Link>
          )
        )}
        {page < pages && (
          <Button variant="secondary" href={href(page + 1)} iconRight={ArrowRight}>
            <span className="hidden sm:inline">{nextLabel}</span>
          </Button>
        )}
      </div>
      <p className="text-base text-neutral-500">{rango ?? `Página ${page} de ${pages}`}</p>
    </nav>
  );
}
