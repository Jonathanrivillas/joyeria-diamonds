import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

/**
 * Encabezado de cada pantalla. Todas las páginas lo usan para que el título,
 * el enlace de "volver" y la ayuda estén siempre en el mismo lugar.
 */
export function PageHeader({
  title,
  subtitle,
  help,
  back,
  actions,
  eyebrow,
  center,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Frase corta que explica para qué sirve la pantalla. */
  help?: React.ReactNode;
  /** Enlace para volver. `mobileOnly` lo oculta en computador cuando el menú lateral ya lleva al mismo lugar. */
  back?: { href: string; label: string; mobileOnly?: boolean };
  /** Botones a la derecha del título. */
  actions?: React.ReactNode;
  /** Texto pequeño encima del título (ej. la fecha). */
  eyebrow?: React.ReactNode;
  /** Contenido centrado: en su propia línea arriba; en pantallas muy anchas, entre el título y los botones. */
  center?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      {back && (
        <BackLink href={back.href} className={back.mobileOnly ? "lg:hidden" : undefined}>
          {back.label}
        </BackLink>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-lg text-neutral-500">{eyebrow}</p>}
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-[1.75rem]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-base text-neutral-600">{subtitle}</p>}
        </div>
        {/* Va sola en su línea, arriba y centrada; solo en pantallas muy anchas cabe entre el título y los botones. */}
        {center && (
          <div className="order-first w-full text-center 2xl:order-none 2xl:w-auto 2xl:flex-1 2xl:self-center 2xl:whitespace-nowrap">
            {center}
          </div>
        )}
        {actions && <div className="no-print flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {help && <p className="no-print mt-2 max-w-3xl text-base text-neutral-600">{help}</p>}
    </header>
  );
}

/** Enlace "← Volver a ..." con el mismo estilo en todo el sitio. */
export function BackLink({
  href,
  onClick,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn("no-print mb-3 inline-flex items-center gap-2 text-base font-medium text-brand-800 hover:underline", className);
  const content = (
    <>
      <Icon icon={ArrowLeft} /> {children}
    </>
  );
  return href ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

/** Bloque de una página con su título (h2) y una acción opcional. */
export function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-xl font-bold text-neutral-800">{title}</h2>}
            {description && <p className="text-base text-neutral-600">{description}</p>}
          </div>
          {action && <div className="no-print flex flex-wrap gap-3">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Contenedor de página: ancho máximo y espaciado vertical consistentes. */
/** `fluid` ocupa todo el ancho disponible (pantallas de cuadrícula, como escoger piezas). */
const widths = { sm: "max-w-lg", md: "max-w-3xl", lg: "max-w-4xl", xl: "max-w-5xl", full: "max-w-6xl", fluid: "max-w-none" } as const;

export function PageContainer({
  width = "full",
  className,
  children,
}: {
  width?: keyof typeof widths;
  className?: string;
  children: React.ReactNode;
}) {
  // Alineado a la izquierda, con el mismo margen que la barra superior.
  return <div className={cn("w-full space-y-6", widths[width], className)}>{children}</div>;
}
