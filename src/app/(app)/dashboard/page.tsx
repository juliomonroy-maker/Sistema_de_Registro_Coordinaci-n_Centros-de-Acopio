import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  DashboardCoordinador,
  DashboardEncargado,
  DashboardVoluntario,
  DashboardInstitucion,
  DashboardLider,
} from "./_components";
import { EntregasInstitucion } from "@/components/EntregasInstitucion";

export const dynamic = "force-dynamic";

// Router de dashboards por rol (spec §7).
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  switch (session.rol) {
    case "COORDINADOR":
      return <DashboardCoordinador />;
    case "ENCARGADO":
      return <DashboardEncargado centroId={session.centroId} />;
    case "VOLUNTARIO":
      return <DashboardVoluntario centroId={session.centroId} />;
    case "INSTITUCION":
      return (
        <>
          <DashboardInstitucion institucionId={session.institucionId} />
          <EntregasInstitucion />
        </>
      );
    case "LIDER_CAMPANA":
      return <DashboardLider userId={session.userId} />;
    default:
      return <p>Rol no reconocido.</p>;
  }
}
