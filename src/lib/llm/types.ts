/**
 * LLM provider contract.
 *
 * Same bring-your-own pattern as auth and storage. A company points KarmaLMS
 * at AWS Bedrock (runs in their own account — data never leaves their VPC),
 * an OpenAI-compatible API, or a self-hosted model. No provider configured =>
 * AI features degrade gracefully and simply hide.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface LlmProvider {
  readonly name: string;

  /** True when the provider is configured and AI features should show. */
  readonly enabled: boolean;

  /** Single completion — used by course authoring, quiz generation, grading. */
  complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string>;

  /** Embeddings for RAG (the AI tutor grounds answers in course content). */
  embed(texts: string[]): Promise<number[][]>;
}
