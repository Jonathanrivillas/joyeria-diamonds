import { Lock } from "lucide-react";
import { requireSesion } from "@/lib/session";
import { Card, EmptyState, PageContainer } from "@/components/ui";

/** Para un vendedor al que el administrador no le ha dado ninguna pantalla. */
export default async function SinPermisosPage() {
  await requireSesion();
  return (
    <PageContainer width="md">
      <Card padding="lg">
        <EmptyState
          icon={Lock}
          title="Todavía no tiene pantallas asignadas"
          description="Pídale al administrador que le dé permiso en Configuración → Usuarios."
        />
      </Card>
    </PageContainer>
  );
}
