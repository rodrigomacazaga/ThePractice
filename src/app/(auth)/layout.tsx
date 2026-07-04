import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="font-display text-xs font-semibold text-stone-deep hover:text-ink"
        >
          ← Volver al sitio
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
      <footer className="pb-8 text-center font-display text-[10px] font-semibold tracking-[0.2em] text-stone uppercase">
        The Practice · Private Practice Spaces
      </footer>
    </div>
  );
}
