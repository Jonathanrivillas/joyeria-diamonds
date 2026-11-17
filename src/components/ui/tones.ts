/**
 * Tonos semánticos compartidos por todos los componentes.
 * Un componente nunca elige "verde" o "rojo": elige un tono con significado.
 */
export type Tone = "neutral" | "brand" | "success" | "danger" | "warning" | "info";

/** Fondo claro + texto oscuro (insignias, íconos, avisos). */
export const toneSoft: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  brand: "bg-brand-100 text-brand-800",
  success: "bg-success-100 text-success-800",
  danger: "bg-danger-100 text-danger-800",
  warning: "bg-warning-100 text-warning-900",
  info: "bg-info-50 text-info-900",
};

/** Fondo fuerte + texto blanco. */
export const toneSolid: Record<Tone, string> = {
  neutral: "bg-neutral-700 text-white",
  brand: "bg-brand-700 text-white",
  success: "bg-success-600 text-white",
  danger: "bg-danger-600 text-white",
  warning: "bg-warning-500 text-warning-950",
  info: "bg-info-600 text-white",
};

/** Solo color de texto (cifras, montos). */
export const toneText: Record<Tone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-800",
  success: "text-success-700",
  danger: "text-danger-700",
  warning: "text-warning-700",
  info: "text-info-800",
};

/** Superficies teñidas (tarjetas y paneles que llaman la atención). */
export const toneSurface: Record<Tone, string> = {
  neutral: "border-neutral-300 bg-white",
  brand: "border-brand-300 bg-brand-50",
  success: "border-success-200 bg-success-50",
  danger: "border-danger-200 bg-danger-50",
  warning: "border-warning-300 bg-warning-50",
  info: "border-info-200 bg-info-50",
};
