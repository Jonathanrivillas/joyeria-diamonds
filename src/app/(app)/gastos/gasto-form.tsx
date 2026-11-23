"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { registrarGasto } from "./actions";
import { Alert, Button, Card, Chip, ChipGroup, ChoiceGrid, ChoiceTile, Field, FileButton, MoneyInput, Textarea } from "@/components/ui";
import { GRUPOS_GASTO as GRUPOS } from "@/components/gastos/tipos-gasto";
import { TAMANO_MAXIMO } from "@/lib/archivos";

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
  proveedores,
}: {
  esAdmin: boolean;
  locales: { id: number; nombre: string }[];
  localDefecto?: number | null;
  /** Proveedores activos, para "Pago a proveedor". */
  proveedores: { id: number; nombre: string }[];
}) {
  const [estado, accion, pendiente] = useActionState(registrarGasto, undefined);
  const [grupo, setGrupo] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [monto, setMonto] = useState(0);
  const [justificacion, setJustificacion] = useState("");
  const [archivo, setArchivo] = useState<string>("");
  const [procesando, setProcesando] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [localGasto, setLocalGasto] = useState<number | null>(localDefecto ?? null);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const esPagoProveedor = tipo === "PROVEEDOR";

  // El local es el paso 1 solo si hay de dónde escoger; los demás pasos se numeran después.
  const conLocal = esAdmin && locales.length > 1;
  const n = (paso: number) => (conLocal ? paso + 1 : paso);

  useEffect(() => {
    if (estado?.ok) {
      setGrupo("");
      setTipo("");
      setMonto(0);
      setJustificacion("");
      setArchivo("");
      setErrorArchivo("");
      setProveedorId(null);
      setFormKey((k) => k + 1);
    }
  }, [estado]);

  const listo = tipo && (!esPagoProveedor || proveedorId) && monto > 0 && justificacion.trim().length >= 5;

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

  const subtipos = GRUPOS.find((g) => g.id === grupo)?.subtipos;

  function escogerGrupo(id: string) {
    setGrupo(id);
    // Un grupo sin subtipos ya es el tipo; uno con subtipos espera a que escojan cuál.
    setTipo(GRUPOS.find((g) => g.id === id)?.subtipos ? "" : id);
  }

  const textoBoton = !grupo
    ? "Escoja el tipo de gasto"
    : !tipo
      ? "Escoja cuál gasto del presupuesto"
      : esPagoProveedor && !proveedorId
        ? "Escoja a cuál proveedor"
    : monto <= 0
      ? "Escriba cuánto costó"
      : justificacion.trim().length < 5
        ? "Escriba en qué se gastó"
        : "Guardar el gasto";

  return (
    <Card padding="lg">
      <form key={formKey} action={accion} className="space-y-6">
        <h2 className="text-2xl font-bold">Anotar un gasto</h2>

        {estado?.ok && <Alert tone="success">{estado.ok}</Alert>}

        {esAdmin && <input type="hidden" name="localId" value={localGasto ?? ""} />}
        {conLocal && (
          <Field label="1. ¿De qué local es el gasto?">
            <ChipGroup>
              {locales.map((l) => (
                <Chip key={l.id} selected={localGasto === l.id} onClick={() => setLocalGasto(l.id)}>
                  {l.nombre}
                </Chip>
              ))}
            </ChipGroup>
          </Field>
        )}

        <Field label={`${n(1)}. ¿Qué tipo de gasto es?`}>
          <input type="hidden" name="tipo" value={tipo} />
          <ChoiceGrid columns={2}>
            {GRUPOS.map((g, i) => (
              <ChoiceTile
                key={g.id}
                layout="inline"
                selected={grupo === g.id}
                onClick={() => escogerGrupo(g.id)}
                icon={g.icon}
                title={g.nombre}
                description={g.detalle}
                className={i === GRUPOS.length - 1 && GRUPOS.length % 2 === 1 ? "col-span-2" : undefined}
              />
            ))}
          </ChoiceGrid>
        </Field>

        {subtipos && (
          <Field label="¿Cuál gasto del presupuesto es?">
            <ChipGroup>
              {subtipos.map((st) => (
                <Chip key={st.id} selected={tipo === st.id} onClick={() => setTipo(st.id)}>
                  {st.nombre}
                </Chip>
              ))}
            </ChipGroup>
          </Field>
        )}

        {esPagoProveedor && (
          <Field label="¿A cuál proveedor se le pagó?">
            <input type="hidden" name="proveedorId" value={proveedorId ?? ""} />
            {proveedores.length === 0 ? (
              <Alert tone="warning">
                Todavía no hay proveedores. {esAdmin ? "Agréguelos en el módulo Proveedores." : "Pídale al administrador que los agregue."}
              </Alert>
            ) : (
              <ChipGroup>
                {proveedores.map((p) => (
                  <Chip key={p.id} selected={proveedorId === p.id} onClick={() => setProveedorId(p.id)}>
                    {p.nombre}
                  </Chip>
                ))}
              </ChipGroup>
            )}
          </Field>
        )}

        <MoneyInput name="monto" label={`${n(2)}. ¿Cuánto costó?`} value={monto} onChange={setMonto} size="xl" />

        <Textarea
          label={`${n(3)}. ¿En qué se gastó y por qué?`}
          name="justificacion"
          size="lg"
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          placeholder="Ej: Compra de 100 bolsas de regalo para diciembre"
          hint="Es obligatorio, para saber siempre en qué se fue la plata."
        />

        <FileButton
          label={`${n(4)}. Foto del recibo (si tiene)`}
          name="soporte"
          accept="image/*,application/pdf"
          capture="environment"
          fileName={archivo}
          processing={procesando}
          processingText="Preparando la foto..."
          error={errorArchivo}
          onChange={alEscogerArchivo}
        />

        {estado?.error && <Alert tone="danger">{estado.error}</Alert>}
        <Button type="submit" size="lg" block icon={Check} loading={pendiente} loadingText="Guardando..." disabled={procesando || !listo}>
          {textoBoton}
        </Button>
      </form>
    </Card>
  );
}
