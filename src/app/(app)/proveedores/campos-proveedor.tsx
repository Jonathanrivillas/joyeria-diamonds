import { Input } from "@/components/ui";

export type DatosProveedor = { id: number; nombre: string; documento: string; telefono: string; notas: string };

/**
 * Mismos campos para crear y para editar un proveedor.
 * `volver`: a dónde regresar después de guardar ("detalle" = la página del proveedor).
 */
export function CamposProveedor({ p, volver }: { p?: DatosProveedor; volver?: "detalle" }) {
  return (
    <>
      <input type="hidden" name="id" value={p?.id ?? ""} />
      {volver && <input type="hidden" name="volver" value={volver} />}
      <Input label="Nombre" name="nombre" defaultValue={p?.nombre} required placeholder="Ej: Japón" />
      <Input label="NIT o cédula (si lo tiene)" name="documento" defaultValue={p?.documento} inputMode="numeric" />
      <Input label="Teléfono (si lo tiene)" name="telefono" defaultValue={p?.telefono} inputMode="tel" />
      <Input label="Notas (si quiere)" name="notas" defaultValue={p?.notas} placeholder="Ej: oro 18k, cuenta Bancolombia..." />
    </>
  );
}
