"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "./button";
import { Input, type InputProps } from "./form";

/** Campo de contraseña con botón "Ver / Ocultar". Con `visible` se controla desde afuera. */
export function PasswordInput({ visible, ...props }: Omit<InputProps, "type" | "trailing"> & { visible?: boolean }) {
  const [own, setOwn] = useState(false);
  const show = visible ?? own;
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      trailing={
        visible === undefined && (
          <Button variant="ghost" size="sm" icon={show ? EyeOff : Eye} onClick={() => setOwn((v) => !v)} className="text-base">
            {show ? "Ocultar" : "Ver"}
          </Button>
        )
      }
    />
  );
}
