"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

type Enlace = { href: string; label: string };

// Enlaces por rol.
const LINKS_POR_ROL: Record<string, Enlace[]> = {
  COORDINADOR: [
    { href: "/dashboard", label: "Inicio" },
    { href: "/centros", label: "Centros" },
    { href: "/campanas", label: "Campañas" },
    { href: "/mapa", label: "Mapa" },
    { href: "/movimientos", label: "Movimientos" },
    { href: "/aprobaciones", label: "Aprobaciones" },
    { href: "/usuarios", label: "Usuarios" },
  ],
  ENCARGADO: [
    { href: "/dashboard", label: "Mi centro" },
    { href: "/movimientos", label: "Movimientos" },
    { href: "/movimientos/nuevo", label: "Registrar" },
    { href: "/aprobaciones", label: "Aprobaciones" },
    { href: "/mapa", label: "Mapa" },
  ],
  VOLUNTARIO: [
    { href: "/dashboard", label: "Mi centro" },
    { href: "/movimientos/nuevo", label: "Registrar" },
    { href: "/mapa", label: "Mapa" },
  ],
  INSTITUCION: [
    { href: "/dashboard", label: "Entregas" },
    { href: "/movimientos", label: "Historial" },
  ],
  LIDER_CAMPANA: [
    { href: "/dashboard", label: "Mi campaña" },
    { href: "/movimientos", label: "Movimientos" },
    { href: "/mapa", label: "Mapa" },
  ],
};

const ROL_LABEL: Record<string, string> = {
  COORDINADOR: "Coordinador general",
  ENCARGADO: "Encargado",
  VOLUNTARIO: "Voluntario",
  INSTITUCION: "Institución receptora",
  LIDER_CAMPANA: "Líder de campaña",
};

/**
 * Barra superior fina. Escritorio: marca, enlaces y usuario en una línea.
 * Móvil: marca + botón de menú; el menú despliega los enlaces en filas de 44px.
 */
export function NavBar({ nombre, rol }: { nombre: string; rol: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const links = LINKS_POR_ROL[rol] ?? [{ href: "/dashboard", label: "Inicio" }];

  // Cerrar el menú al navegar.
  useEffect(() => setAbierto(false), [pathname]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const activo = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5" aria-label="SRCCA, inicio">
          <Image src="/logo-srcca-blanco.png" alt="" width={58} height={28} className="h-6 w-auto" priority />
          <span className="text-sm font-black tracking-[0.2em]">SRCCA</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Principal">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={activo(l.href) ? "page" : undefined}
              className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activo(l.href) ? "text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {l.label}
              {activo(l.href) && <span aria-hidden className="absolute inset-x-3 -bottom-[15px] h-px bg-ink" />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 text-sm lg:flex">
          <span className="text-ink-2">
            {nombre} <span className="text-ink-3">· {ROL_LABEL[rol] ?? rol}</span>
          </span>
          <button onClick={logout} className="rounded-md border border-line-2 px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-3">
            Salir
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-surface-3 lg:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {abierto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {abierto && (
        <div id="menu-movil" className="border-t border-line bg-bg lg:hidden">
          <nav className="mx-auto max-w-6xl px-2 py-2" aria-label="Principal">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={activo(l.href) ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-md px-3 text-base font-medium ${
                  activo(l.href) ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
            <span className="min-w-0 truncate text-ink-2">
              {nombre} <span className="text-ink-3">· {ROL_LABEL[rol] ?? rol}</span>
            </span>
            <button onClick={logout} className="min-h-11 shrink-0 rounded-md border border-line-2 px-4 text-sm font-medium text-ink hover:bg-surface-3">
              Salir
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
