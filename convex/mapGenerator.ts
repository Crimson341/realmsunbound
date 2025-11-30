import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// LOCATION TEMPLATES - Creator-authored maps
// ============================================

// Save or update a location template (used by Forge tilemap editor)
export const saveLocationTemplate = mutation({
  args: {
    locationId: v.id("locations"),
    campaignId: v.id("campaigns"),
    width: v.number(),
    height: v.number(),
    tiles: v.string(),
    collisionMask: v.string(),
    playerSpawnX: v.number(),
    playerSpawnY: v.number(),
    alternateSpawns: v.optional(v.string()),
    placedEntities: v.string(),
    placedObjects: v.string(),
    transitions: v.string(),
    lighting: v.optional(v.string()),
    ambience: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if template already exists for this location
    const existing = await ctx.db
      .query("locationTemplates")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing template, increment version
      await ctx.db.patch(existing._id, {
        width: args.width,
        height: args.height,
        tiles: args.tiles,
        collisionMask: args.collisionMask,
        playerSpawnX: args.playerSpawnX,
        playerSpawnY: args.playerSpawnY,
        alternateSpawns: args.alternateSpawns,
        placedEntities: args.placedEntities,
        placedObjects: args.placedObjects,
        transitions: args.transitions,
        lighting: args.lighting,
        ambience: args.ambience,
        version: existing.version + 1,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new template
      return await ctx.db.insert("locationTemplates", {
        locationId: args.locationId,
        campaignId: args.campaignId,
        width: args.width,
        height: args.height,
        tiles: args.tiles,
        collisionMask: args.collisionMask,
        playerSpawnX: args.playerSpawnX,
        playerSpawnY: args.playerSpawnY,
        alternateSpawns: args.alternateSpawns,
        placedEntities: args.placedEntities,
        placedObjects: args.placedObjects,
        transitions: args.transitions,
        lighting: args.lighting,
        ambience: args.ambience,
        version: 1,
        createdAt: now,
      });
    }
  },
});

// Get a location template by location ID
export const getLocationTemplate = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locationTemplates")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .first();
  },
});

// Get all templates for a campaign (for batch operations)
export const getTemplatesForCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locationTemplates")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

// Delete a location template
export const deleteLocationTemplate = mutation({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("locationTemplates")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .first();

    if (template) {
      await ctx.db.delete(template._id);
      return true;
    }
    return false;
  },
});

// ============================================
// GENERATED MAPS - Per-player map instances
// ============================================

// Get or create a generated map for a player at a location
export const getOrCreateGeneratedMap = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
    // If creating new, provide the generated data
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    tiles: v.optional(v.string()),
    templateId: v.optional(v.id("locationTemplates")),
    templateVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if map already exists for this player at this location
    const existing = await ctx.db
      .query("generatedMaps")
      .withIndex("by_player_location", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("playerId", args.playerId)
          .eq("locationId", args.locationId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update visit tracking
      await ctx.db.patch(existing._id, {
        lastVisitAt: now,
        visitCount: existing.visitCount + 1,
      });
      return existing;
    }

    // Create new generated map (requires generation data)
    if (!args.width || !args.height || !args.tiles) {
      throw new Error("Cannot create generated map without width, height, and tiles");
    }

    const mapId = await ctx.db.insert("generatedMaps", {
      campaignId: args.campaignId,
      playerId: args.playerId,
      locationId: args.locationId,
      templateId: args.templateId,
      templateVersion: args.templateVersion,
      width: args.width,
      height: args.height,
      tiles: args.tiles,
      entityStates: "{}",
      objectStates: "{}",
      exploredTiles: "[]",
      firstVisitAt: now,
      lastVisitAt: now,
      visitCount: 1,
    });

    return await ctx.db.get(mapId);
  },
});

// Get a generated map (read-only, doesn't update visit count)
export const getGeneratedMap = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generatedMaps")
      .withIndex("by_player_location", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("playerId", args.playerId)
          .eq("locationId", args.locationId)
      )
      .first();
  },
});

// Update entity state (when enemy is killed, NPC moves, etc)
export const updateEntityState = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
    entityId: v.string(),
    state: v.object({
      hp: v.optional(v.number()),
      x: v.optional(v.number()),
      y: v.optional(v.number()),
      dead: v.optional(v.boolean()),
      diedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db
      .query("generatedMaps")
      .withIndex("by_player_location", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("playerId", args.playerId)
          .eq("locationId", args.locationId)
      )
      .first();

    if (!map) {
      throw new Error("Generated map not found");
    }

    const entityStates = JSON.parse(map.entityStates) as Record<string, unknown>;
    entityStates[args.entityId] = {
      ...(entityStates[args.entityId] as object || {}),
      ...args.state,
    };

    await ctx.db.patch(map._id, {
      entityStates: JSON.stringify(entityStates),
    });
  },
});

// Update object state (when chest is opened, trap triggered, etc)
export const updateObjectState = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
    objectId: v.string(),
    state: v.object({
      opened: v.optional(v.boolean()),
      destroyed: v.optional(v.boolean()),
      openedAt: v.optional(v.number()),
      state: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db
      .query("generatedMaps")
      .withIndex("by_player_location", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("playerId", args.playerId)
          .eq("locationId", args.locationId)
      )
      .first();

    if (!map) {
      throw new Error("Generated map not found");
    }

    const objectStates = JSON.parse(map.objectStates) as Record<string, unknown>;
    objectStates[args.objectId] = {
      ...(objectStates[args.objectId] as object || {}),
      ...args.state,
    };

    await ctx.db.patch(map._id, {
      objectStates: JSON.stringify(objectStates),
    });
  },
});

// Update explored tiles (fog of war)
export const updateExploredTiles = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
    newTiles: v.array(v.string()), // Array of "x,y" strings
  },
  handler: async (ctx, args) => {
    const map = await ctx.db
      .query("generatedMaps")
      .withIndex("by_player_location", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("playerId", args.playerId)
          .eq("locationId", args.locationId)
      )
      .first();

    if (!map) {
      throw new Error("Generated map not found");
    }

    const exploredSet = new Set(JSON.parse(map.exploredTiles) as string[]);
    args.newTiles.forEach((tile) => exploredSet.add(tile));

    await ctx.db.patch(map._id, {
      exploredTiles: JSON.stringify(Array.from(exploredSet)),
    });
  },
});

// Reset a generated map (for testing or player restart)
export const resetGeneratedMap = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db
      .query("generatedMaps")
      .withIndex("by_player_location", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("playerId", args.playerId)
          .eq("locationId", args.locationId)
      )
      .first();

    if (map) {
      await ctx.db.delete(map._id);
      return true;
    }
    return false;
  },
});

// Get all generated maps for a player in a campaign
export const getGeneratedMapsForPlayer = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generatedMaps")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("playerId"), args.playerId))
      .collect();
  },
});
