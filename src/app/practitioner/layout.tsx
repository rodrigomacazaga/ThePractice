import { requirePractitioner } from "@/lib/auth-helpers";
import { DashboardShell, type DashNavSection } from "@/components/dashboard/shell";

export const dynamic = "force-dynamic";

const SECTIONS: DashNavSection[] = [
  {
    items: [
      { href: "/practitioner", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/practitioner/book", label: "Reservar sala", icon: "door" },
      { href: "/practitioner/calendar", label: "Mi calendario", icon: "calendar" },
    ],
  },
  {
    title: "Mi práctica",
    items: [
      { href: "/practitioner/microsite", label: "Mi micrositio", icon: "globe" },
      { href: "/practitioner/services", label: "Mis servicios", icon: "briefcase" },
      { href: "/practitioner/leads", label: "Leads", icon: "inbox" },
      { href: "/practitioner/bookings", label: "Reservas de clientes", icon: "users" },
    ],
  },
  {
    title: "Cuenta",
    items: [
      { href: "/practitioner/membership", label: "Membresía", icon: "crown" },
      { href: "/practitioner/credits", label: "Créditos", icon: "wallet" },
      { href: "/practitioner/payments", label: "Pagos", icon: "credit-card" },
      { href: "/practitioner/documents", label: "Documentos", icon: "file" },
      { href: "/practitioner/settings", label: "Ajustes", icon: "settings" },
      { href: "/practitioner/support", label: "Soporte", icon: "support" },
    ],
  },
];

export default async function PractitionerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, profile } = await requirePractitioner();

  const pendingBanner =
    profile.verificationStatus !== "APPROVED" ? (
      <div className="border-b border-amber-warm/20 bg-amber-soft px-6 py-3 text-center text-sm font-medium text-amber-warm">
        Tu perfil está en verificación. Podrás reservar salas y publicar tu
        micrositio cuando sea aprobado (típicamente 48 h).
      </div>
    ) : undefined;

  return (
    <DashboardShell
      sections={SECTIONS}
      user={{
        name: session.user.name ?? "Practitioner",
        email: session.user.email ?? "",
        image: session.user.image,
      }}
      roleLabel="Practitioner"
      banner={pendingBanner}
    >
      {children}
    </DashboardShell>
  );
}
