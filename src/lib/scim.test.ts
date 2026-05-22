import { describe, it, expect } from "vitest";
import {
  scimEmail,
  scimName,
  scimUserNameFilter,
  applyScimPatch,
  toScimUser,
  scimListResponse,
} from "./scim";

describe("scimEmail", () => {
  it("prefers a userName that looks like an email", () => {
    expect(scimEmail({ userName: "Ada@Example.com" })).toBe("ada@example.com");
  });

  it("falls back to the primary email, then the first", () => {
    expect(
      scimEmail({
        emails: [
          { value: "alt@example.com" },
          { value: "main@example.com", primary: true },
        ],
      }),
    ).toBe("main@example.com");
    expect(scimEmail({ emails: [{ value: "first@example.com" }] })).toBe(
      "first@example.com",
    );
  });

  it("returns an empty string when nothing usable is present", () => {
    expect(scimEmail({ userName: "not-an-email" })).toBe("");
    expect(scimEmail(null)).toBe("");
  });
});

describe("scimName", () => {
  it("prefers displayName", () => {
    expect(scimName({ displayName: "  Ada Lovelace " })).toBe("Ada Lovelace");
  });

  it("joins given and family name when there is no displayName", () => {
    expect(
      scimName({ name: { givenName: "Ada", familyName: "Lovelace" } }),
    ).toBe("Ada Lovelace");
  });

  it("returns null when no name is present", () => {
    expect(scimName({})).toBeNull();
    expect(scimName(null)).toBeNull();
  });
});

describe("scimUserNameFilter", () => {
  it("extracts the userName from an eq filter", () => {
    expect(scimUserNameFilter('userName eq "Ada@Example.com"')).toBe(
      "ada@example.com",
    );
  });

  it("returns null for an absent or unrecognized filter", () => {
    expect(scimUserNameFilter(null)).toBeNull();
    expect(scimUserNameFilter('displayName eq "Ada"')).toBeNull();
  });
});

describe("applyScimPatch", () => {
  it("reads active and displayName from path-based operations", () => {
    expect(
      applyScimPatch({
        Operations: [
          { path: "active", value: "false" },
          { path: "displayName", value: "New Name" },
        ],
      }),
    ).toEqual({ active: false, name: "New Name" });
  });

  it("reads a no-path operation whose value is an object", () => {
    expect(
      applyScimPatch({
        Operations: [{ value: { active: true, displayName: "Patched" } }],
      }),
    ).toEqual({ active: true, name: "Patched" });
  });

  it("returns an empty object when there are no operations", () => {
    expect(applyScimPatch({})).toEqual({});
    expect(applyScimPatch({ Operations: "nope" })).toEqual({});
  });
});

describe("toScimUser / scimListResponse", () => {
  const user = {
    id: "user-1",
    email: "ada@example.com",
    name: "Ada Lovelace",
    active: true,
  };

  it("maps a user to a SCIM User resource", () => {
    const resource = toScimUser(user);
    expect(resource.id).toBe("user-1");
    expect(resource.userName).toBe("ada@example.com");
    expect(resource.emails).toEqual([
      { value: "ada@example.com", primary: true },
    ]);
    expect(resource.active).toBe(true);
  });

  it("wraps users in a SCIM ListResponse with totals", () => {
    const list = scimListResponse([user]);
    expect(list.totalResults).toBe(1);
    expect(list.itemsPerPage).toBe(1);
    expect(list.Resources).toHaveLength(1);
  });
});
