import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

export const summarizeSession = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    chatHistory: v.array(v.object({ role: v.string(), content: v.string() })),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    // 1. Generate Summary
    const prompt = `
    Summarize the following RPG session log into a concise, factual memory (3-5 sentences).
    Focus on key events, decisions, and new information.
    Do not include game mechanics (like "rolled a 20").
    
    LOG:
    ${args.chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) return;
    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!summary) return;

    // 2. Generate Embedding for the Summary
    // We call our internal embedding action
    const embedding = await ctx.runAction(api.lib.embeddings.generateEmbedding, {
      text: summary,
    });

    // 3. Save to Database
    // We need a mutation to save this. We'll assume one exists or create it.
    // Since we are in an action, we must call a mutation.
    await ctx.runMutation(api.lib.memory_storage.saveMemory, {
        campaignId: args.campaignId,
        content: summary,
        type: "summary",
        embedding: embedding,
    });
  },
});
