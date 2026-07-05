import Image from "next/image";
import type { RoomType } from "@prisma/client";
import { Users } from "lucide-react";
import { formatMXN, formatCredits } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Fotos por tipo de sala (generadas con dirección de arte de la marca). */
const ROOM_PHOTOS: Record<string, string> = {
  talk: "/images/room-talk.jpg",
  consult: "/images/room-consult.jpg",
  premium: "/images/room-premium.jpg",
  studio: "/images/room-studio.jpg",
};

/**
 * Card de tipo de sala: foto del espacio con overlay del costo en créditos.
 * Si un tipo nuevo no tiene foto aún, cae al plano arquitectónico SVG.
 */
export function RoomTypeCard({ roomType }: { roomType: RoomType }) {
  const photo = ROOM_PHOTOS[roomType.code];
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lift)">
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-ink">
        {photo ? (
          <Image
            src={photo}
            alt={`${roomType.name} en The Practice`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <RoomPlan code={roomType.code} />
        )}
        <Badge variant="clay" className="absolute top-4 right-4 z-10">
          {formatCredits(roomType.creditsPerHour)}{" "}
          {roomType.creditsPerHour === 1 ? "crédito" : "créditos"}/hora
        </Badge>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold tracking-tight">{roomType.name}</h3>
          <span className="flex items-center gap-1 text-xs text-stone-deep">
            <Users className="h-3.5 w-3.5" /> {roomType.capacity}
          </span>
        </div>
        {roomType.description && (
          <p className="mt-2 text-sm leading-relaxed text-stone-deep">{roomType.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {roomType.features.slice(0, 4).map((f) => (
            <Badge key={f} variant="outline">
              {f}
            </Badge>
          ))}
        </div>

        <div className="mt-auto pt-5">
          <p className="font-display text-sm font-bold text-ink">
            {formatMXN(roomType.baseHourlyPriceCents)}
            <span className="font-sans text-xs font-normal text-stone"> /hora</span>
            {roomType.memberHourlyPriceCents != null && (
              <span className="ml-2 font-sans text-xs font-normal text-sage">
                {formatMXN(roomType.memberHourlyPriceCents)} con membresía
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-stone">
            Ideal para: {roomType.idealFor.join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Mini plano arquitectónico por tipo de sala. */
function RoomPlan({ code }: { code: string }) {
  const stroke = "var(--color-paper)";
  const accent = "var(--color-clay)";

  if (code === "talk") {
    return (
      <svg viewBox="0 0 120 80" className="h-24 w-40 opacity-90" fill="none">
        <rect x="4" y="4" width="112" height="72" rx="10" stroke={stroke} strokeWidth="2" opacity="0.5" />
        <circle cx="38" cy="40" r="11" stroke={stroke} strokeWidth="2.5" />
        <circle cx="82" cy="40" r="11" stroke={stroke} strokeWidth="2.5" />
        <rect x="55" y="56" width="10" height="10" rx="3" fill={accent} />
      </svg>
    );
  }
  if (code === "consult") {
    return (
      <svg viewBox="0 0 120 80" className="h-24 w-40 opacity-90" fill="none">
        <rect x="4" y="4" width="112" height="72" rx="10" stroke={stroke} strokeWidth="2" opacity="0.5" />
        <rect x="30" y="30" width="60" height="14" rx="4" stroke={stroke} strokeWidth="2.5" />
        <circle cx="45" cy="58" r="7" stroke={stroke} strokeWidth="2.5" />
        <circle cx="75" cy="58" r="7" stroke={stroke} strokeWidth="2.5" />
        <circle cx="60" cy="18" r="7" fill={accent} />
      </svg>
    );
  }
  if (code === "premium") {
    return (
      <svg viewBox="0 0 120 80" className="h-24 w-40 opacity-90" fill="none">
        <rect x="4" y="4" width="112" height="72" rx="10" stroke={stroke} strokeWidth="2" opacity="0.5" />
        <rect x="22" y="30" width="34" height="16" rx="6" stroke={stroke} strokeWidth="2.5" />
        <circle cx="82" cy="30" r="9" stroke={stroke} strokeWidth="2.5" />
        <circle cx="82" cy="54" r="9" stroke={stroke} strokeWidth="2.5" />
        <rect x="16" y="12" width="26" height="5" rx="2.5" fill={accent} />
      </svg>
    );
  }
  // studio
  return (
    <svg viewBox="0 0 120 80" className="h-24 w-40 opacity-90" fill="none">
      <rect x="4" y="4" width="112" height="72" rx="10" stroke={stroke} strokeWidth="2" opacity="0.5" />
      <rect x="40" y="14" width="40" height="6" rx="3" fill={accent} />
      {[32, 52, 72, 92].map((x) => (
        <circle key={`t-${x}`} cx={x - 2} cy="40" r="6" stroke={stroke} strokeWidth="2" />
      ))}
      {[42, 62, 82].map((x) => (
        <circle key={`b-${x}`} cx={x - 2} cy="60" r="6" stroke={stroke} strokeWidth="2" />
      ))}
    </svg>
  );
}
