import { prisma } from "@/lib/prisma";
import { LoginVista } from "./LoginVista";

export const dynamic = "force-dynamic";

// Pantalla de acceso. Los centros activos con coordenadas se leen aquí (servidor)
// y viajan como props: el mapa no espera un fetch del cliente.
export default async function LoginPage() {
  const centros = await prisma.centro.findMany({
    where: { activo: true, latitud: { not: null }, longitud: { not: null } },
    select: { id: true, nombre: true, institucion: true, direccion: true, ciudad: true, latitud: true, longitud: true },
    orderBy: { nombre: "asc" },
  });
  return (
    <LoginVista
      centros={centros.map((c) => ({ ...c, latitud: c.latitud as number, longitud: c.longitud as number }))}
    />
  );
}
