import { describe, it, expect } from "vitest";
import { isUuid, lessonBody } from "./courses";

describe("isUuid", () => {
  it("accepts a valid UUID", () => {
    expect(isUuid("7f326aec-a1e4-4ecb-9e6d-8616236d9736")).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("12345")).toBe(false);
    expect(isUuid("7f326aec-a1e4-4ecb-9e6d")).toBe(false);
  });
});

describe("lessonBody", () => {
  it("returns the body string from the content object", () => {
    expect(lessonBody({ body: "Hello" })).toBe("Hello");
  });

  it("returns an empty string for missing or malformed content", () => {
    expect(lessonBody(null)).toBe("");
    expect(lessonBody(undefined)).toBe("");
    expect(lessonBody({})).toBe("");
    expect(lessonBody({ blocks: ["legacy"] })).toBe("");
  });
});
