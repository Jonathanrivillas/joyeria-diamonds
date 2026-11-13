import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PageHeader, EstadoBadge } from "@/components/ui";
import { alternarUsuario, crearUsuario, guardarCategoria, guardarLocal } from "./actions";

export default async function AdminPage() {
  const s = await requireAdmin();
  const [categorias, locales, usuarios] = await Promise.all([
    db.categoria.findMany({ orderBy: { orden: "asc" } }),
    db.local.findMany({ orderBy: { id: "asc" } }),
    db.usuario.findMany({ orderBy: { id: "asc" }, include: { local: true } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader titulo="Administración" subtitulo="Categorías y precios, locales y usuarios" />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Categorías y precios sugeridos</h2>
        <div className="card overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Controla peso</th>
                <th>Precio por gramo</th>
                <th>Precio por unidad</th>
                <th>Activa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...categorias, null].map((c) => (
                <tr key={c?.id ?? "nueva"}>
                  <td colSpan={6} className="!p-0">
                    <form action={guardarCategoria} className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_0.5fr_auto] items-center gap-3 px-3 py-2">
                      <input type="hidden" name="id" value={c?.id ?? ""} />
                      <input name="nombre" className="input py-1" defaultValue={c?.nombre ?? ""} placeholder="Nueva categoría..." />
                      <input name="controlaPeso" type="checkbox" defaultChecked={c?.controlaPeso ?? true} className="h-4 w-4" />
                      <input name="precioGramo" className="input py-1 text-right" defaultValue={c?.precioGramoSugerido ?? ""} placeholder="COP / g" />
                      <input name="precioUnidad" className="input py-1 text-right" defaultValue={c?.precioUnidadSugerido ?? ""} placeholder="COP / und" />
                      <input name="activa" type="checkbox" defaultChecked={c?.activa ?? true} className="h-4 w-4" />
                      <button className={c ? "btn-secondary py-1" : "btn-primary py-1"}>{c ? "Guardar" : "Agregar"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Locales</h2>
        <div className="card divide-y divide-stone-100">
          {[...locales, null].map((l) => (
            <form key={l?.id ?? "nuevo"} action={guardarLocal} className="grid grid-cols-[1fr_1.5fr_100px_auto] items-center gap-3 px-4 py-3">
              <input type="hidden" name="id" value={l?.id ?? ""} />
              <input name="nombre" className="input py-1" defaultValue={l?.nombre ?? ""} placeholder="Nombre del nuevo local" />
              <input name="direccion" className="input py-1" defaultValue={l?.direccion ?? ""} placeholder="Dirección" />
              <input name="prefijo" className="input py-1" defaultValue={l?.prefijoFactura ?? ""} placeholder="Prefijo" disabled={!!l} title="Prefijo de factura" />
              <button className={l ? "btn-secondary py-1" : "btn-primary py-1"}>{l ? "Guardar" : "Agregar"}</button>
            </form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Usuarios</h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Local</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.nombre}</td>
                    <td className="font-mono text-xs">{u.email}</td>
                    <td>{u.rol === "ADMIN" ? "Administrador" : "Vendedor"}</td>
                    <td>{u.local?.nombre ?? "Todos"}</td>
                    <td><EstadoBadge estado={u.activo ? "ACTIVA" : "ANULADA"} /></td>
                    <td>
                      {u.id !== s.id && (
                        <form action={alternarUsuario}>
                          <input type="hidden" name="id" value={u.id} />
                          <button className="text-xs text-oro-700 hover:underline">{u.activo ? "Desactivar" : "Activar"}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={crearUsuario} className="card space-y-3 p-5">
            <p className="text-sm font-semibold">Crear usuario</p>
            <input name="nombre" className="input" placeholder="Nombre" required />
            <input name="email" type="email" className="input" placeholder="correo@joyeria.com" required />
            <input name="password" type="password" className="input" placeholder="Contraseña temporal (mín. 8)" minLength={8} required />
            <div className="grid grid-cols-2 gap-3">
              <select name="rol" className="input">
                <option value="VENDEDOR">Vendedor</option>
                <option value="ADMIN">Administrador</option>
              </select>
              <select name="localId" className="input">
                {locales.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
            <button className="btn-primary w-full">Crear</button>
          </form>
        </div>
      </section>
    </div>
  );
}
