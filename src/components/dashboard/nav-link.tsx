"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASH_ICONS, type DashIconName } from "./icons";

export function NavLink({
  href,
  label,
  icon,
  exact = false,
}: {
  href: string;
  label: string;
  icon: DashIconName;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = DASH_ICONS[icon];

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-display text-[13px] font-semibold transition-colors",
        active
          ? "bg-ink text-paper shadow-(--shadow-card)"
          : "text-ink-mute hover:bg-paper-deep hover:text-ink"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
      {label}
    </Link>
  );
}
