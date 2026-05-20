import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { sendCertificationReminders } from "@/lib/reminders";

/**
 * Sends due certification lapse reminders. Trigger this on a schedule (cron,
 * GitHub Actions, any scheduler) with: Authorization: Bearer <CRON_SECRET>.
 * Disabled until CRON_SECRET is set.
 */
export async function POST(req: Request) {
  const secret = config.cronSecret;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const remindersSent = await sendCertificationReminders();
  return NextResponse.json({ ok: true, remindersSent });
}
