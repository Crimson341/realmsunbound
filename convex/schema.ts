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

    // --- ABILITY SYSTEM CONFIG ---
    abilitySystemConfig: v.optional(v.string()), // JSON: Full ability system configuration
    // Example: {
    //   "abilityTermSingular": "Jutsu",
    //   "abilityTermPlural": "Jutsu",
    //   "energyTerm": "Chakra",
    //   "categories": ["Ninjutsu", "Taijutsu", "Genjutsu", "Senjutsu"],
    //   "damageTypes": ["Fire", "Water", "Earth", "Wind", "Lightning"],
    //   "statusEffects": ["Burn", "Freeze", "Paralysis", "Poison"],
    //   "rarityLevels": ["E-Rank", "D-Rank", "C-Rank", "B-Rank", "A-Rank", "S-Rank"]
    // }
    
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
    // --- SPRITE SYSTEM ---
    spriteSheetId: v.optional(v.id("spriteSheets")), // Custom animated sprite for gameplay
    spriteTint: v.optional(v.string()),              // Hex color tint to apply to sprite
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
    status: v.string(), // 'available', 'active', 'completed', 'failed'
    npcId: v.optional(v.id("npcs")),
    source: v.optional(v.string()), // 'creator' or 'ai'
    nextQuestId: v.optional(v.id("quests")),
    rewardReputation: v.optional(v.string()), // JSON: {"Mages Guild": 10}
    rewardWorldUpdates: v.optional(v.string()), // JSON: [{"locationId": "...", "newDescription": "..."}]
    rewardLoreIds: v.optional(v.array(v.id("lore"))),
    rewardFollowerIds: v.optional(v.array(v.id("npcs"))),
    embedding: v.optional(v.array(v.number())), // Searchable
    // --- QUEST OBJECTIVES SYSTEM ---
    objectives: v.optional(v.array(v.object({
      id: v.string(),                          // Unique identifier for this objective
      description: v.string(),                 // What player needs to do
      type: v.string(),                        // 'kill', 'collect', 'talk', 'explore', 'deliver', 'escort', 'custom'
      target: v.optional(v.string()),          // NPC name, item name, location name, etc.
      targetCount: v.optional(v.number()),     // How many (e.g., kill 5 wolves)
      currentCount: v.optional(v.number()),    // Current progress
      isCompleted: v.boolean(),                // Whether this objective is done
      isOptional: v.optional(v.boolean()),     // Optional bonus objective
      hint: v.optional(v.string()),            // Hint for players who are stuck
    }))),
    currentObjectiveIndex: v.optional(v.number()), // Which objective is currently active (for sequential quests)
    questGiverDialogue: v.optional(v.string()),    // What the quest giver says when offering quest
    completionDialogue: v.optional(v.string()),   // What they say when you complete it
    difficulty: v.optional(v.string()),           // 'easy', 'medium', 'hard', 'legendary'
    estimatedTime: v.optional(v.string()),        // '10 minutes', '1 hour', etc.
    xpReward: v.optional(v.number()),             // XP gained on completion
    goldReward: v.optional(v.number()),           // Gold gained on completion
  })
  .index("by_user", ["userId"])
  .index("by_campaign", ["campaignId"])
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
    // --- 2D TILEMAP SYSTEM ---
    tilemapData: v.optional(v.string()),     // JSON 2D array of tile IDs
    tilemapWidth: v.optional(v.number()),    // Grid width
    tilemapHeight: v.optional(v.number()),   // Grid height
    collisionMask: v.optional(v.string()),   // JSON 2D array of 0/1 for walkable
    spawnPoints: v.optional(v.string()),     // JSON: {player: {x,y}, npcs: [...]}
    transitions: v.optional(v.string()),     // JSON: [{x,y,toLocationId,spawnPoint}]
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

    // --- PERSUASION SYSTEM ---
    persuasionDifficulty: v.optional(v.number()), // 1-100, how hard to convince (based on personality)
    persuasionProgress: v.optional(v.number()), // Current accumulated persuasion progress
    persuasionAttempts: v.optional(v.number()), // Number of attempts used (max 5)
    persuasionCooldown: v.optional(v.number()), // Timestamp when can try again

    // --- 2D GAME VISUAL SYSTEM ---
    gridX: v.optional(v.number()),           // Position on tilemap X
    gridY: v.optional(v.number()),           // Position on tilemap Y
    spriteColor: v.optional(v.string()),     // Hex color for placeholder sprite (fallback)
    spriteSheetId: v.optional(v.id("spriteSheets")), // Custom animated sprite
    spriteTint: v.optional(v.string()),      // Hex color tint to apply to sprite
    movementPattern: v.optional(v.string()), // "static" | "wander" | "patrol"
    isHostile: v.optional(v.boolean()),      // Whether NPC attacks player on sight
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

  // Abilities/Spells/Jutsu/Powers - Genre-agnostic ability system
  spells: defineTable({
    userId: v.string(),
    campaignId: v.optional(v.id("campaigns")),

    // --- CORE IDENTITY ---
    name: v.string(),
    description: v.optional(v.string()),              // What does this ability do?
    category: v.optional(v.string()),                 // Creator-defined: "Ninjutsu", "Fire Magic", "Psychic", etc.
    subcategory: v.optional(v.string()),              // More specific: "Fire Style", "Healing", "Offensive"
    iconEmoji: v.optional(v.string()),                // Emoji icon for display
    tags: v.optional(v.array(v.string())),            // Flexible tags for filtering

    // --- REQUIREMENTS ---
    requiredLevel: v.optional(v.number()),            // Minimum level to learn/use
    requiredStats: v.optional(v.string()),            // JSON: { "ninjutsu": 10, "chakra_control": 5 }
    requiredItems: v.optional(v.string()),            // JSON: ["Fire Scroll", "Chakra Paper"]
    requiredAbilities: v.optional(v.string()),        // JSON: ["Basic Fireball"] - must know these first

    // --- COST & COOLDOWN ---
    energyCost: v.optional(v.number()),               // Cost in energy/mana/chakra to use
    healthCost: v.optional(v.number()),               // Some abilities cost HP (forbidden jutsu)
    cooldown: v.optional(v.number()),                 // Turns before can use again
    usesPerDay: v.optional(v.number()),               // Limited uses per day/rest
    isPassive: v.optional(v.boolean()),               // Always active, no activation needed

    // --- EFFECTS ---
    damage: v.optional(v.number()),                   // Direct damage amount
    damageType: v.optional(v.string()),               // "fire", "lightning", "physical", etc.
    damageScaling: v.optional(v.string()),            // JSON: { "stat": "ninjutsu", "ratio": 0.5 }
    healing: v.optional(v.number()),                  // Healing amount
    healingScaling: v.optional(v.string()),           // JSON: { "stat": "wisdom", "ratio": 0.3 }
    buffEffect: v.optional(v.string()),               // JSON: { stat: "speed", amount: 5, duration: 3 }
    debuffEffect: v.optional(v.string()),             // JSON: { stat: "defense", amount: -3, duration: 2 }
    statusEffect: v.optional(v.string()),             // "burn", "freeze", "stun", "poison", etc.
    statusDuration: v.optional(v.number()),           // How long status effect lasts

    // --- TARGETING ---
    targetType: v.optional(v.string()),               // "self", "single", "area", "all_enemies", "all_allies"
    range: v.optional(v.string()),                    // "melee", "short", "medium", "long", "unlimited"
    areaSize: v.optional(v.string()),                 // "small", "medium", "large", "massive"

    // --- SPECIAL PROPERTIES ---
    castTime: v.optional(v.string()),                 // "instant", "1 turn", "channeled", "ritual"
    interruptible: v.optional(v.boolean()),           // Can be interrupted during cast

    // --- UPGRADE/MASTERY ---
    canUpgrade: v.optional(v.boolean()),              // Can this ability be improved?
    upgradedVersion: v.optional(v.string()),          // Name of the upgraded ability

    // --- LORE & FLAVOR ---
    lore: v.optional(v.string()),                     // Background story of this ability
    creator: v.optional(v.string()),                  // Who invented this ability?
    rarity: v.optional(v.string()),                   // "common", "rare", "legendary", "forbidden"
    isForbidden: v.optional(v.boolean()),             // Forbidden technique (narrative flag)
    notes: v.optional(v.string()),                    // Creator notes

    // --- LEGACY FIELDS (backwards compatibility) ---
    level: v.optional(v.number()),
    school: v.optional(v.string()),
    castingTime: v.optional(v.string()),
    range_legacy: v.optional(v.string()),
    components: v.optional(v.string()),
    duration: v.optional(v.string()),
    save: v.optional(v.string()),
    effectId: v.optional(v.id("effectsLibrary")),
    damageDice: v.optional(v.string()),
    areaShape: v.optional(v.string()),
    higherLevels: v.optional(v.string()),
    concentration: v.optional(v.boolean()),
    ritual: v.optional(v.boolean()),
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

    // --- CONTEXT OPTIMIZATION ---
    isAnchor: v.optional(v.boolean()),         // Anchor messages never get trimmed (major plot moments)
    anchorReason: v.optional(v.string()),      // Why this is an anchor: "quest_complete", "npc_death", "major_choice", "location_discovery"
    summarized: v.optional(v.boolean()),       // Has this message been included in a summary?
  })
  .index("by_campaign_and_player", ["campaignId", "playerId"])
  .index("by_anchor", ["campaignId", "playerId", "isAnchor"]),

  // Story Events - key plot points for context reconstruction
  storyEvents: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),

    // Event classification
    type: v.string(),  // "quest_started", "quest_completed", "quest_failed", "npc_met", "npc_killed",
                       // "location_discovered", "item_acquired", "item_lost", "level_up", "faction_joined",
                       // "faction_left", "major_choice", "combat_victory", "combat_defeat", "secret_found",
                       // "relationship_change", "story_milestone"

    // Event details
    title: v.string(),                         // Short title: "Met Sasuke at Training Grounds"
    description: v.string(),                   // Brief description of what happened
    importance: v.number(),                    // 1-10, affects retention priority

    // Related entities
    relatedNpcIds: v.optional(v.array(v.id("npcs"))),
    relatedLocationId: v.optional(v.id("locations")),
    relatedQuestId: v.optional(v.id("quests")),
    relatedItemIds: v.optional(v.array(v.id("items"))),

    // Consequences (for context reconstruction)
    consequences: v.optional(v.string()),      // JSON: What changed as a result

    // Tracking
    timestamp: v.number(),
    messageId: v.optional(v.id("gameMessages")),  // Link to the message where this happened
  })
  .index("by_campaign_player", ["campaignId", "playerId"])
  .index("by_type", ["campaignId", "playerId", "type"])
  .index("by_importance", ["campaignId", "playerId", "importance"]),

  // Story Summaries - condensed story arcs for context efficiency
  storySummaries: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),

    // Summary scope
    type: v.string(),  // "chapter", "arc", "session", "full"
    title: v.optional(v.string()),             // "Chapter 1: The Beginning", "Training Arc"

    // The actual summary
    content: v.string(),                       // Condensed narrative of events

    // What this summary covers
    startTimestamp: v.number(),
    endTimestamp: v.number(),
    messageCount: v.number(),                  // How many messages were summarized
    eventIds: v.optional(v.array(v.id("storyEvents"))),  // Events included in this summary

    // For sliding window - which messages to skip
    lastSummarizedMessageId: v.optional(v.id("gameMessages")),

    // Quality tracking
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_campaign_player", ["campaignId", "playerId"])
  .index("by_type", ["campaignId", "playerId", "type"]),

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

  // --- CONDITIONAL LOGIC SYSTEM ---

  // Conditions - creator-defined if-else rules for game logic
  conditions: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),                           // Human-readable name for the rule
    description: v.optional(v.string()),        // What this condition does

    // When to evaluate this condition
    trigger: v.string(), // "on_enter_location", "on_exit_location", "on_combat_start", "on_item_use",
                         // "on_npc_interact", "on_quest_update", "on_level_up", "on_ability_use",
                         // "on_game_start", "on_turn", "always"
    triggerContext: v.optional(v.string()),     // Specific context (e.g., location ID, NPC ID)

    // The condition logic (JSON AST)
    // Examples:
    // { "eq": ["player.faction", "Hidden Leaf"] }
    // { "and": [{ "gte": ["player.level", 10] }, { "has_item": "Shadow Cloak" }] }
    // { "or": [{ "quest_completed": "bell_test" }, { "gte": ["player.reputation.Hokage", 50] }] }
    rules: v.string(),

    // Actions when condition is TRUE (JSON array)
    // [{ "type": "block_entry", "message": "You cannot enter here" }, { "type": "set_flag", "key": "warned", "value": true }]
    thenActions: v.string(),

    // Actions when condition is FALSE (optional)
    elseActions: v.optional(v.string()),

    // Execution settings
    priority: v.number(),                       // Higher = evaluated first (default 0)
    isActive: v.boolean(),                      // Can be toggled on/off
    executeOnce: v.optional(v.boolean()),       // Only triggers once per player
    cooldownSeconds: v.optional(v.number()),    // Cooldown before can trigger again

    // Metadata
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_trigger", ["trigger"])
  .index("by_active", ["isActive"]),

  // Condition Execution Log - track when conditions fire (for debugging & executeOnce)
  conditionExecutions: defineTable({
    campaignId: v.id("campaigns"),
    conditionId: v.id("conditions"),
    playerId: v.string(),
    result: v.boolean(),                        // Did condition evaluate to true?
    triggeredAt: v.number(),
    actionsExecuted: v.optional(v.string()),    // JSON array of actions that ran
  })
  .index("by_condition", ["conditionId"])
  .index("by_player", ["playerId"])
  .index("by_campaign_player", ["campaignId", "playerId"]),

  // Player Flags - custom key-value storage for condition system
  playerFlags: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    key: v.string(),                            // Flag name (e.g., "discovered_secret_cave", "talked_to_elder")
    value: v.string(),                          // JSON value (string, number, boolean, array)
    setAt: v.number(),
    setBy: v.optional(v.string()),              // "condition", "quest", "ai", "manual"
  })
  .index("by_campaign_player", ["campaignId", "playerId"])
  .index("by_key", ["key"]),

  // Player Abilities - track which abilities/spells a player has learned
  playerAbilities: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    spellId: v.id("spells"),
    learnedAt: v.number(),
    learnedFrom: v.optional(v.string()),        // "level_up", "quest", "trainer", "condition", "scroll"
    isEquipped: v.optional(v.boolean()),        // For ability loadout systems
  })
  .index("by_campaign_player", ["campaignId", "playerId"])
  .index("by_spell", ["spellId"]),

  // Player Visited Locations - track exploration for conditions
  playerVisitedLocations: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
    firstVisitAt: v.number(),
    lastVisitAt: v.number(),
    visitCount: v.number(),
  })
  .index("by_campaign_player", ["campaignId", "playerId"])
  .index("by_location", ["locationId"]),

  // Player Reputation - track reputation with factions
  playerReputation: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    factionId: v.id("factions"),
    reputation: v.number(),                     // Can be negative (hostile) to positive (allied)
    updatedAt: v.number(),
  })
  .index("by_campaign_player", ["campaignId", "playerId"])
  .index("by_faction", ["factionId"]),

  // --- SPRITE SYSTEM ---

  // Sprite Sheets - custom animated sprites for entities
  spriteSheets: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.string(),

    // Core Identity
    name: v.string(),                           // "Hero Knight", "Fire Goblin"
    description: v.optional(v.string()),        // Description of the sprite
    imageId: v.id("_storage"),                  // The actual sprite sheet image

    // Sprite Sheet Configuration
    frameWidth: v.number(),                     // Width of each frame in pixels
    frameHeight: v.number(),                    // Height of each frame in pixels
    columns: v.number(),                        // Total columns in the sprite sheet
    rows: v.number(),                           // Total rows in the sprite sheet

    // Animations - JSON array of animation definitions
    // Example: [{"name": "idle", "row": 0, "startFrame": 0, "frameCount": 4, "fps": 8, "loop": true}]
    animations: v.string(),

    // Default Settings
    defaultAnimation: v.string(),               // Animation to play by default (e.g., "idle")
    anchorX: v.optional(v.number()),            // Anchor X (0-1, default 0.5)
    anchorY: v.optional(v.number()),            // Anchor Y (0-1, default 0.5)
    scale: v.optional(v.number()),              // Scale multiplier (default 1.0)

    // Preset type (for quick setup)
    presetType: v.optional(v.string()),         // "RPG_MAKER_VX", "LPC_STANDARD", "SIMPLE_4DIR", "custom"

    // Metadata
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_user", ["userId"]),

  // --- PROCEDURAL MAP GENERATION SYSTEM ---

  // Location Templates - creator-authored tilemap layouts for the Forge editor
  locationTemplates: defineTable({
    locationId: v.id("locations"),              // Links to parent location
    campaignId: v.id("campaigns"),              // For indexed queries

    // Core Template Data
    width: v.number(),                          // Grid width (tiles)
    height: v.number(),                         // Grid height (tiles)
    tiles: v.string(),                          // JSON: number[][] tile IDs
    collisionMask: v.string(),                  // JSON: number[][] (0=walkable, 1=blocked)

    // Spawn Points
    playerSpawnX: v.number(),                   // Default player spawn X
    playerSpawnY: v.number(),                   // Default player spawn Y
    alternateSpawns: v.optional(v.string()),    // JSON: [{fromLocationId, x, y}] - spawn based on where player came from

    // Placed Content
    placedEntities: v.string(),                 // JSON: PlacedEntity[] - NPCs, monsters positioned on map
    placedObjects: v.string(),                  // JSON: PlacedObject[] - chests, furniture, lights, traps
    transitions: v.string(),                    // JSON: Transition[] - exits to other locations

    // Visual Settings
    lighting: v.optional(v.string()),           // "dark" | "dim" | "bright"
    ambience: v.optional(v.string()),           // dungeon, forest, town, cave, etc.

    // Metadata
    version: v.number(),                        // Template version for detecting updates
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_location", ["locationId"])
  .index("by_campaign", ["campaignId"]),

  // Generated Maps - per-player map instances with dynamic state (hybrid persistence)
  generatedMaps: defineTable({
    campaignId: v.id("campaigns"),
    playerId: v.string(),                       // tokenIdentifier of the player
    locationId: v.id("locations"),
    templateId: v.optional(v.id("locationTemplates")),  // Which template was used
    templateVersion: v.optional(v.number()),    // Version at generation time (for detecting updates)

    // Generated map data (may include procedural variations)
    width: v.number(),
    height: v.number(),
    tiles: v.string(),                          // JSON: number[][] - the actual generated tiles

    // Dynamic State - Modified during gameplay, persists across sessions
    entityStates: v.string(),                   // JSON: {entityId: {hp, x, y, dead, diedAt, ...}}
    objectStates: v.string(),                   // JSON: {objectId: {opened, destroyed, openedAt, ...}}
    exploredTiles: v.string(),                  // JSON: ["x,y", ...] - fog of war explored tiles

    // Tracking
    firstVisitAt: v.number(),
    lastVisitAt: v.number(),
    visitCount: v.number(),
  })
  .index("by_player_location", ["campaignId", "playerId", "locationId"])
  .index("by_campaign", ["campaignId"]),

});
