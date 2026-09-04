"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { BarraProgreso, fmtNum } from "@/components/ui";
import type { ProgresoMeta } from "@/lib/stock";

type Articulo = { id: string; nombre: string; unidad: string };
type Fila = { articuloId: string; cantidadObjetivo: number };

const field = "min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2 text-base text-ink focus:border-ink focus:outline-none sm:text-sm";

/**
 * Metas por artículo de una campaña con avance (recibido vs objetivo).
 * Si `editable`, permite agregar/quitar metas y guardarlas (PUT reemplaza el conjunto).
 */
export function MetasCampana({ campanaId, inicial, editable }: { campanaId: string; inicial: ProgresoMeta[]; editable: boolean }) {
  const [metas, setMetas] = useState<ProgresoMeta[]>(inicial);
  const [editando, setEditando] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!editando || articulos.length) return;
    api<Articulo[]>("/api/articulos").then(setArticulos).catch((e) => setError(e.message));
  }, [editando, articulos.length]);

  function abrirEdicion() {
    setFilas(metas.map((m) => ({ articuloId: m.articuloId, cantidadObjetivo: m.objetivo })));
    setError(null);
    setEditando(true);
  }

  function setFila(i: number, patch: Partial<Fila>) {
    setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const nuevas = await api<ProgresoMeta[]>(`/api/campanas/${campanaId}/metas`, {
        method: "PUT",
        body: JSON.stringify(filas),
      });
      setMetas(nuevas);
      setEditando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  const usados = new Set(filas.map((f) => f.articuloId));

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold sm:text-lg">Metas de recolección</h2>
        {editable && !editando && (
          <button onClick={abrirEdicion} className="inline-flex min-h-11 items-center rounded-md border border-line-2 px-3 text-sm font-medium text-ink hover:bg-surface-3">
            {metas.length ? "Editar metas" : "+ Definir metas"}
          </button>
        )}
      </div>
      {error && <div className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}

      {!editando && (
        <ul className="grid gap-4 md:grid-cols-2">
          {metas.length === 0 && <li className="text-sm text-ink-3">Sin metas definidas.</li>}
          {metas.map((m) => (
            <li key={m.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">{m.nombre}</span>
                <span className="text-ink-3">
                  {fmtNum(m.recibido)} / {fmtNum(m.objetivo)} {m.unidad} · <b>{m.porcentaje}%</b>
                </span>
              </div>
              <BarraProgreso porcentaje={m.porcentaje} />
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <div className="grid gap-2">
          {filas.map((f, i) => (
            <div key={i} className="flex gap-2">
              <select value={f.articuloId} onChange={(e) => setFila(i, { articuloId: e.target.value })} className={`${field} flex-1`}>
                <option value="">Artículo…</option>
                {articulos
                  .filter((a) => a.id === f.articuloId || !usados.has(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.unidad})
                    </option>
                  ))}
              </select>
              <input
                type="number"
                min="0.01"
                step="any"
                value={f.cantidadObjetivo || ""}
                onChange={(e) => setFila(i, { cantidadObjetivo: Number(e.target.value) })}
                placeholder="Objetivo"
                className={`${field} w-32`}
              />
              <button onClick={() => setFilas((fs) => fs.filter((_, j) => j !== i))} className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-danger" aria-label="Quitar meta">
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <button onClick={() => setFilas((fs) => [...fs, { articuloId: "", cantidadObjetivo: 0 }])} className="rounded-md border px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-3">
              + Agregar artículo
            </button>
            <button
              onClick={guardar}
              disabled={guardando || filas.some((f) => !f.articuloId || !(f.cantidadObjetivo > 0))}
              className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-60"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => setEditando(false)} className="px-3 py-1.5 text-sm text-ink-2 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
