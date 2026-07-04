"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });

    if (res?.error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    // /post-login lee el rol de la sesión y redirige al panel correcto
    router.push("/post-login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-(--shadow-card)">
        <h1 className="font-display text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="mt-1.5 text-sm text-stone-deep">
          Tu panel de The Practice te espera.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
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
      </div>

      <p className="mt-6 text-center text-sm text-stone-deep">
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="font-semibold text-ink hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
