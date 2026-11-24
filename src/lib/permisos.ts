// Permisos por pantalla para los VENDEDORES. El ADMIN siempre ve todo.
// Sin imports del servidor: también se usa en el menú (navegador).

export type Permiso = "inicio" | "vender" | "facturas" | "inventario" | "gastos" | "arqueo" | "reportes" | "totales";

/**
 * Lo que el administrador puede habilitar a cada vendedor, en el orden del menú.
 * Los que tienen `href` son pantallas; "totales" no es una pantalla: deja ver cifras en Mi mostrador.
 */
export const PERMISOS: { clave: Permiso; nombre: string; detalle: string; href?: string }[] = [
  // Quien puede vender entra a "Mi mostrador" (precio del día, calculadora y sus ventas).
  { clave: "vender", nombre: "Vender", detalle: "Mi mostrador y hacer ventas al precio del gramo de hoy", href: "/mostrador" },
  { clave: "facturas", nombre: "Facturas", detalle: "Ver e imprimir las ventas ya hechas", href: "/ventas" },
  { clave: "inicio", nombre: "Inicio", detalle: "Resumen del día: lo vendido y lo gastado", href: "/" },
  { clave: "inventario", nombre: "Inventario", detalle: "Lo que hay en vitrina", href: "/inventario" },
  { clave: "gastos", nombre: "Gastos", detalle: "Anotar gastos del local", href: "/gastos" },
  { clave: "arqueo", nombre: "Arqueo", detalle: "Contar la mercancía", href: "/arqueo" },
  { clave: "reportes", nombre: "Reportes", detalle: "Cierre y gráficos", href: "/reportes" },
  { clave: "totales", nombre: "Ver sus totales", detalle: "En Mi mostrador ve cuánto lleva vendido hoy" },
];

/** Lo que tiene un vendedor nuevo: solo la sección de ventas. */
export const PERMISOS_DEFECTO: Permiso[] = ["vender", "facturas"];

const CLAVES = new Set<string>(PERMISOS.map((p) => p.clave));

/** Deja solo claves conocidas (lo que llega de un formulario no es de fiar). */
export const limpiarPermisos = (lista: string[]): Permiso[] => [...new Set(lista)].filter((p): p is Permiso => CLAVES.has(p));

type ConPermisos = { rol: string; permisos?: string[] };

export function puedeVer(s: ConPermisos, permiso: Permiso): boolean {
  return s.rol === "ADMIN" || (s.permisos ?? []).includes(permiso);
}

/** A dónde mandar al usuario cuando entra o cuando abre algo que no puede ver. */
export function paginaInicial(s: ConPermisos): string {
  if (s.rol === "ADMIN") return "/";
  return PERMISOS.find((p) => p.href && puedeVer(s, p.clave))?.href ?? "/sin-permisos";
}

/** Tamaños de letra que cada persona puede escoger en "Mi cuenta" (% del tamaño normal). */
export const LETRAS: { clave: string; nombre: string; porcentaje: number }[] = [
  { clave: "NORMAL", nombre: "Normal", porcentaje: 100 },
  { clave: "GRANDE", nombre: "Grande", porcentaje: 112.5 },
  { clave: "MUY_GRANDE", nombre: "Muy grande", porcentaje: 125 },
];
