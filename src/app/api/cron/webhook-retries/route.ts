import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { retryFailedDeliveries } from "@/lib/webhooks";

/**
 * Re-attempts failed webhook deliveries. Trigger on a schedule with
 * Authorization: Bearer <CRON_SECRET>. Disabled until CRON_SECRET is set.
 */
export async function POST(req: Request) {
  const secret = config.cronSecret;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const retried = await retryFailedDeliveries();
  return NextResponse.json({ ok: true, retried });
}
