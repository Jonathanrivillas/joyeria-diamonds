// Comunicación con la API de Alegra (facturación electrónica).
// Solo se usa en el servidor: el token nunca debe llegar al navegador.

const BASE = "https://api.alegra.com/api/v1";

/**
 * Alegra contestó que NO (datos inválidos, cliente mal escrito…): no se creó nada y se puede
 * corregir y reintentar sin riesgo.
 */
export class AlegraRechazo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "AlegraRechazo";
  }
}

/**
 * Alegra no respondió a tiempo, se cortó la conexión o falló de su lado (5xx): NO se sabe si la
 * operación se hizo. Para una factura esto significa que puede existir: reintentar a ciegas
 * podría crear una factura duplicada ante la DIAN.
 */
export class AlegraSinRespuesta extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "AlegraSinRespuesta";
  }
}

function autorizacion() {
  const usuario = process.env.ALEGRA_USUARIO;
  const token = process.env.ALEGRA_TOKEN;
  if (!usuario || !token) throw new AlegraRechazo("La facturación electrónica no está configurada. Avise a soporte.");
  return "Basic " + Buffer.from(`${usuario}:${token}`).toString("base64");
}

async function alegra<T>(ruta: string, opciones: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + ruta, {
      method: opciones.method ?? "GET",
      headers: { Authorization: autorizacion(), "Content-Type": "application/json", Accept: "application/json" },
      body: opciones.body ? JSON.stringify(opciones.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    if (e instanceof AlegraRechazo) throw e;
    // Tiempo agotado o red caída: no sabemos si Alegra alcanzó a procesar la petición.
    throw new AlegraSinRespuesta(`Alegra no respondió (${(e as Error).name === "TimeoutError" ? "pasaron 20 segundos" : "sin conexión"}).`);
  }
  const datos = await res.json().catch(() => null);
  if (res.status >= 500) throw new AlegraSinRespuesta(`Alegra tuvo un problema de su lado (${res.status}).`);
  if (!res.ok) throw new AlegraRechazo(`Alegra no aceptó la factura: ${datos?.message ?? `error ${res.status}`}`);
  return datos as T;
}

/** Revisa que el usuario y el token funcionen. */
export async function probarConexionAlegra() {
  await alegra<unknown[]>("/invoices?limit=1");
  return true;
}


// ---------- Clientes ----------

export type TipoDocumento = "CC" | "NIT" | "CE" | "PP";

export type ClienteFactura = {
  tipoDoc: TipoDocumento;
  documento: string;
  nombre: string;
  correo?: string | null;
};

/** El cliente "Consumidor Final" que Alegra trae creado en toda cuenta de Colombia. */
export const CONSUMIDOR_FINAL = "222222222222";

/** Busca el cliente en Alegra por su documento; si no existe, lo crea. Devuelve su id. */
export async function buscarOCrearCliente(c: ClienteFactura): Promise<string> {
  const documento = c.documento.replace(/\D/g, ""); // solo números
  const encontrados = await alegra<{ id: string }[]>(
    `/contacts?identification=${encodeURIComponent(documento)}&limit=1`,
  );
  if (encontrados.length > 0) return encontrados[0].id;

  const esEmpresa = c.tipoDoc === "NIT";
  const [primerNombre, ...resto] = c.nombre.trim().split(/\s+/);
  const nuevo = await alegra<{ id: string }>("/contacts", {
    method: "POST",
    body: {
      type: ["client"],
      identificationObject: { type: c.tipoDoc, number: documento },
      kindOfPerson: esEmpresa ? "LEGAL_ENTITY" : "PERSON_ENTITY",
      regime: "SIMPLIFIED_REGIME",
      ...(esEmpresa
        ? { name: c.nombre.trim() }
        : { nameObject: { firstName: primerNombre, lastName: resto.join(" ") || primerNombre } }),
      email: c.correo || undefined,
    },
  });
  return nuevo.id;
}

// ---------- Facturas ----------

export type ItemFactura = {
  alegraItemId: string; // producto de Alegra enlazado al tipo de pieza
  descripcion: string;  // ej. "Anillo 18k – 3,25 g"
  precio: number;       // subtotal de esa línea en COP (ya incluye peso y hechura)
};

// Formas de pago del sistema -> medios de pago DIAN en Alegra.
// Otros códigos disponibles: BANK_DEPOSIT (consignación), CREDIT_CARD (tarjeta crédito).
// ⚠️ Pendiente confirmar con el contador: transferencia y si se separa tarjeta débito/crédito.
const METODO_PAGO: Record<string, string> = {
  EFECTIVO: "CASH",
  TRANSFERENCIA: "DEBIT_TRANSFER",
  TARJETA: "DEBIT_CARD",
};

export async function crearFacturaAlegra(datos: {
  /** Número de la venta en el sistema (ej. L1-000123): va en las observaciones de la factura. */
  referencia: string;
  clienteId: string;
  fecha: string; // "2026-11-23", en hora de Colombia
  metodoPago: string;
  items: ItemFactura[];
}): Promise<{ id: string; numero: string }> {
  // Solo se envía a la DIAN si se activa a propósito. En pruebas se deja apagado.
  const enviarDian = process.env.ALEGRA_ENVIAR_DIAN === "true";

  const f = await alegra<{ id: string; numberTemplate?: { fullNumber?: string } }>("/invoices", {
    method: "POST",
    body: {
      date: datos.fecha,
      dueDate: datos.fecha,
      client: { id: Number(datos.clienteId) },
      paymentForm: "CASH", // de contado
      paymentMethod: METODO_PAGO[datos.metodoPago] ?? "CASH",
      observations: `Venta ${datos.referencia}`,
      items: datos.items.map((i) => ({
        id: Number(i.alegraItemId),
        description: i.descripcion,
        price: i.precio,
        quantity: 1,
      })),
      ...(enviarDian ? { stamp: { generateStamp: true } } : {}),
    },
  });
  return { id: String(f.id), numero: f.numberTemplate?.fullNumber ?? String(f.id) };
}

// ---------- Productos ----------

/** Crea en Alegra un producto para un tipo de pieza. El precio real va en cada factura. */
export async function crearProductoAlegra(nombre: string): Promise<string> {
  const p = await alegra<{ id: string }>("/items", {
    method: "POST",
    body: { name: nombre, price: 0 },
  });
  return String(p.id);
}
