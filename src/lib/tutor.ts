/**
 * AI tutor — retrieval-augmented Q&A grounded in a course's lessons.
 *
 * Each lesson is embedded into a vector (stored on `lessons.embedding`).
 * A question is embedded, the most similar lessons are retrieved by cosine
 * similarity, and the LLM answers using only that material.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { llm } from "@/lib/llm";
import { listLessons, lessonBody } from "@/lib/courses";

/** Cosine similarity of two vectors; 0 when either has no magnitude. */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function lessonText(title: string, content: unknown): string {
  return `# ${title}\n\n${lessonBody(content)}`.trim();
}

/** Re-embeds every non-empty lesson so the tutor can retrieve them. */
export async function rebuildTutorIndex(courseId: string): Promise<number> {
  const lessons = await listLessons(courseId);
  const indexable = lessons.filter(
    (l) => lessonBody(l.content).trim().length > 0,
  );
  if (indexable.length === 0) return 0;

  const embeddings = await llm.embed(
    indexable.map((l) => lessonText(l.title, l.content)),
  );

  for (let i = 0; i < indexable.length; i++) {
    await db
      .update(schema.lessons)
      .set({ embedding: embeddings[i] })
      .where(eq(schema.lessons.id, indexable[i].id));
  }
  return indexable.length;
}

export interface TutorAnswer {
  answer: string;
  sources: string[];
}

/** Answers a question using only the course's lesson content (RAG). */
export async function askTutor(
  courseId: string,
  question: string,
): Promise<TutorAnswer> {
  const lessons = await listLessons(courseId);
  const indexed = lessons.filter((l) => Array.isArray(l.embedding));
  if (indexed.length === 0) {
    return {
      answer:
        "The AI tutor isn't ready for this course yet — an admin needs to build its index.",
      sources: [],
    };
  }

  const [questionEmbedding] = await llm.embed([question]);
  const top = indexed
    .map((l) => ({
      lesson: l,
      score: cosineSimilarity(questionEmbedding, l.embedding as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const context = top
    .map((t) => lessonText(t.lesson.title, t.lesson.content))
    .join("\n\n---\n\n");

  const answer = await llm.complete(
    [
      {
        role: "system",
        content:
          "You are a helpful tutor for a training course. Answer the " +
          "learner's question using ONLY the course material provided. If " +
          "the material does not cover it, say so plainly. Be concise.",
      },
      {
        role: "user",
        content: `Course material:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
    { maxTokens: 600, temperature: 0.2 },
  );

  return { answer, sources: top.map((t) => t.lesson.title) };
}
