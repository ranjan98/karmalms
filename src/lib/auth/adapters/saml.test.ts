import { describe, it, expect } from "vitest";
import { samlAdapter } from "./saml";

describe("samlAdapter", () => {
  it("identifies itself as the saml adapter", () => {
    expect(samlAdapter.name).toBe("saml");
  });

  it("builds a login URL that carries returnTo, URL-encoded", () => {
    expect(samlAdapter.getLoginUrl("/courses/intro")).toBe(
      "/api/auth/saml/login?returnTo=%2Fcourses%2Fintro",
    );
    // Characters that would break the query string are escaped.
    expect(samlAdapter.getLoginUrl("/a b&c")).toBe(
      "/api/auth/saml/login?returnTo=%2Fa%20b%26c",
    );
  });

  it("resolves no user from a request — SAML sessions are cookie-based", async () => {
    const req = new Request("https://example.test/dashboard");
    expect(await samlAdapter.getCurrentUser(req)).toBeNull();
  });
});
