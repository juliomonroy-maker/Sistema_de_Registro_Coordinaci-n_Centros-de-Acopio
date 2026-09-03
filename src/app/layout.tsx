import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centros de Acopio",
  description: "Sistema de Registro y Coordinación de Centros de Acopio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
