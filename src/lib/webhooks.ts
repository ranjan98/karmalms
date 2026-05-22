/**
 * Outbound webhooks. An org registers URLs; KarmaLMS POSTs signed event
 * payloads to them when something happens, so external systems (HRIS,
 * Slack, automation) integrate without forking.
 *
 * Every delivery is recorded in `webhook_deliveries` — that table is both the
 * delivery log and the retry queue. Failed deliveries are re-attempted by the
 * /api/cron/webhook-retries job until they succeed or hit MAX_ATTEMPTS.
 */
import crypto from "node:crypto";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type WebhookEvent = "course.completed" | "certificate.issued";

const MAX_ATTEMPTS = 5;

/** Generates a webhook signing secret. */
export function newWebhookSecret(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function listWebhooks(orgId: string) {
  return db
    .select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.orgId, orgId))
    .orderBy(schema.webhooks.createdAt);
}

/**
 * Recent webhook deliveries for an org — the delivery log, newest first.
 * Each row is joined to its webhook so the UI can show the target URL.
 */
export async function listRecentDeliveries(orgId: string, limit = 25) {
  return db
    .select({
      id: schema.webhookDeliveries.id,
      event: schema.webhookDeliveries.event,
      succeeded: schema.webhookDeliveries.succeeded,
      attempts: schema.webhookDeliveries.attempts,
      lastAttemptAt: schema.webhookDeliveries.lastAttemptAt,
      createdAt: schema.webhookDeliveries.createdAt,
      url: schema.webhooks.url,
    })
    .from(schema.webhookDeliveries)
    .innerJoin(
      schema.webhooks,
      eq(schema.webhookDeliveries.webhookId, schema.webhooks.id),
    )
    .where(eq(schema.webhooks.orgId, orgId))
    .orderBy(desc(schema.webhookDeliveries.createdAt))
    .limit(limit);
}

/** Whether a failed delivery has exhausted its retry budget. */
export function isDeliveryGivenUp(d: {
  succeeded: boolean;
  attempts: number;
}): boolean {
  return !d.succeeded && d.attempts >= MAX_ATTEMPTS;
}

/** POSTs one delivery (HMAC-signed) and records the outcome on its row. */
async function attemptDelivery(args: {
  deliveryId: string;
  url: string;
  secret: string;
  event: string;
  payload: unknown;
}): Promise<void> {
  const body = JSON.stringify({
    type: args.event,
    payload: args.payload,
    timestamp: new Date().toISOString(),
  });
  const signature = crypto
    .createHmac("sha256", args.secret)
    .update(body)
    .digest("hex");

  let succeeded = false;
  try {
    const res = await fetch(args.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-karmalms-event": args.event,
        "x-karmalms-signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    succeeded = res.ok;
  } catch {
    succeeded = false;
  }

  await db
    .update(schema.webhookDeliveries)
    .set({
      succeeded,
      attempts: sql`${schema.webhookDeliveries.attempts} + 1`,
      lastAttemptAt: new Date(),
    })
    .where(eq(schema.webhookDeliveries.id, args.deliveryId));
}

/**
 * Delivers an event to every active webhook for an org. Fire-and-forget:
 * callers should `void` this so a slow endpoint never blocks a user action.
 * Each delivery is logged; failures are retried by the cron job.
 */
export async function dispatchEvent(
  orgId: string,
  type: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const hooks = await db
    .select()
    .from(schema.webhooks)
    .where(
      and(eq(schema.webhooks.orgId, orgId), eq(schema.webhooks.active, true)),
    );

  for (const hook of hooks) {
    const [delivery] = await db
      .insert(schema.webhookDeliveries)
      .values({ webhookId: hook.id, event: type, payload })
      .returning({ id: schema.webhookDeliveries.id });

    await attemptDelivery({
      deliveryId: delivery.id,
      url: hook.url,
      secret: hook.secret,
      event: type,
      payload,
    });
  }
}

/** Re-attempts failed deliveries that are still under the attempt cap. */
export async function retryFailedDeliveries(): Promise<number> {
  const due = await db
    .select({
      id: schema.webhookDeliveries.id,
      event: schema.webhookDeliveries.event,
      payload: schema.webhookDeliveries.payload,
      url: schema.webhooks.url,
      secret: schema.webhooks.secret,
    })
    .from(schema.webhookDeliveries)
    .innerJoin(
      schema.webhooks,
      eq(schema.webhookDeliveries.webhookId, schema.webhooks.id),
    )
    .where(
      and(
        eq(schema.webhookDeliveries.succeeded, false),
        lt(schema.webhookDeliveries.attempts, MAX_ATTEMPTS),
      ),
    );

  for (const d of due) {
    await attemptDelivery({
      deliveryId: d.id,
      url: d.url,
      secret: d.secret,
      event: d.event,
      payload: d.payload,
    });
  }
  return due.length;
}
