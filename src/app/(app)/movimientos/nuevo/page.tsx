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

const field = "w-full min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2 text-base text-ink placeholder-ink-3 focus:border-ink focus:outline-none sm:text-sm";

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
      const [art, cen, inst] = await Promise.all([
        api<Opt[]>("/api/articulos"),
        api<Opt[]>("/api/centros?activo=true"),
        api<Opt[]>("/api/instituciones"),
      ]);
      setArticulos(art);
      setCentros(cen);
      setInstituciones(inst);
    })().catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  // Solo campañas activas en las que participa el centro elegido: evita el 422
  // "el centro no participa en esta campaña" al enviar.
  useEffect(() => {
    if (!centroId) {
      setCampanas([]);
      return;
    }
    api<Opt[]>(`/api/campanas?activa=true&centroId=${encodeURIComponent(centroId)}`)
      .then(setCampanas)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [centroId]);

  const tipos = useMemo(() => TIPOS_POR_ROL[me?.rol ?? "VOLUNTARIO"] ?? [], [me]);
  const centroFijo = me?.rol === "ENCARGADO" || me?.rol === "VOLUNTARIO";
  const sinCampanas = !!centroId && campanas.length === 0;

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
      setOkMsg(
        tipo === "MERMA" && me?.rol === "ENCARGADO"
          ? "Merma enviada al coordinador. No descuenta stock hasta que la apruebe."
          : "Movimiento registrado.",
      );
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
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">Registrar movimiento</h1>
      {error && <div className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>}
      {okMsg && <div className="mb-4 rounded-md bg-ink/10 px-3 py-2 text-sm text-ink">{okMsg}</div>}

      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 sm:p-6">
        <label className="sm:col-span-2 text-sm">
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
            <option value="">{centroId ? "Selecciona…" : "Elige primero el centro"}</option>
            {campanas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {sinCampanas && (
            <span className="mt-1 block text-xs text-danger">
              Este centro no participa en ninguna campaña activa. El coordinador o el líder deben vincularlo desde la campaña.
            </span>
          )}
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
          <label className="sm:col-span-2 text-sm">
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

        {tipo === "MERMA" && me?.rol === "ENCARGADO" && (
          <p className="sm:col-span-2 rounded-md bg-warn-bg px-3 py-2 text-xs text-warn">
            La merma queda <b>pendiente</b> hasta que el coordinador la apruebe; mientras tanto no descuenta stock.
          </p>
        )}
        {tipo === "MERMA" && (
          <label className="sm:col-span-2 text-sm">
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
          <label className="sm:col-span-2 text-sm">
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

        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-medium">Nota</span>
          <input name="nota" className={field} />
        </label>

        <div className="sm:col-span-2 mt-2 flex gap-3">
          <button
            type="submit"
            disabled={loading || sinCampanas}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-60"
          >
            {loading ? "Registrando…" : "Registrar"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line-2 px-4 text-sm font-medium text-ink hover:bg-surface-3"
          >
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}
