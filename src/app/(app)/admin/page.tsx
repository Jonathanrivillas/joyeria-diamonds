import { History, Plus, Save, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { esSoporte, requireAdmin } from "@/lib/session";
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  Input,
  PageContainer,
  PageHeader,
  PasswordInput,
  Section,
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import {
  alternarUsuario,
  crearUsuario,
  guardarCategoria,
  guardarLocal,
} from "./actions";

export default async function AdminPage() {
  const s = await requireAdmin();
  const soporte = esSoporte(s);
  const [categorias, locales, usuarios] = await Promise.all([
    db.categoria.findMany({ orderBy: { orden: "asc" } }),
    db.local.findMany({ orderBy: { id: "asc" } }),
    db.usuario.findMany({ orderBy: { id: "asc" }, include: { local: true } }),
  ]);

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        title="Administración"
        subtitle={
          soporte
            ? "Usuarios, tipos de pieza y locales"
            : "Las personas que usan el sistema"
        }
        actions={
          <Button variant="secondary" href="/admin/auditoria" icon={History}>
            Historial de cambios
          </Button>
        }
      />

      {soporte && (
        <>
          <Section
            title="Tipos de pieza (solo soporte)"
            description="Todo se vende por gramos al precio del día que la administradora pone en el inicio. Aquí solo se cambia el nombre o se deja de vender un tipo de pieza."
          >
            <Card>
              <div className="divide-y divide-neutral-100 overflow-x-auto">
                {[...categorias, null].map((c) => (
                  <form
                    key={c?.id ?? "nueva"}
                    action={guardarCategoria}
                    className="grid min-w-[32rem] grid-cols-[1fr_11rem_8rem] items-center gap-3 px-4 py-2"
                  >
                    <input type="hidden" name="id" value={c?.id ?? ""} />
                    <Input
                      label="Nombre"
                      hideLabel
                      name="nombre"
                      defaultValue={c?.nombre ?? ""}
                      placeholder="Nuevo tipo de pieza..."
                    />
                    {c ? (
                      <Checkbox
                        label="Se sigue vendiendo"
                        name="activa"
                        defaultChecked={c.activa}
                      />
                    ) : (
                      <span />
                    )}
                    <Button
                      type="submit"
                      variant={c ? "secondary" : "primary"}
                      icon={c ? Save : Plus}
                    >
                      {c ? "Guardar" : "Agregar"}
                    </Button>
                  </form>
                ))}
              </div>
            </Card>
          </Section>

          <Section title="Locales (solo soporte)">
            <Card>
              <div className="divide-y divide-neutral-100 overflow-x-auto">
                {[...locales, null].map((l) => (
                  <form
                    key={l?.id ?? "nuevo"}
                    action={guardarLocal}
                    className="grid min-w-[40rem] grid-cols-[1fr_1.5fr_8rem_8rem] items-center gap-3 px-4 py-3"
                  >
                    <input type="hidden" name="id" value={l?.id ?? ""} />
                    <Input
                      label="Nombre del local"
                      hideLabel
                      name="nombre"
                      defaultValue={l?.nombre ?? ""}
                      placeholder="Nombre del nuevo local"
                    />
                    <Input
                      label="Dirección"
                      hideLabel
                      name="direccion"
                      defaultValue={l?.direccion ?? ""}
                      placeholder="Dirección"
                    />
                    <Input
                      label="Prefijo de factura"
                      hideLabel
                      name="prefijo"
                      defaultValue={l?.prefijoFactura ?? ""}
                      placeholder="Prefijo"
                      disabled={!!l}
                      title="Prefijo de factura"
                    />
                    <Button
                      type="submit"
                      variant={l ? "secondary" : "primary"}
                      icon={l ? Save : Plus}
                    >
                      {l ? "Guardar" : "Agregar"}
                    </Button>
                  </form>
                ))}
              </div>
            </Card>
          </Section>
        </>
      )}

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
                      <StatusBadge
                        status={u.activo ? "HABILITADO" : "INACTIVO"}
                      />
                    </Td>
                    <Td>
                      {u.id !== s.id && (
                        <form action={alternarUsuario}>
                          <input type="hidden" name="id" value={u.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={u.activo ? "danger-outline" : "secondary"}
                          >
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
              <Input
                label="Correo"
                name="email"
                type="email"
                placeholder="correo@joyeria.com"
                required
              />
              <PasswordInput
                label="Contraseña temporal"
                name="password"
                minLength={8}
                required
                hint="Mínimo 8 caracteres. Se le pedirá cambiarla al entrar."
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Rol"
                  name="rol"
                  options={[
                    { value: "VENDEDOR", label: "Vendedor" },
                    { value: "ADMIN", label: "Administrador" },
                  ]}
                />
                <Select
                  label="Local"
                  name="localId"
                  options={locales.map((l) => ({
                    value: l.id,
                    label: l.nombre,
                  }))}
                />
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
