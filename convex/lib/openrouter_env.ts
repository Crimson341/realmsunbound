/**
 * OpenRouter environment helpers.
 *
 * OpenRouter uses an OpenAI-compatible API surface at:
 *   https://openrouter.ai/api/v1
 *
 * Env vars:
 * - OPENROUTER_API_KEY (required)
 * - OPENROUTER_CHAT_MODEL (optional, default: openai/gpt-4o-mini)
 * - OPENROUTER_EMBEDDINGS_MODEL (optional, default: openai/text-embedding-3-small)
 * - OPENROUTER_EMBEDDINGS_DIMENSIONS (optional, default: 768)
 * - OPENROUTER_HTTP_REFERER (optional)
 * - OPENROUTER_APP_TITLE (optional)
 */

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return key;
}

export function getOpenRouterChatModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini";
}

export function getOpenRouterEmbeddingsModel(): string {
  return process.env.OPENROUTER_EMBEDDINGS_MODEL || "openai/text-embedding-3-small";
}

export function getOpenRouterEmbeddingsDimensions(): number {
  const raw = process.env.OPENROUTER_EMBEDDINGS_DIMENSIONS;
  if (!raw) return 768;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 768;
  return n;
}

export function getOpenRouterExtraHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Optional, used for OpenRouter discovery/rankings.
  if (process.env.OPENROUTER_HTTP_REFERER) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER;
  }
  if (process.env.OPENROUTER_APP_TITLE) {
    headers["X-Title"] = process.env.OPENROUTER_APP_TITLE;
  }

  return headers;
}

