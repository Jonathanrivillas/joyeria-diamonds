import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Tiempo de las transacciones para TODO el sistema. Prisma trae 5 s, y no alcanzan cuando Neon
// está "dormido" (la primera consulta lo despierta) o la conexión va lenta: la transacción se
// cerraba a la mitad con "Transaction not found". maxWait = espera para empezar; timeout = duración máxima.
export const db = globalForPrisma.prisma ?? new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 30_000 } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
