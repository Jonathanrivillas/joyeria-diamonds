"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import { Alert, Button, Card, Checkbox, Icon, PasswordInput } from "@/components/ui";
import { cambiarClave } from "./actions";

export default function CambiarClavePage() {
  const [estado, accion, pendiente] = useActionState(cambiarClave, undefined);
  const [ver, setVer] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-lg">
        <Card padding="lg">
          <form action={accion} className="space-y-5">
            <div className="flex items-center gap-3">
              <Icon icon={KeyRound} size="xl" className="text-brand-700" />
              <h1 className="text-2xl font-bold">Cambiar mi contraseña</h1>
            </div>
            <p className="text-base text-neutral-600">
              Escoja una contraseña de <b>al menos 8 letras o números</b> que solo usted conozca. Puede ser una frase fácil de
              recordar, por ejemplo: <b>MiPerroToby2026</b>.
            </p>
            <PasswordInput visible={ver} label="Contraseña actual" name="actual" required size="lg" autoComplete="current-password" />
            <PasswordInput visible={ver} label="Contraseña nueva" name="nueva" required minLength={8} size="lg" autoComplete="new-password" />
            <PasswordInput
              visible={ver}
              label="Escriba otra vez la contraseña nueva"
              name="confirmar"
              required
              minLength={8}
              size="lg"
              autoComplete="new-password"
            />
            <Checkbox label="Mostrar lo que escribo" checked={ver} onChange={(e) => setVer(e.target.checked)} />
            {estado?.error && <Alert tone="danger">{estado.error}</Alert>}
            <Button type="submit" size="lg" block loading={pendiente} loadingText="Guardando...">
              Guardar nueva contraseña
            </Button>
            <div className="text-center">
              <Button variant="link" href="/">
                Volver sin cambiar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
