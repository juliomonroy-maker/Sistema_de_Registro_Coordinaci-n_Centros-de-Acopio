import { getSession } from "@/lib/session";
import { ok } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  return ok({ user: session });
}
