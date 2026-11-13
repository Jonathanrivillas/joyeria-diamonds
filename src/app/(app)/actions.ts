"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_LOCAL, requireSesion } from "@/lib/session";

export async function cambiarLocal(valor: string) {
  const s = await requireSesion();
  if (s.rol !== "ADMIN") return;
  const c = await cookies();
  c.set(COOKIE_LOCAL, valor, { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}
