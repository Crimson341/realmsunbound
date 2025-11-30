import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Sprite animation definition validator
const animationValidator = v.object({
  name: v.string(),
  row: v.number(),
  startFrame: v.number(),
  frameCount: v.number(),
  fps: v.number(),
  loop: v.boolean(),
});

// --- SPRITE SHEET MANAGEMENT ---

/**
 * Get all sprite sheets for a campaign
 */
export const listSprites = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const sprites = await ctx.db
      .query("spriteSheets")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    // Get storage URLs for each sprite
    const spritesWithUrls = await Promise.all(
      sprites.map(async (sprite) => {
        const url = await ctx.storage.getUrl(sprite.imageId);
        return { ...sprite, imageUrl: url };
      })
    );

    return spritesWithUrls;
  },
});

/**
 * Get a single sprite sheet by ID
 */
export const getSprite = query({
  args: { spriteId: v.id("spriteSheets") },
  handler: async (ctx, args) => {
    const sprite = await ctx.db.get(args.spriteId);
    if (!sprite) return null;

    const url = await ctx.storage.getUrl(sprite.imageId);
    return { ...sprite, imageUrl: url };
  },
});

/**
 * Generate an upload URL for a sprite sheet image
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new sprite sheet
 */
export const createSprite = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    imageId: v.id("_storage"),
    frameWidth: v.number(),
    frameHeight: v.number(),
    columns: v.number(),
    rows: v.number(),
    animations: v.array(animationValidator),
    defaultAnimation: v.string(),
    anchorX: v.optional(v.number()),
    anchorY: v.optional(v.number()),
    scale: v.optional(v.number()),
    presetType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const spriteId = await ctx.db.insert("spriteSheets", {
      campaignId: args.campaignId,
      userId: args.userId,
      name: args.name,
      description: args.description,
      imageId: args.imageId,
      frameWidth: args.frameWidth,
      frameHeight: args.frameHeight,
      columns: args.columns,
      rows: args.rows,
      animations: JSON.stringify(args.animations),
      defaultAnimation: args.defaultAnimation,
      anchorX: args.anchorX,
      anchorY: args.anchorY,
      scale: args.scale,
      presetType: args.presetType,
      createdAt: Date.now(),
    });

    return spriteId;
  },
});

/**
 * Create a sprite sheet from a preset (RPG Maker, LPC, etc.)
 */
export const createSpriteFromPreset = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    imageId: v.id("_storage"),
    presetType: v.string(), // "RPG_MAKER_VX", "LPC_STANDARD", "SIMPLE_4DIR"
  },
  handler: async (ctx, args) => {
    // Preset configurations
    const presets: Record<string, {
      frameWidth: number;
      frameHeight: number;
      columns: number;
      rows: number;
      animations: Array<{
        name: string;
        row: number;
        startFrame: number;
        frameCount: number;
        fps: number;
        loop: boolean;
      }>;
      defaultAnimation: string;
    }> = {
      RPG_MAKER_VX: {
        frameWidth: 32,
        frameHeight: 32,
        columns: 3,
        rows: 4,
        animations: [
          { name: "walk_down", row: 0, startFrame: 0, frameCount: 3, fps: 8, loop: true },
          { name: "walk_left", row: 1, startFrame: 0, frameCount: 3, fps: 8, loop: true },
          { name: "walk_right", row: 2, startFrame: 0, frameCount: 3, fps: 8, loop: true },
          { name: "walk_up", row: 3, startFrame: 0, frameCount: 3, fps: 8, loop: true },
          { name: "idle", row: 0, startFrame: 1, frameCount: 1, fps: 1, loop: true },
        ],
        defaultAnimation: "idle",
      },
      LPC_STANDARD: {
        frameWidth: 64,
        frameHeight: 64,
        columns: 9,
        rows: 4,
        animations: [
          { name: "walk_up", row: 0, startFrame: 1, frameCount: 8, fps: 10, loop: true },
          { name: "walk_left", row: 1, startFrame: 1, frameCount: 8, fps: 10, loop: true },
          { name: "walk_down", row: 2, startFrame: 1, frameCount: 8, fps: 10, loop: true },
          { name: "walk_right", row: 3, startFrame: 1, frameCount: 8, fps: 10, loop: true },
          { name: "idle", row: 2, startFrame: 0, frameCount: 1, fps: 1, loop: true },
        ],
        defaultAnimation: "idle",
      },
      SIMPLE_4DIR: {
        frameWidth: 32,
        frameHeight: 32,
        columns: 4,
        rows: 4,
        animations: [
          { name: "idle", row: 0, startFrame: 0, frameCount: 1, fps: 1, loop: true },
          { name: "walk_down", row: 0, startFrame: 0, frameCount: 4, fps: 8, loop: true },
          { name: "walk_up", row: 1, startFrame: 0, frameCount: 4, fps: 8, loop: true },
          { name: "walk_left", row: 2, startFrame: 0, frameCount: 4, fps: 8, loop: true },
          { name: "walk_right", row: 3, startFrame: 0, frameCount: 4, fps: 8, loop: true },
        ],
        defaultAnimation: "idle",
      },
    };

    const preset = presets[args.presetType];
    if (!preset) {
      throw new Error(`Unknown preset type: ${args.presetType}`);
    }

    const spriteId = await ctx.db.insert("spriteSheets", {
      campaignId: args.campaignId,
      userId: args.userId,
      name: args.name,
      description: args.description,
      imageId: args.imageId,
      frameWidth: preset.frameWidth,
      frameHeight: preset.frameHeight,
      columns: preset.columns,
      rows: preset.rows,
      animations: JSON.stringify(preset.animations),
      defaultAnimation: preset.defaultAnimation,
      presetType: args.presetType,
      createdAt: Date.now(),
    });

    return spriteId;
  },
});

/**
 * Update a sprite sheet
 */
export const updateSprite = mutation({
  args: {
    spriteId: v.id("spriteSheets"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    frameWidth: v.optional(v.number()),
    frameHeight: v.optional(v.number()),
    columns: v.optional(v.number()),
    rows: v.optional(v.number()),
    animations: v.optional(v.array(animationValidator)),
    defaultAnimation: v.optional(v.string()),
    anchorX: v.optional(v.number()),
    anchorY: v.optional(v.number()),
    scale: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { spriteId, animations, ...updates } = args;

    const patchData: Record<string, unknown> = {
      ...updates,
      updatedAt: Date.now(),
    };

    if (animations) {
      patchData.animations = JSON.stringify(animations);
    }

    await ctx.db.patch(spriteId, patchData);
    return spriteId;
  },
});

/**
 * Delete a sprite sheet
 */
export const deleteSprite = mutation({
  args: { spriteId: v.id("spriteSheets") },
  handler: async (ctx, args) => {
    const sprite = await ctx.db.get(args.spriteId);
    if (!sprite) return { success: false, message: "Sprite not found" };

    // Delete the storage file
    await ctx.storage.delete(sprite.imageId);

    // Delete the sprite record
    await ctx.db.delete(args.spriteId);

    return { success: true };
  },
});

// --- ASSIGN SPRITES TO ENTITIES ---

/**
 * Assign a sprite sheet to an NPC
 */
export const assignSpriteToNPC = mutation({
  args: {
    npcId: v.id("npcs"),
    spriteSheetId: v.optional(v.id("spriteSheets")),
    spriteTint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.npcId, {
      spriteSheetId: args.spriteSheetId,
      spriteTint: args.spriteTint,
    });
    return { success: true };
  },
});

/**
 * Assign a sprite sheet to a character
 */
export const assignSpriteToCharacter = mutation({
  args: {
    characterId: v.id("characters"),
    spriteSheetId: v.optional(v.id("spriteSheets")),
    spriteTint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.characterId, {
      spriteSheetId: args.spriteSheetId,
      spriteTint: args.spriteTint,
    });
    return { success: true };
  },
});

/**
 * Get sprite data formatted for the game engine
 * This returns the sprite configuration in the format expected by EntitySpriteData
 */
export const getSpriteForEntity = query({
  args: { spriteSheetId: v.id("spriteSheets") },
  handler: async (ctx, args) => {
    const sprite = await ctx.db.get(args.spriteSheetId);
    if (!sprite) return null;

    const url = await ctx.storage.getUrl(sprite.imageId);
    if (!url) return null;

    // Parse animations from JSON
    const animations = JSON.parse(sprite.animations);

    return {
      spriteSheetUrl: url,
      config: {
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight,
        columns: sprite.columns,
        rows: sprite.rows,
        animations,
        defaultAnimation: sprite.defaultAnimation,
        anchorX: sprite.anchorX,
        anchorY: sprite.anchorY,
        scale: sprite.scale,
      },
    };
  },
});
