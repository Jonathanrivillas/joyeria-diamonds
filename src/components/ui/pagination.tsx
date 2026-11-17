import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./button";

/** Paginación simple "anterior / página X de Y / siguiente". `href(n)` arma el enlace a la página n. */
export function Pagination({
  page,
  pages,
  href,
  previousLabel = "Anterior",
  nextLabel = "Siguiente",
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="no-print flex flex-wrap items-center justify-center gap-3" aria-label="Paginación">
      {page > 1 && (
        <Button variant="secondary" href={href(page - 1)} icon={ArrowLeft}>
          {previousLabel}
        </Button>
      )}
      <span className="text-base text-neutral-600">
        Página {page} de {pages}
      </span>
      {page < pages && (
        <Button variant="secondary" href={href(page + 1)} iconRight={ArrowRight}>
          {nextLabel}
        </Button>
      )}
    </nav>
  );
}
