import { requireAdmin } from "@/lib/auth-helpers";
import { DashboardShell, type DashNavSection } from "@/components/dashboard/shell";

export const dynamic = "force-dynamic";

const SECTIONS: DashNavSection[] = [
  {
    items: [
      { href: "/admin/overview", label: "Overview", icon: "bar-chart" },
      { href: "/admin/leads", label: "Leads", icon: "inbox" },
      { href: "/admin/bookings", label: "Reservas", icon: "calendar" },
    ],
  },
  {
    title: "Operación",
    items: [
      { href: "/admin/practitioners", label: "Practitioners", icon: "user" },
      { href: "/admin/clients", label: "Clientes", icon: "users" },
      { href: "/admin/locations", label: "Ubicaciones", icon: "building" },
      { href: "/admin/rooms", label: "Salas", icon: "door" },
    ],
  },
  {
    title: "Negocio",
    items: [
      { href: "/admin/catalog", label: "Planes y precios", icon: "tags" },
      { href: "/admin/payments", label: "Pagos", icon: "credit-card" },
      { href: "/admin/settings", label: "Configuración", icon: "settings" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <DashboardShell
      sections={SECTIONS}
      user={{
        name: session.user.name ?? "Admin",
        email: session.user.email ?? "",
        image: session.user.image,
      }}
      roleLabel={session.user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
    >
      {children}
    </DashboardShell>
  );
}
