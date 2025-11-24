import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// The schema provides more precise TypeScript types.
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    pictureUrl: v.optional(v.string()),
    studioName: v.optional(v.string()),
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
    templateId: v.optional(v.id("templates")),
    templateVersion: v.optional(v.string()),
    
    // --- UNIVERSAL ENGINE FIELDS ---
    worldBible: v.optional(v.string()), // The "God Text" for the AI (Lore, Physics, Tone)
    aiPersona: v.optional(v.string()), // The personality of the Narrator
    terminology: v.optional(v.string()), // JSON: {"mana": "Chakra", "spells": "Jutsu"}
    statConfig: v.optional(v.string()), // JSON: Definition of stats [{"key": "nin", "label": "Ninjutsu"}]
    theme: v.optional(v.string()), // Visual preset: 'fantasy', 'sci-fi', 'ninja'
  }).index("by_user", ["userId"]),

  // New Table: Episodic & Semantic Memories
  // Stores summarized chapters, key facts, and entity references for the AI
  memories: defineTable({
    userId: v.string(),
    campaignId: v.id("campaigns"),
    content: v.string(), // The actual memory text (summary, fact, or lore snippet)
    type: v.string(), // 'summary', 'fact', 'conversation_chunk'
    embedding: v.array(v.number()), // Vector embedding (768 dimensions for Gemini)
    importance: v.optional(v.number()), // 1-10 scale for retrieval weighting
    relatedId: v.optional(v.string()), // ID of a related Quest, NPC, or Location if specific
    metadata: v.optional(v.string()), // JSON string for extra context
  })
  .index("by_campaign", ["campaignId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["campaignId"],
  }),

  templates: defineTable({
    title: v.string(),
    description: v.string(), // Lore
    imageId: v.optional(v.id("_storage")),
    version: v.string(), // e.g., "1.0.0"
    updates: v.optional(v.array(v.string())), // ["Fixed bugs", "Added new quest"]
    creatorId: v.optional(v.string()), // Optional for system templates
  }),

  characters: defineTable({
    userId: v.string(),
    campaignId: v.optional(v.id("campaigns")),
    name: v.string(),
    class: v.string(),
    level: v.number(),
    stats: v.string(), // JSON string
    imageId: v.optional(v.id("_storage")),
  }).index("by_user", ["userId"]).index("by_campaign", ["campaignId"]),

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
    source: v.optional(v.string()),
    embedding: v.optional(v.array(v.number())), // Searchable
  })
  .index("by_user", ["userId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["campaignId"], // Note: items might not always have campaignId if global template? But here it's optional. Filter might fail if field is missing.
  }),

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
    source: v.optional(v.string()), // 'creator' or 'ai'
    nextQuestId: v.optional(v.id("quests")),
    rewardReputation: v.optional(v.string()), // JSON: {"Mages Guild": 10}
    rewardWorldUpdates: v.optional(v.string()), // JSON: [{"locationId": "...", "newDescription": "..."}]
    rewardLoreIds: v.optional(v.array(v.id("lore"))),
    rewardFollowerIds: v.optional(v.array(v.id("npcs"))),
    embedding: v.optional(v.array(v.number())), // Searchable
  })
  .index("by_user", ["userId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["campaignId"],
  }),

  locations: defineTable({
    userId: v.string(),
    campaignId: v.id("campaigns"),
    name: v.string(),
    type: v.string(), // Kingdom, Swamp, etc.
    environment: v.optional(v.string()), // What the area consists of (e.g., "Dense foliage, rocky path")
    description: v.string(),
    neighbors: v.array(v.id("locations")), // Adjacency list
    imageId: v.optional(v.id("_storage")),
    embedding: v.optional(v.array(v.number())), // Searchable
  })
  .index("by_campaign", ["campaignId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["campaignId"],
  }),

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
    embedding: v.optional(v.array(v.number())), // Searchable
  })
  .index("by_campaign", ["campaignId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["campaignId"],
  }),

  monsters: defineTable({
    userId: v.string(),
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.string(),
    health: v.number(),
    damage: v.number(),
    dropItemIds: v.optional(v.array(v.id("items"))),
    locationId: v.optional(v.id("locations")),
    embedding: v.optional(v.array(v.number())), // Searchable
  })
  .index("by_campaign", ["campaignId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["campaignId"],
  }),

  effectsLibrary: defineTable({
    name: v.string(),
    category: v.string(), // e.g. Condition, Buff, Debuff, Damage, Utility
    summary: v.string(),
    mechanics: v.optional(v.string()),
    duration: v.optional(v.string()),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  }).index("by_category", ["category"]),

  lore: defineTable({
    userId: v.string(),
    campaignId: v.id("campaigns"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()), // e.g. History, Faction, Magic
    imageId: v.optional(v.id("_storage")),
    embedding: v.optional(v.array(v.number())), // Searchable
  })
  .index("by_campaign", ["campaignId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["campaignId"],
  }),

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
