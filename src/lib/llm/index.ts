import { config } from "@/lib/config";
import type { LlmProvider, ChatMessage } from "./types";
import { bedrockProvider } from "./adapters/bedrock";
import { openaiProvider } from "./adapters/openai";

/** A no-op provider so the app runs fine with AI switched off. */
const disabledProvider: LlmProvider = {
  name: "none",
  enabled: false,
  async complete(): Promise<string> {
    throw new Error("No LLM provider configured (set LLM_MODE).");
  },
  async embed(): Promise<number[][]> {
    throw new Error("No LLM provider configured (set LLM_MODE).");
  },
};

function resolveProvider(): LlmProvider {
  switch (config.llm.mode) {
    case "bedrock":
      return bedrockProvider;
    case "openai":
      return openaiProvider;
    case "none":
    default:
      return disabledProvider;
  }
}

export const llm: LlmProvider = resolveProvider();
export type { LlmProvider, ChatMessage } from "./types";
