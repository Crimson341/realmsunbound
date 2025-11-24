import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const saveMemory = mutation({
  args: {
    campaignId: v.id("campaigns"),
    content: v.string(),
    type: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("memories", {
      userId: "system", // or fetch from campaign if needed, but system is fine for auto-summaries
      campaignId: args.campaignId,
      content: args.content,
      type: args.type,
      embedding: args.embedding,
    });
  },
});
