/* Datos de la base de DESARROLLO: cargar datos de prueba o dejar todo en cero.
 *
 * ── Escoja el modo cambiando esta variable (o pase --prueba / --cero en el comando) ──
 */
const MODO: "PRUEBA" | "CERO" = "PRUEBA";
/** En modo CERO es el único usuario que queda. En modo PRUEBA no se borra ningún usuario. */
const ADMIN_QUE_QUEDA = "adminprueba@joyeria.com";
/*
 * PRUEBA: borra ventas, gastos, movimientos, arqueos, traslados y joyas, y carga 30 días de
 *         datos de ejemplo en los 2 locales (con costos, redes, proveedores y joyas preciosas).
 *         CONSERVA usuarios, locales, tipos de pieza (y su enlace a Alegra) y el precio del gramo.
 * CERO:   borra lo mismo, deja el inventario en 0 y borra todos los usuarios menos ADMIN_QUE_QUEDA.
 *
 * Uso (siempre con --si para confirmar; sin él solo dice qué haría):
 *   npx tsx --env-file=.env scripts/datos.ts --si            ← usa el MODO de arriba
 *   npx tsx --env-file=.env scripts/datos.ts --prueba --si
 *   npx tsx --env-file=.env scripts/datos.ts --cero --si
 *
 * ⚠️ Nunca contra la base real del cliente: revise DATABASE_URL en el .env antes de correrlo.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 120_000 } });

// ---------- Azar repetible (mismos datos en cada carga) ----------
let semilla = 20261124;
const rnd = () => {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
};
const entre = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
const elegir = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];

/** Inventario de ejemplo por tipo de pieza (Local 1; el Local 2 tiene el 75 %): [centigramos, piezas]. */
const BASE: Record<string, [number, number]> = {
  Dijes: [66206, 919], Topos: [12525, 162], Tobilleras: [9840, 45], Pulsos: [31072, 88],
  Candongas: [18630, 140], Anillos: [24518, 96], Cadenas: [28764, 52], Piercing: [1892, 74],
  Balines: [2215, 130], "Topos-Seguridad": [3048, 60], Broches: [1236, 40], "Anillos Italy": [3220, 12],
};
/** Si la base está vacía (instalación nueva), estos son los tipos de pieza que se crean. */
const CATEGORIAS_NUEVAS: [string, boolean, number][] = [
  ...Object.keys(BASE).map((n) => [n, true, 0] as [string, boolean, number]),
  ["Neón", false, 25000],
  ["Diamantes", false, 1800000],
];
const COSTO_GRAMO = 300_000; // a cómo se "compró" el oro de ejemplo (para ver ganancia en Reportes)
const CLIENTES = ["María Gómez", "Carlos Ruiz", "Ana Martínez", "Luisa Fernández", "Jorge Pérez", "Valentina Ríos", "Andrés Castro", "", "", ""];
const REDES = ["WHATSAPP", "WHATSAPP", "INSTAGRAM", "INSTAGRAM", "FACEBOOK"] as const;
const GASTOS: [string, string, number, number][] = [
  ["INSUMOS", "Bolsas, estuches y cajas de regalo", 60000, 180000],
  ["INSUMOS", "Limpiador y paños para joyas", 25000, 70000],
  ["INSUMOS", "Domicilio de mercancía", 15000, 40000],
  ["TALLERES", "Arreglo de cierres en el taller", 30000, 90000],
  ["COMISIONES", "Comisión por venta grande", 50000, 120000],
];

/** Borra todo lo que es movimiento (común a los dos modos). Usuarios, locales y tipos de pieza no se tocan. */
async function borrarMovimientos() {
  await db.$transaction(async (tx) => {
    await tx.ventaItem.deleteMany();
    await tx.venta.deleteMany();
    await tx.pieza.deleteMany();
    await tx.gasto.deleteMany();
    await tx.movimiento.deleteMany();
    await tx.arqueoDetalle.deleteMany();
    await tx.arqueo.deleteMany();
    await tx.trasladoItem.deleteMany();
    await tx.traslado.deleteMany();
    await tx.auditoria.deleteMany();
    await tx.intentoLogin.deleteMany();
    await tx.existencia.updateMany({ data: { pesoCg: 0, cantidad: 0, medidaConCosto: 0, costoTotal: 0 } });
    await tx.local.updateMany({ data: { consecutivo: 0 } });
  });
}

// ======================================================================
//  CERO
// ======================================================================
async function dejarEnCero() {
  console.log("Borrando ventas, gastos, movimientos y usuarios…");
  const admin = await db.usuario.findUnique({ where: { email: ADMIN_QUE_QUEDA } });
  if (!admin || admin.rol !== "ADMIN" || !admin.activo) throw new Error(`No hay un administrador activo con el correo ${ADMIN_QUE_QUEDA}. Cambie ADMIN_QUE_QUEDA.`);
  await borrarMovimientos();
  await db.$transaction(async (tx) => {
    await tx.precioGramo.updateMany({ where: { usuarioId: { not: admin.id } }, data: { usuarioId: admin.id } });
    const u = await tx.usuario.deleteMany({ where: { id: { not: admin.id } } });
    await tx.auditoria.create({ data: { accion: "DATOS_EN_CERO", usuarioId: admin.id, usuarioNombre: admin.nombre } });
    console.log(`✅ Todo en cero. ${u.count} usuarios borrados; queda ${admin.nombre} (${admin.email}).`);
  });
}

// ======================================================================
//  PRUEBA
// ======================================================================
async function cargarPrueba() {
  console.log("1/3 Borrando ventas, gastos y movimientos anteriores…");
  await borrarMovimientos();
  console.log("2/3 Preparando locales, usuarios, tipos de pieza y proveedores…");

  // ---- Locales (si no hay, se crean) ----
  let locales = await db.local.findMany({ orderBy: { id: "asc" } });
  if (locales.length === 0) {
    await db.local.create({ data: { nombre: "Local 1 – Diamonds", direccion: "C.C. Centro, local 101", prefijoFactura: "L1" } });
    await db.local.create({ data: { nombre: "Local 2", direccion: "Calle 10 # 5-23", prefijoFactura: "L2" } });
    locales = await db.local.findMany({ orderBy: { id: "asc" } });
  }

  // ---- Usuarios: se conservan todos. Se crean los de ejemplo solo si faltan (clave demo123). ----
  const hash = await bcrypt.hash("demo123", 10);
  const admin =
    (await db.usuario.findFirst({ where: { rol: "ADMIN", activo: true }, orderBy: { id: "asc" } })) ??
    (await db.usuario.create({ data: { nombre: "Administrador", email: "admin@joyeria.com", passwordHash: hash, rol: "ADMIN" } }));
  const vendedores = [];
  for (const [i, l] of locales.slice(0, 2).entries()) {
    const email = `vendedor${i + 1}@joyeria.com`;
    vendedores.push(
      (await db.usuario.findUnique({ where: { email } })) ??
        (await db.usuario.create({
          data: { nombre: i === 0 ? "Laura (Vendedora L1)" : "Diego (Vendedor L2)", email, passwordHash: hash, rol: "VENDEDOR", localId: l.id, permisos: ["vender", "facturas", "totales"] },
        })),
    );
  }

  // ---- Tipos de pieza: se usan los activos que ya existen (si no hay, se crean) ----
  if ((await db.categoria.count()) === 0) {
    for (const [i, [nombre, controlaPeso, precioUnidad]] of CATEGORIAS_NUEVAS.entries())
      await db.categoria.create({ data: { nombre, orden: i + 1, controlaPeso, precioUnidadSugerido: precioUnidad } });
    await db.categoria.create({ data: { nombre: "Fabricación", orden: 90, controlaPeso: false, esServicio: true } });
    await db.categoria.create({ data: { nombre: "Reparación", orden: 91, controlaPeso: false, esServicio: true } });
  }
  const cats = await db.categoria.findMany({ where: { activa: true, esServicio: false, porPieza: false }, orderBy: { orden: "asc" } });
  const servicios = await db.categoria.findMany({ where: { activa: true, esServicio: true } });
  const catJoyas = await db.categoria.findFirst({ where: { porPieza: true } });

  // ---- Precio del gramo (se conserva el último; si no hay, se crea) ----
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diaN = (n: number, h: number, m = 0) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - n);
    d.setHours(h, m, 0, 0);
    return d;
  };
  let precio = (await db.precioGramo.findFirst({ orderBy: { fecha: "desc" } }))?.valor;
  if (!precio) {
    precio = 400_000;
    await db.precioGramo.create({ data: { valor: precio, usuarioId: admin.id, fecha: diaN(1, 8, 30) } });
  }

  // ---- Proveedores de ejemplo (se conservan los que ya existan) ----
  const japon = await db.proveedor.upsert({ where: { nombre: "Japón" }, update: {}, create: { nombre: "Japón", notas: "Oro 18k" } });
  const oroMed = await db.proveedor.upsert({ where: { nombre: "Oro Medellín" }, update: {}, create: { nombre: "Oro Medellín", telefono: "3001234567" } });

  const DIAS = 30;
  // Costo de compra por "medida": centigramos (si se pesa) o piezas.
  const costoMedida = (c: (typeof cats)[number]) => (c.controlaPeso ? COSTO_GRAMO / 100 : Math.round(c.precioUnidadSugerido * 0.7));
  const base = (c: (typeof cats)[number]): [number, number] => BASE[c.nombre] ?? (c.controlaPeso ? [5000, 40] : [0, 20]);
  let totalVentas = 0;

  for (const [li, local] of locales.slice(0, 2).entries()) {
    const vendedor = vendedores[li];
    console.log(`3/3 ${local.nombre}: creando ventas, gastos, joyas y arqueos…`);
    const factor = li === 0 ? 1 : 0.75;
    const objetivo = cats.map((c) => {
      const [p, q] = base(c);
      return { peso: c.controlaPeso ? Math.round(p * factor) : 0, cant: Math.max(1, Math.round(q * factor)) };
    });

    // 1) Simular las ventas de los últimos 30 días
    type Item = { ci: number; peso: number; cant: number; precio: number; subtotal: number; servicio?: string };
    type V = { fecha: Date; items: Item[]; metodo: string; cliente: string; anulada: boolean; canal: string; red: string | null; aProveedor: number | null };
    const ventas: V[] = [];
    const vendido = cats.map(() => ({ peso: 0, cant: 0 }));
    for (let n = DIAS; n >= 0; n--) {
      const nVentas = n === 0 ? entre(2, 4) : entre(Math.round(3 * factor), Math.round(8 * factor));
      for (let k = 0; k < nVentas; k++) {
        const fecha = diaN(n, n === 0 ? Math.min(entre(9, 12), Math.max(9, new Date().getHours())) : entre(9, 19), entre(0, 59));
        if (fecha > new Date()) continue;
        const items: Item[] = [];
        for (let j = 0, nItems = rnd() < 0.75 ? 1 : entre(2, 3); j < nItems; j++) {
          // De vez en cuando, un trabajo de taller.
          if (servicios.length && rnd() < 0.06) {
            const sv = elegir(servicios);
            const valor = entre(5, 30) * 10000;
            items.push({ ci: -1, peso: 0, cant: 1, precio: valor, subtotal: valor, servicio: `${sv.id}|${sv.nombre === "Reparación" ? "Soldar cadena" : "Anillo de grado"}` });
            continue;
          }
          const ci = entre(0, cats.length - 1);
          const c = cats[ci];
          const [p, q] = base(c);
          const cant = rnd() < 0.85 ? 1 : 2;
          const peso = c.controlaPeso ? Math.max(30, Math.round((p / q) * cant * (0.6 + rnd() * 0.9))) : 0;
          const pr = c.controlaPeso ? precio : c.precioUnidadSugerido || 50000;
          items.push({ ci, peso, cant, precio: pr, subtotal: c.controlaPeso ? Math.round((peso / 100) * pr) : pr * cant });
        }
        const anulada = rnd() < 0.03;
        if (!anulada) for (const it of items) if (it.ci >= 0) (vendido[it.ci].peso += it.peso), (vendido[it.ci].cant += it.cant);
        const metodo = elegir(["EFECTIVO", "EFECTIVO", "TRANSFERENCIA", "TRANSFERENCIA", "TARJETA"]);
        const porRedes = rnd() < 0.2;
        ventas.push({
          fecha, items, anulada, metodo, cliente: elegir(CLIENTES),
          canal: porRedes ? "REDES" : "TIENDA",
          red: porRedes ? elegir(REDES) : null,
          aProveedor: metodo === "TRANSFERENCIA" && rnd() < 0.25 ? japon.id : null,
        });
      }
    }

    // 2) Inventario inicial (con costo) = lo que queda hoy + lo que se vendió
    const fechaInicial = diaN(DIAS + 1, 8);
    for (const [i, c] of cats.entries()) {
      const peso = c.controlaPeso ? objetivo[i].peso + vendido[i].peso : 0;
      const cant = objetivo[i].cant + vendido[i].cant;
      const medidaIni = c.controlaPeso ? peso : cant;
      await db.movimiento.create({
        data: { localId: local.id, categoriaId: c.id, usuarioId: admin.id, tipo: "ENTRADA", pesoCg: peso, cantidad: cant, fecha: fechaInicial, nota: "Inventario inicial (datos de prueba)", costo: medidaIni * costoMedida(c), proveedorId: oroMed.id },
      });
      const medidaFin = c.controlaPeso ? objetivo[i].peso : objetivo[i].cant;
      await db.existencia.upsert({
        where: { localId_categoriaId: { localId: local.id, categoriaId: c.id } },
        create: { localId: local.id, categoriaId: c.id, pesoCg: objetivo[i].peso, cantidad: objetivo[i].cant, medidaConCosto: medidaFin, costoTotal: medidaFin * costoMedida(c) },
        update: { pesoCg: objetivo[i].peso, cantidad: objetivo[i].cant, medidaConCosto: medidaFin, costoTotal: medidaFin * costoMedida(c) },
      });
    }

    // 3) Ventas con sus movimientos y el costo de lo vendido
    ventas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    let consecutivo = 0;
    for (const v of ventas) {
      consecutivo++;
      const numero = `${local.prefijoFactura}-${String(consecutivo).padStart(6, "0")}`;
      const total = v.items.reduce((s, i) => s + i.subtotal, 0);
      await db.venta.create({
        data: {
          numero, fecha: v.fecha, localId: local.id, usuarioId: vendedor.id, clienteNombre: v.cliente || null,
          metodoPago: v.metodo, total, canal: v.canal, red: v.red, proveedorId: v.aProveedor,
          estado: v.anulada ? "ANULADA" : "ACTIVA", motivoAnulacion: v.anulada ? "Error en el peso digitado" : null,
          items: {
            create: v.items.map((i) => {
              if (i.ci < 0) {
                const [id, desc] = i.servicio!.split("|");
                return { categoriaId: Number(id), descripcion: desc, pesoCg: 0, cantidad: 1, precioGramo: i.precio, subtotal: i.subtotal };
              }
              const c = cats[i.ci];
              const medida = c.controlaPeso ? i.peso : i.cant;
              return { categoriaId: c.id, pesoCg: i.peso, cantidad: i.cant, precioGramo: i.precio, subtotal: i.subtotal, costoMedida: medida, costo: medida * costoMedida(c) };
            }),
          },
        },
      });
      for (const i of v.items.filter((i) => i.ci >= 0)) {
        const c = cats[i.ci];
        const costo = (c.controlaPeso ? i.peso : i.cant) * costoMedida(c);
        await db.movimiento.create({ data: { localId: local.id, categoriaId: c.id, usuarioId: vendedor.id, tipo: "VENTA", pesoCg: -i.peso, cantidad: -i.cant, fecha: v.fecha, referencia: numero, costo: -costo } });
        if (v.anulada)
          await db.movimiento.create({
            data: { localId: local.id, categoriaId: c.id, usuarioId: admin.id, tipo: "ANULACION", pesoCg: i.peso, cantidad: i.cant, fecha: new Date(v.fecha.getTime() + 20 * 60000), referencia: numero, nota: "Anulación de factura", costo },
          });
      }
    }
    await db.local.update({ where: { id: local.id }, data: { consecutivo } });
    totalVentas += ventas.length;

    // 4) Gastos (incluye pagos a proveedores)
    for (let n = DIAS; n >= 1; n--) {
      if (rnd() < 0.45) {
        const [tipo, just, min, max] = elegir(GASTOS);
        await db.gasto.create({ data: { localId: local.id, usuarioId: vendedor.id, fecha: diaN(n, entre(10, 17)), tipo, justificacion: just, monto: Math.round(entre(min, max) / 1000) * 1000 } });
      }
      if (n % 7 === 0)
        await db.gasto.create({
          data: { localId: local.id, usuarioId: admin.id, fecha: diaN(n, 16), tipo: "PROVEEDOR", proveedorId: japon.id, justificacion: "Abono semanal a Japón", monto: factor === 1 ? 1500000 : 900000 },
        });
      if (n === DIAS)
        await db.gasto.create({ data: { localId: local.id, usuarioId: admin.id, fecha: diaN(n, 9), tipo: "ARRIENDO", justificacion: "Arriendo mensual del local", monto: factor === 1 ? 3500000 : 2400000 } });
      if (n === 15 || n === 1)
        await db.gasto.create({ data: { localId: local.id, usuarioId: admin.id, fecha: diaN(n, 18), tipo: "NOMINA", justificacion: "Pago quincena vendedor(a)", monto: 850000 } });
    }

    // 5) Joyas preciosas de ejemplo (4 por local)
    if (catJoyas) {
      let peso = 0;
      for (let k = 0; k < 4; k++) {
        const pCg = entre(250, 900);
        const costo = entre(8, 30) * 100000;
        const pz = await db.pieza.create({
          data: { codigo: `TMP-${local.id}-${k}`, tipo: elegir(["ANILLO", "TOPOS", "DIJE"]), descripcion: "Esmeralda colombiana, oro 18k", pesoCg: pCg, precio: Math.round(costo * 1.6 / 10000) * 10000, costo, localId: local.id, categoriaId: catJoyas.id, proveedorId: japon.id, creadaEn: diaN(20 - k, 11) },
        });
        const codigo = `JP-${String(pz.id).padStart(4, "0")}`;
        await db.pieza.update({ where: { id: pz.id }, data: { codigo } });
        await db.movimiento.create({ data: { localId: local.id, categoriaId: catJoyas.id, usuarioId: admin.id, tipo: "ENTRADA", pesoCg: pCg, cantidad: 1, fecha: diaN(20 - k, 11), referencia: codigo, nota: `${codigo} · compra a Japón`, costo, proveedorId: japon.id } });
        peso += pCg;
      }
      const costoJoyas = await db.pieza.aggregate({ where: { localId: local.id }, _sum: { costo: true } });
      await db.existencia.upsert({
        where: { localId_categoriaId: { localId: local.id, categoriaId: catJoyas.id } },
        create: { localId: local.id, categoriaId: catJoyas.id, pesoCg: peso, cantidad: 4, medidaConCosto: peso, costoTotal: costoJoyas._sum.costo ?? 0 },
        update: { pesoCg: peso, cantidad: 4, medidaConCosto: peso, costoTotal: costoJoyas._sum.costo ?? 0 },
      });
    }

    // 6) Arqueos cerrados de los días anteriores (saldo reconstruido del kardex)
    const movs = await db.movimiento.findMany({ where: { localId: local.id, categoriaId: { in: cats.map((c) => c.id) } }, orderBy: { fecha: "asc" } });
    for (let n = DIAS - 1; n >= 1; n--) {
      const corte = diaN(n, 19, 30);
      const saldo = new Map<number, { peso: number; cant: number }>();
      for (const m of movs) {
        if (m.fecha > corte) break;
        const s = saldo.get(m.categoriaId) ?? { peso: 0, cant: 0 };
        s.peso += m.pesoCg;
        s.cant += m.cantidad;
        saldo.set(m.categoriaId, s);
      }
      const conDif = rnd() < 0.25 ? entre(0, cats.length - 1) : -1;
      let totalSis = 0;
      let totalCont = 0;
      const detalles = cats.map((c, idx) => {
        const s = saldo.get(c.id) ?? { peso: 0, cant: 0 };
        const pc = idx === conDif && c.controlaPeso ? s.peso - entre(150, 450) : s.peso;
        totalSis += s.peso;
        totalCont += pc;
        const estado = pc === s.peso ? "OK" : "FALTA";
        return { categoriaId: c.id, pesoSistemaCg: s.peso, cantidadSistema: s.cant, pesoContadoCg: pc, cantidadContada: s.cant, estado, observacion: estado === "OK" ? null : "Pieza en el taller" };
      });
      await db.arqueo.create({
        data: { localId: local.id, usuarioId: vendedor.id, fecha: corte, estado: "CERRADO", pesoSistemaCg: totalSis, pesoContadoCg: totalCont, ajustesAplicados: false, observacion: totalSis === totalCont ? "Todo OK" : "Diferencia justificada: pieza en taller", detalles: { create: detalles } },
      });
    }
  }

  console.log(`✅ Datos de prueba cargados: ${totalVentas} ventas en ${Math.min(2, locales.length)} locales, 30 días.`);
  console.log(`   Usuarios de ejemplo (clave demo123): ${vendedores.map((v) => v.email).join(", ")}. Su(s) usuario(s) se conservaron.`);
}

// ======================================================================
//  PRODUCCION: dejar la base real lista para el primer día
// ======================================================================
async function dejarListaProduccion() {
  const admin = await db.usuario.findUnique({ where: { email: ADMIN_QUE_QUEDA } });
  if (!admin || admin.rol !== "ADMIN" || !admin.activo) throw new Error(`No hay un administrador activo con el correo ${ADMIN_QUE_QUEDA}. Cambie ADMIN_QUE_QUEDA.`);
  console.log("Borrando movimientos, usuarios de prueba, proveedores de prueba y precios viejos…");
  await borrarMovimientos();
  await db.$transaction(async (tx) => {
    await tx.precioGramo.deleteMany(); // el administrador pone el precio real el primer día
    await tx.proveedor.deleteMany(); // ya no tienen gastos, ventas ni joyas (se borraron arriba)
    const u = await tx.usuario.deleteMany({ where: { id: { not: admin.id } } });
    // Los productos de Alegra eran de la cuenta de PRUEBA: con la cuenta real se crean solos al
    // facturar (o con scripts/enlazar-alegra.ts).
    await tx.categoria.updateMany({ data: { alegraItemId: null } });
    await tx.auditoria.create({ data: { accion: "BASE_LISTA_PRODUCCION", usuarioId: admin.id, usuarioNombre: admin.nombre } });
    console.log(`✅ Base lista para el primer día. ${u.count} usuarios de prueba borrados; queda ${admin.nombre} (${admin.email}).`);
    console.log("   Siguiente: entrar, poner el precio del gramo, crear los usuarios reales e ingresar el inventario.");
  });
}

// ======================================================================
async function main() {
  const modo = process.argv.includes("--produccion")
    ? "PRODUCCION"
    : process.argv.includes("--cero")
      ? "CERO"
      : process.argv.includes("--prueba")
        ? "PRUEBA"
        : MODO;
  const url = (process.env.DATABASE_URL ?? "").replace(/\/\/[^@]*@/, "//***@").split("?")[0];
  let servidor = "";
  try {
    servidor = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    throw new Error("DATABASE_URL no está configurada o no es válida.");
  }
  console.log(`Modo: ${modo}  ·  Base: ${url}`);

  // ── Seguros: este script BORRA datos ──
  if (modo === "PRODUCCION") {
    // La base real solo se prepara escribiendo su servidor a mano: no se puede correr por error.
    const confirmado = process.argv.find((x) => x.startsWith("--confirmar="))?.slice("--confirmar=".length);
    if (confirmado !== servidor) {
      console.log(`Para preparar esta base para el primer día, agregue: --confirmar=${servidor}`);
      process.exitCode = 1;
      return;
    }
  } else {
    // Datos de prueba / cero: solo en bases marcadas como de desarrollo en el .env de su computador.
    const permitidos = (process.env.DATOS_PERMITIDOS_HOSTS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    if (process.env.NODE_ENV === "production" || !permitidos.some((p) => servidor.includes(p))) {
      console.log("⛔ No se hizo nada: esta base no está marcada como de desarrollo.");
      console.log(`   Si de verdad es su base de pruebas, agregue en su .env:  DATOS_PERMITIDOS_HOSTS=${servidor.split(".")[0].replace(/-pooler$/, "")}`);
      process.exitCode = 1;
      return;
    }
  }

  if (!process.argv.includes("--si")) {
    console.log(
      modo === "PRODUCCION"
        ? "Dejaría la base lista para el primer día (sin datos de prueba)."
        : modo === "CERO"
          ? "Borraría todo y dejaría solo a " + ADMIN_QUE_QUEDA + "."
          : "Borraría los movimientos y cargaría 30 días de datos de prueba.",
    );
    console.log("No se hizo nada. Para confirmar, agregue --si al final del comando.");
    return;
  }
  // Último seguro: 5 segundos para leer qué base se va a tocar y cancelar con Ctrl + C.
  for (let s = 5; s > 0; s--) {
    process.stdout.write(`\rEmpieza en ${s} s… (Ctrl + C para cancelar) `);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write("\rEmpezó. Esto tarda uno o dos minutos; no cierre la terminal.\n");
  if (modo === "PRODUCCION") await dejarListaProduccion();
  else if (modo === "CERO") await dejarEnCero();
  else await cargarPrueba();
}

main()
  .catch((e) => {
    console.error("❌", e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
