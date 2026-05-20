/**
 * Outbound webhooks. An org registers URLs; KarmaLMS POSTs signed event
 * payloads to them when something happens, so external systems (HRIS,
 * Slack, automation) integrate without forking.
 */
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type WebhookEvent = "course.completed" | "certificate.issued";

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
 * Delivers an event to every active webhook for an org. Fire-and-forget:
 * callers should `void` this so a slow endpoint never blocks a user action.
 * Each delivery is HMAC-SHA256 signed with the webhook's secret.
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
  if (hooks.length === 0) return;

  const body = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });

  await Promise.allSettled(
    hooks.map(async (hook) => {
      const signature = crypto
        .createHmac("sha256", hook.secret)
        .update(body)
        .digest("hex");
      try {
        await fetch(hook.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-karmalms-event": type,
            "x-karmalms-signature": `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(5000),
        });
      } catch (err) {
        console.error(`[webhook] delivery to ${hook.url} failed:`, err);
      }
    }),
  );
}
