/**
 * Genera las imágenes del sitio con Nano Banana (Gemini image generation).
 *
 * Uso:
 *   GEMINI_API_KEY=xxx node scripts/generate-images.mjs
 *
 * Guarda PNGs en public/images/. Dirección de arte alineada al brand:
 * minimalismo cálido, paleta ink/paper/clay, arquitectónico, luz cálida,
 * sin clichés médicos ni de spa.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Falta GEMINI_API_KEY");
  process.exit(1);
}

// nano banana = gemini-2.5-flash-image
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const OUT_DIR = path.join(process.cwd(), "public", "images");

/**
 * Estilo base compartido para consistencia entre todas las imágenes.
 * Nada de personas identificables ni texto/logos en la escena.
 */
const STYLE = `Professional interior architecture photography, photorealistic.
Warm minimalism: warm charcoal (#1b1916), ivory/paper walls (#f6f3ee), warm oak wood,
one muted terracotta clay accent element only. Soft warm natural light from a side window,
golden hour glow, subtle shadows. Clean lines, architectural, premium but human and serene.
High-end interior design magazine quality. No people, no text, no logos, no signage.
Aspect ratio 3:2, eye-level shot on a 35mm lens.`;

const IMAGES = [
  {
    file: "room-talk.png",
    prompt: `${STYLE}
A small private therapy room for one-on-one conversation: two comfortable mid-century
armchairs in warm boucle fabric facing each other at a slight angle, a small round oak
side table between them with a carafe of water and a small ceramic cup, a soft wool rug,
a floor lamp with warm light, one large-leaf potted plant in the corner, acoustic wall
panel in warm fabric. Intimate, calm, private atmosphere.`,
  },
  {
    file: "room-consult.png",
    prompt: `${STYLE}
A private nutrition consultation room: a clean oak desk with two upholstered chairs for
clients on one side and a professional chair on the other, closed white storage cabinet,
a subtle professional scale beside the wall, warm pendant light over the desk, a framed
abstract line-art print on the wall. Professional, orderly, welcoming — clearly a private
practice office, not a hospital.`,
  },
  {
    file: "room-premium.png",
    prompt: `${STYLE}
A spacious premium therapy suite for couples therapy and executive coaching: a deep
three-seat sofa in warm ivory fabric, two elegant armchairs, a low walnut coffee table
with a ceramic vase, layered lighting with wall sconces, heavy acoustic curtains,
a large abstract textile artwork in clay and sand tones, wide oak flooring. Generous
negative space, quietly luxurious, serene.`,
  },
  {
    file: "room-studio.png",
    prompt: `${STYLE}
A bright workshop studio for small group sessions of eight people: light modular oak
tables arranged in an open U shape with comfortable chairs, a large blank whiteboard on
the wall, a ceiling-mounted projector, floor cushions stacked neatly in a corner for
mindfulness sessions, tall windows with sheer curtains, warm linear pendant lighting.
Flexible, calm, professional group space.`,
  },
  {
    file: "common-area.png",
    prompt: `${STYLE}
The common lounge and waiting area of a premium private-practice space: a small warm
reception nook with an oak counter (no signage), two lounge chairs and a small sofa
around a low table, a self-serve coffee station with a chemex and ceramic mugs on a
walnut sideboard, a corridor with several closed wooden doors to private rooms visible
in the background, one tall plant, soft ambient lighting. Feels like a calm boutique
members club, not a clinic waiting room.`,
  },
  {
    file: "hero-space.png",
    prompt: `${STYLE}
Wide establishing interior of a premium private practice space seen from the common area:
warm corridor with a row of elegant closed oak doors each with a small round brass number
disc, warm wall washers lighting each door, polished concrete floor with a long wool
runner rug, at the end of the corridor a floor-to-ceiling window with soft daylight and
a bench with a plant beside it. Architectural depth, calm rhythm of doors, premium and
serene — the feeling of many private practices under one roof.`,
  },
  {
    file: "room-restore.png",
    prompt: `${STYLE}
A private restorative room for massage and deep relaxation: two elegant reclining
zero-gravity lounge chairs in warm ivory boucle upholstery, side by side at a gentle
angle, each with a soft folded blanket in sand tone, a low oak side table between them
with neatly rolled towels and two small ceramic bottles (no labels), dimmed warm lighting
from a paper floor lamp, heavy acoustic curtains in warm taupe, wide oak flooring.
On the wall: a single framed print with ONE simple horizontal arched line (minimal line
art, one stroke only). Premium living-room serenity — NOT a spa cliché: no candles,
no stones, no orchids, no massage table.`,
  },
  {
    file: "room-movement.png",
    prompt: `${STYLE}
A boutique movement studio for barre and low-impact group classes: warm oak wood floor,
one full wall covered by a large seamless mirror with a natural oak ballet barre mounted
across it, tall windows with sheer curtains letting in soft daylight, warm linear pendant
lights, folded sand-colored yoga mats neatly stacked on an oak shelf, a few small pilates
props in a woven basket in the corner. Spacious, calm, premium — a boutique barre studio,
not a gym.`,
  },
  {
    file: "lounge-la-ceiba.png",
    prompt: `Professional architectural photography of a premium indoor-outdoor members lounge
terrace, photorealistic, magazine quality. Warm minimalism: warm oak wood, ivory upholstery,
warm charcoal accents, one muted terracotta clay accent. A spacious 150 sqm rooftop terrace
lounge with: comfortable low lounge sofas and armchairs in warm ivory around low oak coffee
tables, a small oak coffee bar with a chemex and ceramic cups in the corner, abundant lush
green plants and a living green wall, a wooden slatted pergola overhead casting soft striped
shadows, a couple of oak work tables with a single laptop for working between sessions,
warm string lights and a paper lantern, soft golden hour daylight. Calm, sophisticated,
like a Soho House terrace but Muji-calm and warm. No people, no text, no logos, no signage.
Aspect ratio 3:2, eye-level shot on a 35mm lens.`,
  },
];

// Filtro opcional: node scripts/generate-images.mjs room-restore room-movement
const filter = process.argv.slice(2);
const TO_GENERATE = filter.length
  ? IMAGES.filter((i) => filter.some((f) => i.file.includes(f)))
  : IMAGES;

async function generate(item) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: item.prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "3:2" },
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`${item.file}: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) {
    throw new Error(`${item.file}: sin imagen en la respuesta — ${JSON.stringify(data).slice(0, 300)}`);
  }

  const buffer = Buffer.from(part.inlineData.data, "base64");
  await writeFile(path.join(OUT_DIR, item.file), buffer);
  console.log(`✓ ${item.file} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

await mkdir(OUT_DIR, { recursive: true });
console.log(`Generando ${TO_GENERATE.length} imágenes con ${MODEL}…\n`);

for (const item of TO_GENERATE) {
  try {
    await generate(item);
  } catch (err) {
    console.error(`✗ ${err.message}`);
  }
}
console.log("\nListo. Revisa public/images/");
