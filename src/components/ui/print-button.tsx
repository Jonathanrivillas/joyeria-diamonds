"use client";

import { Printer } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "./button";

export function PrintButton({
  label = "Imprimir",
  size = "md",
  variant = "secondary",
}: {
  label?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <Button variant={variant} size={size} icon={Printer} onClick={() => window.print()}>
      {label}
    </Button>
  );
}
