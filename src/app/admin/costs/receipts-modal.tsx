"use client";

import { useState } from "react";
import { FileText, Loader2, Paperclip, Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { addExpenseReceipt, deleteExpenseReceipt } from "../actions";

interface ReceiptView {
  id: string;
  url: string;
  filename: string;
  createdAtLabel: string;
}

/**
 * Comprobantes de un gasto. El archivo sube del navegador directo al proveedor
 * de storage con una firma temporal: nunca pasa por la función serverless.
 * Si el proveedor está en modo mock (sin credenciales), el archivo no persiste
 * y se avisa en pantalla en vez de fingir que se guardó.
 */
export function ReceiptsModal({
  expenseId,
  concept,
  receipts,
}: {
  expenseId: string;
  concept: string;
  receipts: ReceiptView[];
}) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          folder: "receipts",
        }),
      });
      if (!signRes.ok) throw new Error("No se pudo firmar la subida");
      const signed: {
        uploadUrl: string;
        fields: Record<string, string>;
        publicUrl: string;
        provider: string;
      } = await signRes.json();

      setIsMock(signed.provider === "mock");

      const form = new FormData();
      for (const [k, v] of Object.entries(signed.fields)) form.append(k, v);
      form.append("file", file);
      const up = await fetch(signed.uploadUrl, { method: "POST", body: form });
      if (!up.ok) throw new Error("El proveedor rechazó el archivo");

      // Cloudinary responde con la URL final; el mock usa la calculada.
      let url = signed.publicUrl;
      try {
        const json = await up.clone().json();
        if (json?.secure_url) url = json.secure_url;
      } catch {
        // Respuesta sin JSON: se usa publicUrl.
      }
      setUploaded({ url, filename: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falló la subida");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      trigger={
        receipts.length > 0 ? `${receipts.length} comprob.` : "Adjuntar"
      }
      title={`Comprobantes de ${concept}`}
    >
      <div className="space-y-3">
        {receipts.length === 0 && (
          <p className="text-sm text-stone-deep">Este gasto todavía no tiene comprobantes.</p>
        )}
        {receipts.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-stone" />
              <div className="min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-display text-sm font-semibold underline"
                >
                  {r.filename}
                </a>
                <p className="text-xs text-stone">{r.createdAtLabel}</p>
              </div>
            </div>
            <ActionButton
              action={deleteExpenseReceipt.bind(null, r.id)}
              label="Quitar"
              variant="danger"
              confirmText={`¿Quitar ${r.filename}?`}
            />
          </div>
        ))}

        <div className="border-t border-line pt-4">
          <p className="font-display text-sm font-bold">Agregar comprobante</p>

          {/* Subida directa al proveedor */}
          <div className="mt-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-paper px-4 py-6 text-sm font-medium text-ink-mute hover:border-ink">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Subiendo…" : "Elegir archivo (factura, recibo, ticket)"}
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={onFile}
                disabled={uploading}
              />
            </label>
          </div>

          {error && (
            <p className="mt-2 rounded-xl bg-rust-soft px-3 py-2 text-xs font-medium text-rust">
              {error}
            </p>
          )}
          {isMock && uploaded && (
            <p className="mt-2 rounded-xl bg-amber-soft px-3 py-2 text-xs font-medium text-amber-warm">
              El almacenamiento está en modo mock: este archivo no persiste. Configura las
              credenciales de Cloudinary para que las subidas sean reales.
            </p>
          )}

          {/* Registro del comprobante: liga subida o pegada a mano */}
          <ActionForm action={addExpenseReceipt} submitLabel="Guardar comprobante" className="mt-3">
            <input type="hidden" name="expenseId" value={expenseId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre" htmlFor={`rc-name-${expenseId}`}>
                <Input
                  id={`rc-name-${expenseId}`}
                  name="filename"
                  defaultValue={uploaded?.filename ?? ""}
                  key={uploaded?.filename ?? "empty-name"}
                  placeholder="Factura de renta enero"
                  required
                />
              </Field>
              <Field
                label="Liga del archivo"
                htmlFor={`rc-url-${expenseId}`}
                hint="Se llena sola al subir, o pega una liga existente"
              >
                <Input
                  id={`rc-url-${expenseId}`}
                  name="url"
                  type="url"
                  defaultValue={uploaded?.url ?? ""}
                  key={uploaded?.url ?? "empty-url"}
                  required
                />
              </Field>
            </div>
          </ActionForm>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-stone">
            <Paperclip className="mt-0.5 h-3 w-3 shrink-0" />
            Cada comprobante queda ligado al gasto y a quién lo subió, con su fecha.
          </p>
        </div>
      </div>
    </Modal>
  );
}
