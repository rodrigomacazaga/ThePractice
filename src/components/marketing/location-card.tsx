import Link from "next/link";
import type { Location } from "@prisma/client";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/logo";

export function LocationCard({
  location,
  roomCount,
}: {
  location: Location;
  roomCount?: number;
}) {
  const isOpen = location.status === "OPEN";
  const inner = (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-line bg-ink p-7 text-paper shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lift)">
      <div className="absolute -top-8 -right-8 opacity-[0.07] transition-opacity group-hover:opacity-[0.12]">
        <LogoMark tone="paper" className="h-44 w-44" />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between">
          <Badge variant={isOpen ? "sage" : "amber"}>
            {isOpen ? "Abierto" : "Próximamente"}
          </Badge>
          {isOpen && (
            <ArrowUpRight className="h-5 w-5 text-paper/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-paper" />
          )}
        </div>
        <p className="mt-8 eyebrow-light">The Practice</p>
        <h3 className="mt-1 font-display text-2xl font-bold tracking-tight">
          {location.shortName}
        </h3>
      </div>

      <div className="relative mt-10 flex items-center justify-between text-sm text-paper/60">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {location.city}, {location.state}
        </span>
        {roomCount != null && roomCount > 0 && <span>{roomCount} salas</span>}
      </div>
    </div>
  );

  if (!isOpen) return inner;
  return (
    <Link href={`/locations/${location.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
