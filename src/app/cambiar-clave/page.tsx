"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { cambiarClave } from "./actions";

export default function CambiarClavePage() {
    const [estado, accion, pendiente] = useActionState(cambiarClave, undefined);
    const [ver, setVer] = useState(false);
    const tipo = ver ? "text" : "password";

    return (
        <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
            <form action={accion} className="card w-full max-w-lg p-6 sm:p-8">
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <KeyRound className="h-8 w-8 text-oro-700" />
                        <h1 className="text-2xl font-bold">Cambiar mi contraseña</h1>
                    </div>
                    <p className="text-base text-stone-600">
                        Escoja una contraseña de <b>al menos 8 letras o números</b> que solo usted conozca.
                        Puede ser una frase fácil de recordar, por ejemplo: <b>MiPerroToby2026</b>.
                    </p>
                    <div>
                        <label className="label" htmlFor="actual">Contraseña actual</label>
                        <input id="actual" name="actual" type={tipo} required className="input text-lg" autoComplete="current-password" />
                    </div>
                    <div>
                        <label className="label" htmlFor="nueva">Contraseña nueva</label>
                        <input id="nueva" name="nueva" type={tipo} required minLength={8} className="input text-lg" autoComplete="new-password" />
                    </div>
                    <div>
                        <label className="label" htmlFor="confirmar">Escriba otra vez la contraseña nueva</label>
                        <input id="confirmar" name="confirmar" type={tipo} required minLength={8} className="input text-lg" autoComplete="new-password" />
                    </div>
                    <label className="flex items-center gap-3 text-base">
                        <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} className="h-5 w-5" />
                        Mostrar lo que escribo
                    </label>
                    {estado?.error && (
                        <p role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-800">
                            {estado.error}
                        </p>
                    )}
                    <button className="btn-primary btn-grande w-full" disabled={pendiente}>
                        {pendiente ? "Guardando..." : "Guardar nueva contraseña"}
                    </button>
                    <Link href="/" className="block text-center text-base text-stone-600 underline">
                        Volver sin cambiar
                    </Link>
                </div>
            </form>
        </div>
    );
}
