/**
 * Notification delivery. Every notification is logged; if a webhook URL is
 * configured it's also POSTed there, so a company can wire reminders to their
 * own email service, Slack, or an automation tool without touching the code.
 */
import { config } from "@/lib/config";

export interface Notification {
  to: string;
  subject: string;
  body: string;
}

export async function notify(notification: Notification): Promise<void> {
  console.log(
    `[notification] to=${notification.to} subject="${notification.subject}"`,
  );

  const url = config.notifications.webhookUrl;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(notification),
    });
  } catch (err) {
    console.error("[notification] webhook delivery failed:", err);
  }
}
