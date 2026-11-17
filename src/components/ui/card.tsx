import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";
import { toneSurface, toneText, type Tone } from "./tones";

const paddings = { none: "", sm: "p-4", md: "p-5", lg: "p-6 sm:p-8" } as const;
export type CardPadding = keyof typeof paddings;

type CardStyle = {
  tone?: Tone;
  /** Borde más grueso para destacar la tarjeta. */
  emphasis?: boolean;
  padding?: CardPadding;
  className?: string;
};

function cardClasses({ tone = "neutral", emphasis, padding = "none", className }: CardStyle) {
  return cn("rounded-2xl border", emphasis && "border-2", toneSurface[tone], paddings[padding], className);
}

/** Contenedor base: superficie blanca con borde fino y esquinas redondeadas (sin sombra). */
export function Card({
  as: Tag = "div",
  children,
  ...style
}: CardStyle & { as?: "div" | "section" | "article"; children: React.ReactNode }) {
  return <Tag className={cardClasses(style)}>{children}</Tag>;
}

/** Tarjeta completa que funciona como enlace, con flecha a la derecha. */
export function CardLink({
  href,
  children,
  chevron = true,
  ...style
}: CardStyle & { href: string; chevron?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(cardClasses({ padding: "md", ...style }), "flex items-center gap-4 transition hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.99]")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">{children}</div>
      {chevron && <Icon icon={ChevronRight} size="md" className="text-neutral-400" />}
    </Link>
  );
}

/** Encabezado de tarjeta: título, descripción opcional y acción a la derecha. */
export function CardHeader({
  title,
  description,
  icon,
  iconTone = "brand",
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Color del ícono: úselo para indicar un estado (ej. "warning" si hay algo pendiente). */
  iconTone?: Tone;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <Icon icon={icon} size="md" className={toneText[iconTone]} />}
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
          {description && <p className="text-base text-neutral-500">{description}</p>}
        </div>
      </div>
      {action && <div className="no-print flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("border-t border-neutral-200 bg-neutral-50 px-5 py-4 rounded-b-2xl", className)}>{children}</div>;
}
