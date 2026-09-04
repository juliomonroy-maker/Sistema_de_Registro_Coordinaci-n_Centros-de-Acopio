import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UsuariosAdmin } from "@/components/UsuariosAdmin";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await getSession();
  if (session?.rol !== "COORDINADOR") redirect("/dashboard");

  const [usuarios, centros, instituciones] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      select: {
        id: true, nombre: true, email: true, rol: true, activo: true, estado: true,
        centro: { select: { id: true, nombre: true } },
        institucion: { select: { id: true, nombre: true } },
      },
    }),
    prisma.centro.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.institucion.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight sm:text-3xl">Usuarios</h1>
      <p className="mb-6 text-sm text-ink-3">
        Cuentas del sistema. Encargados y voluntarios se ligan a un centro; instituciones receptoras a su institución.
        Los voluntarios que se registran solos aparecen &quot;Pendiente de aprobación&quot;: apruébalos en{" "}
        <a href="/aprobaciones" className="text-ink underline-offset-4 hover:underline">Aprobaciones</a>.
      </p>
      <UsuariosAdmin usuarios={usuarios} centros={centros} instituciones={instituciones} miId={session.userId} />
    </div>
  );
}
