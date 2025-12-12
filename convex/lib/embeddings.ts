import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { openRouterEmbedding } from "./openrouter";

/**
 * Generates a vector embedding for a given text using OpenRouter embeddings.
 * NOTE: We keep dimensions at 768 to match Convex vector indexes in `convex/schema.ts`.
 *
 * Internal only - not exposed to clients.
 */
export const generateEmbedding = internalAction({
  args: {
    text: v.string(),
  },
  handler: async (_ctx, args): Promise<number[]> => {
    return await openRouterEmbedding({ input: args.text });
  },
});
