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
    
    // --- DISCOVERY & CATEGORIZATION ---
    genre: v.optional(v.string()), // 'fantasy', 'sci-fi', 'anime', 'realism', 'historical', 'horror', 'mythology'
    isFeatured: v.optional(v.boolean()), // Admin-curated featured realms
    isPublic: v.optional(v.boolean()), // Whether realm is discoverable (default true)
    viewCount: v.optional(v.number()), // For popularity tracking
    playCount: v.optional(v.number()), // Number of times played
    tags: v.optional(v.array(v.string())), // Additional tags for filtering
    
    // --- UNIVERSAL ENGINE FIELDS ---
    worldBible: v.optional(v.string()), // The "God Text" for the AI (Lore, Physics, Tone)
    aiPersona: v.optional(v.string()), // The personality of the Narrator
    terminology: v.optional(v.string()), // JSON: {"mana": "Chakra", "spells": "Jutsu"}
    statConfig: v.optional(v.string()), // JSON: Definition of stats [{"key": "nin", "label": "Ninjutsu"}]
    theme: v.optional(v.string()), // Visual preset: 'fantasy', 'sci-fi', 'ninja'
    
    // --- WORLD SYSTEMS ---
    bountyEnabled: v.optional(v.boolean()), // Enable bounty/crime system for this campaign

    // --- CHARACTER CREATION CONFIG ---
    availableClasses: v.optional(v.string()), // JSON array: [{ name: "Warrior", description: "...", bonusStats: {...} }]
    availableRaces: v.optional(v.string()), // JSON array: [{ name: "Human", description: "...", bonusStats: {...} }]
    statAllocationMethod: v.optional(v.string()), // "point_buy", "standard_array", "random", "fixed"
    startingStatPoints: v.optional(v.number()), // Points for point buy (default 27)
    allowCustomNames: v.optional(v.boolean()), // Whether players can enter custom names (default true)
  })
    .index("by_user", ["userId"])
    .index("by_genre", ["genre"])
    .index("by_featured", ["isFeatured"]),

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
    race: v.optional(v.string()), // Character race/species
    level: v.number(),
    stats: v.string(), // JSON string
    imageId: v.optional(v.id("_storage")),
    background: v.optional(v.string()), // Character backstory
  }).index("by_user", ["userId"]).index("by_campaign", ["campaignId"]),

  items: defineTable({
    userId: v.string(),
    campaignId: v.optional(v.id("campaigns")),
    name: v.string(),
    type: v.string(),
    rarity: v.string(),
    category: v.optional(v.string()),  // "weapon", "armor", "potion", "consumable", "material", "quest", "scroll"
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
    
    // --- USABILITY SYSTEM ---
    usable: v.optional(v.boolean()), // Can this item be used from inventory?
    useEffect: v.optional(v.string()), // JSON: { type: "heal", amount: 20 } or { type: "buff", stat: "strength", duration: 60 }
    consumable: v.optional(v.boolean()), // Disappears after use?
    quantity: v.optional(v.number()), // Stack count for consumables
  })
  .index("by_user", ["userId"])
  .index("by_campaign", ["campaignId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["campaignId"],
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
    // --- MAP SYSTEM ---
    mapX: v.optional(v.number()),      // X position on map (0-1000 normalized)
    mapY: v.optional(v.number()),      // Y position on map (0-1000 normalized)
    mapIcon: v.optional(v.string()),   // Custom icon override
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
    
    // --- HEALTH & COMBAT STATS ---
    health: v.optional(v.number()), // Current health
    maxHealth: v.optional(v.number()), // Maximum health (default 20)
    damage: v.optional(v.number()), // Damage they deal (default 5)
    armorClass: v.optional(v.number()), // Difficulty to hit (default 10)
    
    // --- INVENTORY & LOOT SYSTEM ---
    inventoryItems: v.optional(v.array(v.id("items"))), // Items the NPC carries
    dropItems: v.optional(v.array(v.id("items"))), // Items dropped on death (can be subset of inventory)
    gold: v.optional(v.number()), // Gold the NPC carries
    hasBeenLooted: v.optional(v.boolean()), // Whether body has been searched
    
    // --- TRADING SYSTEM ---
    willTrade: v.optional(v.boolean()), // Whether NPC is willing to trade
    tradeInventory: v.optional(v.array(v.id("items"))), // Items available for trade
    tradePriceModifier: v.optional(v.number()), // Price multiplier (1.0 = normal, 1.5 = expensive)
    
    // --- DEATH & FACTION SYSTEM ---
    isDead: v.optional(v.boolean()), // Has this NPC been killed?
    deathCause: v.optional(v.string()), // How they died (for narrative)
    killedBy: v.optional(v.string()), // "player" or NPC name
    deathTimestamp: v.optional(v.number()), // When they died
    factionId: v.optional(v.id("factions")), // Which faction they belong to
    isEssential: v.optional(v.boolean()), // Cannot be killed (story-critical)
    
    // --- RECRUITMENT SYSTEM ---
    isRecruitable: v.optional(v.boolean()), // Can be recruited to player camp
    recruitCost: v.optional(v.number()), // Gold cost to recruit
    loyalty: v.optional(v.number()), // 0-100, affects if they'll leave/betray
  })
  .index("by_campaign", ["campaignId"])
  .index("by_faction", ["factionId"])
  .index("by_location", ["locationId"])
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
    // --- COMBAT ABILITY SYSTEM ---
    energyCost: v.optional(v.number()), // Cost in mana/chakra/energy to cast
    cooldown: v.optional(v.number()), // Turns before can use again (0 = instant)
    damage: v.optional(v.number()), // Direct damage amount
    healing: v.optional(v.number()), // Healing amount
    buffEffect: v.optional(v.string()), // JSON: { stat: "strength", amount: 5, duration: 3 }
    debuffEffect: v.optional(v.string()), // JSON: { stat: "defense", amount: -3, duration: 2 }
    isPassive: v.optional(v.boolean()), // Always active, no energy cost
    iconEmoji: v.optional(v.string()), // Emoji icon for display (e.g., "🔥", "⚡")
  }).index("by_campaign", ["campaignId"]).index("by_user", ["userId"]),

  // --- WORLD SYSTEMS ---

  // Factions - groups that NPCs can belong to
  factions: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.string(),
    territory: v.optional(v.string()), // Description of their territory
    headquartersId: v.optional(v.id("locations")), // Main base location
    allies: v.optional(v.array(v.id("factions"))), // Allied factions
    enemies: v.optional(v.array(v.id("factions"))), // Enemy factions
    imageId: v.optional(v.id("_storage")),
  }).index("by_campaign", ["campaignId"]),

  // Regions - groups of locations for bounty tracking
  regions: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.optional(v.string()),
    locationIds: v.array(v.id("locations")), // Locations in this region
    governingFactionId: v.optional(v.id("factions")), // Who controls this region
  }).index("by_campaign", ["campaignId"]),

  // Rumors - information that spreads through the world
  rumors: defineTable({
    campaignId: v.id("campaigns"),
    content: v.string(), // The rumor text
    type: v.string(), // "death", "crime", "quest_complete", "major_event"
    originLocationId: v.id("locations"), // Where the rumor started
    spreadRadius: v.number(), // How many location hops it has spread
    maxSpreadRadius: v.optional(v.number()), // Maximum spread (default 3)
    timestamp: v.number(), // When it was created
    relatedNpcId: v.optional(v.id("npcs")), // Related NPC if applicable
    relatedPlayerId: v.optional(v.string()), // Related player if applicable
    isActive: v.optional(v.boolean()), // Whether rumor is still spreading
  })
  .index("by_campaign", ["campaignId"])
  .index("by_origin", ["originLocationId"])
  .index("by_type", ["type"]),

  // Bounties - crime tracking per region
  bounties: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(), // tokenIdentifier of the wanted player
    regionId: v.id("regions"), // Which region the bounty is in
    amount: v.number(), // Gold amount
    crimes: v.array(v.object({
      type: v.string(), // "murder", "theft", "assault", "trespassing"
      description: v.string(),
      timestamp: v.number(),
      victimName: v.optional(v.string()),
    })),
    status: v.string(), // "active", "paid", "jailed", "pardoned", "escaped"
    lastUpdated: v.number(),
    bountyHuntersSent: v.optional(v.number()), // Track how many hunters dispatched
  })
  .index("by_campaign", ["campaignId"])
  .index("by_player", ["playerId"])
  .index("by_region", ["regionId"])
  .index("by_status", ["status"]),

  // Player Camps - base building for players
  playerCamps: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(), // tokenIdentifier of the owner
    name: v.string(),
    locationId: v.id("locations"), // Where the camp is established
    description: v.optional(v.string()),
    followers: v.array(v.object({
      npcId: v.id("npcs"),
      role: v.string(), // "companion", "guard", "worker", "merchant"
      joinedAt: v.number(),
      positionX: v.optional(v.number()), // Position on camp map
      positionY: v.optional(v.number()),
    })),
    resources: v.optional(v.string()), // JSON: { gold: 100, food: 50 }
    createdAt: v.number(),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_player", ["playerId"])
  .index("by_location", ["locationId"]),

  // Player Game State - persistent player state across sessions
  playerGameState: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    currentLocationId: v.optional(v.id("locations")),
    hp: v.number(),
    maxHp: v.number(),
    energy: v.optional(v.number()), // Current mana/chakra/stamina
    maxEnergy: v.optional(v.number()), // Max energy pool
    xp: v.number(),
    level: v.number(),
    gold: v.optional(v.number()),
    isJailed: v.optional(v.boolean()),
    jailEndTime: v.optional(v.number()), // When jail sentence ends
    jailRegionId: v.optional(v.id("regions")),
    activeBuffs: v.optional(v.string()), // JSON array of active buffs
    activeCooldowns: v.optional(v.string()), // JSON: { spellId: turnsRemaining }
    lastPlayed: v.number(),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_player", ["playerId"])
  .index("by_campaign_and_player", ["campaignId", "playerId"]),

  // Player Inventory - items owned by player (separate from campaign items)
  playerInventory: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    itemId: v.id("items"),
    quantity: v.number(),
    equippedSlot: v.optional(v.string()), // "weapon", "armor", "accessory", null
    acquiredAt: v.number(),
  })
  .index("by_campaign_and_player", ["campaignId", "playerId"])
  .index("by_item", ["itemId"]),

  // Game Messages - persisted chat history for gameplay sessions
  gameMessages: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    role: v.string(), // "user" | "model"
    content: v.string(),
    timestamp: v.number(),
    choices: v.optional(v.array(v.string())),
    questOffer: v.optional(v.array(v.string())),
  })
  .index("by_campaign_and_player", ["campaignId", "playerId"]),

  // --- SHOP SYSTEM ---

  // Shops - location-bound stores that players can buy from
  shops: defineTable({
    campaignId: v.id("campaigns"),
    locationId: v.id("locations"),           // Required - shops are location-bound
    name: v.string(),                         // "Blacksmith's Forge"
    description: v.string(),                  // Shop description for AI/display
    type: v.string(),                         // "blacksmith", "potion", "general", "magic", "armor"
    shopkeeperId: v.optional(v.id("npcs")),   // Optional - shops can be standalone (market stalls, vending)
    imageId: v.optional(v.id("_storage")),

    // Inventory - array of items with stock info
    inventory: v.array(v.object({
      itemId: v.id("items"),
      stock: v.number(),                      // -1 for unlimited
      basePrice: v.optional(v.number()),      // Override rarity-based price
      restockRate: v.optional(v.number()),    // Items per game-day to restock
    })),

    // Pricing Rules
    basePriceModifier: v.number(),            // 1.0 = normal, 1.5 = expensive
    buybackModifier: v.number(),              // 0.5 = 50% of sell price for buyback
    buybackDuration: v.optional(v.number()),  // Minutes until buyback expires (null = never expires)

    // Dynamic Pricing Config
    dynamicPricing: v.optional(v.object({
      reputationFactor: v.optional(v.boolean()),
      supplyDemandFactor: v.optional(v.boolean()),
      eventFactor: v.optional(v.boolean()),
    })),

    // Buyback System - items players have sold
    buybackInventory: v.optional(v.array(v.object({
      itemId: v.id("items"),
      soldByPlayerId: v.string(),
      soldAt: v.number(),
      buybackPrice: v.number(),
      expiresAt: v.optional(v.number()),
    }))),

    isOpen: v.optional(v.boolean()),          // Can be closed by events
    aiManaged: v.optional(v.boolean()),       // AI can modify inventory
    lastAiUpdate: v.optional(v.number()),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_location", ["locationId"]),

  // Shop Transactions - track all shop activity
  shopTransactions: defineTable({
    campaignId: v.id("campaigns"),
    shopId: v.id("shops"),
    playerId: v.string(),
    type: v.string(),                         // "buy", "sell", "buyback"
    itemId: v.id("items"),
    quantity: v.number(),
    pricePerUnit: v.number(),
    totalPrice: v.number(),
    timestamp: v.number(),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_shop", ["shopId"])
  .index("by_player", ["playerId"]),

});
