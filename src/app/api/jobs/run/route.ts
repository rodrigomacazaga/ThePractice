import { NextRequest, NextResponse } from "next/server";
import { runJob, ALL_JOBS, type JobName } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * Endpoint de jobs para cron externo / Netlify Scheduled Functions.
 * Protegido con CRON_SECRET (header Authorization: Bearer <secret>).
 *
 * POST /api/jobs/run            → corre todos los jobs
 * POST /api/jobs/run?job=<name> → corre uno específico
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const jobParam = req.nextUrl.searchParams.get("job") as JobName | null;
  const jobs = jobParam && ALL_JOBS.includes(jobParam) ? [jobParam] : ALL_JOBS;

  const results = [];
  for (const job of jobs) {
    try {
      results.push(await runJob(job));
    } catch (err) {
      console.error(`[jobs] ${job} failed:`, err);
      results.push({ job, processed: 0, detail: `error: ${String(err)}` });
    }
  }

  return NextResponse.json({ ok: true, results });
}
