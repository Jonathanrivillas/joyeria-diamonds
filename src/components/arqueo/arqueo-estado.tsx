import { AlertCircle, Check, CheckCircle2, ChevronRight, ClipboardCheck, type LucideIcon } from "lucide-react";
import { Badge, Button, Card, CardHeader, Icon, List, ListItem, type Tone } from "@/components/ui";
import { gramos, plural } from "@/lib/format";

type ArqueoCerrado = { pesoContadoCg: number; pesoSistemaCg: number };

/** Cómo se ve y qué dice el arqueo del día, igual en el inicio y en la pantalla de arqueo. */
function resumen(abierto: boolean, cerrado: ArqueoCerrado | null | undefined): { tone: Tone; icon: LucideIcon; texto: string } {
  if (abierto)
    return {
      tone: "warning",
      icon: AlertCircle,
      texto: "Está empezado pero sin terminar.",
    };
  if (cerrado) {
    const dif = cerrado.pesoContadoCg - cerrado.pesoSistemaCg;
    return dif === 0
      ? {
          tone: "success",
          icon: CheckCircle2,
          texto: "Ya está hecho. Todo cuadró ✓",
        }
      : {
          tone: "danger",
          icon: CheckCircle2,
          texto: `Ya está hecho, con una diferencia de ${gramos(dif)}.`,
        };
  }
  return {
    tone: "warning",
    icon: ClipboardCheck,
    texto: "Todavía no se ha hecho.",
  };
}

const colorIcono: Record<Tone, string> = {
  neutral: "text-neutral-500",
  brand: "text-brand-600",
  success: "text-success-600",
  danger: "text-danger-600",
  warning: "text-warning-600",
  info: "text-info-600",
};

/** Resultado de un arqueo en una lista. */
export function ArqueoResultadoBadge({
  cerrado,
  conDiferencia,
  diferenciaCg,
  corregido,
}: {
  cerrado: boolean;
  conDiferencia: boolean;
  diferenciaCg: number;
  corregido: boolean;
}) {
  if (!cerrado) return <Badge tone="warning">Sin terminar</Badge>;
  if (conDiferencia)
    return (
      <Badge tone="danger">
        {diferenciaCg < 0 ? `Faltaron ${gramos(-diferenciaCg)}` : diferenciaCg > 0 ? `Sobraron ${gramos(diferenciaCg)}` : "Diferencia en piezas"}
        {corregido ? " · corregido" : ""}
      </Badge>
    );
  return (
    <Badge tone="success" icon={Check}>
      Cuadró
    </Badge>
  );
}

export type ArqueoLocalHoy = {
  localId: number;
  nombre: string;
  /** Arqueo empezado y sin terminar (puede ser de un día anterior). */
  abiertoId?: number;
  /** Arqueo de hoy ya terminado. */
  cerrado?: (ArqueoCerrado & { id: number }) | null;
};

/**
 * Estado del arqueo de hoy de todos los locales en una sola tarjeta:
 * el título dice si falta algo y cada local tiene su botón para empezar, continuar o ver.
 * Con `accion` cada pantalla pone su propio botón (ej. en Arqueo, "Empezar" abre el arqueo directamente).
 */
export function ArqueoHoyResumen({ locales, accion }: { locales: ArqueoLocalHoy[]; accion?: (local: ArqueoLocalHoy) => React.ReactNode }) {
  const pendientes = locales.filter((l) => l.abiertoId || !l.cerrado).length;
  const titulo =
    pendientes === 0
      ? "Arqueo de hoy: listo"
      : locales.length === 1
        ? "Falta el arqueo de hoy"
        : `Falta el arqueo de hoy en ${plural(pendientes, "local", "locales")}`;

  return (
    <Card as="section">
      <CardHeader title={titulo} icon={pendientes ? AlertCircle : CheckCircle2} iconTone={pendientes ? "warning" : "success"} />
      <List>
        {locales.map((l) => {
          const r = resumen(!!l.abiertoId, l.cerrado);
          const href = l.abiertoId ? `/arqueo/${l.abiertoId}` : l.cerrado ? `/arqueo/${l.cerrado.id}` : "/arqueo";
          const hecho = !l.abiertoId && !!l.cerrado;
          return (
            <ListItem
              key={l.localId}
              leading={<Icon icon={r.icon} size="lg" className={colorIcono[r.tone]} />}
              title={l.nombre}
              meta={r.texto}
              end={
                accion ? (
                  accion(l)
                ) : (
                  <Button href={href} variant={hecho ? "ghost" : "secondary"} iconRight={ChevronRight}>
                    {l.abiertoId ? "Continuar" : hecho ? "Ver" : "Empezar"}
                  </Button>
                )
              }
            />
          );
        })}
      </List>
    </Card>
  );
}
