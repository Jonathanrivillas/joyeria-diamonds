"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { IconBadge } from "./icon";
import type { Tone } from "./tones";
import { Button } from "./button";

const widths = { sm: "w-[min(28rem,calc(100vw-2rem))]", md: "w-[min(32rem,calc(100vw-2rem))]", lg: "w-[min(44rem,calc(100vw-2rem))]" } as const;

/**
 * Ventana modal basada en <dialog>: atrapa el foco, se cierra con Esc
 * y al tocar fuera. Controlada con `open` / `onClose`.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  tone = "brand",
  size = "md",
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  size?: keyof typeof widths;
  /** Si es false, no se puede cerrar con Esc ni tocando fuera (ej. mientras guarda). */
  dismissible?: boolean;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn("rounded-2xl p-0 shadow-xl backdrop:bg-black/50", widths[size])}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        // Toque en el fondo oscuro (fuera del contenido)
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          {icon && <IconBadge icon={icon} tone={tone} size="sm" />}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-bold text-neutral-900">
              {title}
            </h2>
            {description && <div className="mt-1 text-base text-neutral-600">{description}</div>}
          </div>
          {dismissible && <Button variant="ghost" size="sm" icon={X} aria-label="Cerrar" onClick={onClose} className="-mr-2 -mt-1" />}
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** Fila de botones al pie de un modal: en celular uno encima del otro, en pantalla grande a la derecha. */
export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>;
}

/** Estado abierto/cerrado de un modal. */
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, onOpen: () => setOpen(true), onClose: () => setOpen(false), setOpen };
}
