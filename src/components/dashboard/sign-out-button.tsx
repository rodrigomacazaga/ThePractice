"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-display text-[13px] font-semibold text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
    >
      <LogOut className="h-4 w-4" strokeWidth={1.9} />
      Cerrar sesión
    </button>
  );
}
