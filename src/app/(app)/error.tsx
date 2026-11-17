"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function ErrorPagina({ error, reset }: { error: Error; reset: () => void }) {
  const mensaje =
    error.message && !/digest|Server Components/i.test(error.message)
      ? error.message
      : "Ocurrió un problema. No se perdió nada de lo que ya estaba guardado.";
  return (
    <EmptyState size="lg" tone="danger" icon={AlertTriangle} title="No se pudo completar" description={mensaje}>
      <Button size="lg" icon={RotateCcw} onClick={reset}>
        Intentar de nuevo
      </Button>
      <Button size="lg" variant="secondary" href="/" icon={Home}>
        Ir al inicio
      </Button>
    </EmptyState>
  );
}
