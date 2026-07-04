"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { contactSchema, type ContactInput } from "@/lib/validation/lead";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function ContactForm({ source = "contact" }: { source?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { source },
  });

  async function onSubmit(data: ContactInput) {
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "contact" }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-sage" strokeWidth={1.5} />
        <h3 className="mt-4 font-display text-xl font-bold">Mensaje enviado</h3>
        <p className="mt-2 text-sm text-stone-deep">Te responderemos en menos de 24 horas hábiles.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-2xl border border-line bg-surface p-6 sm:p-8"
      noValidate
    >
      <Field label="Nombre" error={errors.name?.message} htmlFor="c-name">
        <Input id="c-name" {...register("name")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" error={errors.email?.message} htmlFor="c-email">
          <Input id="c-email" type="email" {...register("email")} />
        </Field>
        <Field label="Teléfono (opcional)" error={errors.phone?.message} htmlFor="c-phone">
          <Input id="c-phone" type="tel" {...register("phone")} />
        </Field>
      </div>
      <Field label="Mensaje" error={errors.message?.message} htmlFor="c-message">
        <Textarea id="c-message" placeholder="¿En qué te podemos ayudar?" {...register("message")} />
      </Field>

      {status === "error" && (
        <p className="rounded-xl bg-rust-soft px-4 py-3 text-sm font-medium text-rust">
          No pudimos enviar tu mensaje. Escríbenos a hola@thepractice.mx.
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={status === "sending"}>
        {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar mensaje
      </Button>
    </form>
  );
}
