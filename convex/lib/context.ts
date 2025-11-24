import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

export const retrieveRelevantContext = action({
  args: {
    campaignId: v.id("campaigns"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const embedding = await ctx.runAction((api as any).lib.embeddings.generateEmbedding, {
      text: args.query,
    });

    // Execute vector searches
    const [memories, lore, npcs, locations] = await Promise.all([
      ctx.vectorSearch("memories", "by_embedding", {
        vector: embedding,
        limit: 3,
        filter: (q) => q.eq("campaignId", args.campaignId),
      }),
      ctx.vectorSearch("lore", "by_embedding", {
        vector: embedding,
        limit: 2,
        filter: (q) => q.eq("campaignId", args.campaignId),
      }),
      ctx.vectorSearch("npcs", "by_embedding", {
        vector: embedding,
        limit: 2,
        filter: (q) => q.eq("campaignId", args.campaignId),
      }),
      ctx.vectorSearch("locations", "by_embedding", {
        vector: embedding,
        limit: 1,
        filter: (q) => q.eq("campaignId", args.campaignId),
      }),
    ]);

    // Collect all IDs
    const allIds = [
      ...memories.map((r) => r._id),
      ...lore.map((r) => r._id),
      ...npcs.map((r) => r._id),
      ...locations.map((r) => r._id),
    ];

    if (allIds.length === 0) return "";

    // Fetch documents in parallel using our helper
    // Note: we use Promise.all mapping over the IDs
    const docs = await Promise.all(
        allIds.map((id) => ctx.runQuery((api as any).lib.utils.getDoc, { id }))
    );

    // Format results
    const formattedContext = docs
        .filter((doc) => doc !== null)
        .map((doc: any) => {
            // Determine type based on fields
            if (doc.trigger && doc.effect) return `[EVENT]: ${doc.trigger} -> ${doc.effect}`;
            if (doc.content) return `[LORE/MEMORY]: ${doc.title || 'Memory'} - ${doc.content}`;
            if (doc.role) return `[NPC]: ${doc.name} (${doc.role}, ${doc.attitude}) - ${doc.description}`;
            if (doc.neighbors) return `[LOCATION]: ${doc.name} (${doc.type}) - ${doc.description}`;
            return `[INFO]: ${JSON.stringify(doc)}`;
        })
        .join("\n");

    return formattedContext;
  },
});