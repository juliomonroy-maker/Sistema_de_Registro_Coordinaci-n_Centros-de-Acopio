"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

const field = "w-full min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2 text-base text-ink placeholder-ink-3 focus:border-ink focus:outline-none sm:text-sm";

type Opt = { id: string; nombre: string };
type Usuario = Opt & { email: string; activo: boolean; estado: string };

export default function NuevaCampanaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lideres, setLideres] = useState<Usuario[]>([]);
  const [centros, setCentros] = useState<Opt[]>([]);

  useEffect(() => {
    Promise.all([api<Usuario[]>("/api/usuarios?rol=LIDER_CAMPANA&estado=APROBADO"), api<Opt[]>("/api/centros?activo=true")])
      .then(([l, c]) => {
        setLideres(l.filter((u) => u.activo));
        setCentros(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const c = await api<{ id: string }>("/api/campanas", {
        method: "POST",
        body: JSON.stringify({
          nombre: fd.get("nombre"),
          descripcion: fd.get("descripcion") || undefined,
          meta: fd.get("meta") || undefined,
          fechaInicio: fd.get("fechaInicio") || undefined,
          fechaFin: fd.get("fechaFin") || undefined,
          liderId: fd.get("liderId") || null,
          centroIds: fd.getAll("centroIds"),
        }),
      });
      router.push(`/campanas/${c.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">Nueva campaña</h1>
      {error && <div className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}
      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-line bg-surface p-6">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Nombre *</span>
          <input name="nombre" required minLength={2} className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Descripción</span>
          <textarea name="descripcion" rows={2} className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Meta</span>
          <input name="meta" placeholder="ej. 10,000 artículos" className={field} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Fecha inicio</span>
            <input name="fechaInicio" type="date" className={field} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Fecha fin</span>
            <input name="fechaFin" type="date" className={field} />
          </label>
        </div>

        <label className="text-sm">
          <span className="mb-1 block font-medium">Líder de campaña</span>
          <select name="liderId" className={field} defaultValue="">
            <option value="">— Sin líder por ahora —</option>
            {lideres.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre} · {l.email}</option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-ink-3">
            Solo cuentas con rol Líder de campaña.{" "}
            {lideres.length === 0 && (
              <>No hay ninguna: <Link href="/usuarios" className="text-ink underline-offset-4 hover:underline">crea una en Usuarios</Link>.</>
            )}
          </span>
        </label>

        <fieldset className="text-sm">
          <legend className="mb-1 font-medium">Centros participantes</legend>
          {centros.length === 0 ? (
            <p className="text-xs text-ink-3">No hay centros activos.</p>
          ) : (
            <div className="grid gap-1 sm:grid-cols-2">
              {centros.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" name="centroIds" value={c.id} defaultChecked /> {c.nombre}
                </label>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-ink-3">Solo los centros vinculados pueden registrar movimientos en la campaña. Se puede cambiar después.</p>
        </fieldset>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-60">
            {loading ? "Guardando…" : "Crear campaña"}
          </button>
          <button type="button" onClick={() => router.back()} className="inline-flex min-h-11 items-center justify-center rounded-md border border-line-2 px-4 text-sm font-medium text-ink hover:bg-surface-3">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
