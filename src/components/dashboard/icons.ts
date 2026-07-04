import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Compass,
  CreditCard,
  Crown,
  DoorOpen,
  FileText,
  Globe,
  Heart,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Tags,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Los layouts (Server Components) no pueden pasar componentes de ícono
 * (funciones) a componentes cliente. Pasan nombres (string) y el cliente
 * resuelve contra este mapa.
 */
export const DASH_ICONS = {
  "bar-chart": BarChart3,
  briefcase: Briefcase,
  building: Building2,
  calendar: CalendarDays,
  compass: Compass,
  "credit-card": CreditCard,
  crown: Crown,
  door: DoorOpen,
  file: FileText,
  globe: Globe,
  heart: Heart,
  inbox: Inbox,
  dashboard: LayoutDashboard,
  support: LifeBuoy,
  settings: Settings,
  tags: Tags,
  user: UserRound,
  users: Users,
  wallet: Wallet,
} as const;

export type DashIconName = keyof typeof DASH_ICONS;
