import { NextRequest, NextResponse } from "next/server";

/**
 * La raíz redirige (temporalmente) a la landing comercial de La Ceiba,
 * destino de las campañas. 307 (no 308): más adelante "/" puede volver a
 * ser la página institucional. El clone conserva los query params
 * (utm_*, fbclid, gclid) tal cual. Solo aplica a "/" exacto — /la-ceiba
 * nunca vuelve a entrar aquí, así que no hay loop.
 *
 * El Basic Auth de prelanzamiento (SITE_PASSWORD) se retiró: el sitio es
 * público desde el arranque de campañas. La variable SITE_PASSWORD ya no
 * tiene efecto y puede eliminarse del entorno.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/la-ceiba";
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/"],
};
