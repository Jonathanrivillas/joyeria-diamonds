"use client";

import { useActionState, useState } from "react";
import { Gem, Eye, EyeOff, LogIn } from "lucide-react";
import { login } from "./actions";

const DEMO = [
  { email: "admin@joyeria.com", rol: "Administrador", detalle: "Ve los dos locales" },
  { email: "vendedor1@joyeria.com", rol: "Vendedora", detalle: "Local 1" },
  { email: "vendedor2@joyeria.com", rol: "Vendedor", detalle: "Local 2" },
];

export default function LoginPage() {
  const [estado, accion, pendiente] = useActionState(login, undefined);
  const [email, setEmail] = useState("admin@joyeria.com");
  const [password, setPassword] = useState("demo123");
  const [ver, setVer] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-900 via-stone-800 to-oro-900 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <div className="mb-3 rounded-full bg-oro-500/20 p-4 ring-1 ring-oro-400/40">
            <Gem className="h-10 w-10 text-oro-300" />
          </div>
          <h1 className="text-2xl font-bold">Joyería</h1>
          <p className="text-lg text-stone-300">Inventario, ventas y arqueo</p>
        </div>

        <form action={accion} className="card space-y-5 p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Entrar</h2>
          <div>
            <label className="label" htmlFor="email">Su correo</label>
            <input id="email" name="email" type="email" required className="input text-lg" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="label" htmlFor="password">Su contraseña</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={ver ? "text" : "password"}
                required
                className="input pr-32 text-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setVer((v) => !v)}
                className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg px-3 py-2 text-base font-medium text-stone-600 hover:bg-stone-100"
              >
                {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                {ver ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>
          {estado?.error && (
            <p role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-800">
              {estado.error}. Revise que estén bien escritos.
            </p>
          )}
          <button className="btn-primary btn-grande w-full" disabled={pendiente}>
            <LogIn className="h-6 w-6" /> {pendiente ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-5 rounded-2xl bg-white/10 p-5 text-stone-100 ring-1 ring-white/10">
          <p className="mb-3 text-lg font-semibold text-white">Usuarios de prueba (toque uno)</p>
          <div className="grid gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("demo123");
                }}
                className={`rounded-xl px-4 py-3 text-left transition hover:bg-white/15 ${email === d.email ? "bg-white/15 ring-2 ring-oro-300" : ""}`}
              >
                <span className="block font-semibold">{d.rol} · {d.detalle}</span>
                <span className="block text-sm text-stone-300">{d.email} · clave demo123</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
