import { action } from "../_generated/server";
import { v } from "convex/values";

/**
 * Generates a vector embedding for a given text using Google's Gemini Embedding model.
 * Returns an array of numbers (dimensions: 768).
 */
export const generateEmbedding = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: {
            parts: [{ text: args.text }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate embedding: ${errorText}`);
    }

    const data = await response.json();
    const embedding = data.embedding?.values;

    if (!Array.isArray(embedding)) {
        throw new Error("Invalid embedding response format from Gemini API");
    }

    return embedding as number[];
  },
});

/**
 * Internal helper function to be used by other actions directly (skipping the HTTP overhead of calling itself via ctx.runAction if in the same context, though typically used via ctx.runAction for separation).
 * 
 * However, since we are in Convex, we should generally expose this logic as an internal helper 
 * rather than just an action if we want to call it from other actions easily without loopback.
 * 
 * BUT: Convex actions cannot call other actions directly as functions. They must use `ctx.runAction`.
 * So the export above is the correct way to expose it to the rest of the backend.
 */
