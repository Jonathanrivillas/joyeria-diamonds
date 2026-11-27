import { Home, SearchX } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

/** Se muestra cuando la dirección no existe (o el registro ya no está). */
export default function NoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <EmptyState size="lg" icon={SearchX} title="No encontramos esta página" description="Puede que la dirección esté mal escrita o que lo que buscaba ya no exista.">
        <Button size="lg" href="/" icon={Home}>
          Ir al inicio
        </Button>
      </EmptyState>
    </main>
  );
}
