import { requireClient } from "@/lib/auth-helpers";
import { DashboardShell, type DashNavSection } from "@/components/dashboard/shell";

export const dynamic = "force-dynamic";

const SECTIONS: DashNavSection[] = [
  {
    items: [
      { href: "/client", label: "Explorar", icon: "compass", exact: true },
      { href: "/client/bookings", label: "Mis sesiones", icon: "calendar" },
      { href: "/client/favorites", label: "Favoritos", icon: "heart" },
      { href: "/client/payments", label: "Pagos", icon: "credit-card" },
      { href: "/client/settings", label: "Perfil", icon: "settings" },
    ],
  },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireClient();

  return (
    <DashboardShell
      sections={SECTIONS}
      user={{
        name: session.user.name ?? "Cliente",
        email: session.user.email ?? "",
        image: session.user.image,
      }}
      roleLabel="Cliente"
    >
      {children}
    </DashboardShell>
  );
}
