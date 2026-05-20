import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { syncDirectory } from "@/lib/directory/sync";

/**
 * Syncs the HRIS directory into KarmaLMS users. Trigger on a schedule with
 * Authorization: Bearer <CRON_SECRET>. Disabled until CRON_SECRET is set.
 */
export async function POST(req: Request) {
  const secret = config.cronSecret;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await syncDirectory();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
