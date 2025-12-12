import {
  getOpenRouterApiKey,
  getOpenRouterChatModel,
  getOpenRouterEmbeddingsDimensions,
  getOpenRouterEmbeddingsModel,
  getOpenRouterExtraHeaders,
  OPENROUTER_BASE_URL,
} from "./openrouter_env";

export type OpenRouterChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
};

function buildAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    "Content-Type": "application/json",
    ...getOpenRouterExtraHeaders(),
  };
}

async function readErrorText(response: Response): Promise<string> {
  try {
    const json = await response.json();
    const msg =
      json?.error?.message ||
      json?.message ||
      (typeof json === "string" ? json : JSON.stringify(json));
    return String(msg);
  } catch {
    try {
      return await response.text();
    } catch {
      return `HTTP ${response.status}`;
    }
  }
}

export async function openRouterChatCompletionText(args: {
  messages: OpenRouterChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const model = args.model || getOpenRouterChatModel();
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      model,
      messages: args.messages,
      temperature: args.temperature,
      max_tokens: args.max_tokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const err = await readErrorText(response);
    throw new Error(`OpenRouter chat completion failed: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenRouter chat completion returned no message content");
  }
  return content;
}

/**
 * Creates an OpenRouter chat completions streaming Response (SSE).
 * Caller should forward response.body to the client.
 */
export async function openRouterChatCompletionStream(args: {
  messages: OpenRouterChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  // Optional OpenRouter-only knobs; forwarded in request body.
  extra_body?: Record<string, unknown>;
}): Promise<Response> {
  const model = args.model || getOpenRouterChatModel();

  const body = {
    model,
    messages: args.messages,
    temperature: args.temperature,
    max_tokens: args.max_tokens,
    stream: true,
    ...(args.extra_body || {}),
  };

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await readErrorText(response);
    throw new Error(`OpenRouter stream failed: ${response.status} - ${err}`);
  }

  return response;
}

export async function openRouterEmbedding(args: {
  input: string;
  model?: string;
  dimensions?: number;
}): Promise<number[]> {
  const model = args.model || getOpenRouterEmbeddingsModel();
  const dimensions = args.dimensions ?? getOpenRouterEmbeddingsDimensions();

  const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      model,
      input: args.input,
      dimensions,
    }),
  });

  if (!response.ok) {
    const err = await readErrorText(response);
    throw new Error(`OpenRouter embeddings failed: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || !embedding.every((v: unknown) => typeof v === "number")) {
    throw new Error("Invalid embedding response format from OpenRouter");
  }
  return embedding as number[];
}

