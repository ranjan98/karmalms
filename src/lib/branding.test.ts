import { describe, it, expect } from "vitest";
import { safeColor } from "./branding";

describe("safeColor", () => {
  it("accepts valid hex colors", () => {
    expect(safeColor("#4f46e5", "#000")).toBe("#4f46e5");
    expect(safeColor("#abc", "#000")).toBe("#abc");
    expect(safeColor("#AABBCC", "#000")).toBe("#AABBCC");
  });

  it("trims surrounding whitespace", () => {
    expect(safeColor("  #123456  ", "#000")).toBe("#123456");
  });

  it("rejects non-hex values and falls back", () => {
    expect(safeColor("red", "#000")).toBe("#000");
    expect(safeColor("", "#000")).toBe("#000");
    expect(safeColor("javascript:alert(1)", "#000")).toBe("#000");
    expect(safeColor("#xyz", "#000")).toBe("#000");
  });

  it("rejects non-string input and falls back", () => {
    expect(safeColor(null, "#000")).toBe("#000");
    expect(safeColor(undefined, "#000")).toBe("#000");
    expect(safeColor(123, "#000")).toBe("#000");
  });
});
