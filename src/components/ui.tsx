import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Info, CheckCircle2, AlertTriangle, type LucideIcon } from "lucide-react";

export function PageHeader({
  titulo,
  subtitulo,
  ayuda,
  volver,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  /** Frase corta que explica para qué sirve la pantalla. */
  ayuda?: string;
  volver?: { href: string; texto: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {volver && (
        <Link href={volver.href} className="no-print mb-3 inline-flex items-center gap-2 text-base font-medium text-oro-800 hover:underline">
          <ArrowLeft className="h-5 w-5" /> {volver.texto}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-[1.75rem]">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-base text-stone-600">{subtitulo}</p>}
        </div>
        {children && <div className="no-print flex flex-wrap items-center gap-3">{children}</div>}
      </div>
      {ayuda && (
        <p className="no-print mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-base text-sky-900">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          {ayuda}
        </p>
      )}
    </div>
  );
}

export function KpiCard({
  titulo,
  valor,
  detalle,
  icon: Icon,
  tono = "neutro",
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icon?: LucideIcon;
  tono?: "neutro" | "bueno" | "malo" | "oro";
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-stone-600">
        {Icon && <Icon className="h-5 w-5" />}
        <p className="text-base font-medium">{titulo}</p>
      </div>
      <p
        className={clsx(
          "mt-2 text-2xl font-bold tabular-nums",
          tono === "bueno" && "text-emerald-700",
          tono === "malo" && "text-red-700",
          tono === "oro" && "text-oro-800"
        )}
      >
        {valor}
      </p>
      {detalle && <p className="mt-1 text-base text-stone-500">{detalle}</p>}
    </div>
  );
}

const ESTADOS: Record<string, { clase: string; texto: string }> = {
  OK: { clase: "bg-emerald-100 text-emerald-800", texto: "✓ Está igual" },
  SOBRA: { clase: "bg-amber-100 text-amber-900", texto: "Sobra" },
  FALTA: { clase: "bg-red-100 text-red-800", texto: "Falta" },
  ACTIVA: { clase: "bg-emerald-100 text-emerald-800", texto: "Vigente" },
  ANULADA: { clase: "bg-red-100 text-red-800", texto: "Anulada" },
  ABIERTO: { clase: "bg-amber-100 text-amber-900", texto: "Sin terminar" },
  CERRADO: { clase: "bg-stone-200 text-stone-700", texto: "Terminado" },
  INACTIVO: { clase: "bg-stone-200 text-stone-600", texto: "Inactivo" },
};

export function EstadoBadge({ estado }: { estado: string | null | undefined }) {
  if (!estado) return <span className="text-stone-400">—</span>;
  const e = ESTADOS[estado] ?? { clase: "bg-stone-100", texto: estado };
  return <span className={clsx("badge", e.clase)}>{e.texto}</span>;
}

export function Vacio({ texto, children }: { texto: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-lg text-stone-500">{texto}</p>
      {children}
    </div>
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "error" | "ok"; children: React.ReactNode }) {
  const Icon = tipo === "ok" ? CheckCircle2 : tipo === "error" ? AlertTriangle : Info;
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={clsx(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-base font-medium",
        tipo === "info" && "bg-sky-50 text-sky-900",
        tipo === "error" && "border-2 border-red-200 bg-red-50 text-red-800",
        tipo === "ok" && "border-2 border-emerald-200 bg-emerald-50 text-emerald-900"
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Botón grande de acción para la pantalla de inicio. */
export function Accion({
  href,
  titulo,
  texto,
  icon: Icon,
  destacado,
}: {
  href: string;
  titulo: string;
  texto: string;
  icon: LucideIcon;
  destacado?: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group flex items-center gap-4 rounded-2xl border-2 p-4 shadow-sm transition active:scale-[0.99]",
        destacado
          ? "border-oro-700 bg-oro-700 text-white hover:bg-oro-800"
          : "border-stone-200 bg-white text-stone-900 hover:border-oro-500 hover:bg-oro-50"
      )}
    >
      <div className={clsx("rounded-xl p-3", destacado ? "bg-white/20" : "bg-oro-100 text-oro-800")}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-lg font-bold">{titulo}</p>
        <p className={clsx("text-base", destacado ? "text-oro-50" : "text-stone-500")}>{texto}</p>
      </div>
    </Link>
  );
}
