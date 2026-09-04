"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { fmtFecha, fmtNum } from "@/components/ui";

export type MermaPendiente = {
  id: string;
  fecha: string;
  cantidad: number;
  motivo: string | null;
  nota: string | null;
  disponible: number;
  articulo: { nombre: string; unidad: string };
  centro: { nombre: string };
  campana: { nombre: string };
  actor: { nombre: string } | null;
};

export type VoluntarioPendiente = {
  id: string;
  nombre: string;
  email: string;
  createdAt: string;
  centro: { nombre: string } | null;
};

const MOTIVO_LABEL: Record<string, string> = { CADUCIDAD: "Caducidad", DANO: "Daño", PERDIDA: "Pérdida", OTRO: "Otro" };

const btnOk = "rounded-md bg-ink px-3 py-1 text-xs font-semibold text-bg hover:bg-ink-2 disabled:opacity-60";
const btnNo = "rounded-md border border-danger/40 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger-bg disabled:opacity-60";

function useResolver() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function resolver(url: string, accion: "APROBAR" | "RECHAZAR", id: string, motivoRechazo?: string) {
    setError(null);
    setOcupado(id);
    try {
      await api(url, { method: "PATCH", body: JSON.stringify({ accion, motivoRechazo }) });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setOcupado(null);
    }
  }
  return { error, ocupado, resolver };
}

/** Mermas solicitadas por encargados, en espera del coordinador. */
export function MermasPendientes({ mermas }: { mermas: MermaPendiente[] }) {
  const { error, ocupado, resolver } = useResolver();
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-3">
            <tr>
              {["Fecha", "Centro", "Campaña", "Artículo", "Cantidad", "Disponible", "Motivo", "Solicitó", ""].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mermas.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-ink-3">Sin mermas pendientes.</td></tr>
            )}
            {mermas.map((m) => {
              const alcanza = m.disponible >= m.cantidad;
              return (
                <tr key={m.id} className="border-t align-top">
                  <td className="px-4 py-2">{fmtFecha(m.fecha)}</td>
                  <td className="px-4 py-2">{m.centro.nombre}</td>
                  <td className="px-4 py-2">{m.campana.nombre}</td>
                  <td className="px-4 py-2">{m.articulo.nombre}</td>
                  <td className="px-4 py-2 font-medium text-danger">−{fmtNum(m.cantidad)} {m.articulo.unidad}</td>
                  <td className={`px-4 py-2 ${alcanza ? "" : "text-danger"}`}>
                    {fmtNum(m.disponible)} {m.articulo.unidad}{!alcanza && " (insuficiente)"}
                  </td>
                  <td className="px-4 py-2">
                    {MOTIVO_LABEL[m.motivo ?? ""] ?? m.motivo ?? "—"}
                    {m.nota && <div className="text-xs text-ink-3">{m.nota}</div>}
                  </td>
                  <td className="px-4 py-2">{m.actor?.nombre ?? "—"}</td>
                  <td className="px-4 py-2">
                    {rechazando === m.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Motivo del rechazo (opcional)"
                          maxLength={300}
                          className="rounded-md border border-line-2 px-2 py-1 text-xs"
                        />
                        <div className="flex gap-1">
                          <button
                            className={btnNo}
                            disabled={ocupado === m.id}
                            onClick={() => resolver(`/api/movimientos/${m.id}/resolver`, "RECHAZAR", m.id, motivo || undefined)}
                          >
                            Confirmar rechazo
                          </button>
                          <button className="text-xs text-ink-3 hover:underline" onClick={() => setRechazando(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          className={btnOk}
                          disabled={ocupado === m.id || !alcanza}
                          title={alcanza ? "Aprobar: descuenta del stock" : "No hay stock suficiente"}
                          onClick={() => resolver(`/api/movimientos/${m.id}/resolver`, "APROBAR", m.id)}
                        >
                          {ocupado === m.id ? "…" : "Aprobar"}
                        </button>
                        <button className={btnNo} disabled={ocupado === m.id} onClick={() => { setRechazando(m.id); setMotivo(""); }}>
                          Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Voluntarios que se registraron y esperan aprobación (encargado de su centro o coordinador). */
export function VoluntariosPendientes({ voluntarios }: { voluntarios: VoluntarioPendiente[] }) {
  const { error, ocupado, resolver } = useResolver();

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-3">
            <tr>
              {["Solicitud", "Nombre", "Correo", "Centro", ""].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {voluntarios.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-3">Sin voluntarios pendientes.</td></tr>
            )}
            {voluntarios.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-4 py-2">{fmtFecha(v.createdAt)}</td>
                <td className="px-4 py-2 font-medium">{v.nombre}</td>
                <td className="px-4 py-2">{v.email}</td>
                <td className="px-4 py-2">{v.centro?.nombre ?? "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button className={btnOk} disabled={ocupado === v.id} onClick={() => resolver(`/api/usuarios/${v.id}/aprobar`, "APROBAR", v.id)}>
                      {ocupado === v.id ? "…" : "Aprobar"}
                    </button>
                    <button className={btnNo} disabled={ocupado === v.id} onClick={() => resolver(`/api/usuarios/${v.id}/aprobar`, "RECHAZAR", v.id)}>
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
