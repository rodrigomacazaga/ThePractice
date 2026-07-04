/**
 * Configuración de marca y navegación.
 * El contenido operativo (precios, planes, salas) vive en la base de datos
 * y se administra desde el panel admin — aquí solo va lo estructural.
 */

export const site = {
  name: "The Practice",
  tagline: "Private Practice Spaces",
  description:
    "Espacios privados premium y herramientas digitales para terapeutas, coaches, nutriólogos y profesionales del bienestar. Lanza y opera tu práctica privada sin renta fija.",
  domain: "thepractice.mx",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://thepractice.mx",
  email: "hola@thepractice.mx",
  phone: "+52 442 000 0000",
  instagram: "https://instagram.com/thepractice.mx",
} as const;

export const mainNav = [
  { label: "Para profesionales", href: "/for-practitioners" },
  { label: "Para clientes", href: "/for-clients" },
  { label: "Membresías", href: "/memberships" },
  { label: "Salas", href: "/rooms" },
  { label: "Ubicaciones", href: "/locations" },
  { label: "Directorio", href: "/directory" },
] as const;

export const footerNav = {
  producto: [
    { label: "Cómo funciona", href: "/how-it-works" },
    { label: "Membresías", href: "/memberships" },
    { label: "Salas", href: "/rooms" },
    { label: "Ubicaciones", href: "/locations" },
    { label: "Directorio", href: "/directory" },
  ],
  profesionales: [
    { label: "Aplicar como practitioner", href: "/apply" },
    { label: "Membresías founder — La Ceiba", href: "/la-ceiba" },
    { label: "Preguntas frecuentes", href: "/faq" },
  ],
  empresa: [
    { label: "Nosotros", href: "/about" },
    { label: "Contacto", href: "/contact" },
  ],
  legal: [
    { label: "Términos de uso", href: "/legal/terms" },
    { label: "Aviso de privacidad", href: "/legal/privacy" },
    { label: "Política de cancelación", href: "/legal/cancellation" },
  ],
} as const;
