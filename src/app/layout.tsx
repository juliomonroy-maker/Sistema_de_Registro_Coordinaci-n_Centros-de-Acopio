import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "SCCA",
  description: "SCCA · Sistema de Coordinación de Centros de Acopio",
  icons: { icon: "/logo-scca-blanco.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">
        {/*
          IMPECCABLE DIRECTION CONTRACT · SCCA · 2026-09-03
          THESIS: un cuaderno de operación en negro: todo es tinta blanca sobre un solo ground,
            separado por líneas finas, no por cajas. Rechaza la rejilla de tarjetas iguales con icono.
          OWN-WORLD: ground #0a0a0a, superficies #121212/#181818, líneas #262626, tinta en tres
            niveles (#f4f4f4 / #b9b9b9 / #8a8a8a). Sin acento: rojo y ámbar solo para error y pendiente.
            Inter con numerales tabulares; botón primario = blanco sobre negro.
          STORY: quien entra ve de un vistazo qué hay, qué falta aprobar y dónde registrar; confía
            porque cada número tiene origen y cada acción deja rastro.
          FIRST VIEWPORT: barra superior fina (logo pantera + SCCA, enlaces, usuario); título con
            acciones a la derecha; riel de cifras separadas por líneas; luego gráficas y tablas.
            En móvil: barra con menú desplegable, cifras en 2 columnas, tablas con scroll lateral.
          FORM: dirección pinneada por el usuario (oscuro total, monocromo, minimal); sin tirada.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review,
            the verdict, DESIGN.md, and every shipping raster carrying its provenance.
        */}
        {children}
      </body>
    </html>
  );
}
