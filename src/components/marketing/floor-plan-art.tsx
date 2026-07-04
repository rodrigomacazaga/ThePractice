import { cn } from "@/lib/utils";

/**
 * Motivo visual de marca: plano arquitectónico abstracto del espacio.
 * Salas privadas alrededor de un área común; una sala resaltada en clay
 * — "tu sala, dentro de la infraestructura".
 */
export function FloorPlanArt({ className }: { className?: string }) {
  const stroke = "var(--color-line-strong)";
  const ink = "var(--color-ink)";
  return (
    <svg viewBox="0 0 420 340" fill="none" className={cn("w-full", className)} aria-hidden>
      {/* perímetro */}
      <rect x="8" y="8" width="404" height="324" rx="22" stroke={ink} strokeWidth="3" />

      {/* salas superiores */}
      <rect x="28" y="28" width="88" height="92" rx="12" stroke={stroke} strokeWidth="2.5" />
      <rect x="128" y="28" width="88" height="92" rx="12" stroke={stroke} strokeWidth="2.5" />
      {/* sala destacada */}
      <rect x="228" y="28" width="88" height="92" rx="12" fill="var(--color-clay)" opacity="0.92" />
      <circle cx="258" cy="66" r="10" stroke="var(--color-paper)" strokeWidth="2.5" fill="none" />
      <circle cx="290" cy="82" r="10" stroke="var(--color-paper)" strokeWidth="2.5" fill="none" />
      <rect x="328" y="28" width="64" height="92" rx="12" stroke={stroke} strokeWidth="2.5" />

      {/* interiores sutiles */}
      <circle cx="56" cy="62" r="9" stroke={stroke} strokeWidth="2" />
      <circle cx="88" cy="80" r="9" stroke={stroke} strokeWidth="2" />
      <rect x="146" y="56" width="52" height="12" rx="4" stroke={stroke} strokeWidth="2" />
      <circle cx="360" cy="60" r="8" stroke={stroke} strokeWidth="2" />
      <circle cx="360" cy="88" r="8" stroke={stroke} strokeWidth="2" />

      {/* área común */}
      <rect x="28" y="140" width="240" height="76" rx="12" stroke={stroke} strokeWidth="2" strokeDasharray="6 8" />
      <circle cx="80" cy="178" r="7" stroke={stroke} strokeWidth="2" />
      <circle cx="110" cy="178" r="7" stroke={stroke} strokeWidth="2" />
      <rect x="150" y="168" width="60" height="20" rx="8" stroke={stroke} strokeWidth="2" />

      {/* studio */}
      <rect x="288" y="140" width="104" height="172" rx="12" stroke={ink} strokeWidth="2.5" />
      <rect x="306" y="158" width="68" height="8" rx="4" fill={ink} opacity="0.85" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={318 + col * 22}
            cy={196 + row * 26}
            r="6.5"
            stroke={stroke}
            strokeWidth="2"
          />
        ))
      )}

      {/* salas inferiores */}
      <rect x="28" y="236" width="110" height="76" rx="12" stroke={stroke} strokeWidth="2.5" />
      <circle cx="62" cy="270" r="9" stroke={stroke} strokeWidth="2" />
      <circle cx="100" cy="282" r="9" stroke={stroke} strokeWidth="2" />
      <rect x="158" y="236" width="110" height="76" rx="12" stroke={stroke} strokeWidth="2.5" />
      <rect x="176" y="262" width="56" height="12" rx="4" stroke={stroke} strokeWidth="2" />

      {/* marca */}
      <rect x="180" y="322" width="60" height="4" rx="2" fill={ink} />
    </svg>
  );
}
