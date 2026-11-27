# Joyería · Inventario por gramos

Sistema para llevar el inventario de una joyería con 2 locales **por peso (gramos) y cantidad**, igual que la planilla en papel (Entrada / Salida / Saldo por categoría), más ventas (facturas y factura electrónica con Alegra), gastos con recibo, arqueo diario, proveedores, joyas preciosas y reportes.

## Desarrollo (su computador)

Requisitos: Node.js 20+ y una base PostgreSQL (Neon). Copie `.env.example` a `.env` y llénelo.

```bash
npm install
npx prisma migrate dev     # crea/actualiza las tablas
npm run dev                # http://localhost:3000
```

Datos de ejemplo (solo en la base de desarrollo; exige `DATOS_PERMITIDOS_HOSTS` en el `.env`):

- `npm run datos:prueba` — borra los movimientos y carga ventas, gastos y arqueos de ejemplo.
- `npm run datos:cero` — deja todo en cero (conserva usuarios, locales y proveedores).

Los usuarios de ejemplo (clave `demo123`) solo existen en desarrollo: el script se niega a correr en otra base.

## Producción

Ver **[DESPLIEGUE.md](DESPLIEGUE.md)** (VPS, Caddy, PM2, variables, día 1, respaldos y actualizaciones).

## Módulos

- **Dashboard**: ventas, facturas, gramos vendidos, gastos y neto del día; gramos disponibles; gráfico ventas vs. gastos (7/30 días); categorías más vendidas; último arqueo.
- **Inventario**: planilla del día con el formato del papel; clic en una categoría → kardex con saldo corrido. El admin registra **entradas** de mercancía.
- **Ventas**: factura con varios ítems (categoría, peso, cantidad, precio/g sugerido editable, hechura). Valida existencia y descuenta el inventario. Historial con filtros, factura imprimible y **anulación** (admin) que devuelve las piezas al inventario.
- **Gastos**: con justificación obligatoria y soporte (foto/PDF) opcional; totales por tipo.
- **Arqueo diario**: toma el saldo del sistema; se digita lo contado y marca **OK / FALTA / SOBRA** en verde/rojo. Al cerrar, el admin puede aplicar las diferencias como ajuste al inventario.
- **Traslados** entre locales, **Reportes** (cierre del día o rango, exportación CSV para Excel) y **Administración** (categorías y precios por gramo, locales, usuarios).

## Sistema de diseño (frontend)

Todas las pantallas se arman con componentes reutilizables; las vistas no definen botones, tarjetas, campos ni colores propios. Catálogo en vivo: **/admin/componentes** (solo administrador).

```
src/
├── styles/tokens.ts        Colores de marca (única fuente de verdad; Tailwind y gráficos los leen)
├── components/
│   ├── ui/                 Sistema de diseño genérico — importar siempre desde "@/components/ui"
│   ├── layout/             Menú lateral, barra inferior, selector de local, mapa de módulos
│   ├── filtros/            Filtro de rango de fechas y navegador de días
│   ├── ventas/, arqueo/    Piezas de dominio que se repiten en varias pantallas
│   └── graficos/           Gráficos (Recharts)
└── app/                    Páginas: solo datos + composición de componentes
```

- **Paleta de la marca** (monocromática): `#020202`, `#A6A6A6`, `#D9D9D9` y `#FFFFFF`, definida en `src/styles/tokens.ts`. `neutral` es la escala de grises (textos, bordes, fondos) y `brand` el negro de la marca (acciones y selección). `#A6A6A6` no se usa para texto: no se lee bien sobre blanco.
- **Colores de estado**: `success` (cuadra, ingresos), `danger` (faltantes, gastos, anulaciones), `warning` (pendientes) e `info` (ayudas), solo en insignias, avisos y cifras. Los componentes reciben `tone="success"`, nunca un color directo.
- **Componentes de `ui/`**: `Button` (variantes, tamaños, ícono, `loading`, y `href` para enlaces), `Card`/`CardHeader`/`CardLink`, `Modal` y `ConfirmButton`, `Icon`/`IconBadge` (escala única de tamaños), `Calendar`/`DatePicker`, `Input`/`Select`/`Textarea`/`Checkbox`/`PasswordInput`, `GramsInput`/`MoneyInput`/`QuantityStepper`, `ChoiceTile`/`Chip`, `StatCard`, `DataRow`, `List`/`ListItem`, `Table`/`Th`/`Td`, `Badge`/`StatusBadge`, `Alert`, `EmptyState`, `Stepper`, `ProgressBar`, `Pagination`, `PageHeader`/`Section`/`PageContainer`.
- **Regla**: si una pantalla necesita algo que no existe, se agrega en `src/components/ui` (o en una carpeta de dominio si es específico del negocio) y se muestra en `/admin/componentes`.
- Los botones son `type="button"` por defecto: para enviar un formulario use `type="submit"`.
- Desde una página del servidor no se pueden pasar componentes de ícono a componentes de cliente: en `ConfirmButton` el ícono se pasa ya renderizado (`icon={<Icon icon={Ban} />}`).

## Notas técnicas

- Next.js 15 (App Router, Server Actions) + Prisma + PostgreSQL (Neon) + Tailwind + Recharts.
- Pesos guardados en **centésimas de gramo** (enteros) y dinero en pesos COP enteros: no hay errores de redondeo.
- Toda modificación de inventario pasa por `registrarMovimiento()` en [src/lib/inventario.ts](src/lib/inventario.ts), que escribe el kardex y actualiza el saldo en la misma transacción. `npm run verificar` comprueba que saldo = suma del kardex.
- Los recibos de gastos se guardan en el disco del servidor (`SOPORTES_DIR`), no en la base.
