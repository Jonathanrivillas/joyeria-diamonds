import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/token";

const SOLO_ADMIN = ["/admin", "/inventario/entradas", "/traslados"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sesion = await verificarSesion(req.cookies.get(COOKIE_SESION)?.value);

  if (pathname.startsWith("/login")) {
    // Sesión revocada: borrar la cookie y mostrar el login.
    if (req.nextUrl.searchParams.has("salir")) {
      const res = NextResponse.next();
      res.cookies.delete(COOKIE_SESION);
      return res;
    }
    if (sesion) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!sesion) return NextResponse.redirect(new URL("/login", req.url));

  if (sesion.rol !== "ADMIN" && SOLO_ADMIN.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
