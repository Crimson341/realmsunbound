import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// --- HELPERS ---
async function getUser(ctx: any) {
    console.log('Auth check - ctx.auth:', !!ctx.auth);
    const identity = await ctx.auth.getUserIdentity();
    console.log('Auth check - identity:', identity);
    if (!identity) {
        throw new Error("Unauthenticated call to mutation");
    }
    return identity;
}

// --- UPLOAD ---
export const generateUploadUrl = mutation(async (ctx) => {
    await getUser(ctx);
    return await ctx.storage.generateUploadUrl();
});

// --- CAMPAIGNS ---
export const createCampaign = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        xpRate: v.number(),
        rules: v.string(),
        raritySettings: v.optional(v.string()),
        starterItemIds: v.optional(v.array(v.id("items"))),
        imageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const campaignId = await ctx.db.insert("campaigns", {
            userId: identity.tokenIdentifier,
            ...args,
        });
        return campaignId;
    },
});

export const getMyCampaigns = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        const userId = identity.tokenIdentifier;
        return await ctx.db
            .query("campaigns")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
    },
});

export const getAllCampaigns = query({
    handler: async (ctx) => {
        // In a real app, you might want pagination or filtering here
        return await ctx.db.query("campaigns").collect();
    },
});

export const getCampaignDetails = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        // Public access allowed
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;

        const dmUserId = campaign.userId;

        const locations = await ctx.db
            .query("locations")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const events = await ctx.db
            .query("events")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const npcs = await ctx.db
            .query("npcs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        // Fetch quests created by the DM for this campaign
        const quests = await ctx.db
            .query("quests")
            .withIndex("by_user", (q) => q.eq("userId", dmUserId))
            .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
            .collect();

        const monsters = await ctx.db
            .query("monsters")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        // Fetch items created by the DM for this campaign
        const items = await ctx.db
            .query("items")
            .withIndex("by_user", (q) => q.eq("userId", dmUserId))
            .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
            .collect();

        const spells = await ctx.db
            .query("spells")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        return { campaign, locations, events, quests, npcs, monsters, items, spells };
    },
});

// --- CHARACTERS ---
export const createCharacter = mutation({
    args: {
        campaignId: v.optional(v.id("campaigns")),
        name: v.string(),
        class: v.string(),
        level: v.number(),
        stats: v.string(),
        imageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        return await ctx.db.insert("characters", {
            userId: identity.tokenIdentifier,
            ...args,
        });
    },
});

export const getMyCharacters = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        return await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
    },
});

// --- ITEMS ---
export const createItem = mutation({
    args: {
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
        imageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        return await ctx.db.insert("items", {
            userId: identity.tokenIdentifier,
            ...args,
        });
    },
});

export const getEffectsLibrary = query({
    handler: async (ctx) => {
        // Public library; no auth required
        return await ctx.db.query("effectsLibrary").collect();
    },
});

export const seedEffectsLibrary = mutation({
    args: {},
    handler: async (ctx) => {
        // Optional helper to seed a handful of common effects
        const entries = [
            // Conditions
            {
                name: "Poisoned",
                category: "Condition",
                summary: "Disadvantage on attack rolls and ability checks.",
                mechanics: "Apply disadvantage to d20 tests. Creatures may have resistance.",
                duration: "Until cured/saved",
                tags: ["debuff", "condition"],
                source: "SRD-inspired",
            },
            {
                name: "Prone",
                category: "Condition",
                summary: "Movement costs extra; melee attacks have advantage, ranged attacks have disadvantage.",
                mechanics: "Half movement to stand. Attack modifiers change by range.",
                duration: "Until stood up",
                tags: ["control", "condition"],
                source: "SRD-inspired",
            },
            {
                name: "Grappled",
                category: "Condition",
                summary: "Speed becomes 0; ends if grappler is incapacitated or moved away.",
                mechanics: "Target speed 0; escape via contested check per system rules.",
                duration: "Until escaped/ends",
                tags: ["control", "condition"],
                source: "SRD-inspired",
            },
            {
                name: "Restrained",
                category: "Condition",
                summary: "Speed 0, attacks vs target have advantage, target’s attacks have disadvantage; DEX saves disadvantage.",
                mechanics: "Apply advantage/disadvantage modifiers; speed 0.",
                duration: "Until freed",
                tags: ["control", "condition"],
                source: "SRD-inspired",
            },
            // Buffs
            {
                name: "Bless",
                category: "Buff",
                summary: "+1d4 to attack rolls and saving throws for up to 3 creatures.",
                mechanics: "Concentration. Add 1d4 to each attack roll and saving throw.",
                duration: "1 minute or concentration",
                tags: ["support", "concentration"],
                source: "SRD-inspired",
            },
            {
                name: "Haste",
                category: "Buff",
                summary: "Double speed, +2 AC, advantage on DEX saves, extra action each turn.",
                mechanics: "Extra action: Dash, Disengage, Hide, Use Object, or one weapon attack.",
                duration: "1 minute or concentration",
                tags: ["speed", "buff", "concentration"],
                source: "SRD-inspired",
            },
            {
                name: "Shield",
                category: "Buff",
                summary: "+5 AC until start of next turn; blocks Magic Missile.",
                mechanics: "Reaction to being hit; AC increases by 5, negates Magic Missile.",
                duration: "Until start of your next turn",
                tags: ["defense", "reaction"],
                source: "SRD-inspired",
            },
            // Debuffs / controls
            {
                name: "Bane",
                category: "Debuff",
                summary: "Targets subtract 1d4 from attacks and saving throws.",
                mechanics: "CHA save on cast; concentration.",
                duration: "1 minute or concentration",
                tags: ["debuff", "concentration"],
                source: "SRD-inspired",
            },
            {
                name: "Slow",
                category: "Debuff",
                summary: "-2 AC, half speed, no reactions, limited actions.",
                mechanics: "WIS save; on fail speed halved, -2 AC, no reactions, only one attack, limited actions.",
                duration: "1 minute or concentration",
                tags: ["control", "debuff", "concentration"],
                source: "SRD-inspired",
            },
            // Damage templates
            {
                name: "Fireball",
                category: "Damage",
                summary: "8d6 fire damage in a 20-ft radius sphere; DEX save for half.",
                mechanics: "Range 150 ft. DEX save vs DC; take 8d6 or half on success.",
                duration: "Instant",
                tags: ["aoe", "fire"],
                source: "SRD-inspired",
            },
            {
                name: "Eldritch Blast",
                category: "Damage",
                summary: "Force bolt(s), 1d10 each; scales with level.",
                mechanics: "Spell attack vs AC; 1d10 force per beam.",
                duration: "Instant",
                tags: ["force", "ranged"],
                source: "SRD-inspired",
            },
            {
                name: "Cure Wounds",
                category: "Healing",
                summary: "Restores 1d8 + ability mod HP (melee touch).",
                mechanics: "Touch; add spellcasting ability modifier to heal.",
                duration: "Instant",
                tags: ["healing", "touch"],
                source: "SRD-inspired",
            },
            {
                name: "Healing Word",
                category: "Healing",
                summary: "Bonus action heal at range: 1d4 + ability mod HP.",
                mechanics: "Howl/word; add spellcasting ability modifier to heal.",
                duration: "Instant",
                tags: ["healing", "bonus-action"],
                source: "SRD-inspired",
            },
        ];

        for (const entry of entries) {
            const existing = await ctx.db
                .query("effectsLibrary")
                .withIndex("by_category", (q) => q.eq("category", entry.category))
                .filter((q) => q.eq(q.field("name"), entry.name))
                .first();
            if (!existing) {
                await ctx.db.insert("effectsLibrary", entry);
            }
        }
        return true;
    },
});

export const getMyItems = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        return await ctx.db
            .query("items")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
    },
});

// --- SPELLS ---
export const createSpell = mutation({
    args: {
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
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        return await ctx.db.insert("spells", {
            userId: identity.tokenIdentifier,
            ...args,
        });
    },
});

export const getCampaignSpells = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        return await ctx.db
            .query("spells")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
    },
});

export const getMySpells = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        return await ctx.db
            .query("spells")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
    },
});

// --- QUESTS ---
export const createQuest = mutation({
    args: {
        campaignId: v.optional(v.id("campaigns")),
        locationId: v.optional(v.id("locations")),
        title: v.string(),
        description: v.string(),
        rewards: v.string(),
        rewardItemIds: v.optional(v.array(v.id("items"))),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        return await ctx.db.insert("quests", {
            userId: identity.tokenIdentifier,
            ...args,
        });
    },
});

export const getMyQuests = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        return await ctx.db
            .query("quests")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
    },
});

// --- LOCATIONS ---
export const createLocation = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        type: v.string(),
        environment: v.optional(v.string()),
        description: v.string(),
        neighbors: v.array(v.id("locations")),
        imageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        return await ctx.db.insert("locations", {
            userId: identity.tokenIdentifier,
            ...args,
        });
    },
});

// --- NPCS ---
export const createNPC = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        description: v.string(),
        role: v.string(),
        attitude: v.string(),
        locationId: v.optional(v.id("locations")),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        return await ctx.db.insert("npcs", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name,
            description: args.description,
            role: args.role,
            attitude: args.attitude,
            locationId: args.locationId,
        });
    },
});

// --- EVENTS ---
export const createEvent = mutation({
    args: {
        campaignId: v.id("campaigns"),
        trigger: v.string(),
        effect: v.string(),
        locationId: v.optional(v.id("locations")),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        return await ctx.db.insert("events", {
            userId: identity.tokenIdentifier,
            ...args,
        });
    },
});

// --- SEEDING ---
export const seedCampaign = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await getUser(ctx);
        const userId = identity.tokenIdentifier;

        // 1. Create Campaign
        const campaignId = await ctx.db.insert("campaigns", {
            userId,
            title: "The Shadow of Eldoria",
            description: "A realm teetering on the brink of eternal twilight. Ancient magic is fading, and the shadows are growing longer.",
            imageId: undefined,
            xpRate: 1.5,
            rules: JSON.stringify({ magic: "wild", death: "permadeath" }),
            raritySettings: JSON.stringify({ Common: "#a8a29e", Rare: "#3b82f6", Legendary: "#f59e0b" }),
        });

        // 2. Create Locations
        const locKingdom = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Eldoria Capital",
            type: "City",
            description: "The shining heart of the realm, now dimmed by fear.",
            neighbors: [],
        });

        const locSwamp = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Whispering Swamp",
            type: "Swamp",
            description: "A fog-laden marsh where the voices of the lost can be heard.",
            neighbors: [locKingdom],
        });

        // 3. Create NPCs
        const npcGuard = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Captain Thorne",
            role: "Guard Captain",
            attitude: "Friendly",
            description: "A weary veteran trying to keep the peace.",
            locationId: locKingdom,
        });

        const npcWitch = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Baba Yara",
            role: "Witch",
            attitude: "Neutral",
            description: "An ancient crone who knows too much.",
            locationId: locSwamp,
        });

        // 4. Create Events
        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Player enters the Swamp at night",
            effect: "Wisps appear and lead them astray.",
            locationId: locSwamp,
        });

        // 5. Create Quests
        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "The Missing Scout",
            description: "Find the scout who went missing in the Whispering Swamp.",
            status: "Active",
            locationId: locSwamp,
            npcId: npcGuard,
        });

        // 6. Create Items with different rarities
        const itemSword = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Shadowbane Sword",
            type: "Weapon",
            rarity: "Legendary",
            effects: "Deals extra damage to shadow creatures",
            description: "Forged in moonlight, the blade hums when near shadow magic.",
            specialAbilities: "While attuned, the wielder can cast 'Dispel Shadows' once per long rest.",
            usage: "Requires two hands; glows softly near undead.",
            requirements: "Attunement by a creature who has slain a shadow.",
            lore: "Legends claim only the first king of Eldoria knew its full name.",
            textColor: "#f59e0b",
        });

        const itemPotion = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Health Potion",
            type: "Consumable",
            rarity: "Common",
            effects: "Restores 50 HP",
            description: "A bitter crimson brew that knits flesh with a flash of heat.",
            specialAbilities: "On a critical success, restores an additional 10 HP.",
            usage: "Drink as an action; bottle shatters on impact.",
            requirements: "None",
            textColor: "#9ca3af",
        });

        const itemAmulet = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Amulet of Light",
            type: "Accessory",
            rarity: "Rare",
            effects: "Provides resistance to darkness",
            description: "A cool silver disc etched with ever-burning runes.",
            specialAbilities: "Emits bright light in a 15 ft radius while wearer is conscious.",
            usage: "Worn around the neck; light can be dimmed as a bonus action.",
            requirements: "Attunement by a spellcaster.",
            textColor: "#3b82f6",
        });

        const itemBoot = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Swamp Waders",
            type: "Armor",
            rarity: "Uncommon",
            effects: "Move faster through swamps",
            description: "Thick leather boots sealed with tar to keep rot at bay.",
            specialAbilities: "Advantage on checks to avoid being restrained by mud or roots.",
            usage: "Counts as light armor; reduces movement penalties from difficult terrain in wetlands.",
            requirements: "Medium or smaller creature.",
            textColor: "#22c55e",
            spawnLocationIds: [locSwamp],
        });

        // 7. Create Monsters with item drops
        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Shadow Wraith",
            description: "A twisted creature born from the fading light, it hunts in the darkness.",
            health: 150,
            damage: 25,
            locationId: locSwamp,
            dropItemIds: [itemAmulet, itemPotion],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Swamp Lurker",
            description: "A massive beast that dwells in the murky waters of the swamp.",
            health: 200,
            damage: 30,
            locationId: locSwamp,
            dropItemIds: [itemBoot, itemPotion],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Corrupted Guardian",
            description: "Once a protector of Eldoria, now twisted by dark magic.",
            health: 300,
            damage: 45,
            locationId: locKingdom,
            dropItemIds: [itemSword],
        });

        // 8. Set rarity colors for the campaign
        await ctx.db.patch(campaignId, {
            rarityColors: JSON.stringify({
                Common: "#9ca3af",
                Uncommon: "#22c55e",
                Rare: "#3b82f6",
                Epic: "#a855f7",
                Legendary: "#f59e0b"
            }),
        });

        return campaignId;
    },
});

// --- MONSTERS ---
export const createMonster = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        description: v.string(),
        health: v.number(),
        damage: v.number(),
        dropItemIds: v.optional(v.array(v.id("items"))),
        locationId: v.optional(v.id("locations")),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        return await ctx.db.insert("monsters", {
            userId: identity.tokenIdentifier,
            ...args,
        });
    },
});

// --- RARITY COLORS ---
export const updateRarityColors = mutation({
    args: {
        campaignId: v.id("campaigns"),
        rarityColors: v.string(), // JSON string
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }
        await ctx.db.patch(args.campaignId, {
            rarityColors: args.rarityColors,
        });
    },
});
