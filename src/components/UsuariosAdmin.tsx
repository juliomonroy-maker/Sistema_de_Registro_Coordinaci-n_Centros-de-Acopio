"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

type Opt = { id: string; nombre: string };
export type UsuarioFila = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  estado: string;
  centro: Opt | null;
  institucion: Opt | null;
};

const ROLES: [string, string][] = [
  ["ENCARGADO", "Encargado de centro"],
  ["VOLUNTARIO", "Voluntario"],
  ["INSTITUCION", "Institución receptora"],
  ["LIDER_CAMPANA", "Líder de campaña"],
  ["COORDINADOR", "Coordinador general"],
];
const ROL_LABEL = Object.fromEntries(ROLES);

const field = "w-full min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2 text-base text-ink placeholder-ink-3 focus:border-ink focus:outline-none sm:text-sm";

/** Alta de cuentas y activar/desactivar. Solo lo ve el coordinador. */
export function UsuariosAdmin({
  usuarios,
  centros,
  instituciones,
  miId,
}: {
  usuarios: UsuarioFila[];
  centros: Opt[];
  instituciones: Opt[];
  miId: string;
}) {
  const router = useRouter();
  const [rol, setRol] = useState("ENCARGADO");
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const necesitaCentro = rol === "ENCARGADO" || rol === "VOLUNTARIO";
  const necesitaInstitucion = rol === "INSTITUCION";

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOcupado("crear");
    // `e.currentTarget` es null después del primer await: capturar el form antes.
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await api("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nombre: fd.get("nombre"),
          email: fd.get("email"),
          password: fd.get("password"),
          rol,
          centroId: necesitaCentro ? fd.get("centroId") || null : null,
          institucionId: necesitaInstitucion ? fd.get("institucionId") || null : null,
        }),
      });
      form.reset();
      setAbierto(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setOcupado(null);
    }
  }

  async function toggleActivo(u: UsuarioFila) {
    setError(null);
    setOcupado(u.id);
    try {
      await api(`/api/usuarios/${u.id}`, { method: "PATCH", body: JSON.stringify({ activo: !u.activo }) });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-3">{usuarios.length} cuentas</p>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2"
        >
          {abierto ? "Cerrar" : "+ Nueva cuenta"}
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}

      {abierto && (
        <form onSubmit={crear} className="mb-6 grid gap-4 rounded-xl border border-line bg-surface p-6 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Nombre *</span>
            <input name="nombre" required minLength={2} className={field} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Correo *</span>
            <input name="email" type="email" required className={field} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Contraseña * (mín. 8)</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Rol *</span>
            <select value={rol} onChange={(e) => setRol(e.target.value)} className={field}>
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          {necesitaCentro && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Centro *</span>
              <select name="centroId" required className={field}>
                <option value="">Selecciona…</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
          )}
          {necesitaInstitucion && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Institución *</span>
              <select name="institucionId" required className={field}>
                <option value="">Selecciona…</option>
                {instituciones.map((i) => (
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
              </select>
            </label>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={ocupado === "crear"}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-60"
            >
              {ocupado === "crear" ? "Creando…" : "Crear cuenta"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-3">
            <tr>
              {["Nombre", "Email", "Rol", "Centro / Institución", "Estado", ""].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className={`border-t ${u.activo ? "" : "text-ink-3"}`}>
                <td className="px-4 py-2">{u.nombre}{u.id === miId && <span className="ml-1 text-xs text-ink-3">(tú)</span>}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{ROL_LABEL[u.rol] ?? u.rol}</td>
                <td className="px-4 py-2">{u.centro?.nombre ?? u.institucion?.nombre ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex flex-wrap gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.activo ? "bg-ink/10 text-ink" : "bg-surface-2 text-ink-3"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                    {u.estado !== "APROBADO" && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.estado === "PENDIENTE" ? "bg-warn-bg text-warn" : "bg-surface-3 text-ink-2"}`}>
                        {u.estado === "PENDIENTE" ? "Pendiente de aprobación" : "Rechazado"}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {u.id !== miId && (
                    <button
                      onClick={() => toggleActivo(u)}
                      disabled={ocupado === u.id}
                      className="rounded-md border px-3 py-1 text-xs font-medium text-ink-2 hover:bg-surface-3 disabled:opacity-60"
                    >
                      {ocupado === u.id ? "…" : u.activo ? "Desactivar" : "Activar"}
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
