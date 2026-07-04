import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/auth-helpers";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect(homeFor(session.user.role));
  return <SignupForm />;
}
