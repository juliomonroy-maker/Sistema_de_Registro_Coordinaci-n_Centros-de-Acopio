"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

type Link = { href: string; label: string };

// Enlaces por rol.
const LINKS_POR_ROL: Record<string, Link[]> = {
  COORDINADOR: [
    { href: "/dashboard", label: "Inicio" },
    { href: "/centros", label: "Centros" },
    { href: "/campanas", label: "Campañas" },
    { href: "/movimientos", label: "Movimientos" },
    { href: "/usuarios", label: "Usuarios" },
  ],
  ENCARGADO: [
    { href: "/dashboard", label: "Mi centro" },
    { href: "/movimientos", label: "Movimientos" },
    { href: "/movimientos/nuevo", label: "Registrar" },
  ],
  VOLUNTARIO: [
    { href: "/dashboard", label: "Mi centro" },
    { href: "/movimientos/nuevo", label: "Registrar" },
  ],
  INSTITUCION: [
    { href: "/dashboard", label: "Entregas" },
    { href: "/movimientos", label: "Historial" },
  ],
  LIDER_CAMPANA: [
    { href: "/dashboard", label: "Mi campaña" },
    { href: "/movimientos", label: "Movimientos" },
  ],
};

const ROL_LABEL: Record<string, string> = {
  COORDINADOR: "Coordinador general",
  ENCARGADO: "Encargado",
  VOLUNTARIO: "Voluntario",
  INSTITUCION: "Institución receptora",
  LIDER_CAMPANA: "Líder de campaña",
};

export function NavBar({ nombre, rol }: { nombre: string; rol: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = LINKS_POR_ROL[rol] ?? [{ href: "/dashboard", label: "Inicio" }];

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <span className="font-bold text-brand-700">Acopio</span>
        <nav className="flex flex-1 flex-wrap gap-1">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">
            {nombre} <span className="text-gray-400">({ROL_LABEL[rol] ?? rol})</span>
          </span>
          <button
            onClick={logout}
            className="rounded-md border px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
