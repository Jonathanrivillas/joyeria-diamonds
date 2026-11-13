"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ErrorPagina({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 w-fit rounded-full bg-red-100 p-4 text-red-700">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold">No se pudo completar</h1>
      <p className="mt-2 text-lg text-stone-600">
        {error.message && !/digest|Server Components/i.test(error.message) ? error.message : "Ocurrió un problema. No se perdió nada de lo que ya estaba guardado."}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button className="btn-primary btn-grande" onClick={reset}>Intentar de nuevo</button>
        <Link href="/" className="btn-secondary btn-grande">Ir al inicio</Link>
      </div>
    </div>
  );
}
