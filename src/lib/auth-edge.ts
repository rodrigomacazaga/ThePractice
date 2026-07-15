import NextAuth from "next-auth";

/**
 * Instancia edge-safe de NextAuth SOLO para el middleware: sin providers,
 * sin Prisma ni bcrypt (no corren en edge). Comparte la estrategia JWT y el
 * secret (NEXTAUTH_SECRET/AUTH_SECRET del entorno) con src/lib/auth.ts, así
 * que su auth() valida y descifra la misma cookie de sesión emitida al
 * hacer login. authorize() nunca se ejecuta aquí.
 */
export const { auth: authEdge } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/" },
  providers: [],
});
