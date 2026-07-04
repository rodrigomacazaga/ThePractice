"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"client" | "practitioner">("client");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      phone: String(form.get("phone") || "") || undefined,
      password: String(form.get("password")),
      accountType,
      specialty: accountType === "practitioner" ? String(form.get("specialty") || "") || undefined : undefined,
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No pudimos crear tu cuenta. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    // Login automático tras registro
    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    router.push("/post-login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-(--shadow-card)">
        <h1 className="font-display text-2xl font-bold tracking-tight">Crear cuenta</h1>
        <p className="mt-1.5 text-sm text-stone-deep">
          Elige el tipo de cuenta para empezar.
        </p>

        {/* Selector de tipo */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-paper p-1.5">
          {(
            [
              { key: "client", label: "Soy cliente" },
              { key: "practitioner", label: "Soy profesional" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setAccountType(opt.key)}
              className={cn(
                "rounded-lg py-2.5 font-display text-xs font-semibold transition-colors",
                accountType === opt.key
                  ? "bg-ink text-paper shadow-(--shadow-card)"
                  : "text-ink-mute hover:text-ink"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <Field label="Nombre completo" htmlFor="s-name">
            <Input id="s-name" name="name" required minLength={2} placeholder="Ana García" />
          </Field>
          {accountType === "practitioner" && (
            <Field label="Especialidad" htmlFor="s-specialty">
              <Input
                id="s-specialty"
                name="specialty"
                placeholder="Psicología clínica, nutrición…"
              />
            </Field>
          )}
          <Field label="Email" htmlFor="s-email">
            <Input id="s-email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Teléfono (opcional)" htmlFor="s-phone">
            <Input id="s-phone" name="phone" type="tel" />
          </Field>
          <Field label="Contraseña" htmlFor="s-password" hint="Mínimo 8 caracteres">
            <Input
              id="s-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>

          {error && (
            <p className="rounded-xl bg-rust-soft px-4 py-3 text-sm font-medium text-rust">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear cuenta
          </Button>

          {accountType === "practitioner" && (
            <p className="text-xs leading-relaxed text-stone">
              Tu cuenta se crea de inmediato; tu perfil público se activa
              después de la verificación de credenciales (48 h típicamente).
            </p>
          )}
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-stone-deep">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-ink hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
