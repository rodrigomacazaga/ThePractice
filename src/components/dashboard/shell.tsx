import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { NavLink } from "./nav-link";
import { SignOutButton } from "./sign-out-button";
import { MobileDashNav } from "./mobile-dash-nav";
import type { DashIconName } from "./icons";

export interface DashNavItem {
  href: string;
  label: string;
  icon: DashIconName;
  exact?: boolean;
}

export interface DashNavSection {
  title?: string;
  items: DashNavItem[];
}

export function DashboardShell({
  sections,
  user,
  roleLabel,
  banner,
  children,
}: {
  sections: DashNavSection[];
  user: { name: string; email: string; image?: string | null };
  roleLabel: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-paper">
      {/* SIDEBAR DESKTOP */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Logo />
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {sections.map((section, i) => (
            <div key={section.title ?? i}>
              {section.title && (
                <p className="mb-2 px-3.5 font-display text-[10px] font-semibold tracking-[0.18em] text-stone uppercase">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3 px-2 pb-3">
            <Avatar name={user.name} src={user.image} size={36} />
            <div className="min-w-0">
              <p className="truncate font-display text-[13px] font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-stone">{roleLabel}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* CONTENIDO */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* TOPBAR MOBILE */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur-xl lg:hidden">
          <Logo />
          <MobileDashNav sections={sections} />
        </header>

        {banner}

        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <footer className="border-t border-line px-8 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-stone uppercase">
              The Practice
            </p>
            <Link href="/contact" className="text-xs text-stone hover:text-ink">
              Soporte
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone-deep">{description}</p>}
      </div>
      {actions && <div className="flex gap-2.5">{actions}</div>}
    </div>
  );
}
