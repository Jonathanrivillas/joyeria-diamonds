"use client";

import { Camera, Check } from "lucide-react";
import { cn } from "./cn";
import { Field } from "./form";
import { Icon } from "./icon";
import { Spinner } from "./spinner";

/** Botón grande para adjuntar un archivo o tomar una foto. Muestra el nombre una vez escogido. */
export function FileButton({
  name,
  accept,
  capture,
  label,
  fileName,
  processing,
  error,
  emptyText = "Tomar foto o escoger archivo",
  processingText = "Preparando el archivo...",
  onChange,
}: {
  name: string;
  accept?: string;
  capture?: "user" | "environment";
  label?: React.ReactNode;
  /** Nombre del archivo ya escogido. */
  fileName?: string;
  processing?: boolean;
  error?: React.ReactNode;
  emptyText?: string;
  processingText?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Field label={label} error={error}>
      <label
        className={cn(
          "flex min-h-[3.25rem] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-2 text-base font-semibold transition",
          "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-400",
          fileName ? "border-success-400 bg-success-50 text-success-800" : "border-neutral-300 bg-white text-neutral-800 hover:border-brand-500 hover:bg-brand-50"
        )}
      >
        {processing ? <Spinner /> : <Icon icon={fileName ? Check : Camera} size="md" />}
        <span className="min-w-0 truncate">{processing ? processingText : fileName ? `Adjunto: ${fileName}` : emptyText}</span>
        <input type="file" name={name} accept={accept} capture={capture} className="sr-only" onChange={onChange} />
      </label>
    </Field>
  );
}
