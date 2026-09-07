/**
 * The only way the rest of the app talks to a chat model. Swap Gemini, OpenAI or Anthropic by
 * changing `AI_PROVIDER` — parsers and planners never import a vendor SDK.
 */
export type JsonSchema = Record<string, unknown>;

export type GenerateJsonInput = {
  /** JSON Schema the model must satisfy. Validated again with Zod after the call. */
  jsonSchema: JsonSchema;
  system: string;
  prompt: string;
};

export type GenerateJsonResult = {
  json: unknown;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
};

export abstract class LanguageModel {
  abstract readonly provider: 'gemini' | 'openai' | 'anthropic';

  abstract generateJson(input: GenerateJsonInput): Promise<GenerateJsonResult>;
}
