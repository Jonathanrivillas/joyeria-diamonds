/**
 * Sistema de diseño de la joyería.
 *
 * Importe siempre desde "@/components/ui": las vistas no deben definir botones,
 * tarjetas, campos ni colores propios. Si algo no existe aquí, agréguelo aquí.
 * Vea todos los componentes en vivo en /admin/componentes.
 */
export { cn } from "./cn";
export type { Tone } from "./tones";

// Acciones
export { Button, buttonClasses, type ButtonProps, type ButtonVariant, type ButtonSize } from "./button";
export { ConfirmButton } from "./confirm-button";
export { PrintButton } from "./print-button";

// Íconos
export { Icon, IconBadge, iconSizes, type IconSize } from "./icon";
export { Logo } from "./logo";

// Estructura
export { PageHeader, PageContainer, Section, BackLink } from "./page-header";
export { Card, CardLink, CardHeader, CardBody, CardFooter } from "./card";
export { Disclosure, Popover } from "./disclosure";
export { Modal, ModalActions, useDisclosure } from "./modal";

// Datos
export { Stat, StatCard, StatGrid, StatPanel } from "./stat-card";
export { DataRow, LabeledValue } from "./data-row";
export { List, ListItem } from "./list";
export { NoValue, Table, Th, Td, Tr } from "./table";
export { Pagination } from "./pagination";
export { Badge, StatusBadge } from "./badge";

// Mensajes y estados
export { Alert } from "./alert";
export { EmptyState } from "./empty-state";
export { Spinner, LoadingState } from "./spinner";
export { ProgressBar, Stepper } from "./progress";

// Formularios
export { Field, FieldMessage, Input, Textarea, Select, Checkbox, FormGrid, controlClasses, type SelectOption } from "./form";
export { GramsInput, MoneyInput, QuantityStepper, CountInput } from "./number-inputs";
export { PasswordInput } from "./password-input";
export { Calendar, DatePicker, formatISODate } from "./calendar";
export { ChoiceTile, ChoiceGrid, Chip, ChipGroup, RemovableChip } from "./choice";
export { ActionBar } from "./action-bar";
export { LeaveGuard } from "./leave-guard";
export { FileButton } from "./file-button";
