import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createOrg, dropOrg } from "@/test/helpers";
import { dispatchEvent, retryFailedDeliveries } from "@/lib/webhooks";

const SLUG = "itest-webhooks";

let orgId: string;
let server: Server;
let receiverUrl: string;
let received: { event: string; signature: string }[] = [];

beforeAll(async () => {
  orgId = await createOrg(SLUG);

  // A local receiver that records every delivery and answers 200.
  server = createServer((req, res) => {
    received.push({
      event: req.headers["x-karmalms-event"] as string,
      signature: req.headers["x-karmalms-signature"] as string,
    });
    res.statusCode = 200;
    res.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no server address");
  receiverUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await dropOrg(SLUG);
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("webhook delivery (DB)", () => {
  it("delivers an event and logs a successful delivery", async () => {
    received = [];
    await db.insert(schema.webhooks).values({
      orgId,
      url: receiverUrl,
      secret: "test-secret",
    });

    await dispatchEvent(orgId, "course.completed", { courseId: "c-1" });

    expect(received).toHaveLength(1);
    expect(received[0].event).toBe("course.completed");
    expect(received[0].signature).toMatch(/^sha256=/);

    const [delivery] = await db
      .select()
      .from(schema.webhookDeliveries)
      .innerJoin(
        schema.webhooks,
        eq(schema.webhookDeliveries.webhookId, schema.webhooks.id),
      )
      .where(eq(schema.webhooks.orgId, orgId));
    expect(delivery.webhook_deliveries.succeeded).toBe(true);
    expect(delivery.webhook_deliveries.attempts).toBe(1);
  });

  it("records a failed delivery and retries it on the next run", async () => {
    // A webhook pointing at a port nothing listens on — every POST fails.
    const [deadHook] = await db
      .insert(schema.webhooks)
      .values({ orgId, url: "http://127.0.0.1:1/dead", secret: "s" })
      .returning({ id: schema.webhooks.id });

    await dispatchEvent(orgId, "certificate.issued", { certId: "x-1" });

    const failedFilter = and(
      eq(schema.webhookDeliveries.webhookId, deadHook.id),
      eq(schema.webhookDeliveries.event, "certificate.issued"),
    );

    let [delivery] = await db
      .select()
      .from(schema.webhookDeliveries)
      .where(failedFilter);
    expect(delivery.succeeded).toBe(false);
    expect(delivery.attempts).toBe(1);

    const retried = await retryFailedDeliveries();
    expect(retried).toBeGreaterThanOrEqual(1);

    [delivery] = await db
      .select()
      .from(schema.webhookDeliveries)
      .where(failedFilter);
    expect(delivery.succeeded).toBe(false);
    expect(delivery.attempts).toBe(2);
  });
});
