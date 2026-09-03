"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/fetcher";

type Me = { rol: string; centroId: string | null } | null;
type Opt = { id: string; nombre: string };

const TIPOS_POR_ROL: Record<string, { value: string; label: string }[]> = {
  COORDINADOR: [
    { value: "RECEPCION", label: "Recepción" },
    { value: "ENTREGA", label: "Entrega" },
    { value: "MERMA", label: "Merma" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "AJUSTE", label: "Ajuste" },
  ],
  ENCARGADO: [
    { value: "RECEPCION", label: "Recepción" },
    { value: "ENTREGA", label: "Entrega" },
    { value: "MERMA", label: "Merma" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "AJUSTE", label: "Ajuste" },
  ],
  VOLUNTARIO: [
    { value: "RECEPCION", label: "Recepción" },
    { value: "ENTREGA", label: "Entrega" },
  ],
};

const field = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

export default function NuevoMovimientoPage() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [me, setMe] = useState<Me>(null);
  const [campanas, setCampanas] = useState<Opt[]>([]);
  const [articulos, setArticulos] = useState<Opt[]>([]);
  const [centros, setCentros] = useState<Opt[]>([]);
  const [instituciones, setInstituciones] = useState<Opt[]>([]);

  const [tipo, setTipo] = useState(params.get("tipo") ?? "RECEPCION");
  const [centroId, setCentroId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const meRes = await api<{ user: Me }>("/api/auth/me");
      setMe(meRes.user);
      if (meRes.user?.centroId) setCentroId(meRes.user.centroId);
      const [camp, art, cen, inst] = await Promise.all([
        api<Opt[]>("/api/campanas?activa=true"),
        api<Opt[]>("/api/articulos"),
        api<Opt[]>("/api/centros?activo=true"),
        api<Opt[]>("/api/instituciones"),
      ]);
      setCampanas(camp);
      setArticulos(art);
      setCentros(cen);
      setInstituciones(inst);
    })().catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  const tipos = useMemo(() => TIPOS_POR_ROL[me?.rol ?? "VOLUNTARIO"] ?? [], [me]);
  const centroFijo = me?.rol === "ENCARGADO" || me?.rol === "VOLUNTARIO";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const origen = centroFijo ? me?.centroId : (fd.get("centroId") as string);

    try {
      if (tipo === "TRANSFERENCIA") {
        await api("/api/transferencias", {
          method: "POST",
          body: JSON.stringify({
            origenId: origen,
            destinoId: fd.get("destinoId"),
            campanaId: fd.get("campanaId"),
            articuloId: fd.get("articuloId"),
            cantidad: Number(fd.get("cantidad")),
            nota: fd.get("nota") || undefined,
          }),
        });
      } else {
        const body: Record<string, unknown> = {
          tipo,
          centroId: origen,
          campanaId: fd.get("campanaId"),
          articuloId: fd.get("articuloId"),
          cantidad: Number(fd.get("cantidad")),
          nota: fd.get("nota") || undefined,
        };
        if (tipo === "RECEPCION") {
          body.donanteNombre = fd.get("donanteNombre") || undefined;
          body.donanteAnonimo = fd.get("donanteAnonimo") === "on";
        }
        if (tipo === "ENTREGA") body.institucionId = fd.get("institucionId") || undefined;
        if (tipo === "MERMA") body.motivo = fd.get("motivo");
        if (tipo === "AJUSTE") {
          body.signoPositivo = fd.get("signo") === "mas";
          body.motivo = fd.get("motivo");
        }
        await api("/api/movimientos", { method: "POST", body: JSON.stringify(body) });
      }
      setOkMsg("Movimiento registrado.");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Registrar movimiento</h1>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {okMsg && <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{okMsg}</div>}

      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4 rounded-xl border bg-white p-6">
        <label className="col-span-2 text-sm">
          <span className="mb-1 block font-medium">Tipo *</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={field}>
            {tipos.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {/* Centro origen */}
        {centroFijo ? (
          <input type="hidden" name="centroId" value={me?.centroId ?? ""} />
        ) : (
          <label className="text-sm">
            <span className="mb-1 block font-medium">Centro *</span>
            <select name="centroId" required value={centroId} onChange={(e) => setCentroId(e.target.value)} className={field}>
              <option value="">Selecciona…</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-sm">
          <span className="mb-1 block font-medium">Campaña *</span>
          <select name="campanaId" required className={field}>
            <option value="">Selecciona…</option>
            {campanas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium">Artículo *</span>
          <select name="articuloId" required className={field}>
            <option value="">Selecciona…</option>
            {articulos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium">Cantidad *</span>
          <input name="cantidad" type="number" step="any" min="0.01" required className={field} />
        </label>

        {/* Campos dinámicos por tipo */}
        {tipo === "RECEPCION" && (
          <>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Donante (opcional)</span>
              <input name="donanteNombre" placeholder="Nombre o vacío" className={field} />
            </label>
            <label className="flex items-center gap-2 self-end text-sm">
              <input name="donanteAnonimo" type="checkbox" /> Donante anónimo
            </label>
          </>
        )}

        {tipo === "ENTREGA" && (
          <label className="col-span-2 text-sm">
            <span className="mb-1 block font-medium">Institución receptora</span>
            <select name="institucionId" className={field}>
              <option value="">— (beneficiario sin institución) —</option>
              {instituciones.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        {tipo === "MERMA" && (
          <label className="col-span-2 text-sm">
            <span className="mb-1 block font-medium">Motivo * (obligatorio)</span>
            <select name="motivo" required className={field}>
              <option value="CADUCIDAD">Caducidad</option>
              <option value="DANO">Daño</option>
              <option value="PERDIDA">Pérdida</option>
              <option value="OTRO">Otro</option>
            </select>
          </label>
        )}

        {tipo === "AJUSTE" && (
          <>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Sentido *</span>
              <select name="signo" required className={field}>
                <option value="mas">Sumar (+)</option>
                <option value="menos">Restar (−)</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Motivo * (obligatorio)</span>
              <select name="motivo" required className={field}>
                <option value="CORRECCION">Corrección</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
          </>
        )}

        {tipo === "TRANSFERENCIA" && (
          <label className="col-span-2 text-sm">
            <span className="mb-1 block font-medium">Centro destino *</span>
            <select name="destinoId" required className={field}>
              <option value="">Selecciona…</option>
              {centros
                .filter((c) => c.id !== (centroFijo ? me?.centroId : centroId))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </label>
        )}

        <label className="col-span-2 text-sm">
          <span className="mb-1 block font-medium">Nota</span>
          <input name="nota" className={field} />
        </label>

        <div className="col-span-2 mt-2 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Registrando…" : "Registrar"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}
