import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================================
// LOOT TABLE QUERIES
// ============================================================================

export const getByCampaign = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("lootTables")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id("lootTables"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// ============================================================================
// LOOT TABLE MUTATIONS
// ============================================================================

const lootEntryValidator = v.object({
  itemId: v.id("items"),
  weight: v.number(),
  minQuantity: v.number(),
  maxQuantity: v.number(),
});

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.optional(v.string()),
    entries: v.array(lootEntryValidator),
    minRolls: v.optional(v.number()),
    maxRolls: v.optional(v.number()),
    guaranteedDrops: v.optional(v.array(v.id("items"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify campaign ownership
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.userId !== identity.tokenIdentifier) {
      throw new Error("Campaign not found or not authorized");
    }

    return ctx.db.insert("lootTables", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("lootTables"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    entries: v.optional(v.array(lootEntryValidator)),
    minRolls: v.optional(v.number()),
    maxRolls: v.optional(v.number()),
    guaranteedDrops: v.optional(v.array(v.id("items"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const lootTable = await ctx.db.get(args.id);
    if (!lootTable) {
      throw new Error("Loot table not found");
    }

    // Verify campaign ownership
    const campaign = await ctx.db.get(lootTable.campaignId);
    if (!campaign || campaign.userId !== identity.tokenIdentifier) {
      throw new Error("Not authorized");
    }

    const { id, ...updates } = args;
    return ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("lootTables"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const lootTable = await ctx.db.get(args.id);
    if (!lootTable) {
      throw new Error("Loot table not found");
    }

    // Verify campaign ownership
    const campaign = await ctx.db.get(lootTable.campaignId);
    if (!campaign || campaign.userId !== identity.tokenIdentifier) {
      throw new Error("Not authorized");
    }

    return ctx.db.delete(args.id);
  },
});

// ============================================================================
// LOOT ROLLING LOGIC
// ============================================================================

export type LootEntry = {
  itemId: Id<"items">;
  weight: number;
  minQuantity: number;
  maxQuantity: number;
};

export type RolledLoot = {
  itemId: Id<"items">;
  quantity: number;
};

/**
 * Roll loot from a loot table.
 * This is a helper function, not a Convex function.
 */
export function rollLoot(
  entries: LootEntry[],
  minRolls: number = 1,
  maxRolls: number = 1,
  guaranteedDrops: Id<"items">[] = []
): RolledLoot[] {
  const result: RolledLoot[] = [];

  // Add guaranteed drops first
  for (const itemId of guaranteedDrops) {
    result.push({ itemId, quantity: 1 });
  }

  // Calculate total weight
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0 || entries.length === 0) {
    return result;
  }

  // Determine number of rolls
  const numRolls = Math.floor(Math.random() * (maxRolls - minRolls + 1)) + minRolls;

  // Roll for each slot
  for (let i = 0; i < numRolls; i++) {
    const roll = Math.random() * totalWeight;
    let cumulative = 0;

    for (const entry of entries) {
      cumulative += entry.weight;
      if (roll <= cumulative) {
        const quantity =
          Math.floor(Math.random() * (entry.maxQuantity - entry.minQuantity + 1)) +
          entry.minQuantity;

        // Check if we already have this item in results
        const existing = result.find((r) => r.itemId === entry.itemId);
        if (existing) {
          existing.quantity += quantity;
        } else {
          result.push({ itemId: entry.itemId, quantity });
        }
        break;
      }
    }
  }

  return result;
}

// Query to roll loot from a specific table (for testing/preview in Forge)
export const previewRoll = query({
  args: {
    lootTableId: v.id("lootTables"),
    numRolls: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lootTable = await ctx.db.get(args.lootTableId);
    if (!lootTable) {
      return [];
    }

    const numSimulations = args.numRolls ?? 1;
    const results: RolledLoot[][] = [];

    for (let i = 0; i < numSimulations; i++) {
      results.push(
        rollLoot(
          lootTable.entries,
          lootTable.minRolls ?? 1,
          lootTable.maxRolls ?? 1,
          lootTable.guaranteedDrops ?? []
        )
      );
    }

    // Fetch item names for display
    const allItemIds = new Set<Id<"items">>();
    for (const roll of results) {
      for (const item of roll) {
        allItemIds.add(item.itemId);
      }
    }

    const items = await Promise.all([...allItemIds].map((id) => ctx.db.get(id)));
    const itemMap = new Map(items.filter(Boolean).map((item) => [item!._id, item!.name]));

    return results.map((roll) =>
      roll.map((item) => ({
        ...item,
        itemName: itemMap.get(item.itemId) ?? "Unknown Item",
      }))
    );
  },
});
