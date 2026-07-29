import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { getStorageProvider } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Credenciales de subida firmada. El archivo va del navegador directo al
 * proveedor: nunca pasa por la función (Netlify no tiene disco persistente y
 * el límite de payload es bajo).
 *
 * Exige la facultad de gestionar gastos: sin eso cualquiera con sesión podría
 * usar el almacenamiento del proyecto.
 */
export async function POST(req: NextRequest) {
  await requirePermission("expenses.manage");

  let body: { filename?: string; contentType?: string; folder?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.filename || !body.contentType) {
    return NextResponse.json({ error: "Falta filename o contentType" }, { status: 422 });
  }

  const provider = getStorageProvider();
  const signed = await provider.createSignedUpload({
    folder: body.folder === "receipts" ? "receipts" : "misc",
    filename: body.filename,
    contentType: body.contentType,
  });

  return NextResponse.json({ ...signed, provider: provider.name });
}
