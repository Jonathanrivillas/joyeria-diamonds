/* Datos de ejemplo: 2 locales, usuarios demo, las 17 categorías de la planilla
 * y 30 días de ventas, gastos y arqueos simulados.
 * El saldo final del Local 1 coincide con la planilla (total 2.140,83 g). */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Generador pseudoaleatorio determinístico (mismos datos en cada seed)
let semilla = 20261112;
function rnd() {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
}
const entre = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
const elegir = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

// [nombre, controlaPeso, precio/g, precio/unidad, pesoCg Local1, cantidad Local1]
const CATEGORIAS: [string, boolean, number, number, number, number][] = [
  ["Dijes", true, 380000, 0, 66206, 919],
  ["Topos", true, 380000, 0, 12525, 162],
  ["Tobilleras", true, 370000, 0, 9840, 45],
  ["Pulsos", true, 380000, 0, 31072, 88],
  ["Candongas", true, 380000, 0, 18630, 140],
  ["Anillos", true, 390000, 0, 24518, 96],
  ["Cadenas", true, 370000, 0, 28764, 52],
  ["Piercing", true, 400000, 0, 1892, 74],
  ["Balines", true, 360000, 0, 2215, 130],
  ["Topos-Seguridad", true, 380000, 0, 3048, 60],
  ["Broches", true, 360000, 0, 1236, 40],
  ["Topos-Esmeralda", true, 450000, 0, 2480, 22],
  ["Anillos-Esmeralda", true, 460000, 0, 4827, 15],
  ["Dijes-Esmeralda", true, 450000, 0, 3610, 18],
  ["Neón", false, 0, 25000, 0, 35],
  ["Anillos Italy", true, 420000, 0, 3220, 12],
  ["Diamantes", false, 0, 1800000, 0, 8],
];

const CLIENTES = [
  "María Gómez", "Carlos Ruiz", "Ana Martínez", "Luisa Fernández", "Jorge Pérez",
  "Valentina Ríos", "Andrés Castro", "Camila Torres", "", "", "",
];

const GASTOS: [string, string, number, number][] = [
  ["SERVICIOS", "Pago de energía del local", 180000, 320000],
  ["INSUMOS", "Bolsas, estuches y cajas de regalo", 60000, 180000],
  ["INSUMOS", "Limpiador y paños para joyas", 25000, 70000],
  ["OTROS", "Domicilio de mercancía", 15000, 40000],
  ["OTROS", "Cafetería y aseo", 20000, 60000],
  ["SERVICIOS", "Internet y datáfono", 90000, 150000],
];

async function main() {
  console.log("Limpiando base de datos...");
  await db.auditoria.deleteMany();
  await db.intentoLogin.deleteMany();
  await db.trasladoItem.deleteMany();
  await db.traslado.deleteMany();
  await db.arqueoDetalle.deleteMany();
  await db.arqueo.deleteMany();
  await db.ventaItem.deleteMany();
  await db.venta.deleteMany();
  await db.gasto.deleteMany();
  await db.movimiento.deleteMany();
  await db.existencia.deleteMany();
  await db.usuario.deleteMany();
  await db.categoria.deleteMany();
  await db.local.deleteMany();

  const l1 = await db.local.create({
    data: { nombre: "Local 1 – Diamonds", direccion: "C.C. Centro, local 101", prefijoFactura: "L1" },
  });
  const l2 = await db.local.create({
    data: { nombre: "Local 2", direccion: "Calle 10 # 5-23", prefijoFactura: "L2" },
  });

  const hash = await bcrypt.hash("demo123", 10);
  const admin = await db.usuario.create({
    data: { nombre: "Administrador", email: "admin@joyeria.com", passwordHash: hash, rol: "ADMIN" },
  });
  const v1 = await db.usuario.create({
    data: { nombre: "Laura (Vendedora L1)", email: "vendedor1@joyeria.com", passwordHash: hash, rol: "VENDEDOR", localId: l1.id },
  });
  const v2 = await db.usuario.create({
    data: { nombre: "Diego (Vendedor L2)", email: "vendedor2@joyeria.com", passwordHash: hash, rol: "VENDEDOR", localId: l2.id },
  });

  const cats: { id: number; controlaPeso: boolean }[] = [];
  for (let i = 0; i < CATEGORIAS.length; i++) {
    const [nombre, controlaPeso, pg, pu] = CATEGORIAS[i];
    cats.push(
      await db.categoria.create({
        data: { nombre, orden: i + 1, controlaPeso, precioGramoSugerido: pg, precioUnidadSugerido: pu },
      })
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const DIAS = 30;
  const diaN = (n: number, h: number, m = 0) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - n);
    d.setHours(h, m, 0, 0);
    return d;
  };

  for (const [local, vendedor, factor] of [
    [l1, v1, 1],
    [l2, v2, 0.75],
  ] as const) {
    // Saldo objetivo de hoy (Local 2 ≈ 75% del Local 1)
    const objetivo = CATEGORIAS.map(([, , , , peso, cant]) => ({
      peso: Math.round(peso * factor),
      cant: Math.max(1, Math.round(cant * factor)),
    }));

    // 1) Simular ventas de los últimos 30 días (hoy hasta antes de ahora)
    type ItemSim = { cat: number; peso: number; cant: number; precio: number; hechura: number; subtotal: number };
    type VentaSim = { fecha: Date; items: ItemSim[]; metodo: string; cliente: string; anulada: boolean };
    const ventas: VentaSim[] = [];
    const vendido = objetivo.map(() => ({ peso: 0, cant: 0 }));

    for (let n = DIAS; n >= 0; n--) {
      const nVentas = n === 0 ? entre(2, 4) : entre(Math.round(3 * factor), Math.round(8 * factor));
      for (let k = 0; k < nVentas; k++) {
        const hora = n === 0 ? Math.min(entre(9, 12), Math.max(9, new Date().getHours())) : entre(9, 19);
        const fecha = diaN(n, hora, entre(0, 59));
        if (fecha > new Date()) continue;
        const items: ItemSim[] = [];
        const nItems = rnd() < 0.75 ? 1 : entre(2, 3);
        for (let j = 0; j < nItems; j++) {
          // Más peso en categorías grandes
          const ci = rnd() < 0.55 ? elegir([0, 0, 1, 3, 4, 5, 6]) : entre(0, cats.length - 1);
          const c = CATEGORIAS[ci];
          const cant = rnd() < 0.85 ? 1 : 2;
          let peso = 0;
          if (c[1]) {
            const prom = c[4] / c[5]; // peso promedio por pieza (cg)
            peso = Math.max(30, Math.round(prom * cant * (0.6 + rnd() * 0.9)));
          }
          const precio = c[1] ? c[2] : c[3];
          const hechura = c[1] && rnd() < 0.3 ? elegir([10000, 15000, 20000]) : 0;
          const subtotal = c[1] ? Math.round((peso / 100) * precio) + hechura : precio * cant;
          items.push({ cat: ci, peso, cant, precio, hechura, subtotal });
        }
        const anulada = rnd() < 0.03;
        if (!anulada) {
          for (const it of items) {
            vendido[it.cat].peso += it.peso;
            vendido[it.cat].cant += it.cant;
          }
        }
        ventas.push({
          fecha,
          items,
          anulada,
          metodo: elegir(["EFECTIVO", "EFECTIVO", "TRANSFERENCIA", "TARJETA"]),
          cliente: elegir(CLIENTES),
        });
      }
    }

    // 2) Entrada inicial = saldo objetivo + lo vendido
    const fechaInicial = diaN(DIAS + 1, 8);
    for (let i = 0; i < cats.length; i++) {
      const peso = objetivo[i].peso + vendido[i].peso;
      const cant = objetivo[i].cant + vendido[i].cant;
      const pesoFinal = CATEGORIAS[i][1] ? peso : 0;
      await db.movimiento.create({
        data: {
          localId: local.id, categoriaId: cats[i].id, usuarioId: admin.id, tipo: "ENTRADA",
          pesoCg: pesoFinal, cantidad: cant, fecha: fechaInicial, nota: "Inventario inicial (planilla)",
        },
      });
      await db.existencia.create({
        data: { localId: local.id, categoriaId: cats[i].id, pesoCg: CATEGORIAS[i][1] ? objetivo[i].peso : 0, cantidad: objetivo[i].cant },
      });
    }

    // 3) Crear ventas y sus movimientos
    ventas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    let consecutivo = 0;
    for (const v of ventas) {
      consecutivo++;
      const numero = `${local.prefijoFactura}-${String(consecutivo).padStart(6, "0")}`;
      const total = v.items.reduce((s, i) => s + i.subtotal, 0);
      const venta = await db.venta.create({
        data: {
          numero, fecha: v.fecha, localId: local.id, usuarioId: vendedor.id,
          clienteNombre: v.cliente || null, metodoPago: v.metodo, total,
          estado: v.anulada ? "ANULADA" : "ACTIVA",
          motivoAnulacion: v.anulada ? "Error en el peso digitado" : null,
          items: {
            create: v.items.map((i) => ({
              categoriaId: cats[i.cat].id, descripcion: "", pesoCg: i.peso, cantidad: i.cant,
              precioGramo: i.precio, hechura: i.hechura, subtotal: i.subtotal,
            })),
          },
        },
      });
      for (const i of v.items) {
        await db.movimiento.create({
          data: {
            localId: local.id, categoriaId: cats[i.cat].id, usuarioId: vendedor.id, tipo: "VENTA",
            pesoCg: -i.peso, cantidad: -i.cant, fecha: v.fecha, referencia: numero,
          },
        });
        if (v.anulada) {
          const f = new Date(v.fecha.getTime() + 20 * 60000);
          await db.movimiento.create({
            data: {
              localId: local.id, categoriaId: cats[i.cat].id, usuarioId: admin.id, tipo: "ANULACION",
              pesoCg: i.peso, cantidad: i.cant, fecha: f, referencia: numero, nota: "Anulación de factura",
            },
          });
        }
      }
      void venta;
    }
    await db.local.update({ where: { id: local.id }, data: { consecutivo } });

    // 4) Gastos
    for (let n = DIAS; n >= 1; n--) {
      if (rnd() < 0.45) {
        const [tipo, just, min, max] = elegir(GASTOS);
        await db.gasto.create({
          data: {
            localId: local.id, usuarioId: vendedor.id, fecha: diaN(n, entre(10, 17)), tipo,
            justificacion: just, monto: Math.round(entre(min, max) / 1000) * 1000,
          },
        });
      }
      const d = diaN(n, 9);
      if (d.getDate() === 1 || n === DIAS) {
        await db.gasto.create({
          data: { localId: local.id, usuarioId: admin.id, fecha: diaN(n, 9), tipo: "ARRIENDO",
            justificacion: "Arriendo mensual del local", monto: factor === 1 ? 3500000 : 2400000 },
        });
      }
      if (d.getDate() === 15 || d.getDate() === 30) {
        await db.gasto.create({
          data: { localId: local.id, usuarioId: admin.id, fecha: diaN(n, 18), tipo: "NOMINA",
            justificacion: "Pago quincena vendedor(a)", monto: 850000 },
        });
      }
    }

    // 5) Arqueos diarios cerrados (días anteriores). Saldo del sistema reconstruido del kardex.
    const movs = await db.movimiento.findMany({ where: { localId: local.id }, orderBy: { fecha: "asc" } });
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
      // Diferencias pequeñas ocasionales (que luego se "encuentran": no se ajustan)
      const conDif = rnd() < 0.25 ? entre(0, 5) : -1;
      let totalSis = 0;
      let totalCont = 0;
      const detalles = cats.map((c, idx) => {
        const s = saldo.get(c.id) ?? { peso: 0, cant: 0 };
        let pc = s.peso;
        const cc = s.cant;
        if (idx === conDif && c.controlaPeso) pc = s.peso - entre(150, 450);
        totalSis += s.peso;
        totalCont += pc;
        const estado = pc === s.peso && cc === s.cant ? "OK" : pc < s.peso || cc < s.cant ? "FALTA" : "SOBRA";
        return {
          categoriaId: c.id, pesoSistemaCg: s.peso, cantidadSistema: s.cant,
          pesoContadoCg: pc, cantidadContada: cc, estado,
          observacion: estado === "OK" ? null : "Se revisó vitrina; pieza en reparación",
        };
      });
      await db.arqueo.create({
        data: {
          localId: local.id, usuarioId: vendedor.id, fecha: corte, estado: "CERRADO",
          pesoSistemaCg: totalSis, pesoContadoCg: totalCont, ajustesAplicados: false,
          observacion: totalSis === totalCont ? "Todo OK" : "Diferencia justificada: pieza en taller",
          detalles: { create: detalles },
        },
      });
    }
  }

  const tot = await db.existencia.aggregate({ where: { localId: l1.id }, _sum: { pesoCg: true } });
  console.log(`Listo. Saldo Local 1: ${((tot._sum.pesoCg ?? 0) / 100).toFixed(2)} g`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
