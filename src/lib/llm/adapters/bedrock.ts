import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { config } from "@/lib/config";
import type { LlmProvider, ChatMessage, CompleteOptions } from "../types";

/**
 * AWS Bedrock adapter — the flagship for corporate self-hosting: inference
 * runs inside the company's own AWS account, so training content never
 * leaves their VPC. Uses the model-agnostic Converse API. Credentials come
 * from the instance IAM role. Config: BEDROCK_REGION, BEDROCK_MODEL_ID.
 */

let client: BedrockRuntimeClient | null = null;
function bedrock(): BedrockRuntimeClient {
  client ??= new BedrockRuntimeClient({ region: config.llm.bedrock.region });
  return client;
}

export const bedrockProvider: LlmProvider = {
  name: "bedrock",
  enabled: config.llm.mode === "bedrock",

  async complete(
    messages: ChatMessage[],
    opts?: CompleteOptions,
  ): Promise<string> {
    // Converse keeps system prompts separate from the user/assistant turns.
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => ({ text: m.content }));
    const conversation = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: [{ text: m.content }],
      }));

    const res = await bedrock().send(
      new ConverseCommand({
        modelId: config.llm.bedrock.modelId,
        system: system.length > 0 ? system : undefined,
        messages: conversation,
        inferenceConfig: {
          maxTokens: opts?.maxTokens ?? 2048,
          temperature: opts?.temperature ?? 0.7,
        },
      }),
    );

    return res.output?.message?.content?.[0]?.text ?? "";
  },

  async embed(): Promise<number[][]> {
    throw new Error(
      "Embeddings are not implemented yet (planned for the AI tutor).",
    );
  },
};
