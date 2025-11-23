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
        
        const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Enrich with player counts
        const enrichedCampaigns = await Promise.all(
            campaigns.map(async (campaign) => {
                const characters = await ctx.db
                    .query("characters")
                    .filter((q) => q.eq(q.field("campaignId"), campaign._id))
                    .collect();
                return {
                    ...campaign,
                    playerCount: characters.length,
                };
            })
        );

        return enrichedCampaigns;
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
        const identity = await ctx.auth.getUserIdentity();
        
        // Public access allowed for campaign details
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

        // Fetch items created by the DM for this campaign (Templates)
        const items = await ctx.db
            .query("items")
            .withIndex("by_user", (q) => q.eq("userId", dmUserId))
            .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
            .collect();

        const spells = await ctx.db
            .query("spells")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        // Fetch Player Specific Data (Inventory & Active Quests)
        let inventory: any[] = [];
        let activeQuests: any[] = [];
        let character: any = null;

        if (identity) {
            const userId = identity.tokenIdentifier;
            
            inventory = await ctx.db
                .query("items")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .collect();

            activeQuests = await ctx.db
                .query("quests")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .collect();

            character = await ctx.db
                .query("characters")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .first();
        }

        return { campaign, locations, events, quests, npcs, monsters, items, spells, inventory, activeQuests, character };
    },
});

export const updateCharacterStats = mutation({
    args: {
        characterId: v.id("characters"),
        stats: v.string(), // JSON string
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const character = await ctx.db.get(args.characterId);

        if (!character) {
            throw new Error("Character not found");
        }

        if (character.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.characterId, {
            stats: args.stats,
        });
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

export const getPlayedCampaigns = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const characters = await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();

        // Fetch all items for the user to distribute them by campaign
        const allUserItems = await ctx.db
            .query("items")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();

        const campaignIds = [...new Set(characters.map((c) => c.campaignId).filter((id) => id !== undefined))];

        const campaigns = await Promise.all(
            campaignIds.map(async (id) => {
                if (!id) return null;
                const campaign = await ctx.db.get(id);
                if (!campaign) return null;

                const character = characters.find(c => c.campaignId === id);
                const items = allUserItems.filter(item => item.campaignId === id);

                return {
                    ...campaign,
                    character,
                    items
                };
            })
        );

        return campaigns.filter((c) => c !== null);
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
        source: v.optional(v.string()),
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
            source: "creator",
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

// --- REWARDS SYSTEM ---
export const grantRewards = mutation({
    args: {
        campaignId: v.id("campaigns"),
        itemNames: v.optional(v.array(v.string())),
        questTitles: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;
        const userId = identity.tokenIdentifier;

        // 1. Handle Items
        if (args.itemNames && args.itemNames.length > 0) {
            // Fetch all campaign items (templates) first to minimize queries
            // In a real app, you'd want to be more specific with indexing
            const campaignItems = await ctx.db
                .query("items")
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .collect();

            for (const name of args.itemNames) {
                // Find the template (ignoring user ownership, looking for matching name in campaign)
                const template = campaignItems.find(i => i.name.toLowerCase() === name.toLowerCase());
                
                if (template) {
                    // Check if user already has this item to prevent duplicates if desired
                    // For now, we allow duplicates (e.g. multiple potions)
                    await ctx.db.insert("items", {
                        userId, // Assign to player
                        campaignId: args.campaignId,
                        name: template.name,
                        type: template.type,
                        rarity: template.rarity,
                        effects: template.effects,
                        effectId: template.effectId,
                        spellId: template.spellId,
                        description: template.description,
                        specialAbilities: template.specialAbilities,
                        usage: template.usage,
                        requirements: template.requirements,
                        lore: template.lore,
                        textColor: template.textColor,
                        imageId: template.imageId,
                    });
                }
            }
        }

        // 2. Handle Quests
        if (args.questTitles && args.questTitles.length > 0) {
            const campaignQuests = await ctx.db
                .query("quests")
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .collect();

            for (const title of args.questTitles) {
                const template = campaignQuests.find(q => q.title.toLowerCase() === title.toLowerCase());
                
                // Check if player already has this quest
                const existing = await ctx.db
                    .query("quests")
                    .withIndex("by_user", (q) => q.eq("userId", userId))
                    .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                    .filter((q) => q.eq(q.field("title"), title)) // Use exact title from AI
                    .first();

                                    if (!existing) {
                                        if (template) {
                                            await ctx.db.insert("quests", {
                                                userId, // Assign to player
                                                campaignId: args.campaignId,
                                                locationId: template.locationId,
                                                title: template.title,
                                                description: template.description,
                                                rewards: template.rewards,
                                                rewardItemIds: template.rewardItemIds,
                                                status: "Active",
                                                npcId: template.npcId,
                                                source: template.source || "creator",
                                            });
                                        } else {
                                            // Dynamic Quest (AI Generated)
                                            await ctx.db.insert("quests", {
                                                userId,
                                                campaignId: args.campaignId,
                                                title: title,
                                                description: "A quest granted by the Dungeon Master.",
                                                status: "Active",
                                                rewards: "Unknown",
                                                source: "ai",
                                            });
                                        }
                                    }            }
        }
    },
});

export const resolveQuest = mutation({
    args: {
        campaignId: v.id("campaigns"),
        questTitle: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;
        const userId = identity.tokenIdentifier;

        // Find the active quest for this user
        const quest = await ctx.db
            .query("quests")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
            .filter((q) => q.eq(q.field("status"), "Active"))
            .collect();
            
        // Case-insensitive match
        const targetQuest = quest.find(q => q.title.toLowerCase() === args.questTitle.toLowerCase());

        if (!targetQuest) return;

        // 1. Mark as Completed
        await ctx.db.patch(targetQuest._id, { status: "Completed" });

        // 2. Grant Reward Items
        if (targetQuest.rewardItemIds && targetQuest.rewardItemIds.length > 0) {
            for (const itemId of targetQuest.rewardItemIds) {
                const template = await ctx.db.get(itemId);
                if (template) {
                    await ctx.db.insert("items", {
                        userId, // Assign to player
                        campaignId: args.campaignId,
                        name: template.name,
                        type: template.type,
                        rarity: template.rarity,
                        effects: template.effects,
                        effectId: template.effectId,
                        spellId: template.spellId,
                        description: template.description,
                        specialAbilities: template.specialAbilities,
                        usage: template.usage,
                        requirements: template.requirements,
                        lore: template.lore,
                        textColor: template.textColor,
                        imageId: template.imageId,
                    });
                }
            }
        }
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

// --- SKRYIM SEED ---
export const seedSkyrim = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await getUser(ctx);
        const userId = identity.tokenIdentifier;

        // 1. Create Campaign
        const campaignId = await ctx.db.insert("campaigns", {
            userId,
            title: "The Elder Scrolls: Skyrim",
            description: "The Empire of Tamriel is on the edge. The High King of Skyrim has been murdered. Alliances form as claims to the throne are made. In the midst of this conflict, a far more dangerous, ancient evil is awakened. Dragons, long lost to the passages of the Elder Scrolls, have returned to Tamriel.",
            xpRate: 1.0,
            rules: JSON.stringify({ magic: "standard", death: "respawn_at_shrine", combat: "real_time_turns" }),
            raritySettings: JSON.stringify({ Common: "#d1d5db", Uncommon: "#22c55e", Rare: "#3b82f6", Epic: "#a855f7", Legendary: "#fbbf24" }),
        });

        // 2. Create Locations
        // Riverwood
        const locRiverwood = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Riverwood",
            type: "Village",
            environment: "Forest, River, Valley",
            description: "A small timberline village located on the banks of the White River.",
            neighbors: [],
        });

        // Whiterun Hold
        const locWhiterun = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Whiterun",
            type: "City",
            environment: "Tundra, Plains, Fortified",
            description: "The capital of Whiterun Hold, located in the center of the province.",
            neighbors: [locRiverwood],
        });

        const locDragonsreach = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Dragonsreach",
            type: "Keep",
            environment: "Stone, Indoor, Castle",
            description: "The palace of the Jarl of Whiterun, built to hold a captive dragon.",
            neighbors: [locWhiterun],
        });

        const locBarrow = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Bleak Falls Barrow",
            type: "Dungeon",
            environment: "Snow, Ruins, Ancient",
            description: "An ancient Nordic tomb located west of Riverwood.",
            neighbors: [locRiverwood],
        });

        const locHighHrothgar = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "High Hrothgar",
            type: "Monastery",
            environment: "Mountain, Snow, Stone",
            description: "A monastery sitting on the slopes of the Throat of the World.",
            neighbors: [locWhiterun],
        });

        const locThroat = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Throat of the World",
            type: "Mountain Peak",
            environment: "Snow, High Altitude, Wind",
            description: "The highest peak in Tamriel, home to Paarthurnax.",
            neighbors: [locHighHrothgar],
        });

        // Major Cities & Holds
        const locSolitude = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Solitude",
            type: "City",
            environment: "Coastal, Stone, Imperial",
            description: "The capital of Skyrim, home of the High King and headquarters of the Imperial Legion.",
            neighbors: [locWhiterun], // Simplified connection
        });

        const locWindhelm = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Windhelm",
            type: "City",
            environment: "Snow, Stone, Ancient",
            description: "The oldest city in Skyrim, capital of the Stormcloak rebellion.",
            neighbors: [locWhiterun],
        });

        const locMarkarth = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Markarth",
            type: "City",
            environment: "Stone, Dwemer Ruins, Mountain",
            description: "A city carved into the living rock of the Druadach Mountains by the Dwemer.",
            neighbors: [locSolitude],
        });

        // The Rift
        const locRiften = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Riften",
            type: "City",
            environment: "Forest, Lake, Autumn",
            description: "A city in the southeastern Rift hold, known for the Thieves Guild.",
            neighbors: [locWhiterun, locWindhelm],
        });

        const locIvarstead = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Ivarstead",
            type: "Village",
            environment: "Mountain Base, River",
            description: "A small village at the foot of the 7,000 Steps.",
            neighbors: [locRiften, locHighHrothgar],
        });

        const locRorikstead = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Rorikstead",
            type: "Village",
            environment: "Farms, Plains",
            description: "A humble farming village in western Whiterun Hold.",
            neighbors: [locWhiterun],
        });

        const locDragonBridge = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Dragon Bridge",
            type: "Village",
            environment: "River, Bridge, Road",
            description: "Named for the ancient dragon-headed bridge that spans the Karth River.",
            neighbors: [locSolitude],
        });

        const locKarthwasten = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Karthwasten",
            type: "Village",
            environment: "Mining, Hills",
            description: "A mining town in the Reach, seemingly owned by the Silver-Blood family.",
            neighbors: [locMarkarth],
        });

        const locWinterhold = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Winterhold",
            type: "City",
            environment: "Snow, Cliffs, Ruins",
            description: "Once a great capital, now a shadow of its former self. Home to the College.",
            neighbors: [locWindhelm],
        });

        const locCollege = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "College of Winterhold",
            type: "Academy",
            environment: "Stone, Magic, Cliffs",
            description: "A school for magic, separated from the city by a narrow bridge.",
            neighbors: [locWinterhold],
        });

        const locFalkreath = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Falkreath",
            type: "Village",
            environment: "Forest, Graveyard, Fog",
            description: "A town within a forest, known for its large graveyard.",
            neighbors: [locRiverwood],
        });

        const locMorthal = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Morthal",
            type: "Village",
            environment: "Swamp, Fog, Mystic",
            description: "A small town in the marshes of Hjaalmarch.",
            neighbors: [locSolitude],
        });

        const locDawnstar = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Dawnstar",
            type: "Port",
            environment: "Snow, Coastal",
            description: "A port city on the northern coast, plagued by nightmares.",
            neighbors: [locWinterhold, locMorthal],
        });

        // Dungeons & Special Locations
        const locLabyrinthian = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Labyrinthian",
            type: "Ruins",
            environment: "Ancient, Magic, Undead",
            description: "An ancient Nordic city, now a ruin teeming with undead and trolls.",
            neighbors: [locMorthal],
        });

        const locBlackreach = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Blackreach",
            type: "Cavern",
            environment: "Underground, Glowing Mushrooms, Dwemer",
            description: "A massive underground cavern connecting several Dwemer ruins.",
            neighbors: [locWinterhold, locWhiterun], // Abstract connections
        });

        const locSanctuary = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Dark Brotherhood Sanctuary",
            type: "Hideout",
            environment: "Cave, Secret, Dark",
            description: "The hidden lair of the Dark Brotherhood near Falkreath.",
            neighbors: [locFalkreath],
        });

        const locCastleVolkihar = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Castle Volkihar",
            type: "Castle",
            environment: "Island, Gothic, Vampire",
            description: "An ancient castle on an island, home to the Volkihar vampire clan.",
            neighbors: [locSolitude],
        });

        // Update Neighbors for existing
        await ctx.db.patch(locWhiterun, { neighbors: [locRiverwood, locRorikstead, locRiften, locWindhelm] });
        await ctx.db.patch(locSolitude, { neighbors: [locDragonBridge, locMorthal] });
        await ctx.db.patch(locMarkarth, { neighbors: [locKarthwasten] });

        // 3. Create Spells & Shouts
        // Existing
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Flames",
            level: 0,
            school: "Destruction",
            castingTime: "Action",
            range: "15 ft",
            duration: "Instant",
            description: "A gout of fire streams from your hand.",
            damageDice: "1d8",
            damageType: "Fire",
            tags: ["fire", "cantrip"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Healing",
            level: 1,
            school: "Restoration",
            castingTime: "Action",
            range: "Touch",
            duration: "Instant",
            description: "Heals a target for a small amount.",
            damageDice: "1d8+mod",
            damageType: "Healing",
            tags: ["healing"],
        });

        // New Spells
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Fireball",
            level: 3,
            school: "Destruction",
            castingTime: "Action",
            range: "150 ft",
            duration: "Instant",
            description: "A bright streak flashes from your pointing finger to a point you choose... then blossoms with a low roar into an explosion of flame.",
            damageDice: "8d6",
            damageType: "Fire",
            tags: ["fire", "aoe"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Ice Storm",
            level: 4,
            school: "Destruction",
            castingTime: "Action",
            range: "Self (Cone)",
            duration: "Instant",
            description: "A freezing whirlwind that damages and slows enemies.",
            damageDice: "4d6",
            damageType: "Cold",
            tags: ["cold", "slow"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Lightning Bolt",
            level: 3,
            school: "Destruction",
            castingTime: "Action",
            range: "100 ft",
            duration: "Instant",
            description: "A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you.",
            damageDice: "8d6",
            damageType: "Lightning",
            tags: ["lightning"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Grand Healing",
            level: 5,
            school: "Restoration",
            castingTime: "Action",
            range: "Self (Radius)",
            duration: "Instant",
            description: "Heals everyone close to the caster.",
            damageDice: "3d8+mod",
            damageType: "Healing",
            tags: ["healing", "aoe"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Conjure Flame Atronach",
            level: 2,
            school: "Conjuration",
            castingTime: "Action",
            range: "60 ft",
            duration: "1 hour",
            description: "Summons a Flame Atronach to fight for you.",
            tags: ["summon", "fire"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Invisibility",
            level: 2,
            school: "Illusion",
            castingTime: "Action",
            range: "Touch",
            duration: "1 hour",
            description: "A creature you touch becomes invisible until it attacks or casts a spell.",
            tags: ["stealth", "utility"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Ebonyflesh",
            level: 5,
            school: "Alteration",
            castingTime: "Action",
            range: "Self",
            duration: "1 minute",
            description: "Improves the caster's armor rating significantly.",
            tags: ["defense"],
        });

        // Shouts
        const spellFusRoDah = await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Shout: Unrelenting Force",
            level: 3,
            school: "Thu'um",
            castingTime: "Action",
            range: "60 ft cone",
            duration: "Instant",
            description: "Your Voice heralds raw power, pushing aside anything - or anyone - who stands in your path.",
            save: "STR",
            tags: ["force", "knockback", "shout"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Shout: Whirlwind Sprint",
            level: 2,
            school: "Thu'um",
            castingTime: "Bonus Action",
            range: "Self",
            duration: "Instant",
            description: "Your Voice lashes out, carrying you forward at incredible speed.",
            tags: ["movement", "shout"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Shout: Become Ethereal",
            level: 4,
            school: "Thu'um",
            castingTime: "Bonus Action",
            range: "Self",
            duration: "18 seconds",
            description: "The Thu'um reaches out to the Void, changing your form to one that cannot harm or be harmed.",
            tags: ["defense", "shout"],
        });

        // 4. Create Items
        // Consumables
        const itemSweetroll = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Sweetroll",
            type: "Consumable",
            rarity: "Common",
            effects: "Restores 5 HP",
            description: "A small, sweet pastry. Hopefully nobody stole it.",
            usage: "Eat",
            textColor: "#d1d5db",
        });

        const itemPotionMinor = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Potion of Minor Healing",
            type: "Consumable",
            rarity: "Common",
            effects: "Restores 25 HP",
            description: "A ruddy liquid that smells of wildflowers.",
            usage: "Drink",
            textColor: "#d1d5db",
        });

        // Basic Gear
        const itemIronHelmet = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Iron Helmet",
            type: "Armor",
            rarity: "Common",
            effects: "+1 AC",
            description: "A standard helmet used by guards and bandits alike.",
            usage: "Head slot",
            textColor: "#d1d5db",
        });

        const itemSteelSword = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Steel Sword",
            type: "Weapon",
            rarity: "Common",
            effects: "1d8 Slashing",
            description: "A reliable blade forged from steel.",
            usage: "One-handed",
            textColor: "#d1d5db",
        });

        // Artifacts
        const itemDragonstone = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Dragonstone",
            type: "Key Item",
            rarity: "Rare",
            effects: "Quest Item",
            description: "An ancient stone tablet from Bleak Falls Barrow, etched with a map of dragon burial mounds.",
            lore: "Farengar Secret-Fire has been looking for this.",
            textColor: "#3b82f6",
            spawnLocationIds: [locBarrow],
        });

        const itemAmuletTalos = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Amulet of Talos",
            type: "Accessory",
            rarity: "Uncommon",
            effects: "Reduces Shout cooldown by 20%",
            description: "An amulet depicting the god Talos.",
            lore: "Worshipping Talos is technically banned by the White-Gold Concordat.",
            textColor: "#22c55e",
        });

        const itemMehrunesRazor = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Mehrunes' Razor",
            type: "Dagger",
            rarity: "Legendary",
            effects: "Chance to instantly kill",
            description: "A wicked dagger forged by the Daedric Prince of Destruction.",
            specialAbilities: "Hits have a small chance to instantly kill the target.",
            lore: "Artifact of Mehrunes Dagon.",
            textColor: "#fbbf24",
        });

        const itemMolagBalMace = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Mace of Molag Bal",
            type: "Mace",
            rarity: "Legendary",
            effects: "Drains Stamina and Magicka",
            description: "A menacing mace with a face that seems to scream in agony.",
            specialAbilities: "Drains resources from the victim and traps their soul.",
            lore: "Artifact of the Daedric Prince of Domination.",
            textColor: "#fbbf24",
        });

        const itemDawnbreaker = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Dawnbreaker",
            type: "Sword",
            rarity: "Legendary",
            effects: "Fire Damage; Explosion on Undead kill",
            description: "A blade that glows with the light of the sun.",
            specialAbilities: "Undead killed by this weapon may explode, turning other undead.",
            lore: "Artifact of Meridia.",
            textColor: "#fbbf24",
        });

        const itemWabbajack = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Wabbajack",
            type: "Staff",
            rarity: "Legendary",
            effects: "Random Effect",
            description: "A mysterious staff topped with three faces.",
            specialAbilities: "Casts a random spell or transforms the target.",
            lore: "Artifact of Sheogorath, Daedric Prince of Madness.",
            textColor: "#fbbf24",
        });

        const itemAzuraStar = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Azura's Star",
            type: "Artifact",
            rarity: "Legendary",
            effects: "Reusable Soul Gem",
            description: "A beautiful star-shaped gem that can hold any white soul.",
            specialAbilities: "Does not break after use.",
            lore: "Artifact of Azura.",
            textColor: "#fbbf24",
        });

        const itemNightingaleBlade = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Nightingale Blade",
            type: "Sword",
            rarity: "Epic",
            effects: "Absorbs Health and Stamina",
            description: "A blade wielded by the Nightingales of Nocturnal.",
            textColor: "#a855f7",
        });

        const itemBladeOfWoe = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Blade of Woe",
            type: "Dagger",
            rarity: "Epic",
            effects: "Absorbs Health",
            description: "A legendary dagger associated with the Dark Brotherhood.",
            textColor: "#a855f7",
        });

        const itemStaffOfMagnus = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Staff of Magnus",
            type: "Staff",
            rarity: "Epic",
            effects: "Drains Magicka, then Health",
            description: "An ancient staff capable of containing the Eye of Magnus.",
            textColor: "#a855f7",
        });

        const itemChillrend = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Chillrend",
            type: "Sword",
            rarity: "Epic",
            effects: "Frost Damage; Chance to Paralyze",
            description: "A glass sword that radiates cold.",
            textColor: "#a855f7",
        });

        // 5. Create NPCs
        // Riverwood
        const npcRalof = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Ralof",
            role: "Stormcloak Soldier",
            attitude: "Friendly",
            description: "A Nord rebel who escaped Helgen with you.",
            locationId: locRiverwood,
        });

        const npcAlvor = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Alvor",
            role: "Blacksmith",
            attitude: "Friendly",
            description: "The local blacksmith in Riverwood.",
            locationId: locRiverwood,
        });

        const npcDelphine = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Delphine",
            role: "Innkeeper / Blade",
            attitude: "Suspicious",
            description: "Runs the Sleeping Giant Inn, but seems to be more than she appears.",
            locationId: locRiverwood,
        });

        // Whiterun
        const npcBalgruuf = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Jarl Balgruuf the Greater",
            role: "Jarl of Whiterun",
            attitude: "Neutral",
            description: "A wise but weary ruler, trying to stay out of the civil war.",
            locationId: locDragonsreach,
        });

        const npcFarengar = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Farengar Secret-Fire",
            role: "Court Wizard",
            attitude: "Arrogant",
            description: "The Jarl's wizard, obsessed with dragons.",
            locationId: locDragonsreach,
        });

        const npcKodlak = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Kodlak Whitemane",
            role: "Harbinger of the Companions",
            attitude: "Wise",
            description: "Leader of the Companions, seeks a cure for his lycanthropy.",
            locationId: locWhiterun,
        });

        // Solitude
        const npcTullius = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "General Tullius",
            role: "Imperial General",
            attitude: "Stern",
            description: "Commander of the Imperial Legion in Skyrim.",
            locationId: locSolitude,
        });

        const npcElisif = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Jarl Elisif the Fair",
            role: "Jarl of Solitude",
            attitude: "Friendly",
            description: "The widow of High King Torygg, young and inexperienced.",
            locationId: locSolitude,
        });

        // Windhelm
        const npsUlfric = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Ulfric Stormcloak",
            role: "Jarl of Windhelm",
            attitude: "Passionate",
            description: "Leader of the Stormcloak rebellion.",
            locationId: locWindhelm,
        });

        // Winterhold
        const npcSavos = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Savos Aren",
            role: "Arch-Mage",
            attitude: "Distant",
            description: "The Arch-Mage of the College of Winterhold.",
            locationId: locCollege,
        });

        // Riften
        const npcMercer = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Mercer Frey",
            role: "Guild Master",
            attitude: "Cold",
            description: "Leader of the Thieves Guild.",
            locationId: locRiften,
        });

        // Dark Brotherhood
        const npcAstrid = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Astrid",
            role: "Assassin Leader",
            attitude: "Dominant",
            description: "Leader of the Dark Brotherhood in Skyrim.",
            locationId: locSanctuary,
        });

        const npcCicero = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Cicero",
            role: "Jester / Keeper",
            attitude: "Insane",
            description: "Keeper of the Night Mother, prone to dancing and rhymes.",
            locationId: locFalkreath, // Wandering nearby
        });

        // Others
        const npcSerana = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Serana",
            role: "Vampire",
            attitude: "Guarded",
            description: "An ancient vampire daughter of Coldharbour.",
            locationId: locMorthal, // Starts near Dimhollow/Morthal
        });

        const npcArngeir = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Arngeir",
            role: "Greybeard",
            attitude: "Wise",
            description: "The voice of the Greybeards.",
            locationId: locHighHrothgar,
        });

        const npcPaarthurnax = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Paarthurnax",
            role: "Dragon / Mentor",
            attitude: "Friendly",
            description: "An ancient dragon who meditates at the peak of the world.",
            locationId: locThroat,
        });

        // 6. Create Monsters
        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Mudcrab",
            description: "Annoying crustaceans found near water.",
            health: 10,
            damage: 2,
            locationId: locRiverwood,
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Draugr",
            description: "Undead Nords guarding ancient tombs.",
            health: 30,
            damage: 5,
            locationId: locBarrow,
            dropItemIds: [itemSteelSword, itemIronHelmet],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Draugr Overlord",
            description: "A powerful undead warrior.",
            health: 80,
            damage: 12,
            locationId: locBarrow,
            dropItemIds: [itemDragonstone],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Frost Troll",
            description: "A hulking beast with regenerating health.",
            health: 60,
            damage: 15,
            locationId: locHighHrothgar,
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Mirmulnir",
            description: "The first dragon you fight at the Western Watchtower.",
            health: 200,
            damage: 25,
            locationId: locWhiterun,
            dropItemIds: [itemSteelSword],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Alduin",
            description: "The World-Eater.",
            health: 1000,
            damage: 50,
            locationId: locThroat, // Appears here in story
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Giant",
            description: "Massive nomadic herders.",
            health: 200,
            damage: 40,
            locationId: locWhiterun, // Secunda's Kiss
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Falmer Shadowmaster",
            description: "Corrupted elves living deep underground.",
            health: 150,
            damage: 20,
            locationId: locBlackreach,
            dropItemIds: [itemPotionMinor],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Dwemer Centurion",
            description: "A massive steam-powered automaton.",
            health: 300,
            damage: 45,
            locationId: locBlackreach,
        });

        // 7. Create Quests
        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Before the Storm",
            description: "Go to Whiterun and inform Jarl Balgruuf about the dragon attack at Helgen.",
            status: "Active",
            locationId: locRiverwood,
            npcId: npcAlvor,
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Bleak Falls Barrow",
            description: "Farengar needs you to retrieve the Dragonstone from Bleak Falls Barrow.",
            status: "Pending",
            locationId: locDragonsreach,
            npcId: npcFarengar,
            rewardItemIds: [itemPotionMinor],
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "The Way of the Voice",
            description: "The Greybeards have summoned you to High Hrothgar.",
            status: "Pending",
            locationId: locHighHrothgar,
            npcId: npcArngeir,
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "The Jagged Crown",
            description: "Retrieve the Jagged Crown for Ulfric Stormcloak or General Tullius.",
            status: "Pending",
            locationId: locWindhelm,
            npcId: npsUlfric,
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Proving Honor",
            description: "Complete a trial to join the Companions' Inner Circle.",
            status: "Pending",
            locationId: locWhiterun,
            npcId: npcKodlak,
            rewardItemIds: [itemSteelSword],
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Under Saarthal",
            description: "Explore the ruins of Saarthal with the College of Winterhold.",
            status: "Pending",
            locationId: locCollege,
            npcId: npcSavos,
            rewardItemIds: [itemStaffOfMagnus],
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Taking Care of Business",
            description: "Collect debts for the Thieves Guild.",
            status: "Pending",
            locationId: locRiften,
            npcId: npcMercer,
            rewardItemIds: [itemNightingaleBlade],
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "With Friends Like These...",
            description: "You have been kidnapped by the Dark Brotherhood.",
            status: "Pending",
            locationId: locSanctuary,
            npcId: npcAstrid,
            rewardItemIds: [itemBladeOfWoe],
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "The House of Horrors",
            description: "Investigate the abandoned house in Markarth.",
            status: "Pending",
            locationId: locMarkarth,
            rewards: "Mace of Molag Bal",
            rewardItemIds: [itemMolagBalMace],
            source: "creator",
        });

        // 8. Create Events
        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Fast Travel to Mountains",
            effect: "A dragon is spotted circling overhead.",
            locationId: locWhiterun,
        });

        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Night time",
            effect: "The Aurora Borealis lights up the sky, restoring magicka regeneration.",
        });

        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Enter Blackreach",
            effect: "The crimson nirnroot chimes softly in the darkness.",
            locationId: locBlackreach,
        });

        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Night on the roads",
            effect: "A Headless Horseman rides past in silence, leading to Hamvir's Rest.",
        });

        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Enter any Tavern",
            effect: "A man named Sam Guevenne challenges you to a drinking contest.",
        });

        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Night in a City",
            effect: "Vampires attack the gates! 'Death to the mortals!'",
        });

        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Courier Delivery",
            effect: "A courier runs up to you: 'I've got a letter and a lot of gold. Something about an inheritance?'",
        });

        await ctx.db.insert("events", {
            userId,
            campaignId,
            trigger: "Cultist Ambush",
            effect: "Two Cultists approach you, claiming you are a false Dragonborn.",
            locationId: locRiverwood,
        });


        // 9. Set Colors
        await ctx.db.patch(campaignId, {
            rarityColors: JSON.stringify({
                Common: "#d1d5db",
                Uncommon: "#22c55e",
                Rare: "#3b82f6",
                Epic: "#a855f7",
                Legendary: "#fbbf24"
            }),
        });

        return campaignId;
    },
});

