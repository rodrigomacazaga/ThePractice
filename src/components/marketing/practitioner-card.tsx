import type { Prisma } from "@prisma/client";
import { MapPin, Video } from "lucide-react";
import { formatMXN } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export type DirectoryPractitioner = Prisma.PractitionerProfileGetPayload<{
  include: {
    user: { select: { name: true; image: true } };
    locations: { include: { location: true } };
  };
}>;

const modalityLabel = {
  IN_PERSON: "Presencial",
  ONLINE: "Online",
  HYBRID: "Híbrido",
} as const;

export function PractitionerCard({ practitioner }: { practitioner: DirectoryPractitioner }) {
  const primaryLocation =
    practitioner.locations.find((l) => l.isPrimary)?.location ??
    practitioner.locations[0]?.location;

  return (
    <div className="group flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lift)">
      <div className="flex items-start gap-4">
        <Avatar
          name={practitioner.user.name}
          src={practitioner.photoUrl ?? practitioner.user.image}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-bold tracking-tight">
              {practitioner.user.name}
            </h3>
            {practitioner.featured && <Badge variant="clay">Destacado</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-stone-deep">
            {practitioner.headline ?? practitioner.specialties[0]}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {practitioner.specialties.slice(0, 3).map((s) => (
          <Badge key={s} variant="default">
            {s}
          </Badge>
        ))}
        {practitioner.acceptingClients && <Badge variant="sage">Acepta clientes</Badge>}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-stone-deep">
        {primaryLocation && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {primaryLocation.shortName}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Video className="h-3.5 w-3.5" />
          {modalityLabel[practitioner.modality]}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <p className="text-sm">
          {practitioner.sessionPriceFromCents != null ? (
            <>
              <span className="text-xs text-stone-deep">desde</span>{" "}
              <span className="font-display font-bold">
                {formatMXN(practitioner.sessionPriceFromCents)}
              </span>
            </>
          ) : (
            <span className="text-xs text-stone-deep">Consultar precio</span>
          )}
        </p>
        <div className="flex gap-2">
          <ButtonLink href={`/p/${practitioner.slug}`} variant="outline" size="sm">
            Ver perfil
          </ButtonLink>
          <ButtonLink href={`/p/${practitioner.slug}#contacto`} size="sm">
            Reservar
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
