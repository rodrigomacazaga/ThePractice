import { NextRequest, NextResponse } from "next/server";

/**
 * Modo "pre-lanzamiento": todo el sitio queda tras una contraseña (Basic Auth),
 * y ÚNICAMENTE la propuesta de La Ceiba (/concept-la-ceiba) queda pública.
 *
 * Se activa con la variable de entorno SITE_PASSWORD. Si no está definida
 * (p. ej. en desarrollo local), el middleware no bloquea nada.
 */

function isPublic(pathname: string): boolean {
  return (
    // La propuesta de arrendamiento y sus sub-rutas.
    pathname === "/concept-la-ceiba" ||
    pathname.startsWith("/concept-la-ceiba/") ||
    // Endpoints máquina-a-máquina: tienen su propia autenticación (firma /
    // CRON_SECRET) y no pueden enviar credenciales Basic.
    pathname.startsWith("/api/jobs") ||
    pathname.startsWith("/api/webhooks")
  );
}

export function middleware(req: NextRequest) {
  // La raíz redirige (temporalmente) a la landing comercial de La Ceiba,
  // destino de las campañas. 307 (no 308): más adelante "/" puede volver a
  // ser la página institucional. El clone conserva los query params
  // (utm_*, fbclid, gclid) tal cual. Solo aplica a "/" exacto — /la-ceiba
  // nunca vuelve a entrar aquí, así que no hay loop.
  if (req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/la-ceiba";
    return NextResponse.redirect(url, 307);
  }

  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  if (isPublic(req.nextUrl.pathname)) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === password) return NextResponse.next();
    } catch {
      // Credencial malformada → cae al 401.
    }
  }

  return new NextResponse("Acceso restringido — The Practice", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="The Practice", charset="UTF-8"',
    },
  });
}

export const config = {
  // Ejecuta en todo excepto assets estáticos y archivos públicos (que la
  // propuesta necesita para renderizar sin contraseña).
  matcher: ["/((?!_next/|images/|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
