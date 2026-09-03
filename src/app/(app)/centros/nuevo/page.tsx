"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

export default function NuevoCentroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const num = (k: string) => {
      const v = fd.get(k);
      return v ? Number(v) : undefined;
    };
    try {
      const centro = await api<{ id: string }>("/api/centros", {
        method: "POST",
        body: JSON.stringify({
          nombre: fd.get("nombre"),
          descripcion: fd.get("descripcion") || undefined,
          direccion: fd.get("direccion"),
          ciudad: fd.get("ciudad"),
          estado: fd.get("estado"),
          cp: fd.get("cp") || undefined,
          telefono: fd.get("telefono") || undefined,
          email: fd.get("email") || undefined,
          responsable: fd.get("responsable") || undefined,
          horario: fd.get("horario") || undefined,
          latitud: num("latitud"),
          longitud: num("longitud"),
          capacidad: num("capacidad"),
        }),
      });
      router.push(`/centros/${centro.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const field = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Nuevo centro de acopio</h1>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4 rounded-xl border bg-white p-6">
        <label className="col-span-2 text-sm">
          <span className="mb-1 block font-medium">Nombre *</span>
          <input name="nombre" required className={field} />
        </label>
        <label className="col-span-2 text-sm">
          <span className="mb-1 block font-medium">Descripción</span>
          <textarea name="descripcion" rows={2} className={field} />
        </label>
        <label className="col-span-2 text-sm">
          <span className="mb-1 block font-medium">Dirección *</span>
          <input name="direccion" required className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Ciudad *</span>
          <input name="ciudad" required className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Estado *</span>
          <input name="estado" required className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">C.P.</span>
          <input name="cp" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Responsable</span>
          <input name="responsable" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Teléfono</span>
          <input name="telefono" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input name="email" type="email" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Horario</span>
          <input name="horario" placeholder="Lun-Vie 9:00-18:00" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Capacidad</span>
          <input name="capacidad" type="number" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Latitud</span>
          <input name="latitud" type="number" step="any" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Longitud</span>
          <input name="longitud" type="number" step="any" className={field} />
        </label>

        <div className="col-span-2 mt-2 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Guardar centro"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
