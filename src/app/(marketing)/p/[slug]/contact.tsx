"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { micrositeLeadSchema, type MicrositeLeadInput } from "@/lib/validation/lead";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function MicrositeContact({
  practitionerSlug,
  practitionerName,
  allowBooking,
}: {
  practitionerSlug: string;
  practitionerName: string;
  allowBooking: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MicrositeLeadInput>({
    resolver: zodResolver(micrositeLeadSchema),
    defaultValues: { practitionerSlug },
  });

  async function onSubmit(data: MicrositeLeadInput) {
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "microsite" }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-(--shadow-card)">
        <CheckCircle2 className="mx-auto h-8 w-8 text-sage" strokeWidth={1.5} />
        <h3 className="mt-3 font-display text-base font-bold">Mensaje enviado</h3>
        <p className="mt-1.5 text-sm text-stone-deep">
          {practitionerName.split(" ")[0]} te contactará pronto para coordinar
          tu sesión.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-line bg-ink p-6 shadow-(--shadow-lift)"
      noValidate
    >
      <h3 className="font-display text-base font-bold text-paper">
        {allowBooking ? "Solicita tu sesión" : `Escríbele a ${practitionerName.split(" ")[0]}`}
      </h3>
      <p className="mt-1 text-xs text-paper/70">
        Respuesta típica en menos de 24 horas.
      </p>

      <div className="mt-5 space-y-4 [&_input]:border-paper/20 [&_input]:bg-paper/10 [&_input]:text-paper [&_input]:placeholder:text-paper/70 [&_label]:text-paper/70 [&_textarea]:border-paper/20 [&_textarea]:bg-paper/10 [&_textarea]:text-paper [&_textarea]:placeholder:text-paper/70">
        <Field label="Nombre" error={errors.name?.message} htmlFor="m-name">
          <Input id="m-name" {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message} htmlFor="m-email">
          <Input id="m-email" type="email" {...register("email")} />
        </Field>
        <Field label="Teléfono (opcional)" error={errors.phone?.message} htmlFor="m-phone">
          <Input id="m-phone" type="tel" {...register("phone")} />
        </Field>
        <Field label="Mensaje" error={errors.message?.message} htmlFor="m-message">
          <Textarea
            id="m-message"
            rows={3}
            placeholder="Qué buscas trabajar, horarios que te acomodan…"
            {...register("message")}
          />
        </Field>
      </div>

      {status === "error" && (
        <p className="mt-4 rounded-xl bg-rust-soft px-4 py-3 text-xs font-medium text-rust">
          No pudimos enviar tu mensaje. Intenta de nuevo.
        </p>
      )}

      <Button
        type="submit"
        variant="light"
        size="lg"
        className="mt-5 w-full"
        disabled={status === "sending"}
      >
        {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar solicitud
      </Button>
    </form>
  );
}
