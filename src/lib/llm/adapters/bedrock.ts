import { config } from "@/lib/config";
import type { LlmProvider, ChatMessage, CompleteOptions } from "../types";

/**
 * AWS Bedrock adapter.
 *
 * The flagship adapter for corporate self-hosting: inference runs inside the
 * company's own AWS account, so training content and learner data never leave
 * their VPC. Config: BEDROCK_REGION, BEDROCK_MODEL_ID. Credentials come from
 * the instance IAM role.
 *
 * STUB: wire up @aws-sdk/client-bedrock-runtime InvokeModelCommand and map the
 * model's request/response shape. See docs/ai.md.
 */
export const bedrockProvider: LlmProvider = {
  name: "bedrock",
  enabled: config.llm.mode === "bedrock",

  async complete(_messages: ChatMessage[], _opts?: CompleteOptions): Promise<string> {
    // TODO: BedrockRuntimeClient.send(new InvokeModelCommand({ ... }))
    throw new Error("bedrock.complete not yet implemented");
  },

  async embed(_texts: string[]): Promise<number[][]> {
    // TODO: invoke an embedding model (e.g. amazon.titan-embed-text-v2).
    throw new Error("bedrock.embed not yet implemented");
  },
};
