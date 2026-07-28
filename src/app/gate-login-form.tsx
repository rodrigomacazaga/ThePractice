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
    const username = String(form.get("username")).trim().toLowerCase();
    // El provider de credenciales valida el usuario como email: sin "@" el
    // login falla igual que con contraseña mala, así que se distingue aquí.
    if (!username.includes("@")) {
      setError("Escribe tu correo completo, por ejemplo admin@thepractice.mx.");
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      email: username,
      password: String(form.get("password")),
      redirect: false,
    });

    if (res?.error) {
      // Solo CredentialsSignin significa "datos incorrectos"; cualquier otro
      // error (configuración, CSRF, red) merece su propio mensaje para no
      // mandar al usuario a reintentar una contraseña que sí era correcta.
      setError(
        res.error === "CredentialsSignin"
          ? "Usuario o contraseña incorrectos."
          : `No se pudo iniciar sesión (${res.error}). Avisa al equipo con este código.`
      );
      setLoading(false);
      return;
    }
    router.push("/post-login");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-5", className)} noValidate>
      <Field label="Usuario (correo)" htmlFor="username">
        <Input
          id="username"
          name="username"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          placeholder="admin@thepractice.mx"
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
