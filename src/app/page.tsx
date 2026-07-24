import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/auth-helpers";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { GateLoginForm } from "./gate-login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "The Practice" },
  robots: { index: false, follow: false },
};

/**
 * Puerta de entrada del sitio: solo el logo y el formulario de acceso.
 * Todas las demás rutas exigen sesión (ver src/middleware.ts). Con sesión
 * activa, redirige directo al panel del rol.
 */
export default async function GatePage() {
  const session = await auth();
  if (session?.user) redirect(homeFor(session.user.role));

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4">
      <div className="flex w-full max-w-xs flex-col items-center">
        <LogoMark className="h-12 w-12" />
        <Wordmark withTagline className="mt-5 items-center text-center" />
        <GateLoginForm className="mt-10 w-full" />
      </div>
    </main>
  );
}
