"use client";

import { useState } from "react";
import { Banknote, CreditCard, Info, Smartphone } from "lucide-react";
import {
  Button,
  Calendar,
  Checkbox,
  ChoiceTile,
  Chip,
  DatePicker,
  FileButton,
  FormGrid,
  GramsInput,
  Input,
  Modal,
  ModalActions,
  MoneyInput,
  PasswordInput,
  QuantityStepper,
  Select,
  Stepper,
  Textarea,
  formatISODate,
  useDisclosure,
} from "@/components/ui";

export function DemoFormularios() {
  const [peso, setPeso] = useState("");
  const [dinero, setDinero] = useState(0);
  const [archivo, setArchivo] = useState("");
  return (
    <FormGrid>
      <Input label="Campo de texto" placeholder="Escriba aquí" hint="Texto de ayuda debajo del campo." />
      <Input label="Campo con error" defaultValue="abc" error="Así se ve un error." />
      <Select label="Lista para escoger" placeholder="Escoja una opción" options={[{ value: 1, label: "Local 1" }, { value: 2, label: "Local 2" }]} />
      <PasswordInput label="Contraseña" placeholder="••••••••" />
      <GramsInput label="Gramos" value={peso} onChange={setPeso} />
      <MoneyInput label="Dinero" value={dinero} onChange={setDinero} />
      <QuantityStepper label="Cantidad" />
      <DatePicker label="Fecha (con calendario)" />
      <Textarea label="Texto largo" placeholder="Observaciones..." />
      <FileButton label="Archivo o foto" name="demo" fileName={archivo} onChange={(e) => setArchivo(e.target.files?.[0]?.name ?? "")} />
      <Checkbox label="Casilla sencilla" />
      <Checkbox variant="card" label="Casilla destacada" description="Para opciones importantes que conviene explicar." />
    </FormGrid>
  );
}

export function DemoSeleccion() {
  const [metodo, setMetodo] = useState("EFECTIVO");
  const [chip, setChip] = useState("Hoy");
  const opciones = [
    { id: "EFECTIVO", nombre: "Efectivo", icon: Banknote },
    { id: "TRANSFERENCIA", nombre: "Transferencia", icon: Smartphone },
    { id: "TARJETA", nombre: "Tarjeta", icon: CreditCard },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {opciones.map((o) => (
          <ChoiceTile key={o.id} selected={metodo === o.id} onClick={() => setMetodo(o.id)} icon={o.icon} title={o.nombre} description="Recuadro para escoger" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["Hoy", "Ayer", "Últimos 7 días"].map((t) => (
          <Chip key={t} selected={chip === t} onClick={() => setChip(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <Stepper steps={["Escoger las piezas", "Cobrar"]} current={1} />
    </div>
  );
}

export function DemoCalendario() {
  const [dia, setDia] = useState<string>();
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="rounded-2xl border border-neutral-200 p-3">
        <Calendar value={dia} onChange={setDia} />
      </div>
      <p className="text-lg">{dia ? `Escogió: ${formatISODate(dia, true)}` : "Toque un día."}</p>
    </div>
  );
}

export function DemoModal() {
  const m = useDisclosure();
  return (
    <>
      <Button variant="secondary" onClick={m.onOpen}>
        Abrir ventana modal
      </Button>
      <Modal open={m.open} onClose={m.onClose} title="Título de la ventana" description="Las ventanas se cierran con Esc, con la X o tocando fuera." icon={Info} tone="info">
        <ModalActions>
          <Button variant="secondary" onClick={m.onClose}>
            Cancelar
          </Button>
          <Button onClick={m.onClose}>Aceptar</Button>
        </ModalActions>
      </Modal>
    </>
  );
}
