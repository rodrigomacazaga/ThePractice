import { NextResponse } from "next/server";
import { authEdge } from "@/lib/auth-edge";

/**
 * Sitio privado: TODA vista requiere sesión iniciada. Lo único público:
 *  - "/"              → la puerta de entrada (logo + usuario/contraseña)
 *  - /api/auth/*      → endpoints de NextAuth (necesarios para poder entrar)
 *  - /api/webhooks/*  → máquina-a-máquina con su propia autenticación
 *  - /api/jobs/*      → ídem (CRON_SECRET)
 *  - assets estáticos → excluidos por el matcher
 *
 * Sin sesión: páginas → redirect a "/"; APIs → 401. La sesión se valida
 * con la instancia edge-safe de NextAuth (src/lib/auth-edge.ts), que
 * descifra el JWT de la cookie — no es solo presencia de cookie.
 */
function isPublic(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/jobs")
  );
}

export default authEdge((req) => {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  if (!req.auth?.user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/|images/|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
