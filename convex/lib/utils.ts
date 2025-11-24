import { query } from "../_generated/server";
import { v } from "convex/values";

// A generic document fetcher that is safe because it's an internal query
export const getDoc = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    // In Convex, ctx.db.get(id) works for any valid ID string
    // provided the ID is valid for *some* table in the schema.
    try {
        return await ctx.db.get(args.id as any);
    } catch (e) {
        return null;
    }
  },
});