import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Glyph: "a room within a space" — un contorno redondeado (el espacio)
 * con un cuadro sólido desplazado (la sala privada). Funciona en favicon,
 * app icon, señalética y placas de sala.
 */
export function LogoMark({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "paper" | "clay";
}) {
  const color =
    tone === "paper" ? "var(--color-paper)" : tone === "clay" ? "var(--color-clay)" : "var(--color-ink)";
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-7 w-7", className)}
      aria-hidden
    >
      <rect x="2.25" y="2.25" width="27.5" height="27.5" rx="8.5" stroke={color} strokeWidth="2.5" />
      <rect x="15" y="15" width="9" height="9" rx="3" fill={color} />
    </svg>
  );
}

export function Wordmark({
  className,
  tone = "ink",
  withTagline = false,
}: {
  className?: string;
  tone?: "ink" | "paper";
  withTagline?: boolean;
}) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span
        className={cn(
          "font-display text-[17px] font-bold tracking-tight",
          tone === "paper" ? "text-paper" : "text-ink"
        )}
      >
        The Practice
      </span>
      {withTagline && (
        <span className="mt-1 font-display text-[8.5px] font-semibold tracking-[0.24em] text-stone uppercase">
          Private Practice Spaces
        </span>
      )}
    </span>
  );
}

export function Logo({
  href = "/",
  tone = "ink",
  withTagline = false,
  className,
}: {
  href?: string;
  tone?: "ink" | "paper";
  withTagline?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} />
      <Wordmark tone={tone} withTagline={withTagline} />
    </Link>
  );
}
