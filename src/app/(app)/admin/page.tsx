import { History, Palette, Plus, Save, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Button, Card, CardHeader, Checkbox, Input, PageContainer, PageHeader, PasswordInput, Section, Select, StatusBadge, Table, Td, Th, Tr } from "@/components/ui";
import { alternarUsuario, crearUsuario, guardarCategoria, guardarLocal } from "./actions";

export default async function AdminPage() {
  const s = await requireAdmin();
  const [categorias, locales, usuarios] = await Promise.all([
    db.categoria.findMany({ orderBy: { orden: "asc" } }),
    db.local.findMany({ orderBy: { id: "asc" } }),
    db.usuario.findMany({ orderBy: { id: "asc" }, include: { local: true } }),
  ]);

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        title="Administración"
        subtitle="Categorías y precios, locales y usuarios"
        actions={
          <>
            <Button variant="secondary" href="/admin/componentes" icon={Palette}>
              Sistema de diseño
            </Button>
            <Button variant="secondary" href="/admin/auditoria" icon={History}>
              Historial de cambios
            </Button>
          </>
        }
      />

      <Section title="Categorías y precios sugeridos">
        <Card>
          <Table>
            <thead>
              <tr>
                <Th colSpan={6} className="!p-0">
                  <div className="grid min-w-[52rem] grid-cols-[1.5fr_0.8fr_1fr_1fr_0.5fr_8rem] gap-3 px-4 py-3">
                    <span>Nombre</span>
                    <span>Controla peso</span>
                    <span>Precio por gramo</span>
                    <span>Precio por unidad</span>
                    <span>Activa</span>
                    <span />
                  </div>
                </Th>
              </tr>
            </thead>
            <tbody>
              {[...categorias, null].map((c) => (
                <tr key={c?.id ?? "nueva"}>
                  <Td colSpan={6} className="!p-0">
                    <form action={guardarCategoria} className="grid min-w-[52rem] grid-cols-[1.5fr_0.8fr_1fr_1fr_0.5fr_8rem] items-center gap-3 px-4 py-2">
                      <input type="hidden" name="id" value={c?.id ?? ""} />
                      <Input label="Nombre" hideLabel name="nombre" defaultValue={c?.nombre ?? ""} placeholder="Nueva categoría..." />
                      <Checkbox label="Controla peso" hideLabel name="controlaPeso" defaultChecked={c?.controlaPeso ?? true} />
                      <Input label="Precio por gramo" hideLabel name="precioGramo" numeric defaultValue={c?.precioGramoSugerido ?? ""} placeholder="COP / g" />
                      <Input label="Precio por unidad" hideLabel name="precioUnidad" numeric defaultValue={c?.precioUnidadSugerido ?? ""} placeholder="COP / und" />
                      <Checkbox label="Activa" hideLabel name="activa" defaultChecked={c?.activa ?? true} />
                      <Button type="submit" variant={c ? "secondary" : "primary"} icon={c ? Save : Plus}>
                        {c ? "Guardar" : "Agregar"}
                      </Button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Section>

      <Section title="Locales">
        <Card>
          <div className="divide-y divide-neutral-100 overflow-x-auto">
            {[...locales, null].map((l) => (
              <form key={l?.id ?? "nuevo"} action={guardarLocal} className="grid min-w-[40rem] grid-cols-[1fr_1.5fr_8rem_8rem] items-center gap-3 px-4 py-3">
                <input type="hidden" name="id" value={l?.id ?? ""} />
                <Input label="Nombre del local" hideLabel name="nombre" defaultValue={l?.nombre ?? ""} placeholder="Nombre del nuevo local" />
                <Input label="Dirección" hideLabel name="direccion" defaultValue={l?.direccion ?? ""} placeholder="Dirección" />
                <Input
                  label="Prefijo de factura"
                  hideLabel
                  name="prefijo"
                  defaultValue={l?.prefijoFactura ?? ""}
                  placeholder="Prefijo"
                  disabled={!!l}
                  title="Prefijo de factura"
                />
                <Button type="submit" variant={l ? "secondary" : "primary"} icon={l ? Save : Plus}>
                  {l ? "Guardar" : "Agregar"}
                </Button>
              </form>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Usuarios">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Nombre</Th>
                  <Th>Correo</Th>
                  <Th>Rol</Th>
                  <Th>Local</Th>
                  <Th>Estado</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-medium">{u.nombre}</Td>
                    <Td className="font-mono text-sm">{u.email}</Td>
                    <Td>{u.rol === "ADMIN" ? "Administrador" : "Vendedor"}</Td>
                    <Td>{u.local?.nombre ?? "Todos"}</Td>
                    <Td>
                      <StatusBadge status={u.activo ? "HABILITADO" : "INACTIVO"} />
                    </Td>
                    <Td>
                      {u.id !== s.id && (
                        <form action={alternarUsuario}>
                          <input type="hidden" name="id" value={u.id} />
                          <Button type="submit" size="sm" variant={u.activo ? "danger-outline" : "secondary"}>
                            {u.activo ? "Desactivar" : "Activar"}
                          </Button>
                        </form>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Crear usuario" icon={UserPlus} />
            <form action={crearUsuario} className="space-y-4 p-5">
              <Input label="Nombre" name="nombre" required />
              <Input label="Correo" name="email" type="email" placeholder="correo@joyeria.com" required />
              <PasswordInput label="Contraseña temporal" name="password" minLength={8} required hint="Mínimo 8 caracteres. Se le pedirá cambiarla al entrar." />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Rol"
                  name="rol"
                  options={[
                    { value: "VENDEDOR", label: "Vendedor" },
                    { value: "ADMIN", label: "Administrador" },
                  ]}
                />
                <Select label="Local" name="localId" options={locales.map((l) => ({ value: l.id, label: l.nombre }))} />
              </div>
              <Button type="submit" block icon={UserPlus}>
                Crear
              </Button>
            </form>
          </Card>
        </div>
      </Section>
    </PageContainer>
  );
}
