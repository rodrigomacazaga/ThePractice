import Link from "next/link";
import { mainNav } from "@/config/site";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";

/**
 * Navbar estática (sin sesión) para que las páginas de marketing se
 * prerendericen y sirvan desde CDN. /login redirige al panel correcto
 * si ya hay sesión activa.
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/85 backdrop-blur-xl">
      <div className="container-page relative flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 font-display text-[13px] font-semibold text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Entrar
          </ButtonLink>
          <ButtonLink href="/apply" size="sm">
            Aplicar
          </ButtonLink>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
