import { describe, it, expect } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  type SessionUser,
} from "./session-token";

const user: SessionUser = {
  id: "user-1",
  email: "avery@acme.test",
  name: "Avery Admin",
  role: "admin",
  orgId: "org-1",
  orgSlug: "acme",
  sessionEpoch: 0,
};

describe("session token", () => {
  it("round-trips a signed session user", async () => {
    const token = await signSessionToken(user);
    expect(await verifySessionToken(token)).toEqual(user);
  });

  it("returns null for a malformed token", async () => {
    expect(await verifySessionToken("not.a.jwt")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const token = await signSessionToken(user);
    const tampered = `${token.slice(0, -4)}AAAA`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });
});
