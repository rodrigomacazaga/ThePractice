"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { z } from "zod";
import { applySchema, type ApplyInput } from "@/lib/validation/lead";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function ApplyForm({
  source = "apply",
  locationSlug,
  className,
}: {
  source?: string;
  locationSlug?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  // Tres genéricos: el schema usa coerce/default, así que el tipo de
  // entrada (lo que teclea el usuario) difiere del de salida (validado).
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof applySchema>, unknown, ApplyInput>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      preferredDays: [],
      wantsLocker: false,
      source,
      locationSlug,
      city: "Querétaro",
    },
  });

  const selectedDays = watch("preferredDays") ?? [];

  function toggleDay(day: string) {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setValue("preferredDays", next, { shouldValidate: true });
  }

  async function onSubmit(data: ApplyInput) {
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "apply" }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className={cn("rounded-2xl border border-line bg-surface p-10 text-center", className)}>
        <CheckCircle2 className="mx-auto h-10 w-10 text-sage" strokeWidth={1.5} />
        <h3 className="mt-4 font-display text-xl font-bold">Aplicación recibida</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-deep">
          Gracias por tu interés. Nuestro equipo revisará tu perfil y te
          contactará en las próximas 48 horas para agendar una llamada.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("rounded-2xl border border-line bg-surface p-6 sm:p-8", className)}
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre completo" error={errors.name?.message} htmlFor="name">
          <Input id="name" placeholder="Ana García" {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message} htmlFor="email">
          <Input id="email" type="email" placeholder="ana@ejemplo.com" {...register("email")} />
        </Field>
        <Field label="Teléfono (WhatsApp)" error={errors.phone?.message} htmlFor="phone">
          <Input id="phone" type="tel" placeholder="442 123 4567" {...register("phone")} />
        </Field>
        <Field label="Especialidad" error={errors.specialty?.message} htmlFor="specialty">
          <Input
            id="specialty"
            placeholder="Psicología clínica, nutrición, coaching…"
            {...register("specialty")}
          />
        </Field>
        <Field
          label="Años de experiencia"
          error={errors.yearsExperience?.message}
          htmlFor="yearsExperience"
        >
          <Input id="yearsExperience" type="number" min={0} {...register("yearsExperience")} />
        </Field>
        <Field label="Ciudad" error={errors.city?.message} htmlFor="city">
          <Input id="city" {...register("city")} />
        </Field>
      </div>

      <div className="mt-6">
        <Field label="Días preferidos" error={errors.preferredDays?.message}>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "rounded-xl border px-4 py-2 font-display text-xs font-semibold transition-colors",
                  selectedDays.includes(day)
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-surface text-ink-mute hover:border-ink"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Horario preferido" error={errors.preferredHours?.message} htmlFor="preferredHours">
          <Select id="preferredHours" defaultValue="" {...register("preferredHours")}>
            <option value="" disabled>
              Elige un horario
            </option>
            <option value="Mañanas (7-12h)">Mañanas (7–12 h)</option>
            <option value="Mediodía (12-16h)">Mediodía (12–16 h)</option>
            <option value="Tardes (16-20h)">Tardes (16–20 h)</option>
            <option value="Noches (20-22h)">Noches (20–22 h)</option>
            <option value="Mixto">Mixto / flexible</option>
          </Select>
        </Field>
        <Field
          label="Sesiones presenciales por semana"
          error={errors.weeklySessions?.message}
          htmlFor="weeklySessions"
        >
          <Input id="weeklySessions" type="number" min={1} placeholder="8" {...register("weeklySessions")} />
        </Field>
        <Field label="¿Tienes clientes actualmente?" error={errors.hasClients?.message} htmlFor="hasClients">
          <Select id="hasClients" defaultValue="" {...register("hasClients")}>
            <option value="" disabled>
              Selecciona
            </option>
            <option value="yes">Sí, tengo práctica activa</option>
            <option value="some">Algunos, estoy creciendo</option>
            <option value="no">Aún no, estoy empezando</option>
          </Select>
        </Field>
        <Field label="Tipo de sala que necesitas" error={errors.roomPreference?.message} htmlFor="roomPreference">
          <Select id="roomPreference" defaultValue="" {...register("roomPreference")}>
            <option value="" disabled>
              Selecciona
            </option>
            <option value="standard">Estándar (terapia / consulta)</option>
            <option value="premium">Premium (pareja / ejecutivo)</option>
            <option value="studio">Studio (talleres / grupos)</option>
            <option value="mixed">Combinación</option>
          </Select>
        </Field>
        <Field label="¿Qué membresía te interesa?" error={errors.interestedPlan?.message} htmlFor="interestedPlan">
          <Select id="interestedPlan" defaultValue="" {...register("interestedPlan")}>
            <option value="" disabled>
              Selecciona
            </option>
            <option value="flex">Flex — por hora</option>
            <option value="pro">Pro — uso regular</option>
            <option value="premium">Premium — práctica establecida</option>
            <option value="resident">Resident — horarios fijos</option>
            <option value="unsure">Aún no lo sé</option>
          </Select>
        </Field>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-mute">
            <input
              type="checkbox"
              className="h-4.5 w-4.5 accent-ink"
              {...register("wantsLocker")}
            />
            Me interesa un locker privado
          </label>
        </div>
      </div>

      <div className="mt-6">
        <Field label="Cuéntanos de tu práctica (opcional)" error={errors.message?.message} htmlFor="message">
          <Textarea
            id="message"
            placeholder="Tipo de clientes que atiendes, dónde atiendes hoy, qué buscas…"
            {...register("message")}
          />
        </Field>
      </div>

      {status === "error" && (
        <p className="mt-4 rounded-xl bg-rust-soft px-4 py-3 text-sm font-medium text-rust">
          No pudimos enviar tu aplicación. Intenta de nuevo o escríbenos a hola@thepractice.mx.
        </p>
      )}

      <Button type="submit" size="xl" className="mt-8 w-full" disabled={status === "sending"}>
        {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar aplicación
      </Button>
      <p className="mt-3 text-center text-xs text-stone">
        Sin compromiso. Tus datos se usan solo para contactarte sobre The Practice.
      </p>
    </form>
  );
}
