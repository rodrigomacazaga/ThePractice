import { z } from "zod";

/**
 * Contenido de la landing comercial de una ubicación.
 *
 * Nada de esto vive en código: una sede es un registro en la base y su landing
 * también. Los bloques son genéricos a propósito para que cualquier sede futura
 * arme la suya sin programar.
 */

export const LANDING_SECTION_TYPES = [
  ["problem", "Problema del profesional"],
  ["solution", "Qué resuelve la sede"],
  ["highlight", "Diferenciador (espacio destacado)"],
  ["benefits", "Beneficios"],
  ["comparison", "Comparación económica"],
  ["process", "Cómo funciona"],
  ["faq", "Preguntas frecuentes"],
] as const;

export type LandingSectionType = (typeof LANDING_SECTION_TYPES)[number][0];

export const landingSectionSchema = z.object({
  type: z.enum(["problem", "solution", "highlight", "benefits", "comparison", "process", "faq"]),
  title: z.string().max(160).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().max(500).optional(),
  /** Puntos del bloque. En "faq" cada item usa title como pregunta. */
  items: z
    .array(
      z.object({
        title: z.string().max(200).optional(),
        text: z.string().max(2000).optional(),
      })
    )
    .max(30)
    .optional(),
  /** Solo para "comparison": las dos columnas a contrastar. */
  columns: z
    .array(z.object({ title: z.string().max(120), items: z.array(z.string().max(200)).max(20) }))
    .max(2)
    .optional(),
});

export type LandingSection = z.infer<typeof landingSectionSchema>;

export const landingSectionsSchema = z.array(landingSectionSchema).max(20);

/**
 * Lee las secciones guardadas como JSON. Si el contenido está corrupto o es de
 * una versión anterior, devuelve vacío en vez de romper la página pública.
 */
export function parseLandingSections(value: unknown): LandingSection[] {
  const parsed = landingSectionsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export const SECTION_LABEL: Record<string, string> = Object.fromEntries(LANDING_SECTION_TYPES);
