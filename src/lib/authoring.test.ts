import { describe, it, expect } from "vitest";
import { parseDraft } from "./authoring";

const validDraft = JSON.stringify({
  lessons: [
    { title: "Lesson one", body: "First body" },
    { title: "Lesson two", body: "Second body" },
  ],
  quiz: [{ prompt: "Question?", options: ["a", "b", "c", "d"], correctIndex: 2 }],
});

describe("parseDraft", () => {
  it("parses a clean JSON draft", () => {
    const draft = parseDraft(validDraft);
    expect(draft.lessons).toHaveLength(2);
    expect(draft.lessons[0].title).toBe("Lesson one");
    expect(draft.quiz[0].correctIndex).toBe(2);
  });

  it("strips a ```json code fence", () => {
    expect(parseDraft("```json\n" + validDraft + "\n```").lessons).toHaveLength(
      2,
    );
  });

  it("tolerates prose around the JSON", () => {
    const wrapped = `Here is the course:\n${validDraft}\nHope this helps!`;
    expect(parseDraft(wrapped).lessons).toHaveLength(2);
  });

  it("drops quiz questions that lack four options", () => {
    const draft = parseDraft(
      JSON.stringify({
        lessons: [{ title: "L", body: "B" }],
        quiz: [
          { prompt: "ok", options: ["a", "b", "c", "d"], correctIndex: 0 },
          { prompt: "bad", options: ["a", "b"], correctIndex: 0 },
        ],
      }),
    );
    expect(draft.quiz).toHaveLength(1);
  });

  it("clamps an out-of-range correctIndex to 0", () => {
    const draft = parseDraft(
      JSON.stringify({
        lessons: [{ title: "L", body: "B" }],
        quiz: [{ prompt: "q", options: ["a", "b", "c", "d"], correctIndex: 9 }],
      }),
    );
    expect(draft.quiz[0].correctIndex).toBe(0);
  });

  it("throws when the response contains no JSON", () => {
    expect(() => parseDraft("Sorry, I can't help with that.")).toThrow();
  });

  it("throws when there are no usable lessons", () => {
    expect(() =>
      parseDraft(JSON.stringify({ lessons: [], quiz: [] })),
    ).toThrow();
  });
});
