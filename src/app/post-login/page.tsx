import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** Redirige al panel correcto según el rol de la sesión. */
export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  redirect(homeFor(session.user.role));
}
