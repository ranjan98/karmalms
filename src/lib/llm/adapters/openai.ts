import { config } from "@/lib/config";
import type { LlmProvider, ChatMessage, CompleteOptions } from "../types";

/**
 * OpenAI-compatible adapter — talks to any service that implements the
 * OpenAI Chat Completions API: OpenAI itself, Azure OpenAI, OpenRouter, or a
 * local Ollama / vLLM server. Configured by OPENAI_API_KEY / OPENAI_BASE_URL
 * / OPENAI_MODEL. Uses plain fetch — no SDK dependency.
 */
export const openaiProvider: LlmProvider = {
  name: "openai",
  enabled: config.llm.mode === "openai" && Boolean(config.llm.openai.apiKey),

  async complete(
    messages: ChatMessage[],
    opts?: CompleteOptions,
  ): Promise<string> {
    const { baseUrl, apiKey, model } = config.llm.openai;
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts?.temperature ?? 0.7,
        max_tokens: opts?.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `LLM request failed (${res.status}): ${await res.text()}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  },

  async embed(texts: string[]): Promise<number[][]> {
    const { baseUrl, apiKey, embedModel } = config.llm.openai;
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: embedModel, input: texts }),
    });
    if (!res.ok) {
      throw new Error(
        `Embedding request failed (${res.status}): ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { data?: { embedding: number[] }[] };
    return (data.data ?? []).map((d) => d.embedding);
  },
};
