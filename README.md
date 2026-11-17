# Joyería · Inventario por gramos (demo)

Sistema para llevar el inventario de una joyería con 2 locales **por peso (gramos) y cantidad**, igual que la planilla en papel (Entrada / Salida / Saldo por categoría), más ventas (facturas), gastos justificados, arqueo diario y reportes.

## Cómo correrlo

Requisitos: Node.js 20+.

```bash
npm install
npm run setup      # crea la base de datos SQLite (prisma/dev.db) y carga datos de ejemplo
npm run dev        # http://localhost:3000
```

Para volver a dejar los datos de ejemplo como al inicio: `npm run db:reset`.

## Usuarios de prueba (clave `demo123`)

| Usuario | Rol | Ve |
|---|---|---|
| admin@joyeria.com | Administrador | Todos los locales (consolidado o uno a uno), anulaciones, entradas, traslados, configuración |
| vendedor1@joyeria.com | Vendedor | Solo Local 1 – Diamonds: ventas, gastos, arqueo |
| vendedor2@joyeria.com | Vendedor | Solo Local 2 |

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

- Next.js 15 (App Router, Server Actions) + Prisma + SQLite + Tailwind + Recharts.
- Pesos guardados en **centésimas de gramo** (enteros) y dinero en pesos COP enteros: no hay errores de redondeo.
- Toda modificación de inventario pasa por `registrarMovimiento()` en [src/lib/inventario.ts](src/lib/inventario.ts), que escribe el kardex y actualiza el saldo en la misma transacción. `npm run verificar` comprueba que saldo = suma del kardex.
- Para producción con PostgreSQL: cambiar `provider` en `prisma/schema.prisma` y `DATABASE_URL` en `.env`, y cambiar `SESSION_SECRET`.
- Los datos de ejemplo del Local 1 reproducen la planilla (total 2.140,83 g); el Local 2 tiene ~75 % de esos valores. Incluyen 30 días de ventas, gastos y arqueos simulados.
