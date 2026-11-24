/* `prisma db seed` (y `npm run setup`) NO cargan ni borran datos.
 *
 * Antes este archivo borraba TODA la base (usuarios incluidos) y cargaba datos de ejemplo. Como
 * `npm run setup` lo corre al instalar, en el servidor real habría borrado los datos del cliente.
 *
 * Para la base de DESARROLLO use scripts/datos.ts:
 *   npx tsx --env-file=.env scripts/datos.ts --prueba --si   ← 30 días de datos de prueba
 *   npx tsx --env-file=.env scripts/datos.ts --cero --si     ← todo en cero
 */
console.log("prisma db seed no hace nada. Para datos de prueba o dejar en cero use scripts/datos.ts (vea el comentario de ese archivo).");
