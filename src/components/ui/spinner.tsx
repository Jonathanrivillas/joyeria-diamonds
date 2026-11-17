import { cn } from "./cn";

const sizes = { sm: "h-5 w-5 border-2", md: "h-8 w-8 border-[3px]", lg: "h-12 w-12 border-4" } as const;

export function Spinner({ size = "sm", className }: { size?: keyof typeof sizes; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent opacity-80", sizes[size], className)}
    />
  );
}

/** Pantalla de "cargando" para secciones completas. */
export function LoadingState({ text = "Cargando, un momento..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-neutral-500" role="status">
      <Spinner size="lg" className="text-brand-600" />
      <p className="text-lg">{text}</p>
    </div>
  );
}
