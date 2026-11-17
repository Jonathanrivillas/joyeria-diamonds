import { AlertTriangle, CheckCircle2, Info, AlertCircle, type LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

type AlertTone = "info" | "success" | "danger" | "warning";

const styles: Record<AlertTone, { classes: string; icon: LucideIcon }> = {
  info: { classes: "bg-info-50 text-info-900", icon: Info },
  success: { classes: "border border-success-200 bg-success-50 text-success-900", icon: CheckCircle2 },
  danger: { classes: "border border-danger-200 bg-danger-50 text-danger-800", icon: AlertTriangle },
  warning: { classes: "border border-warning-200 bg-warning-50 text-warning-900", icon: AlertCircle },
};

/** Mensaje en línea: ayudas, confirmaciones y errores. */
export function Alert({
  tone = "info",
  title,
  className,
  children,
}: {
  tone?: AlertTone;
  title?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const s = styles[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex animate-aparecer items-start gap-3 rounded-xl px-4 py-3 text-base", s.classes, className)}
    >
      <Icon icon={s.icon} className="mt-0.5" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? "" : "font-medium"}>{children}</div>}
      </div>
    </div>
  );
}
