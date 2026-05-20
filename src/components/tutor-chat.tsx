"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "you" | "tutor";
  text: string;
}

/** A chat box that answers questions grounded in the course's lessons. */
export function TutorChat({ courseId }: { courseId: string }) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: "you", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, question: q }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "tutor", text: data.answer ?? data.error ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "tutor", text: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border p-3">
      {messages.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {messages.map((m, i) => (
            <div key={i} className="text-sm">
              <span
                className={cn(
                  "mr-1.5 text-xs font-semibold",
                  m.role === "you" ? "text-muted-foreground" : "text-primary",
                )}
              >
                {m.role === "you" ? "You" : "Tutor"}
              </span>
              <span className="whitespace-pre-wrap">{m.text}</span>
            </div>
          ))}
          {loading && (
            <p className="text-muted-foreground text-sm">Tutor is thinking…</p>
          )}
        </div>
      )}
      <form onSubmit={ask} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this course…"
        />
        <Button type="submit" disabled={loading}>
          Ask
        </Button>
      </form>
    </div>
  );
}
