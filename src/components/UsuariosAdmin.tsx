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

const field = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

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
    const fd = new FormData(e.currentTarget);
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
      e.currentTarget.reset();
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
        <p className="text-sm text-gray-500">{usuarios.length} cuentas</p>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {abierto ? "Cerrar" : "+ Nueva cuenta"}
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {abierto && (
        <form onSubmit={crear} className="mb-6 grid gap-4 rounded-xl border bg-white p-6 md:grid-cols-2">
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
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {ocupado === "crear" ? "Creando…" : "Crear cuenta"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              {["Nombre", "Email", "Rol", "Centro / Institución", "Estado", ""].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className={`border-t ${u.activo ? "" : "text-gray-400"}`}>
                <td className="px-4 py-2">{u.nombre}{u.id === miId && <span className="ml-1 text-xs text-gray-400">(tú)</span>}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{ROL_LABEL[u.rol] ?? u.rol}</td>
                <td className="px-4 py-2">{u.centro?.nombre ?? u.institucion?.nombre ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {u.id !== miId && (
                    <button
                      onClick={() => toggleActivo(u)}
                      disabled={ocupado === u.id}
                      className="rounded-md border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
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
