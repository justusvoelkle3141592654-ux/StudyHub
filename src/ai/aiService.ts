import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { secrets, SECRET_KEYS } from "@/platform/secrets";
import { log } from "@/lib/logger";
import { getAiModel } from "./aiStore";

/**
 * Calls to the Anthropic Messages API with the user's own key. The key is
 * read from the secret store for every call and never logged. This is one
 * of the two code paths in the app that need network access.
 */
async function getClient(): Promise<Anthropic> {
  const apiKey = await secrets.get(SECRET_KEYS.anthropicApiKey);
  if (!apiKey) throw new Error("no-api-key");
  // The app runs inside a WebView (Tauri) or the browser dev build; the SDK
  // adds the direct-browser-access header when this flag is set.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

export class AiRefusalError extends Error {
  constructor(public readonly category: string | null) {
    super("refusal");
    this.name = "AiRefusalError";
  }
}

export interface AiTextRequest {
  system: string;
  prompt: string;
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
  maxTokens?: number;
}

/** Stream a text completion; resolves with the full text. Aborting rejects with the SDK's abort error. */
export async function streamText(req: AiTextRequest): Promise<string> {
  const client = await getClient();
  const stream = client.messages.stream(
    {
      model: getAiModel(),
      max_tokens: req.maxTokens ?? 16000,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
      thinking: { type: "adaptive" },
    },
    { signal: req.signal },
  );
  if (req.onDelta) stream.on("text", req.onDelta);
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new AiRefusalError(message.stop_details?.category ?? null);
  log.info("ai", `text request done (${message.usage.input_tokens} in / ${message.usage.output_tokens} out)`);
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export const FlashcardsSchema = z.object({
  cards: z.array(z.object({ front: z.string(), back: z.string() })),
});
export const QuestionsSchema = z.object({
  questions: z.array(z.object({ question: z.string(), answer: z.string() })),
});

/** Structured request: the response is validated against the Zod schema. */
export async function generateStructured<S extends z.ZodType>(schema: S, system: string, prompt: string, signal?: AbortSignal): Promise<z.infer<S>> {
  const client = await getClient();
  const response = await client.messages.parse(
    {
      model: getAiModel(),
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(schema) },
    },
    { signal },
  );
  if (response.stop_reason === "refusal") throw new AiRefusalError(response.stop_details?.category ?? null);
  if (!response.parsed_output) throw new Error("The model returned no structured result");
  log.info("ai", `structured request done (${response.usage.input_tokens} in / ${response.usage.output_tokens} out)`);
  return response.parsed_output as z.infer<S>;
}

/** Human-readable error text for the UI (German/English handled by the caller via keys). */
export function describeAiError(e: unknown): { key: string; detail?: string } {
  if (e instanceof AiRefusalError) return { key: "ai.errors.refusal", detail: e.category ?? undefined };
  if (e instanceof Anthropic.AuthenticationError) return { key: "ai.errors.auth" };
  if (e instanceof Anthropic.RateLimitError) return { key: "ai.errors.rateLimit" };
  if (e instanceof Anthropic.APIConnectionError) return { key: "ai.errors.network" };
  if (e instanceof Anthropic.APIError) return { key: "ai.errors.api", detail: `${e.status ?? ""} ${e.message}`.trim() };
  if (e instanceof Error && e.message === "no-api-key") return { key: "ai.errors.noKey" };
  if (e instanceof Error && e.name === "AbortError") return { key: "ai.errors.aborted" };
  return { key: "common.errorGeneric", detail: e instanceof Error ? e.message : String(e) };
}
