"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { SelectorUbicacionCliente } from "@/components/MapaCentrosCliente";

export default function NuevoCentroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [campanas, setCampanas] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    api<{ id: string; nombre: string }[]>("/api/campanas?activa=true")
      .then(setCampanas)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

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
          institucion: fd.get("institucion") || undefined,
          direccion: fd.get("direccion"),
          ciudad: fd.get("ciudad"),
          estado: fd.get("estado"),
          telefono: fd.get("telefono") || undefined,
          latitud: ubicacion?.lat ?? num("latitud"),
          longitud: ubicacion?.lng ?? num("longitud"),
          campanaIds: fd.getAll("campanaIds"),
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

  const field = "w-full min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2 text-base text-ink placeholder-ink-3 focus:border-ink focus:outline-none sm:text-sm";

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">Nuevo centro de acopio</h1>
      {error && <div className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}
      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 sm:p-6">
        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-medium">Nombre *</span>
          <input name="nombre" required className={field} />
        </label>
        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-medium">Institución operadora</span>
          <input name="institucion" placeholder="Escuela, ONG, etc." className={field} />
        </label>
        <label className="sm:col-span-2 text-sm">
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
          <span className="mb-1 block font-medium">Teléfono</span>
          <input name="telefono" className={field} />
        </label>
        <div />
        <div className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-medium">Ubicación en el mapa</span>
          <p className="mb-2 text-xs text-ink-3">Haz clic en el mapa para fijar el punto, o escribe las coordenadas abajo.</p>
          <SelectorUbicacionCliente valor={ubicacion} onChange={setUbicacion} />
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Latitud</span>
          <input
            name="latitud"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={ubicacion?.lat ?? ""}
            onChange={(e) => setUbicacion(e.target.value === "" ? null : { lat: Number(e.target.value), lng: ubicacion?.lng ?? 0 })}
            className={field}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Longitud</span>
          <input
            name="longitud"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={ubicacion?.lng ?? ""}
            onChange={(e) => setUbicacion(e.target.value === "" ? null : { lat: ubicacion?.lat ?? 0, lng: Number(e.target.value) })}
            className={field}
          />
        </label>

        <fieldset className="sm:col-span-2 text-sm">
          <legend className="mb-1 font-medium">Campañas en las que participa</legend>
          {campanas.length === 0 ? (
            <p className="text-xs text-ink-3">No hay campañas activas. Podrás vincularlo después desde la campaña.</p>
          ) : (
            <div className="grid gap-1 sm:grid-cols-2">
              {campanas.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" name="campanaIds" value={c.id} defaultChecked={campanas.length === 1} /> {c.nombre}
                </label>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-ink-3">Sin campaña vinculada, el centro no puede registrar movimientos.</p>
        </fieldset>

        <div className="sm:col-span-2 mt-2 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Guardar centro"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line-2 px-4 text-sm font-medium text-ink hover:bg-surface-3"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
