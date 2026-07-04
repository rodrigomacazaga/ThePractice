import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Zona horaria operativa por defecto. Cada Location tiene la suya en DB. */
export const MX_TZ = "America/Mexico_City";

/** Formatea centavos como MXN: 490000 -> "$4,900" */
export function formatMXN(cents: number, opts?: { decimals?: boolean }) {
  const amount = cents / 100;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(amount);
}

/** Formatea créditos: 1.5 -> "1.5", 2 -> "2" */
export function formatCredits(credits: number) {
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(1);
}

/** Fecha corta en horario de México: "mié 3 jul, 16:00" */
export function formatDateTimeMX(date: Date, timezone: string = MX_TZ) {
  const tz = new TZDate(date, timezone);
  return format(tz, "EEE d MMM, HH:mm", { locale: es });
}

export function formatDateMX(date: Date, timezone: string = MX_TZ) {
  const tz = new TZDate(date, timezone);
  return format(tz, "EEEE d 'de' MMMM", { locale: es });
}

export function formatTimeMX(date: Date, timezone: string = MX_TZ) {
  const tz = new TZDate(date, timezone);
  return format(tz, "HH:mm", { locale: es });
}

/** Genera un código corto de reserva: "TP-8F3K2" */
export function generateBookingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TP-${code}`;
}

/** Genera un código de acceso de 6 dígitos (simulado; futuro: smart locks). */
export function generateAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Slugifica nombres: "Ana García" -> "ana-garcia" */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Rango de horas [7, 22] -> ["07:00", ..., "21:00"] como inicios de bloque */
export function hourRange(openingHour: number, closingHour: number) {
  const hours: number[] = [];
  for (let h = openingHour; h < closingHour; h++) hours.push(h);
  return hours;
}

export function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}
