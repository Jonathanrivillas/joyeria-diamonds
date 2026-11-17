import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "./cn";
import { IconBadge } from "./icon";
import type { Tone } from "./tones";

/** Lo que se muestra cuando una lista está vacía o algo falló. */
export function EmptyState({
  title,
  description,
  icon = Inbox,
  tone = "neutral",
  size = "md",
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  size?: "md" | "lg";
  /** Acciones (botones). */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-5 text-center", size === "lg" ? "py-16" : "py-10")}>
      <IconBadge icon={icon} tone={tone} size={size === "lg" ? "lg" : "md"} />
      <p className={cn("font-semibold text-neutral-700", size === "lg" ? "text-2xl" : "text-lg")}>{title}</p>
      {description && <p className="max-w-md text-lg text-neutral-600">{description}</p>}
      {children && <div className="mt-3 flex flex-col justify-center gap-3 sm:flex-row">{children}</div>}
    </div>
  );
}
