"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/fetcher";

type Entrega = {
  id: string;
  fecha: string;
  cantidad: number;
  confirmadaRecibida: boolean;
  articulo: { nombre: string; unidad: string };
  centro: { nombre: string };
};

export function EntregasInstitucion() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Entrega[]>("/api/movimientos?tipo=ENTREGA");
      setEntregas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function confirmar(id: string) {
    setConfirmando(id);
    setError(null);
    try {
      await api(`/api/movimientos/${id}/confirmar`, { method: "PATCH" });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setConfirmando(null);
    }
  }

  if (loading) return <p className="mt-6 text-sm text-ink-3">Cargando entregas…</p>;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-base font-semibold sm:text-lg">Entregas canalizadas</h2>
      {error && <div className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-3">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Centro origen</th>
              <th className="px-4 py-2 font-medium">Artículo</th>
              <th className="px-4 py-2 font-medium">Cantidad</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {entregas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-3">
                  Sin entregas canalizadas.
                </td>
              </tr>
            )}
            {entregas.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-4 py-2">{new Date(e.fecha).toLocaleDateString("es-MX")}</td>
                <td className="px-4 py-2">{e.centro.nombre}</td>
                <td className="px-4 py-2">{e.articulo.nombre}</td>
                <td className="px-4 py-2">
                  {e.cantidad} {e.articulo.unidad}
                </td>
                <td className="px-4 py-2">
                  {e.confirmadaRecibida ? (
                    <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-bg">
                      Recibida
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmar(e.id)}
                      disabled={confirmando === e.id}
                      className="rounded-md bg-ink px-3 py-1 text-xs font-semibold text-bg hover:bg-ink-2 disabled:opacity-60"
                    >
                      {confirmando === e.id ? "…" : "Confirmar recibido"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
