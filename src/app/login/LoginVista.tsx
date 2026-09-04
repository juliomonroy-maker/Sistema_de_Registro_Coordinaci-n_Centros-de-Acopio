"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/fetcher";
import { MapaPublico, type CentroPublico } from "@/components/MapaPublico";

// Solo rutas internas: evita open redirect vía ?next=https://... o //evil.
function destinoSeguro(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

const input =
  "w-full min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2.5 text-base text-ink placeholder-ink-3 focus:border-ink focus:outline-none sm:text-sm";

/** Pantalla de acceso: mapa a la izquierda, logo SCCA arriba a la derecha y formulario. Tema oscuro. */
export function LoginVista({ centros }: { centros: CentroPublico[] }) {
  return (
    <main className="flex min-h-screen flex-col bg-bg text-ink lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
      {/* Logo: arriba a la derecha en escritorio; arriba centrado en móvil */}
      <header className="order-1 flex items-center justify-center gap-3 px-4 pt-5 pb-3 lg:absolute lg:right-8 lg:top-6 lg:z-[1100] lg:justify-end lg:p-0">
        <Image src="/logo-scca-blanco.png" alt="Logo SCCA: pantera" width={200} height={96} priority className="h-12 w-auto sm:h-14 lg:h-16" />
        <div className="leading-tight">
          <div className="text-2xl font-black tracking-widest">SCCA</div>
          <div className="text-[10px] uppercase tracking-wider text-ink-3">Centros de Acopio</div>
        </div>
      </header>

      <section className="order-2 h-64 sm:h-80 lg:order-none lg:h-screen lg:sticky lg:top-0" aria-label="Mapa de centros de acopio">
        <MapaPublico centros={centros} />
      </section>

      <section className="order-3 flex flex-1 items-center justify-center px-4 py-8 lg:order-none lg:py-24">
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push(destinoSeguro(params.get("next")));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
      <h1 className="mb-1 text-xl font-bold">Iniciar sesión</h1>
      <p className="mb-6 text-sm text-ink-3">Sistema de Coordinación de Centros de Acopio</p>

      {error && <div className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-ink-2">Correo</span>
        <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="tu@correo.mx" />
      </label>

      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium text-ink-2">Contraseña</span>
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="••••••••" />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-ink py-2.5 text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="mt-4 text-center text-sm text-ink-3">
        ¿Quieres ser voluntario?{" "}
        <Link href="/registro" className="font-medium text-ink hover:underline">Solicita una cuenta</Link>
      </p>
    </form>
  );
}
