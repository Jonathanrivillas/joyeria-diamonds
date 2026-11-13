/**
 * Reconoce el tipo REAL de un archivo por sus primeros bytes ("firma"),
 * sin confiar en el nombre ni en la extensión, que se pueden falsificar.
 * Devuelve null si no es una imagen o PDF permitido.
 */
export function detectarTipoArchivo(
  b: Uint8Array,
): { ext: string; mime: string } | null {
  const ascii = (desde: number, hasta: number) =>
    String.fromCharCode(...b.subarray(desde, hasta));

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { ext: "jpg", mime: "image/jpeg" };
  if (b[0] === 0x89 && ascii(1, 4) === "PNG")
    return { ext: "png", mime: "image/png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP")
    return { ext: "webp", mime: "image/webp" };
  if (ascii(0, 5) === "%PDF-") return { ext: "pdf", mime: "application/pdf" };
  // Fotos de iPhone (HEIC/HEIF)
  if (
    ascii(4, 8) === "ftyp" &&
    ["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(
      ascii(8, 12),
    )
  ) {
    return { ext: "heic", mime: "image/heic" };
  }
  return null;
}

export const TAMANO_MAXIMO = 4 * 1024 * 1024; // 4 MB
