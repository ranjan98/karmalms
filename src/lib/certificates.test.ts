import { describe, it, expect } from "vitest";
import { certStatus } from "./certificates";

const DAY = 86_400_000;

describe("certStatus", () => {
  it("is valid when expiry is comfortably in the future", () => {
    expect(certStatus(new Date(Date.now() + 200 * DAY))).toBe("valid");
  });

  it("is expiring within the 30-day window", () => {
    expect(certStatus(new Date(Date.now() + 10 * DAY))).toBe("expiring");
  });

  it("is expired once the date has passed", () => {
    expect(certStatus(new Date(Date.now() - DAY))).toBe("expired");
  });
});
