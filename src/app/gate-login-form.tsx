"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/**
 * Formulario mínimo de la puerta de entrada: usuario + contraseña.
 * El "usuario" es el email de la cuenta (así lo valida el provider de
 * credenciales); tras entrar, /post-login enruta al panel según el rol.
 */
export function GateLoginForm({ className }: { className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("username")).trim().toLowerCase(),
      password: String(form.get("password")),
      redirect: false,
    });

    if (res?.error) {
      setError("Usuario o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    router.push("/post-login");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-5", className)} noValidate>
      <Field label="Usuario" htmlFor="username">
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          placeholder="tu@email.com"
        />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      {error && (
        <p className="rounded-xl bg-rust-soft px-4 py-3 text-sm font-medium text-rust">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}
