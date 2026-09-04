"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";

type Centro = { id: string; nombre: string; ciudad: string };

const field = "w-full min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2 text-base text-ink placeholder-ink-3 focus:border-ink focus:outline-none sm:text-sm";

// Registro público de voluntarios. La cuenta queda PENDIENTE hasta que el
// encargado del centro elegido o el coordinador la apruebe.
export default function RegistroPage() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Centro[]>("/api/centros/publicos")
      .then(setCentros)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
          nombre: fd.get("nombre"),
          email: fd.get("email"),
          password: fd.get("password"),
          centroId: fd.get("centroId"),
        }),
      });
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (listo) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-surface p-8 text-center shadow">
          <h1 className="mb-2 text-xl font-bold text-ink underline-offset-4">Solicitud enviada</h1>
          <p className="mb-6 text-sm text-ink-2">
            Tu cuenta quedó <b>pendiente de aprobación</b>. El encargado del centro o el coordinador
            la revisará; cuando la aprueben podrás iniciar sesión.
          </p>
          <Link href="/login" className="text-sm font-medium text-ink underline-offset-4 hover:underline">
            Ir a iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-surface p-8 shadow">
        <h1 className="mb-1 text-xl font-bold text-ink underline-offset-4">Quiero ser voluntario</h1>
        <p className="mb-6 text-sm text-ink-3">
          Elige el centro donde apoyarás. Tu cuenta se activa cuando el encargado la apruebe.
        </p>

        {error && <div className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Nombre completo</span>
          <input name="nombre" required minLength={2} maxLength={120} className={field} />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Correo</span>
          <input name="email" type="email" required className={field} />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Contraseña (mín. 8)</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
        </label>
        <label className="mb-6 block text-sm">
          <span className="mb-1 block font-medium">Centro de acopio</span>
          <select name="centroId" required className={field} defaultValue="">
            <option value="" disabled>Selecciona…</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} · {c.ciudad}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading || centros.length === 0}
          className="w-full min-h-11 rounded-md bg-ink text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Solicitar cuenta"}
        </button>
        <p className="mt-4 text-center text-sm text-ink-3">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">Inicia sesión</Link>
        </p>
      </form>
    </main>
  );
}
