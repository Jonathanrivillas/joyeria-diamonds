"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { Alert, Button, Card, Input, Logo, PasswordInput } from "@/components/ui";
import { login } from "./actions";

export default function LoginPage() {
  const [estado, accion, pendiente] = useActionState(login, undefined);
  // Controlados: React limpia el formulario al enviarlo y no queremos perder lo escrito si hay error.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <Logo size="xl" priority className="mb-4" />
          <h1>
            <Image src="/nombre-diamonds.png" alt="Joyería Diamonds" width={2172} height={300} priority className="h-auto w-72" />
          </h1>
        </div>

        <Card padding="lg">
          <form action={accion} className="space-y-5">
            <h2 className="text-2xl font-bold">Entrar</h2>
            <Input
              label="Su correo"
              name="email"
              type="email"
              required
              size="lg"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordInput
              label="Su contraseña"
              name="password"
              required
              size="lg"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {estado?.error && <Alert tone="danger">{estado.error}</Alert>}
            <Button type="submit" size="lg" block icon={LogIn} loading={pendiente} loadingText="Entrando...">
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
