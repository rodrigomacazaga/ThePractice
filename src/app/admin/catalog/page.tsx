import { redirect } from "next/navigation";

/** La vista se separó: el catálogo comercial vive en /admin/pricing y los
 *  tipos de sala en cada ubicación. Se conserva la ruta para no romper
 *  enlaces guardados. */
export default function CatalogRedirect() {
  redirect("/admin/pricing");
}
