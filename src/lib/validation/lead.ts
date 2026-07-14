import { z } from "zod";

export const applySchema = z.object({
  name: z.string().min(2, "Escribe tu nombre completo").max(120),
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "Teléfono inválido").max(20),
  specialty: z.string().min(2, "¿Cuál es tu especialidad?").max(120),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  city: z.string().min(2).max(80),
  preferredDays: z.array(z.string()).min(1, "Elige al menos un día"),
  preferredHours: z.string().min(1, "Elige un horario"),
  weeklySessions: z.coerce.number().int().min(1, "Mínimo 1 sesión").max(80),
  hasClients: z.enum(["yes", "no", "some"]),
  roomPreference: z.enum(["standard", "premium", "studio", "mixed"]),
  interestedPlan: z.enum(["por-hora", "pro", "premium", "unsure"]),
  wantsLocker: z.boolean().optional().default(false),
  startTimeframe: z.enum(["en-cuanto-abra", "1-3-meses", "3-6-meses", "explorando"], {
    message: "¿Cuándo te gustaría empezar?",
  }),
  message: z.string().max(2000).optional(),
  source: z.string().max(60).optional(),
  locationSlug: z.string().max(60).optional(),
  // Atribución de campaña (opcional, la llena el cliente desde la URL)
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  fbclid: z.string().max(255).optional(),
  gclid: z.string().max(255).optional(),
});

export type ApplyInput = z.infer<typeof applySchema>;

export const contactSchema = z.object({
  name: z.string().min(2, "Escribe tu nombre").max(120),
  email: z.string().email("Email inválido"),
  phone: z.string().max(20).optional(),
  message: z.string().min(10, "Cuéntanos un poco más").max(2000),
  source: z.string().max(60).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const micrositeLeadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  message: z.string().min(5).max(2000),
  practitionerSlug: z.string().min(1),
});

export type MicrositeLeadInput = z.infer<typeof micrositeLeadSchema>;
