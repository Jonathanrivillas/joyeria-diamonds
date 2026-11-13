"use client";

import { useActionState, useEffect, useState } from "react";
import clsx from "clsx";
import { Users, Home, Zap, Package, MoreHorizontal, Camera, Check } from "lucide-react";
import { registrarGasto } from "./actions";
import { Aviso } from "@/components/ui";
import { CampoDinero } from "@/components/campos";
import { TAMANO_MAXIMO } from "@/lib/archivos";

const TIPOS = [
  { id: "INSUMOS", nombre: "Insumos", detalle: "Bolsas, estuches...", icon: Package },
  { id: "SERVICIOS", nombre: "Servicios", detalle: "Luz, internet...", icon: Zap },
  { id: "NOMINA", nombre: "Nómina", detalle: "Pago a empleados", icon: Users },
  { id: "ARRIENDO", nombre: "Arriendo", detalle: "Pago del local", icon: Home },
  { id: "OTROS", nombre: "Otro", detalle: "Cualquier otro", icon: MoreHorizontal },
];

const LADO_MAXIMO = 1600; // píxeles: suficiente para leer un recibo

/** Achica la foto en el celular antes de enviarla. Si algo falla, devuelve la original. */
async function reducirFoto(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.size < 500 * 1024) return f; // PDF o foto ya liviana
  try {
    const img = await createImageBitmap(f); // respeta la orientación de la foto
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return f;
  }
}

export function GastoForm({
  esAdmin,
  locales,
  localDefecto,
}: {
  esAdmin: boolean;
  locales: { id: number; nombre: string }[];
  localDefecto?: number | null;
}) {
  const [estado, accion, pendiente] = useActionState(registrarGasto, undefined);
  const [tipo, setTipo] = useState<string>("");
  const [monto, setMonto] = useState(0);
  const [justificacion, setJustificacion] = useState("");
  const [archivo, setArchivo] = useState<string>("");
  const [procesando, setProcesando] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (estado?.ok) {
      setTipo("");
      setMonto(0);
      setJustificacion("");
      setArchivo("");
      setErrorArchivo("");
      setFormKey((k) => k + 1);
    }
  }, [estado]);

  const listo = tipo && monto > 0 && justificacion.trim().length >= 5;
  async function alEscogerArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const original = input.files?.[0];
    setErrorArchivo("");
    if (!original) {
      setArchivo("");
      return;
    }
    setProcesando(true);
    const final = await reducirFoto(original);
    setProcesando(false);
    if (final.size > TAMANO_MAXIMO) {
      input.value = "";
      setArchivo("");
      setErrorArchivo("Ese archivo es muy pesado (más de 4 MB). Tome la foto otra vez o escoja otro.");
      return;
    }
    if (final !== original) {
      // Reemplaza el archivo del formulario por la versión liviana.
      const dt = new DataTransfer();
      dt.items.add(final);
      input.files = dt.files;
    }
    setArchivo(original.name);
  }

  return (
    <form key={formKey} action={accion} className="card p-6"><div className="space-y-6">
      <h2 className="text-2xl font-bold">Anotar un gasto</h2>

      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      {esAdmin && (
        <div>
          <label className="label">¿De qué local es el gasto?</label>
          <select name="localId" className="input" defaultValue={localDefecto ?? undefined}>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <p className="label">1. ¿Qué tipo de gasto es?</p>
        <input type="hidden" name="tipo" value={tipo} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipo(t.id)}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center transition active:scale-[0.98]",
                tipo === t.id ? "border-oro-700 bg-oro-700 text-white" : "border-stone-200 bg-white hover:border-oro-500"
              )}
            >
              <t.icon className="h-8 w-8" />
              <span className="text-lg font-bold">{t.nombre}</span>
              <span className={clsx("text-sm", tipo === t.id ? "text-oro-50" : "text-stone-500")}>{t.detalle}</span>
            </button>
          ))}
        </div>
      </div>

      <CampoDinero name="monto" label="2. ¿Cuánto costó?" value={monto} onChange={setMonto} grande />

      <div>
        <label className="label" htmlFor="justificacion">3. ¿En qué se gastó y por qué?</label>
        <textarea
          id="justificacion"
          name="justificacion"
          className="input text-lg"
          rows={3}
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          placeholder="Ej: Compra de 100 bolsas de regalo para diciembre"
        />
        <p className="ayuda">Es obligatorio, para saber siempre en qué se fue la plata.</p>
      </div>

      <div>
        <p className="label">4. Foto del recibo (si tiene)</p>
        <label className={clsx("btn w-full cursor-pointer border-2 border-dashed", archivo ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-stone-300 bg-white")}>
          {archivo ? <Check className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
          {procesando ? "Preparando la foto..." : archivo ? `Recibo adjunto: ${archivo}` : "Tomar foto o escoger archivo"}
          <input
            type="file"
            name="soporte"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={alEscogerArchivo}
          />
        </label>
        {errorArchivo && <p className="mt-2 text-base font-medium text-red-700">{errorArchivo}</p>}
      </div>

      {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <button className="btn-primary btn-grande w-full" disabled={pendiente || procesando || !listo}>
        <Check className="h-6 w-6" />
        {pendiente ? "Guardando..." : !tipo ? "Escoja el tipo de gasto" : monto <= 0 ? "Escriba cuánto costó" : justificacion.trim().length < 5 ? "Escriba en qué se gastó" : "Guardar el gasto"}
      </button>
    </div></form>
  );
}
