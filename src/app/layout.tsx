import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joyería · Inventario por gramos",
  description: "Inventario, ventas, gastos y arqueo de la joyería",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
