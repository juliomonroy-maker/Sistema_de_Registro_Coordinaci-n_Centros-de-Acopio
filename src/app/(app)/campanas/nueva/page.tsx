"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

const field = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

export default function NuevaCampanaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <h1 className="mb-6 text-2xl font-bold">Nueva campaña</h1>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border bg-white p-6">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Nombre *</span>
          <input name="nombre" required className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Descripción</span>
          <textarea name="descripcion" rows={2} className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Meta</span>
          <input name="meta" placeholder="ej. 10,000 artículos" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Fecha inicio</span>
            <input name="fechaInicio" type="date" className={field} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Fecha fin</span>
            <input name="fechaFin" type="date" className={field} />
          </label>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {loading ? "Guardando…" : "Crear campaña"}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
