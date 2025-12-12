import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { MEMORY_TYPES } from "./constants";

export const saveMemory = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.string(),
    content: v.string(),
    type: v.union(
      v.literal(MEMORY_TYPES.SUMMARY),
      v.literal(MEMORY_TYPES.EVENT),
      v.literal(MEMORY_TYPES.CHARACTER)
    ),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("memories", {
      userId: args.userId,
      campaignId: args.campaignId,
      content: args.content,
      type: args.type,
      embedding: args.embedding,
    });
  },
});
