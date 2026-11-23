"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

type Props = Omit<Extract<ButtonProps, { href?: undefined }>, "type" | "loading" | "icon">;

/**
 * Botón que envía un <form action={...}> y muestra "cargando" mientras la acción trabaja.
 * Se desactiva solo, así que evita clics repetidos. El ícono va dentro de `children`
 * (ej. <Icon icon={RotateCw} />) para poder usarlo desde páginas del servidor.
 */
export function SubmitButton(props: Props) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" loading={pending} />;
}
