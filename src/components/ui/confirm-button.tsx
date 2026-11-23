"use client";

import { useOptimistic, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Modal, ModalActions } from "./modal";

/**
 * Botón que pide confirmación antes de algo que no se puede deshacer.
 * Envía un <form action={...}>: `fields` van ocultos y `children` (ej. el motivo) se muestran en el diálogo.
 */
export function ConfirmButton({
  action,
  label,
  icon,
  variant = "danger",
  size = "md",
  title,
  message,
  confirmLabel = "Sí, continuar",
  cancelLabel = "No, cancelar",
  fields,
  children,
  "aria-label": ariaLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  /** Texto del botón que abre el diálogo. Omítalo para un botón de solo ícono (con `aria-label`). */
  label?: React.ReactNode;
  /**
   * Ícono ya renderizado, ej. `<Icon icon={Ban} />`. (Se pasa como elemento y no como componente
   * porque este botón se usa desde páginas del servidor.)
   */
  icon?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Campos ocultos fijos (ej. id). */
  fields?: Record<string, string | number>;
  /** Campos visibles dentro del diálogo (ej. motivo). */
  children?: React.ReactNode;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  // useOptimistic y no useState: la acción del formulario corre como transición y un
  // useState normal no se pintaría hasta el final (el "Un momento..." nunca se vería).
  const [sending, setSending] = useOptimistic(false);

  return (
    <>
      <Button variant={variant} size={size} square={!label} aria-label={ariaLabel} onClick={() => setOpen(true)}>
        {icon}
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={message} icon={AlertTriangle} tone="danger" dismissible={!sending}>
        <form
          className="space-y-5"
          action={async (f) => {
            setSending(true); // se pinta de inmediato; vuelve a false solo al terminar
            try {
              await action(f);
            } finally {
              setOpen(false);
            }
          }}
        >
          {fields && Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          {children}
          <ModalActions>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={sending}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant="danger" loading={sending} loadingText="Un momento...">
              {confirmLabel}
            </Button>
          </ModalActions>
        </form>
      </Modal>
    </>
  );
}
