"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "./button";
import { Modal, ModalActions } from "./modal";

/**
 * Pide confirmación antes de salir de una pantalla con trabajo sin guardar (ej. una venta a medias).
 * Cubre los enlaces de la página (menú, "Volver") con un diálogo propio, y recargar o cerrar
 * la pestaña con el aviso del navegador.
 */
export function LeaveGuard({
  when,
  title = "¿Salir sin terminar?",
  message,
  stayLabel = "No, seguir aquí",
  leaveLabel = "Sí, salir",
}: {
  when: boolean;
  title?: string;
  message: React.ReactNode;
  stayLabel?: string;
  leaveLabel?: string;
}) {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    if (!when) return;

    const alCerrar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setDestino(url.pathname + url.search + url.hash);
    };

    window.addEventListener("beforeunload", alCerrar);
    document.addEventListener("click", alTocar, true);
    return () => {
      window.removeEventListener("beforeunload", alCerrar);
      document.removeEventListener("click", alTocar, true);
    };
  }, [when]);

  return (
    <Modal open={destino !== null} onClose={() => setDestino(null)} title={title} description={message} icon={LogOut} tone="warning">
      <ModalActions>
        <Button variant="secondary" onClick={() => setDestino(null)}>
          {stayLabel}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            const d = destino;
            setDestino(null);
            if (d) router.push(d);
          }}
        >
          {leaveLabel}
        </Button>
      </ModalActions>
    </Modal>
  );
}
