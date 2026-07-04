import { Heart } from "lucide-react";
import { requireClient } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { PractitionerCard } from "@/components/marketing/practitioner-card";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const { profile } = await requireClient();
  const favorites = await db.favorite.findMany({
    where: { clientId: profile.id },
    include: {
      practitioner: {
        include: {
          user: { select: { name: true, image: true } },
          locations: { include: { location: true } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Favoritos" description="Profesionales que guardaste." />

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Sin favoritos"
          description="Guarda profesionales desde el directorio para encontrarlos rápido después."
          action={<ButtonLink href="/directory">Explorar directorio</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((f) => (
            <PractitionerCard key={f.practitionerId} practitioner={f.practitioner} />
          ))}
        </div>
      )}
    </>
  );
}
