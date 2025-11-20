import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    pictureUrl: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  campaigns: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    xpRate: v.number(),
    rules: v.string(), // JSON string for flexibility
    raritySettings: v.optional(v.string()), // JSON string for custom colors/names
    rarityColors: v.optional(v.string()), // JSON string: {"Common": "#ffffff", "Rare": "#0070f3", ...}
    starterItemIds: v.optional(v.array(v.id("items"))),
    imageId: v.optional(v.id("_storage")),
  }).index("by_user", ["userId"]),

  characters: defineTable({
    userId: v.string(),
    campaignId: v.optional(v.id("campaigns")),
    name: v.string(),
    class: v.string(),
    level: v.number(),
    stats: v.string(), // JSON string
    imageId: v.optional(v.id("_storage")),
  }).index("by_user", ["userId"]),

  items: defineTable({
    userId: v.string(),
    campaignId: v.optional(v.id("campaigns")),
    name: v.string(),
    type: v.string(),
    rarity: v.string(),
    effects: v.string(),
    effectId: v.optional(v.id("effectsLibrary")),
    spellId: v.optional(v.id("spells")),
    description: v.optional(v.string()),
    specialAbilities: v.optional(v.string()),
    usage: v.optional(v.string()),
    requirements: v.optional(v.string()),
    lore: v.optional(v.string()),
    textColor: v.optional(v.string()), // Hex color for display
    spawnLocationIds: v.optional(v.array(v.id("locations"))),
    imageId: v.optional(v.id("_storage")),
  }).index("by_user", ["userId"]),

  quests: defineTable({
    userId: v.string(),
    campaignId: v.optional(v.id("campaigns")),
    locationId: v.optional(v.id("locations")),
    title: v.string(),
    description: v.string(),
    rewards: v.optional(v.string()),
    rewardItemIds: v.optional(v.array(v.id("items"))),
    status: v.string(),
    npcId: v.optional(v.id("npcs")),
  }).index("by_user", ["userId"]),

  locations: defineTable({
    userId: v.string(),
    campaignId: v.id("campaigns"),
    name: v.string(),
    type: v.string(), // Kingdom, Swamp, etc.
    environment: v.optional(v.string()), // What the area consists of (e.g., "Dense foliage, rocky path")
    description: v.string(),
    neighbors: v.array(v.id("locations")), // Adjacency list
    imageId: v.optional(v.id("_storage")),
  }).index("by_campaign", ["campaignId"]),

  events: defineTable({
    userId: v.string(),
    campaignId: v.id("campaigns"),
    trigger: v.string(), // JSON or text description
    effect: v.string(), // JSON or text description
    locationId: v.optional(v.id("locations")),
  }).index("by_campaign", ["campaignId"]),

  npcs: defineTable({
    userId: v.string(),
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.string(),
    role: v.string(), // e.g. Merchant, Guard
    attitude: v.string(), // e.g. Friendly, Hostile
    locationId: v.optional(v.id("locations")),
    imageId: v.optional(v.id("_storage")),
  }).index("by_campaign", ["campaignId"]),

  monsters: defineTable({
    userId: v.string(),
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.string(),
    health: v.number(),
    damage: v.number(),
    dropItemIds: v.optional(v.array(v.id("items"))),
    locationId: v.optional(v.id("locations")),
  }).index("by_campaign", ["campaignId"]),

  effectsLibrary: defineTable({
    name: v.string(),
    category: v.string(), // e.g. Condition, Buff, Debuff, Damage, Utility
    summary: v.string(),
    mechanics: v.optional(v.string()),
    duration: v.optional(v.string()),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  }).index("by_category", ["category"]),

  spells: defineTable({
    userId: v.string(),
    campaignId: v.optional(v.id("campaigns")),
    name: v.string(),
    level: v.number(),
    school: v.string(),
    castingTime: v.string(),
    range: v.string(),
    components: v.optional(v.string()),
    duration: v.string(),
    save: v.optional(v.string()),
    effectId: v.optional(v.id("effectsLibrary")),
    description: v.optional(v.string()),
    damageDice: v.optional(v.string()),
    damageType: v.optional(v.string()),
    areaShape: v.optional(v.string()),
    areaSize: v.optional(v.string()),
    higherLevels: v.optional(v.string()),
    concentration: v.optional(v.boolean()),
    ritual: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"]).index("by_user", ["userId"]),
});
