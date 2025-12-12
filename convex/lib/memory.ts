import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { MEMORY_TYPES } from "./constants";
import { openRouterChatCompletionText } from "./openrouter";

// Type-safe references to internal lib functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalLib = internal as any;

export const summarizeSession = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    chatHistory: v.array(v.object({ role: v.string(), content: v.string() })),
  },
  handler: async (ctx, args) => {
    if (args.chatHistory.length === 0) {
      throw new Error("Cannot summarize empty chat history");
    }

    const prompt = `
    Summarize the following RPG session log into a concise, factual memory (3-5 sentences).
    Focus on key events, decisions, and new information.
    Do not include game mechanics (like "rolled a 20").

    LOG:
    ${args.chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
    `;

    const summary = await openRouterChatCompletionText({
      messages: [{ role: "user", content: prompt }],
    });

    if (!summary || typeof summary !== "string" || summary.trim() === "") {
      throw new Error("OpenRouter returned empty or invalid summary");
    }

    const embedding = await ctx.runAction(internalLib["lib/embeddings"].generateEmbedding, {
      text: summary,
    });

    await ctx.runMutation(internalLib["lib/memory_storage"].saveMemory, {
      campaignId: args.campaignId,
      userId: "system",
      content: summary.trim(),
      type: MEMORY_TYPES.SUMMARY,
      embedding,
    });
  },
});
