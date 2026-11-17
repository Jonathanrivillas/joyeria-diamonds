import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { Icon, type IconSize } from "./icon";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "danger" | "danger-outline" | "success" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white shadow-sm hover:bg-brand-600",
  secondary: "border-2 border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50",
  danger: "bg-danger-700 text-white shadow-sm hover:bg-danger-800",
  "danger-outline": "border-2 border-danger-200 bg-white text-danger-700 hover:border-danger-300 hover:bg-danger-50",
  success: "bg-success-600 text-white shadow-sm hover:bg-success-700",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  link: "rounded-md text-brand-800 underline-offset-4 hover:underline active:scale-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[2.25rem] px-3 text-sm",
  md: "min-h-[2.75rem] px-4 py-2 text-base",
  lg: "min-h-[3.25rem] px-5 py-2 text-lg",
};
const iconOnlySizes: Record<ButtonSize, string> = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-12 w-12" };
const iconSize: Record<ButtonSize, IconSize> = { sm: "xs", md: "sm", lg: "md" };

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícono a la izquierda del texto. */
  icon?: LucideIcon;
  /** Ícono a la derecha del texto (ej. flecha de "siguiente"). */
  iconRight?: LucideIcon;
  /** Ocupa todo el ancho disponible. */
  block?: boolean;
  /** Botón cuadrado (solo ícono). Se activa solo cuando hay `icon` y no hay texto. */
  square?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type AsButton = Common &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
    /** Muestra un indicador de carga y desactiva el botón. */
    loading?: boolean;
    loadingText?: React.ReactNode;
  };

type AsLink = Common & {
  href: string;
  /** Usa <a> normal en vez de la navegación de Next (descargas, archivos, rutas /api). */
  native?: boolean;
  target?: string;
  rel?: string;
  download?: boolean | string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  "aria-label"?: string;
  "aria-current"?: React.AnchorHTMLAttributes<HTMLAnchorElement>["aria-current"];
};

export type ButtonProps = AsButton | AsLink;

/** Clases de un botón, para casos especiales (ej. <summary> o <label> que deben verse como botón). */
export function buttonClasses({
  variant = "primary",
  size = "md",
  block,
  iconOnly,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; iconOnly?: boolean; className?: string } = {}) {
  return cn(
    base,
    variants[variant],
    variant === "link" ? "min-h-0 px-0 py-0 text-base" : iconOnly ? cn(iconOnlySizes[size], "p-0") : sizes[size],
    block && "w-full",
    className
  );
}

/**
 * Botón estándar del sistema. Con `href` se comporta como enlace pero se ve igual.
 * Para un botón con solo ícono, pase `aria-label` y no pase `children`.
 *
 * Por defecto `type="button"`: para enviar un formulario use `type="submit"`.
 */
export function Button(props: ButtonProps) {
  const { variant, size = "md", icon, iconRight, block, square, className, children } = props;
  const iconOnly = square ?? (!children && !!icon);
  const classes = buttonClasses({ variant, size, block, iconOnly, className });
  const is = iconSize[size];

  if (props.href !== undefined) {
    const { href, native, target, rel, download, onClick } = props;
    const content = (
      <>
        {icon && <Icon icon={icon} size={is} />}
        {children}
        {iconRight && <Icon icon={iconRight} size={is} />}
      </>
    );
    const a11y = { "aria-label": props["aria-label"], "aria-current": props["aria-current"] };
    return native ? (
      <a href={href} target={target} rel={rel} download={download} onClick={onClick} className={classes} {...a11y}>
        {content}
      </a>
    ) : (
      <Link href={href} target={target} rel={rel} onClick={onClick} className={classes} {...a11y}>
        {content}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    icon: _i,
    iconRight: _ir,
    block: _b,
    square: _sq,
    className: _c,
    children: _ch,
    loading,
    loadingText,
    type = "button",
    disabled,
    ...rest
  } = props;
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...rest}>
      {loading ? <Spinner size={size === "lg" ? "md" : "sm"} className={size === "lg" ? "h-6 w-6" : undefined} /> : icon && <Icon icon={icon} size={is} />}
      {loading && loadingText ? loadingText : children}
      {!loading && iconRight && <Icon icon={iconRight} size={is} />}
    </button>
  );
}
