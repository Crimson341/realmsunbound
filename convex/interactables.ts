import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================================
// INTERACTABLES QUERIES
// ============================================================================

export const getByLocation = query({
  args: {
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("interactables")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();
  },
});

export const getByCampaign = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("interactables")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id("interactables"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// ============================================================================
// INTERACTABLES MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    locationId: v.id("locations"),
    name: v.string(),
    type: v.string(),
    gridX: v.number(),
    gridY: v.number(),
    description: v.optional(v.string()),
    spriteId: v.optional(v.number()),
    spriteColor: v.optional(v.string()),
    containedItems: v.optional(v.array(v.id("items"))),
    lootTableId: v.optional(v.id("lootTables")),
    goldAmount: v.optional(v.number()),
    effect: v.optional(v.string()),
    buffId: v.optional(v.id("spells")),
    requiresKey: v.optional(v.id("items")),
    lockDifficulty: v.optional(v.number()),
    requiresQuest: v.optional(v.id("quests")),
    isHidden: v.optional(v.boolean()),
    isOneTime: v.optional(v.boolean()),
    respawnTime: v.optional(v.number()),
    linkedInteractableId: v.optional(v.id("interactables")),
    isOpen: v.optional(v.boolean()),
    signText: v.optional(v.string()),
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

    return ctx.db.insert("interactables", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("interactables"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    gridX: v.optional(v.number()),
    gridY: v.optional(v.number()),
    description: v.optional(v.string()),
    spriteId: v.optional(v.number()),
    spriteColor: v.optional(v.string()),
    containedItems: v.optional(v.array(v.id("items"))),
    lootTableId: v.optional(v.id("lootTables")),
    goldAmount: v.optional(v.number()),
    effect: v.optional(v.string()),
    buffId: v.optional(v.id("spells")),
    requiresKey: v.optional(v.id("items")),
    lockDifficulty: v.optional(v.number()),
    requiresQuest: v.optional(v.id("quests")),
    isHidden: v.optional(v.boolean()),
    isOneTime: v.optional(v.boolean()),
    respawnTime: v.optional(v.number()),
    linkedInteractableId: v.optional(v.id("interactables")),
    isOpen: v.optional(v.boolean()),
    signText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const interactable = await ctx.db.get(args.id);
    if (!interactable) {
      throw new Error("Interactable not found");
    }

    // Verify campaign ownership
    const campaign = await ctx.db.get(interactable.campaignId);
    if (!campaign || campaign.userId !== identity.tokenIdentifier) {
      throw new Error("Not authorized");
    }

    const { id, ...updates } = args;
    return ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("interactables"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const interactable = await ctx.db.get(args.id);
    if (!interactable) {
      throw new Error("Interactable not found");
    }

    // Verify campaign ownership
    const campaign = await ctx.db.get(interactable.campaignId);
    if (!campaign || campaign.userId !== identity.tokenIdentifier) {
      throw new Error("Not authorized");
    }

    return ctx.db.delete(args.id);
  },
});

// ============================================================================
// PLAYER INTERACTABLE STATE
// ============================================================================

export const getPlayerState = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    interactableId: v.id("interactables"),
  },
  handler: async (ctx, args) => {
    const states = await ctx.db
      .query("playerInteractableState")
      .withIndex("by_interactable", (q) => q.eq("interactableId", args.interactableId))
      .filter((q) => q.eq(q.field("playerId"), args.playerId))
      .first();
    return states;
  },
});

export const getPlayerStatesForLocation = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    // Get all interactables in this location
    const interactables = await ctx.db
      .query("interactables")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();

    const interactableIds = interactables.map((i) => i._id);

    // Get player states for these interactables
    const states = await ctx.db
      .query("playerInteractableState")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    // Filter to only states for interactables in this location
    return states.filter((s) => interactableIds.includes(s.interactableId));
  },
});

export const updatePlayerState = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    interactableId: v.id("interactables"),
    isLooted: v.optional(v.boolean()),
    isTriggered: v.optional(v.boolean()),
    isDiscovered: v.optional(v.boolean()),
    respawnsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerInteractableState")
      .withIndex("by_interactable", (q) => q.eq("interactableId", args.interactableId))
      .filter((q) => q.eq(q.field("playerId"), args.playerId))
      .first();

    const { campaignId, playerId, interactableId, ...updates } = args;

    if (existing) {
      return ctx.db.patch(existing._id, {
        ...updates,
        lootedAt: updates.isLooted ? Date.now() : existing.lootedAt,
      });
    } else {
      return ctx.db.insert("playerInteractableState", {
        campaignId,
        playerId,
        interactableId,
        ...updates,
        lootedAt: updates.isLooted ? Date.now() : undefined,
      });
    }
  },
});
