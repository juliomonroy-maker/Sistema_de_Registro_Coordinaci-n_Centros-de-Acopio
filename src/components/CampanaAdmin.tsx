"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

type Opt = { id: string; nombre: string };
type Lider = Opt & { email: string };

const field = "min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2 text-base text-ink focus:border-ink focus:outline-none sm:text-sm";
const btn = "rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-60";

/**
 * Administración de una campaña: líder (solo coordinador) y centros
 * participantes (coordinador o líder). Ambos vía PATCH /api/campanas/:id.
 */
export function CampanaAdmin({
  campanaId,
  liderActual,
  lideres,
  centros,
  participantes,
  puedeCambiarLider,
}: {
  campanaId: string;
  liderActual: string | null;
  lideres: Lider[];
  centros: (Opt & { activo: boolean })[];
  participantes: string[];
  puedeCambiarLider: boolean;
}) {
  const router = useRouter();
  const [liderId, setLiderId] = useState(liderActual ?? "");
  const [sel, setSel] = useState<Set<string>>(new Set(participantes));
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"lider" | "centros" | null>(null);

  async function guardar(que: "lider" | "centros") {
    setError(null);
    setOkMsg(null);
    setOcupado(que);
    try {
      await api(`/api/campanas/${campanaId}`, {
        method: "PATCH",
        body: JSON.stringify(que === "lider" ? { liderId: liderId || null } : { centroIds: [...sel] }),
      });
      setOkMsg(que === "lider" ? "Líder actualizado." : "Centros participantes actualizados.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setOcupado(null);
    }
  }

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const cambioCentros = sel.size !== participantes.length || participantes.some((p) => !sel.has(p));

  return (
    <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 md:grid-cols-2">
      {error && <div className="md:col-span-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}
      {okMsg && <div className="md:col-span-2 rounded-md bg-ink/10 px-3 py-2 text-sm text-ink">{okMsg}</div>}

      <div>
        <h2 className="mb-2 text-base font-semibold sm:text-lg">Líder de campaña</h2>
        {puedeCambiarLider ? (
          <div className="flex flex-wrap items-center gap-2">
            <select value={liderId} onChange={(e) => setLiderId(e.target.value)} className={field}>
              <option value="">— Sin líder —</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre} · {l.email}</option>
              ))}
            </select>
            <button className={btn} disabled={ocupado === "lider" || liderId === (liderActual ?? "")} onClick={() => guardar("lider")}>
              {ocupado === "lider" ? "…" : "Guardar líder"}
            </button>
            {lideres.length === 0 && (
              <p className="w-full text-xs text-ink-3">
                No hay cuentas con rol Líder de campaña. <Link href="/usuarios" className="text-ink underline-offset-4 hover:underline">Crear una</Link>.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-3">Solo el coordinador cambia el líder.</p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold sm:text-lg">Centros participantes</h2>
        {centros.length === 0 ? (
          <p className="text-sm text-ink-3">No hay centros registrados.</p>
        ) : (
          <div className="grid gap-1 text-sm">
            {centros.map((c) => (
              <label key={c.id} className={`flex items-center gap-2 ${c.activo ? "" : "text-ink-3"}`}>
                <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} />
                {c.nombre}{!c.activo && " (inactivo)"}
              </label>
            ))}
          </div>
        )}
        <button className={`${btn} mt-3`} disabled={ocupado === "centros" || !cambioCentros} onClick={() => guardar("centros")}>
          {ocupado === "centros" ? "…" : "Guardar centros"}
        </button>
        <p className="mt-1 text-xs text-ink-3">Solo los centros vinculados pueden registrar movimientos en esta campaña.</p>
      </div>
    </section>
  );
}
