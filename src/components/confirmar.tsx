"use client";

import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Botón que pide confirmación antes de hacer algo que no se puede deshacer.
 * Envuelve un <form action={...}>: los campos de `children` van dentro del diálogo.
 */
export function BotonConfirmar({
  action,
  textoBoton,
  titulo,
  mensaje,
  textoConfirmar = "Sí, continuar",
  campos,
  children,
  claseBoton = "btn-danger",
}: {
  action: (form: FormData) => void | Promise<void>;
  textoBoton: React.ReactNode;
  titulo: string;
  mensaje: React.ReactNode;
  textoConfirmar?: string;
  /** Campos ocultos fijos (ej. id). */
  campos?: Record<string, string | number>;
  /** Campos visibles dentro del diálogo (ej. motivo). */
  children?: React.ReactNode;
  claseBoton?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [enviando, setEnviando] = useState(false);

  return (
    <>
      <button type="button" className={claseBoton} onClick={() => ref.current?.showModal()}>
        {textoBoton}
      </button>
      <dialog ref={ref} className="w-[min(32rem,calc(100vw-2rem))] rounded-2xl p-0 backdrop:bg-black/50">
        <form
          action={async (f) => {
            setEnviando(true);
            try {
              await action(f);
            } finally {
              setEnviando(false);
              ref.current?.close();
            }
          }}
          className="space-y-5 p-6"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-100 p-2 text-red-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">{titulo}</h2>
              <div className="mt-1 text-base text-stone-600">{mensaje}</div>
            </div>
          </div>
          {campos && Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          {children}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => ref.current?.close()} disabled={enviando}>
              No, cancelar
            </button>
            <button className="btn-danger" disabled={enviando}>
              {enviando ? "Un momento..." : textoConfirmar}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
