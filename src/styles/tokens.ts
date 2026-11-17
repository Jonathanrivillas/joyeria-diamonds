/**
 * Tokens del sistema de diseño: la única fuente de verdad de los colores de marca.
 * tailwind.config.ts arma la paleta a partir de aquí y los gráficos (Recharts) también los usan,
 * así un cambio aquí se refleja en todo el sitio.
 *
 * Paleta de la marca (monocromática): #020202 · #A6A6A6 · #D9D9D9 · #FFFFFF.
 *
 * Paleta semántica (clases de Tailwind):
 *  - neutral-* → textos, bordes y fondos. Escala de grises puros armada sobre los colores de marca.
 *  - brand-*   → acciones principales y elementos seleccionados (negro de la marca).
 *  - success-* → "cuadra", ingresos, confirmaciones.                               (emerald)
 *  - danger-*  → faltantes, gastos, anulaciones, errores.                          (red)
 *  - warning-* → pendientes ("sin terminar"), sobrantes.                           (amber)
 *  - info-*    → ayudas y explicaciones.                                           (sky)
 *  Los tonos de estado se usan solo en insignias, avisos y cifras: la base del sitio es blanco y negro.
 *
 * Legibilidad: #A6A6A6 (neutral-400) sobre blanco no se lee bien (contraste 2,4:1).
 * Úselo solo para bordes, íconos decorativos y textos desactivados; el texto gris va en neutral-500 o más oscuro.
 *
 * Este archivo no importa nada para que se pueda usar también en el navegador.
 */

/** Escala de grises puros. Los valores en negrita de la marca son 300, 400 y 950. */
export const gris = {
  50: "#FAFAFA",
  100: "#F2F2F2", // fondo general de la página
  200: "#E6E6E6", // separadores
  300: "#D9D9D9", // marca: bordes de campos y tarjetas
  400: "#A6A6A6", // marca: íconos secundarios, desactivado (no para texto)
  500: "#737373", // texto secundario (4,7:1 sobre blanco)
  600: "#595959",
  700: "#404040",
  800: "#262626",
  900: "#141414",
  950: "#020202", // marca: negro
} as const;

/**
 * Acento de la marca. Los números siguen el uso que ya tenían los componentes
 * (50 = fondo de seleccionado, 700 = botón principal, 800 = texto de acento),
 * por eso el negro de la marca ocupa los tonos 700 en adelante.
 */
export const brand = {
  50: gris[100],
  100: gris[200],
  200: gris[300],
  300: gris[400],
  400: gris[500],
  500: gris[700],
  600: gris[800],
  700: gris[950],
  800: gris[950],
  900: gris[950],
  950: gris[950],
} as const;

/** Colores para gráficos (Recharts no entiende clases de Tailwind). */
export const coloresGraficos = {
  ventas: gris[950],
  gastos: gris[400],
  categorias: gris[700],
  cuadricula: gris[200],
  eje: gris[500],
  ejeFuerte: gris[600],
  cursor: gris[100],
} as const;
