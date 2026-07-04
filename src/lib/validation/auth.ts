import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Escribe tu nombre").max(120),
  email: z.string().email("Email inválido"),
  phone: z.string().max(20).optional(),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(100),
  accountType: z.enum(["client", "practitioner"]),
  specialty: z.string().max(120).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
