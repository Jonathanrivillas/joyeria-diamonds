import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joyería · Inventario por gramos",
  description: "Demo de inventario, ventas, gastos y arqueo para joyería",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
