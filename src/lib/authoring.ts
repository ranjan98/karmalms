/**
 * AI course authoring — turns a pasted document into draft lessons and quiz
 * questions via the configured LLM provider. The result is appended to a
 * course for an admin to review and edit.
 */
import { llm } from "@/lib/llm";

export interface CourseDraft {
  lessons: { title: string; body: string }[];
  quiz: { prompt: string; options: string[]; correctIndex: number }[];
}

const SYSTEM_PROMPT = `You are an instructional designer for a corporate LMS.
Given a source document, produce a concise, practical training course.

Respond with ONLY valid JSON — no markdown fences, no commentary — in exactly
this shape:
{
  "lessons": [{ "title": "string", "body": "string (Markdown)" }],
  "quiz": [{ "prompt": "string", "options": ["a","b","c","d"], "correctIndex": 0 }]
}

Rules:
- 3 to 6 lessons; each "body" is a few short Markdown paragraphs (headings,
  lists, and bold are encouraged).
- 3 to 5 quiz questions; each has exactly 4 options; "correctIndex" is 0-3.
- Base everything on the source document; do not invent unrelated material.`;

export async function generateCourseDraft(
  document: string,
): Promise<CourseDraft> {
  const raw = await llm.complete(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Source document:\n\n${document}` },
    ],
    { maxTokens: 3000, temperature: 0.4 },
  );
  return parseDraft(raw);
}

/** Extracts and validates the course JSON from the model's response. */
function parseDraft(raw: string): CourseDraft {
  let text = raw.trim();

  // Strip a ```json ... ``` fence if the model added one.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();

  // Narrow to the outermost JSON object.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("The AI did not return a course in the expected format.");
  }

  let parsed: { lessons?: unknown; quiz?: unknown };
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("The AI response could not be parsed. Try again.");
  }

  const lessons = (Array.isArray(parsed.lessons) ? parsed.lessons : [])
    .map((l) => l as Record<string, unknown>)
    .filter((l) => typeof l.title === "string" && typeof l.body === "string")
    .map((l) => ({ title: String(l.title), body: String(l.body) }));

  const quiz = (Array.isArray(parsed.quiz) ? parsed.quiz : [])
    .map((q) => q as Record<string, unknown>)
    .filter(
      (q) =>
        typeof q.prompt === "string" &&
        Array.isArray(q.options) &&
        q.options.length >= 4,
    )
    .map((q) => {
      const idx = Number(q.correctIndex);
      return {
        prompt: String(q.prompt),
        options: (q.options as unknown[]).slice(0, 4).map((o) => String(o)),
        correctIndex: Number.isInteger(idx) && idx >= 0 && idx <= 3 ? idx : 0,
      };
    });

  if (lessons.length === 0) {
    throw new Error("The AI returned no usable lessons. Try again.");
  }
  return { lessons, quiz };
}
