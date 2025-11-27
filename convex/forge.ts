import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getMyCampaigns = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        
        const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
        
        // Get image URLs for campaigns that have images
        return Promise.all(
            campaigns.map(async (campaign) => ({
                ...campaign,
                imageUrl: campaign.imageId
                    ? await ctx.storage.getUrl(campaign.imageId)
                    : null,
            }))
        );
    },
});

// Get campaigns where user has characters but doesn't own the campaign
export const getPlayedCampaigns = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        
        // Get user's characters
        const myCharacters = await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
        
        // Get unique campaign IDs from characters
        const campaignIds = [...new Set(
            myCharacters
                .map((c) => c.campaignId)
                .filter((id): id is NonNullable<typeof id> => id !== undefined)
        )];
        
        // Fetch those campaigns and filter out ones the user owns
        const campaigns = await Promise.all(
            campaignIds.map((id) => ctx.db.get(id))
        );
        
        const playedCampaigns = campaigns.filter(
            (c): c is NonNullable<typeof c> => 
                c !== null && c.userId !== identity.tokenIdentifier
        );
        
        return Promise.all(
            playedCampaigns.map(async (campaign) => ({
                ...campaign,
                imageUrl: campaign.imageId
                    ? await ctx.storage.getUrl(campaign.imageId)
                    : null,
            }))
        );
    },
});

export const getMyCharacters = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        
        const characters = await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
        
        return Promise.all(
            characters.map(async (character) => ({
                ...character,
                imageUrl: character.imageId
                    ? await ctx.storage.getUrl(character.imageId)
                    : null,
            }))
        );
    },
});

export const getMyItems = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        
        return ctx.db
            .query("items")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
    },
});

export const getMySpells = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        
        return ctx.db
            .query("spells")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();
    },
});

// Get aggregated hero stats across all realms
export const getMyHeroesStats = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return {
                characters: [],
                totalLevel: 0,
                totalItems: 0,
                totalSpells: 0,
            };
        }

        // Get all user's characters
        const characters = await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();

        // Get all user's items
        const allItems = await ctx.db
            .query("items")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();

        // Get all user's spells
        const allSpells = await ctx.db
            .query("spells")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();

        // Get unique campaign IDs
        const campaignIds = [...new Set(
            characters
                .map((c) => c.campaignId)
                .filter((id): id is NonNullable<typeof id> => id !== undefined)
        )];

        // Fetch campaign details
        const campaigns = await Promise.all(
            campaignIds.map((id) => ctx.db.get(id))
        );

        // Create campaign lookup map
        const campaignMap = new Map(
            campaigns
                .filter((c): c is NonNullable<typeof c> => c !== null)
                .map((c) => [c._id, c])
        );

        // Build enriched character data
        const enrichedCharacters = await Promise.all(
            characters.map(async (char) => {
                const campaign = char.campaignId ? campaignMap.get(char.campaignId) : null;
                
                // Count items for this campaign
                const campaignItems = allItems.filter(
                    (item) => item.campaignId === char.campaignId || (!item.campaignId && !char.campaignId)
                );
                
                // Count spells for this campaign
                const campaignSpells = allSpells.filter(
                    (spell) => spell.campaignId === char.campaignId || (!spell.campaignId && !char.campaignId)
                );

                // Get campaign image URL
                const campaignImageUrl = campaign?.imageId 
                    ? await ctx.storage.getUrl(campaign.imageId) 
                    : null;

                // Get character image URL
                const characterImageUrl = char.imageId
                    ? await ctx.storage.getUrl(char.imageId)
                    : null;

                return {
                    _id: char._id,
                    _creationTime: char._creationTime,
                    name: char.name,
                    class: char.class,
                    level: char.level,
                    stats: char.stats,
                    campaignId: char.campaignId,
                    campaignTitle: campaign?.title || "No Realm",
                    campaignImageUrl,
                    characterImageUrl,
                    itemCount: campaignItems.length,
                    spellCount: campaignSpells.length,
                    // Include some items for inventory preview (max 8)
                    inventoryPreview: campaignItems.slice(0, 8).map((item) => ({
                        _id: item._id,
                        name: item.name,
                        type: item.type,
                        rarity: item.rarity,
                        textColor: item.textColor,
                    })),
                };
            })
        );

        // Calculate totals
        const totalLevel = characters.reduce((sum, c) => sum + c.level, 0);
        const totalItems = allItems.length;
        const totalSpells = allSpells.length;

        return {
            characters: enrichedCharacters,
            totalLevel,
            totalItems,
            totalSpells,
        };
    },
});

// Genre definitions for the platform
export const REALM_GENRES = [
    { key: 'fantasy', label: 'Fantasy', icon: '🏰', description: 'Magic, dragons, and medieval adventures' },
    { key: 'sci-fi', label: 'Sci-Fi', icon: '🚀', description: 'Space exploration and future tech' },
    { key: 'anime', label: 'Anime', icon: '⚔️', description: 'Anime-inspired worlds and storylines' },
    { key: 'realism', label: 'Realism', icon: '🌍', description: 'Grounded, realistic settings' },
    { key: 'historical', label: 'Historical', icon: '📜', description: 'Adventures through history' },
    { key: 'horror', label: 'Horror', icon: '👻', description: 'Dark, terrifying experiences' },
    { key: 'mythology', label: 'Mythology', icon: '⚡', description: 'Gods, legends, and ancient myths' },
    { key: 'cyberpunk', label: 'Cyberpunk', icon: '🤖', description: 'High tech, low life dystopias' },
    { key: 'steampunk', label: 'Steampunk', icon: '⚙️', description: 'Victorian-era steam technology' },
    { key: 'post-apocalyptic', label: 'Post-Apocalyptic', icon: '☢️', description: 'Survival after the end' },
] as const;

// Get all public campaigns (for browsing)
export const getAllCampaigns = query({
    args: {},
    handler: async (ctx) => {
        const campaigns = await ctx.db.query("campaigns").collect();
        
        return Promise.all(
            campaigns.map(async (campaign) => ({
                ...campaign,
                imageUrl: campaign.imageId
                    ? await ctx.storage.getUrl(campaign.imageId)
                    : null,
            }))
        );
    },
});

// Get featured realms (admin-curated)
export const getFeaturedRealms = query({
    args: {},
    handler: async (ctx) => {
        const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_featured", (q) => q.eq("isFeatured", true))
            .collect();
        
        return Promise.all(
            campaigns.map(async (campaign) => ({
                ...campaign,
                imageUrl: campaign.imageId
                    ? await ctx.storage.getUrl(campaign.imageId)
                    : null,
            }))
        );
    },
});

// Get popular realms (sorted by view/play count)
export const getPopularRealms = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const campaigns = await ctx.db.query("campaigns").collect();
        
        // Sort by combined view + play count
        const sorted = campaigns.sort((a, b) => {
            const scoreA = (a.viewCount || 0) + (a.playCount || 0) * 2;
            const scoreB = (b.viewCount || 0) + (b.playCount || 0) * 2;
            return scoreB - scoreA;
        });
        
        const limited = sorted.slice(0, args.limit || 10);
        
        return Promise.all(
            limited.map(async (campaign) => ({
                ...campaign,
                imageUrl: campaign.imageId
                    ? await ctx.storage.getUrl(campaign.imageId)
                    : null,
            }))
        );
    },
});

// Get realms by genre
export const getRealmsByGenre = query({
    args: { genre: v.string() },
    handler: async (ctx, args) => {
        const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_genre", (q) => q.eq("genre", args.genre))
            .collect();
        
        return Promise.all(
            campaigns.map(async (campaign) => ({
                ...campaign,
                imageUrl: campaign.imageId
                    ? await ctx.storage.getUrl(campaign.imageId)
                    : null,
            }))
        );
    },
});

// Get newest realms
export const getNewestRealms = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const campaigns = await ctx.db
            .query("campaigns")
            .order("desc")
            .take(args.limit || 10);
        
        return Promise.all(
            campaigns.map(async (campaign) => ({
                ...campaign,
                imageUrl: campaign.imageId
                    ? await ctx.storage.getUrl(campaign.imageId)
                    : null,
            }))
        );
    },
});

// Get all realms organized by genre
export const getRealmsGroupedByGenre = query({
    args: {},
    handler: async (ctx) => {
        const campaigns = await ctx.db.query("campaigns").collect();
        
        // Get image URLs and group by genre
        const campaignsWithImages = await Promise.all(
            campaigns.map(async (campaign) => ({
                ...campaign,
                imageUrl: campaign.imageId
                    ? await ctx.storage.getUrl(campaign.imageId)
                    : null,
            }))
        );
        
        // Group by genre
        const grouped: Record<string, typeof campaignsWithImages> = {};
        
        for (const campaign of campaignsWithImages) {
            const genre = campaign.genre || 'uncategorized';
            if (!grouped[genre]) {
                grouped[genre] = [];
            }
            grouped[genre].push(campaign);
        }
        
        return grouped;
    },
});

// Increment view count when a realm is viewed
export const incrementRealmView = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return;
        
        await ctx.db.patch(args.campaignId, {
            viewCount: (campaign.viewCount || 0) + 1,
        });
    },
});

// Increment play count when a realm is played
export const incrementRealmPlay = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return;
        
        await ctx.db.patch(args.campaignId, {
            playCount: (campaign.playCount || 0) + 1,
        });
    },
});

// Get full campaign details with all related entities
export const getCampaignDetails = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;

        // Get current user for character lookup
        const identity = await ctx.auth.getUserIdentity();

        const [locations, allNpcs, items, quests, monsters, spells, lore, userCharacters, factions, regions] = await Promise.all([
            ctx.db.query("locations").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("npcs").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("items").withIndex("by_user", (q) => q.eq("userId", campaign.userId)).collect(),
            ctx.db.query("quests").withIndex("by_user", (q) => q.eq("userId", campaign.userId)).collect(),
            ctx.db.query("monsters").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("spells").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("lore").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            identity 
                ? ctx.db.query("characters")
                    .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
                    .collect()
                : Promise.resolve([]),
            ctx.db.query("factions").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("regions").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
        ]);

        const imageUrl = campaign.imageId ? await ctx.storage.getUrl(campaign.imageId) : null;

        // Filter items and quests for this campaign
        const campaignItems = items.filter((i) => !i.campaignId || i.campaignId === args.campaignId);
        const campaignQuests = quests.filter((q) => !q.campaignId || q.campaignId === args.campaignId);
        
        // Get active quests
        const activeQuests = campaignQuests.filter((q) => q.status === "active");
        
        // Get user's character for this campaign (or first character)
        const character = userCharacters.find((c) => c.campaignId === args.campaignId) || userCharacters[0] || null;

        // Separate living and dead NPCs
        const npcs = allNpcs.filter((npc) => !npc.isDead);
        const deadNpcs = allNpcs.filter((npc) => npc.isDead);

        return {
            campaign: { ...campaign, imageUrl },
            locations,
            npcs,
            deadNpcs, // Include dead NPCs for AI context
            items: campaignItems,
            quests: campaignQuests,
            activeQuests,
            monsters,
            spells,
            rules: campaign.rules,
            lore,
            character,
            inventory: campaignItems,
            factions,
            regions,
            bountyEnabled: campaign.bountyEnabled,
        };
    },
});

export const getEffectsLibrary = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db.query("effectsLibrary").collect();
    },
});

export const getMyProfile = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        return user;
    },
});

// --- MUTATIONS ---

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const createCampaign = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        xpRate: v.number(),
        rules: v.string(),
        imageId: v.optional(v.id("_storage")),
        genre: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        isPublic: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        return await ctx.db.insert("campaigns", {
            userId: identity.tokenIdentifier,
            title: args.title,
            description: args.description,
            xpRate: args.xpRate,
            rules: args.rules,
            imageId: args.imageId,
            genre: args.genre,
            tags: args.tags,
            isPublic: args.isPublic ?? true,
            viewCount: 0,
            playCount: 0,
        });
    },
});

export const createCharacter = mutation({
    args: {
        name: v.string(),
        class: v.string(),
        race: v.optional(v.string()),
        level: v.number(),
        stats: v.string(),
        campaignId: v.optional(v.id("campaigns")),
        imageId: v.optional(v.id("_storage")),
        background: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // If creating for a campaign, increment play count
        if (args.campaignId) {
            const campaign = await ctx.db.get(args.campaignId);
            if (campaign) {
                await ctx.db.patch(args.campaignId, {
                    playCount: (campaign.playCount || 0) + 1,
                });
            }
        }

        return await ctx.db.insert("characters", {
            userId: identity.tokenIdentifier,
            name: args.name,
            class: args.class,
            race: args.race,
            level: args.level,
            stats: args.stats,
            campaignId: args.campaignId,
            imageId: args.imageId,
            background: args.background,
        });
    },
});

// Check if character exists and return campaign character creation config
export const getCharacterCreationStatus = query({
    args: {
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { needsCreation: true, character: null, config: null };

        // Check for existing character
        const existingCharacter = await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
            .first();

        // Get campaign config
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Parse character creation config
        const config = {
            availableClasses: campaign.availableClasses
                ? JSON.parse(campaign.availableClasses)
                : [
                    { name: "Warrior", description: "A skilled fighter with strength and combat prowess" },
                    { name: "Mage", description: "A wielder of arcane magic and mystical arts" },
                    { name: "Rogue", description: "A cunning trickster skilled in stealth and agility" },
                    { name: "Cleric", description: "A divine healer blessed with holy magic" },
                    { name: "Ranger", description: "A wilderness expert with bow and blade" },
                ],
            availableRaces: campaign.availableRaces
                ? JSON.parse(campaign.availableRaces)
                : [
                    { name: "Human", description: "Versatile and adaptable, humans excel in all fields" },
                    { name: "Elf", description: "Graceful beings with keen senses and magical affinity" },
                    { name: "Dwarf", description: "Stout and sturdy folk with great resilience" },
                    { name: "Orc", description: "Powerful warriors with incredible strength" },
                    { name: "Halfling", description: "Small but nimble, with remarkable luck" },
                ],
            statAllocationMethod: campaign.statAllocationMethod || "standard_array",
            startingStatPoints: campaign.startingStatPoints || 27,
            allowCustomNames: campaign.allowCustomNames !== false, // default true
            terminology: campaign.terminology ? JSON.parse(campaign.terminology) : {},
            statConfig: campaign.statConfig ? JSON.parse(campaign.statConfig) : null,
            theme: campaign.theme,
        };

        return {
            needsCreation: !existingCharacter,
            character: existingCharacter,
            config,
        };
    },
});

// Ensure a character exists for a campaign (auto-create if not)
export const ensureCharacterForCampaign = mutation({
    args: {
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Check if user already has a character for this campaign
        const existingCharacter = await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
            .first();

        if (existingCharacter) {
            return { characterId: existingCharacter._id, created: false };
        }

        // Get campaign to potentially use its theme for character generation
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Create a new character for this campaign
        const characterId = await ctx.db.insert("characters", {
            userId: identity.tokenIdentifier,
            name: identity.name || "Traveler",
            class: "Adventurer",
            level: 1,
            stats: JSON.stringify({
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10,
            }),
            campaignId: args.campaignId,
        });

        // Increment play count for the campaign
        await ctx.db.patch(args.campaignId, {
            playCount: (campaign.playCount || 0) + 1,
        });

        return { characterId, created: true };
    },
});

export const createItem = mutation({
    args: {
        name: v.string(),
        type: v.string(),
        rarity: v.string(),
        effects: v.string(),
        campaignId: v.optional(v.id("campaigns")),
        description: v.optional(v.string()),
        specialAbilities: v.optional(v.string()),
        usage: v.optional(v.string()),
        requirements: v.optional(v.string()),
        lore: v.optional(v.string()),
        effectId: v.optional(v.id("effectsLibrary")),
        spellId: v.optional(v.id("spells")),
        textColor: v.optional(v.string()),
        imageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        return await ctx.db.insert("items", {
            userId: identity.tokenIdentifier,
            name: args.name,
            type: args.type,
            rarity: args.rarity,
            effects: args.effects,
            campaignId: args.campaignId,
            description: args.description,
            specialAbilities: args.specialAbilities,
            usage: args.usage,
            requirements: args.requirements,
            lore: args.lore,
            effectId: args.effectId,
            spellId: args.spellId,
            textColor: args.textColor,
            imageId: args.imageId,
        });
    },
});

export const createLocation = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        type: v.string(),
        environment: v.optional(v.string()),
        description: v.string(),
        neighbors: v.optional(v.array(v.id("locations"))),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        return await ctx.db.insert("locations", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name,
            type: args.type,
            environment: args.environment,
            description: args.description,
            neighbors: args.neighbors || [],
        });
    },
});

export const createEvent = mutation({
    args: {
        campaignId: v.id("campaigns"),
        trigger: v.string(),
        effect: v.string(),
        locationId: v.optional(v.id("locations")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        return await ctx.db.insert("events", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            trigger: args.trigger,
            effect: args.effect,
            locationId: args.locationId,
        });
    },
});

export const createNPC = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        role: v.string(),
        attitude: v.string(),
        description: v.string(),
        locationId: v.optional(v.id("locations")),
        // Health & Combat
        health: v.optional(v.number()),
        maxHealth: v.optional(v.number()),
        damage: v.optional(v.number()),
        armorClass: v.optional(v.number()),
        // Inventory & Loot
        inventoryItems: v.optional(v.array(v.id("items"))),
        dropItems: v.optional(v.array(v.id("items"))),
        gold: v.optional(v.number()),
        // Trading
        willTrade: v.optional(v.boolean()),
        tradeInventory: v.optional(v.array(v.id("items"))),
        tradePriceModifier: v.optional(v.number()),
        // Other
        isEssential: v.optional(v.boolean()),
        isRecruitable: v.optional(v.boolean()),
        recruitCost: v.optional(v.number()),
        factionId: v.optional(v.id("factions")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        // Set defaults for health if not provided
        const maxHealth = args.maxHealth ?? 20;
        const health = args.health ?? maxHealth;

        return await ctx.db.insert("npcs", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name,
            role: args.role,
            attitude: args.attitude,
            description: args.description,
            locationId: args.locationId,
            // Health & Combat
            health,
            maxHealth,
            damage: args.damage ?? 5,
            armorClass: args.armorClass ?? 10,
            // Inventory & Loot
            inventoryItems: args.inventoryItems,
            dropItems: args.dropItems,
            gold: args.gold ?? 0,
            // Trading
            willTrade: args.willTrade,
            tradeInventory: args.tradeInventory,
            tradePriceModifier: args.tradePriceModifier ?? 1.0,
            // Other
            isEssential: args.isEssential,
            isRecruitable: args.isRecruitable,
            recruitCost: args.recruitCost,
            factionId: args.factionId,
        });
    },
});

export const createQuest = mutation({
    args: {
        campaignId: v.id("campaigns"),
        title: v.string(),
        description: v.string(),
        locationId: v.optional(v.id("locations")),
        npcId: v.optional(v.id("npcs")),
        nextQuestId: v.optional(v.id("quests")),
        rewardItemIds: v.optional(v.array(v.id("items"))),
        rewardReputation: v.optional(v.string()),
        rewardWorldUpdates: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        return await ctx.db.insert("quests", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            title: args.title,
            description: args.description,
            status: "active",
            locationId: args.locationId,
            npcId: args.npcId,
            nextQuestId: args.nextQuestId,
            rewardItemIds: args.rewardItemIds,
            rewardReputation: args.rewardReputation,
            rewardWorldUpdates: args.rewardWorldUpdates,
        });
    },
});

export const createMonster = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        description: v.string(),
        health: v.number(),
        damage: v.number(),
        locationId: v.optional(v.id("locations")),
        dropItemIds: v.optional(v.array(v.id("items"))),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        return await ctx.db.insert("monsters", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name,
            description: args.description,
            health: args.health,
            damage: args.damage,
            locationId: args.locationId,
            dropItemIds: args.dropItemIds,
        });
    },
});

export const createSpell = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        level: v.number(),
        school: v.string(),
        castingTime: v.string(),
        range: v.string(),
        duration: v.string(),
        components: v.optional(v.string()),
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
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        return await ctx.db.insert("spells", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name,
            level: args.level,
            school: args.school,
            castingTime: args.castingTime,
            range: args.range,
            duration: args.duration,
            components: args.components,
            save: args.save,
            effectId: args.effectId,
            description: args.description,
            damageDice: args.damageDice,
            damageType: args.damageType,
            areaShape: args.areaShape,
            areaSize: args.areaSize,
            higherLevels: args.higherLevels,
            concentration: args.concentration,
            ritual: args.ritual,
            tags: args.tags,
            notes: args.notes,
        });
    },
});

export const updateRarityColors = mutation({
    args: {
        campaignId: v.id("campaigns"),
        rarityColors: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.campaignId, {
            rarityColors: args.rarityColors,
        });
    },
});

export const updateProfile = mutation({
    args: {
        name: v.optional(v.string()),
        studioName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, {
                name: args.name ?? user.name,
                studioName: args.studioName,
            });
        } else {
            await ctx.db.insert("users", {
                tokenIdentifier: identity.tokenIdentifier,
                name: args.name ?? identity.name ?? "Unknown",
                studioName: args.studioName,
            });
        }
    },
});

export const updateCampaignEngine = mutation({
    args: {
        campaignId: v.id("campaigns"),
        worldBible: v.optional(v.string()),
        aiPersona: v.optional(v.string()),
        terminology: v.optional(v.string()),
        statConfig: v.optional(v.string()),
        theme: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.userId !== identity.tokenIdentifier) throw new Error("Unauthorized");

        await ctx.db.patch(args.campaignId, {
            worldBible: args.worldBible,
            aiPersona: args.aiPersona,
            terminology: args.terminology,
            statConfig: args.statConfig,
            theme: args.theme,
        });
    },
});

// Seed functions (stubs - implement full seeding logic as needed)
export const seedSkyrim = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        // Seeding logic would go here
        console.log("Skyrim seed triggered by:", identity.tokenIdentifier);
    },
});

export const seedEffectsLibrary = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        // Seeding logic would go here
        console.log("Effects library seed triggered by:", identity.tokenIdentifier);
    },
});

// --- NARUTO SEED ---
// Comprehensive seed that showcases all game systems

export const seedNaruto = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const userId = identity.tokenIdentifier;

        // === CREATE CAMPAIGN ===
        const campaignId = await ctx.db.insert("campaigns", {
            userId,
            title: "Shinobi Chronicles: Hidden Leaf",
            description: "Experience the world of ninjas in the Hidden Leaf Village. Train to become Hokage, complete dangerous missions, and forge your ninja way. Will you protect the village or seek power at any cost?",
            xpRate: 1.5,
            rules: JSON.stringify({
                combatStyle: "chakra-based",
                deathPenalty: "mission_failure",
                levelCap: 100,
                allowedJutsu: "all",
            }),
            genre: "anime",
            isPublic: true,
            isFeatured: false,
            viewCount: 0,
            playCount: 0,
            tags: ["naruto", "ninja", "anime", "action", "adventure"],
            bountyEnabled: true,
            worldBible: `This is the world of Shinobi - ninja warriors who harness chakra to perform incredible jutsu (techniques).
            
The Five Great Shinobi Nations each have a Hidden Village:
- Land of Fire → Hidden Leaf Village (Konohagakure)
- Land of Wind → Hidden Sand Village (Sunagakure)  
- Land of Water → Hidden Mist Village (Kirigakure)
- Land of Earth → Hidden Stone Village (Iwagakure)
- Land of Lightning → Hidden Cloud Village (Kumogakure)

Ninja Ranks (lowest to highest):
- Academy Student → Genin → Chunin → Jonin → Kage

Chakra Natures: Fire, Wind, Lightning, Earth, Water
Advanced natures combine two elements (e.g., Wood = Earth + Water)

The Will of Fire is the philosophy of the Hidden Leaf - protecting loved ones and the village above all else.`,
            aiPersona: "You are a wise and dramatic narrator in the style of Naruto anime. Use Japanese honorifics (-san, -sama, -sensei). Describe jutsu with flair. Reference the ninja way and bonds between characters. Be dramatic during combat but also allow for humor and friendship moments.",
            terminology: JSON.stringify({
                spells: "Jutsu",
                mana: "Chakra",
                class: "Ninja Rank",
                level: "Experience Level",
                guild: "Village",
                magic: "Ninjutsu",
            }),
            statConfig: JSON.stringify([
                { key: "nin", label: "Ninjutsu", description: "Chakra-based techniques" },
                { key: "tai", label: "Taijutsu", description: "Physical combat" },
                { key: "gen", label: "Genjutsu", description: "Illusion techniques" },
                { key: "int", label: "Intelligence", description: "Strategic thinking" },
                { key: "str", label: "Strength", description: "Physical power" },
                { key: "spd", label: "Speed", description: "Movement and reflexes" },
                { key: "sta", label: "Stamina", description: "Chakra reserves" },
                { key: "seal", label: "Hand Seals", description: "Jutsu casting speed" },
            ]),
            theme: "ninja",
        });

        // === CREATE FACTIONS ===
        const hiddenLeafFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Hidden Leaf Village",
            description: "The ninja village of the Land of Fire, known for producing legendary shinobi and their Will of Fire philosophy.",
            territory: "Land of Fire",
        });

        const akatsukiFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Akatsuki",
            description: "A criminal organization of S-rank missing-nin seeking the Tailed Beasts. They wear black cloaks with red clouds.",
            territory: "Various hideouts",
        });

        const soundFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Sound Village",
            description: "A village founded by Orochimaru for his twisted experiments. Known for ruthless ninja and forbidden jutsu.",
            territory: "Land of Rice Fields",
        });

        const anbuFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "ANBU Black Ops",
            description: "The elite assassination and tactical squad of the Hidden Leaf. They wear animal masks and handle the village's darkest missions.",
            territory: "Hidden Leaf Village",
        });

        // === CREATE ITEMS ===
        // Weapons
        const kunai = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Kunai",
            type: "Weapon",
            rarity: "Common",
            effects: "+3 Attack. Can be thrown for ranged attacks.",
            description: "A standard ninja throwing knife. Every shinobi carries several.",
            usable: true,
            consumable: false,
            useEffect: JSON.stringify({ type: "damage", amount: 8 }),
        });

        const shuriken = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Shuriken",
            type: "Weapon",
            rarity: "Common",
            effects: "+2 Attack. Can hit multiple targets when thrown.",
            description: "Four-pointed throwing stars favored by ninja.",
            usable: true,
            consumable: true,
            quantity: 10,
            useEffect: JSON.stringify({ type: "damage", amount: 5 }),
        });

        const katana = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "ANBU Katana",
            type: "Weapon",
            rarity: "Rare",
            effects: "+12 Attack, +5 Speed. Silent kills deal double damage.",
            description: "The signature blade of ANBU operatives, forged for assassination missions.",
            textColor: "#3b82f6",
        });

        const executionBlade = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Kubikiribocho (Executioner's Blade)",
            type: "Weapon",
            rarity: "Legendary",
            effects: "+30 Attack. Regenerates from the iron in blood. Ignores armor.",
            description: "One of the Seven Swords of the Mist. A massive cleaver that can reform itself using the iron from its victims' blood.",
            textColor: "#f59e0b",
        });

        const rasenganScroll = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Rasengan Scroll",
            type: "Scroll",
            rarity: "Epic",
            effects: "Teaches the Rasengan jutsu. Requires high chakra control.",
            description: "A forbidden scroll containing the teachings of the Fourth Hokage's signature technique.",
            textColor: "#a855f7",
            usable: true,
            consumable: true,
            useEffect: JSON.stringify({ type: "buff", stat: "ninjutsu", amount: 20, duration: 300 }),
        });

        // Consumables
        const soldierPill = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Military Ration Pill",
            type: "Consumable",
            rarity: "Uncommon",
            effects: "Restores 50 Chakra. Sustains the user for 3 days without food.",
            description: "Special pills used by ninja on long missions. Tastes terrible but keeps you fighting.",
            textColor: "#22c55e",
            usable: true,
            consumable: true,
            useEffect: JSON.stringify({ type: "restore_mana", amount: 50 }),
        });

        const healingOintment = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Medical Ninja Ointment",
            type: "Consumable",
            rarity: "Uncommon",
            effects: "Heals 30 HP over time.",
            description: "A healing salve developed by the Hidden Leaf's medical corps.",
            textColor: "#22c55e",
            usable: true,
            consumable: true,
            useEffect: JSON.stringify({ type: "heal", amount: 30 }),
        });

        const antidote = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Universal Antidote",
            type: "Consumable",
            rarity: "Rare",
            effects: "Cures most poisons. Essential for missions in hostile territory.",
            description: "Developed by Tsunade-sama herself, this antidote can neutralize most known poisons.",
            textColor: "#3b82f6",
            usable: true,
            consumable: true,
            useEffect: JSON.stringify({ type: "cure" }),
        });

        // Equipment
        const headband = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Leaf Village Headband",
            type: "Armor",
            rarity: "Common",
            effects: "+2 Defense. Identifies you as a Hidden Leaf ninja.",
            description: "The forehead protector bearing the symbol of the Hidden Leaf. Wearing it with pride shows your dedication to the village.",
        });

        const flakJacket = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Chunin Flak Jacket",
            type: "Armor",
            rarity: "Uncommon",
            effects: "+8 Defense, +10 carrying capacity.",
            description: "The standard protective vest worn by Chunin and Jonin. Contains many pockets for ninja tools.",
            textColor: "#22c55e",
        });

        const anbuMask = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "ANBU Mask",
            type: "Armor",
            rarity: "Rare",
            effects: "+5 Defense, +10 Stealth. Hides your identity completely.",
            description: "A porcelain mask in the shape of an animal. Only ANBU operatives are permitted to wear these.",
            textColor: "#3b82f6",
        });

        const akatsukiRing = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Akatsuki Ring",
            type: "Accessory",
            rarity: "Legendary",
            effects: "Allows communication with other Akatsuki members. +15 to all stats when worn.",
            description: "A ring worn by members of the Akatsuki. Each ring has a unique kanji and is assigned to a specific finger position.",
            textColor: "#ef4444",
        });

        // === CREATE LOCATIONS ===
        const hokageOffice = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Hokage's Office",
            type: "Building",
            description: "The administrative center of the Hidden Leaf, located atop the Hokage Rock. From here, the Hokage assigns missions and protects the village.",
            environment: "A circular office with panoramic windows overlooking the village. Mission scrolls line the walls.",
            neighbors: [],
        });

        const ichiraku = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Ichiraku Ramen",
            type: "Shop",
            description: "The best ramen shop in the village! A small stand with a warm atmosphere where ninja gather to eat and share stories.",
            environment: "Steam rises from bubbling pots. The smell of pork broth fills the air. Red lanterns provide cozy lighting.",
            neighbors: [],
        });

        const trainingGround = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Training Ground 7",
            type: "Training Area",
            description: "The training field where Team 7 was formed. Features three wooden posts for survival training and a memorial stone for fallen ninja.",
            environment: "Open grass field surrounded by forest. Three wooden logs stand in the center. The Memorial Stone gleams in the sunlight.",
            neighbors: [],
        });

        const forestOfDeath = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Forest of Death",
            type: "Wilderness",
            description: "Training Area 44, a massive forest filled with dangerous creatures and used for the Chunin Exam's second stage. Only the strong survive here.",
            environment: "Massive trees block out the sun. Giant insects and predators lurk in every shadow. Rivers of murky water cut through the undergrowth.",
            neighbors: [],
        });

        const hospitalLeaf = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Konoha Hospital",
            type: "Building",
            description: "The village's medical facility, run by skilled medical ninja. Many legendary shinobi have recovered here.",
            environment: "Clean white corridors. The scent of healing herbs. Skilled medics move efficiently between patients.",
            neighbors: [],
        });

        const academy = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Ninja Academy",
            type: "Building",
            description: "Where all ninja begin their journey. Young students learn the basics of chakra control, weapons, and jutsu here.",
            environment: "Classrooms with practice targets. A schoolyard for sparring. Iruka-sensei's voice echoes through the halls.",
            neighbors: [],
        });

        const uchihaCompound = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Uchiha Compound",
            type: "District",
            description: "The former home of the Uchiha clan, now mostly abandoned after the massacre. An eerie silence hangs over the empty streets.",
            environment: "Abandoned houses with the Uchiha fan symbol. Overgrown gardens. The police station stands empty.",
            neighbors: [],
        });

        const mainGate = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Village Main Gate",
            type: "Landmark",
            description: "The iconic entrance to the Hidden Leaf Village. Two eternal guards stand watch here, logging all who enter and leave.",
            environment: "Massive wooden gates with the village symbol. Guard posts on either side. The road stretches toward distant lands.",
            neighbors: [],
        });

        const orochimairHideout = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Orochimaru's Hideout",
            type: "Dungeon",
            description: "One of Orochimaru's many underground laboratories. Dark corridors lead to cells containing failed experiments and forbidden research.",
            environment: "Torch-lit stone corridors. Glass containers with preserved specimens. The air is cold and smells of chemicals.",
            neighbors: [],
        });

        const valleyOfEnd = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Valley of the End",
            type: "Landmark",
            description: "The legendary battleground where the First Hokage defeated Madara Uchiha. Two massive statues face each other across a waterfall.",
            environment: "Thundering waterfall between two cliff faces. Giant stone statues of Hashirama and Madara. Raw power lingers in the air.",
            neighbors: [],
        });

        // Update location neighbors
        await ctx.db.patch(hokageOffice, { neighbors: [academy, mainGate] });
        await ctx.db.patch(ichiraku, { neighbors: [academy, trainingGround] });
        await ctx.db.patch(trainingGround, { neighbors: [ichiraku, forestOfDeath, uchihaCompound] });
        await ctx.db.patch(forestOfDeath, { neighbors: [trainingGround, valleyOfEnd] });
        await ctx.db.patch(hospitalLeaf, { neighbors: [academy, hokageOffice] });
        await ctx.db.patch(academy, { neighbors: [hokageOffice, ichiraku, hospitalLeaf, mainGate] });
        await ctx.db.patch(uchihaCompound, { neighbors: [trainingGround, mainGate] });
        await ctx.db.patch(mainGate, { neighbors: [hokageOffice, academy, uchihaCompound, valleyOfEnd] });
        await ctx.db.patch(orochimairHideout, { neighbors: [forestOfDeath] });
        await ctx.db.patch(valleyOfEnd, { neighbors: [forestOfDeath, mainGate] });

        // === CREATE REGIONS ===
        const leafRegion = await ctx.db.insert("regions", {
            campaignId,
            name: "Hidden Leaf Village",
            description: "The ninja village of the Land of Fire, protected by the Hokage.",
            locationIds: [hokageOffice, ichiraku, trainingGround, hospitalLeaf, academy, uchihaCompound, mainGate],
            governingFactionId: hiddenLeafFaction,
        });

        const wildernessRegion = await ctx.db.insert("regions", {
            campaignId,
            name: "Land of Fire Wilderness",
            description: "The dangerous forests and landmarks outside the village walls.",
            locationIds: [forestOfDeath, valleyOfEnd, orochimairHideout],
        });

        // === CREATE NPCs ===
        // Hokage
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Tsunade",
            role: "Fifth Hokage",
            attitude: "Stern but Caring",
            description: "The legendary Sannin and current Hokage. One of the greatest medical ninja to ever live, she protects the village with fierce determination. Has a gambling problem.",
            locationId: hokageOffice,
            factionId: hiddenLeafFaction,
            health: 200,
            maxHealth: 200,
            damage: 50,
            armorClass: 18,
            isEssential: true,
            willTrade: false,
            gold: 0, // Lost it all gambling
        });

        // Ramen Chef
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Teuchi",
            role: "Ramen Chef",
            attitude: "Friendly",
            description: "The kind owner of Ichiraku Ramen. He's fed generations of ninja and always has a warm smile and a hot bowl ready.",
            locationId: ichiraku,
            factionId: hiddenLeafFaction,
            health: 20,
            maxHealth: 20,
            damage: 2,
            armorClass: 10,
            isEssential: true,
            willTrade: true,
            tradeInventory: [soldierPill, healingOintment],
            tradePriceModifier: 0.8, // Gives ninja a discount
            gold: 500,
        });

        // Jonin Sensei
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Kakashi Hatake",
            role: "Jonin Sensei",
            attitude: "Aloof but Wise",
            description: "The Copy Ninja, known for his Sharingan eye and mastery of over 1000 jutsu. Always late and always reading his favorite book.",
            locationId: trainingGround,
            factionId: hiddenLeafFaction,
            health: 150,
            maxHealth: 150,
            damage: 35,
            armorClass: 17,
            isEssential: true,
            willTrade: false,
            inventoryItems: [katana, flakJacket],
            gold: 200,
        });

        // Medical Ninja
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Sakura Haruno",
            role: "Medical Ninja",
            attitude: "Determined",
            description: "Tsunade's apprentice and a skilled medical ninja. Her chakra-enhanced strength can shatter boulders.",
            locationId: hospitalLeaf,
            factionId: hiddenLeafFaction,
            health: 100,
            maxHealth: 100,
            damage: 30,
            armorClass: 14,
            isEssential: false,
            willTrade: true,
            tradeInventory: [healingOintment, antidote, soldierPill],
            tradePriceModifier: 1.0,
            inventoryItems: [flakJacket],
            dropItems: [healingOintment, healingOintment],
            gold: 300,
        });

        // Academy Teacher
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Iruka Umino",
            role: "Academy Instructor",
            attitude: "Kind",
            description: "A beloved teacher at the Ninja Academy. He sees the potential in every student, especially the troublemakers.",
            locationId: academy,
            factionId: hiddenLeafFaction,
            health: 60,
            maxHealth: 60,
            damage: 15,
            armorClass: 12,
            isEssential: true,
            willTrade: false,
            inventoryItems: [kunai, shuriken, headband],
            gold: 100,
        });

        // Weapons Shop Owner
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Tenten",
            role: "Weapons Specialist",
            attitude: "Enthusiastic",
            description: "A kunoichi who specializes in ninja tools and weapons. She runs a shop and dreams of becoming a legendary kunoichi like Tsunade.",
            locationId: mainGate,
            factionId: hiddenLeafFaction,
            health: 80,
            maxHealth: 80,
            damage: 20,
            armorClass: 14,
            isEssential: false,
            willTrade: true,
            tradeInventory: [kunai, shuriken, katana, flakJacket],
            tradePriceModifier: 1.0,
            inventoryItems: [kunai, kunai, shuriken],
            dropItems: [kunai, shuriken],
            gold: 800,
            isRecruitable: true,
            recruitCost: 500,
        });

        // Gate Guards
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Izumo Kamizuki",
            role: "Gate Guard",
            attitude: "Professional",
            description: "One of the eternal gatekeepers of the Hidden Leaf. He and Kotetsu have been guarding the gate for years.",
            locationId: mainGate,
            factionId: hiddenLeafFaction,
            health: 70,
            maxHealth: 70,
            damage: 18,
            armorClass: 14,
            isEssential: false,
            willTrade: false,
            inventoryItems: [kunai, flakJacket],
            dropItems: [kunai],
            gold: 50,
        });

        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Kotetsu Hagane",
            role: "Gate Guard",
            attitude: "Professional",
            description: "The other eternal gatekeeper. He carries a massive shell-mace and takes his duties very seriously.",
            locationId: mainGate,
            factionId: hiddenLeafFaction,
            health: 70,
            maxHealth: 70,
            damage: 20,
            armorClass: 14,
            isEssential: false,
            willTrade: false,
            inventoryItems: [kunai, flakJacket],
            dropItems: [flakJacket],
            gold: 50,
        });

        // Villains
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Orochimaru",
            role: "Rogue Sannin",
            attitude: "Hostile",
            description: "A legendary Sannin turned criminal. He seeks immortality and has performed countless forbidden experiments. His serpentine appearance matches his nature.",
            locationId: orochimairHideout,
            factionId: soundFaction,
            health: 180,
            maxHealth: 180,
            damage: 45,
            armorClass: 18,
            isEssential: true,
            willTrade: false,
            inventoryItems: [rasenganScroll, executionBlade],
            gold: 5000,
        });

        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Kabuto Yakushi",
            role: "Medical Spy",
            attitude: "Hostile",
            description: "Orochimaru's right hand. A skilled medical ninja and spy who has infiltrated multiple villages. His true loyalties are impossible to read.",
            locationId: orochimairHideout,
            factionId: soundFaction,
            health: 100,
            maxHealth: 100,
            damage: 25,
            armorClass: 15,
            isEssential: false,
            willTrade: false,
            inventoryItems: [antidote, healingOintment, kunai],
            dropItems: [antidote, healingOintment, soldierPill],
            gold: 1000,
        });

        // ANBU
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Cat",
            role: "ANBU Captain",
            attitude: "Cold",
            description: "An ANBU captain whose identity is unknown. They communicate only through official channels and execute missions with ruthless efficiency.",
            locationId: hokageOffice,
            factionId: anbuFaction,
            health: 120,
            maxHealth: 120,
            damage: 35,
            armorClass: 16,
            isEssential: false,
            willTrade: false,
            inventoryItems: [katana, anbuMask],
            dropItems: [katana, anbuMask],
            gold: 300,
        });

        // Akatsuki member (encounter)
        await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Itachi Uchiha",
            role: "S-Rank Criminal",
            attitude: "Mysterious",
            description: "The man who massacred the Uchiha clan. An S-rank missing-nin and member of Akatsuki. His true motives remain shrouded in mystery.",
            locationId: uchihaCompound,
            factionId: akatsukiFaction,
            health: 200,
            maxHealth: 200,
            damage: 50,
            armorClass: 19,
            isEssential: true,
            willTrade: false,
            inventoryItems: [akatsukiRing],
            gold: 0,
        });

        // === CREATE MONSTERS ===
        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Sound Ninja",
            description: "A shinobi from the Hidden Sound Village. They use sound-based jutsu and serve Orochimaru.",
            health: 40,
            damage: 12,
            locationId: forestOfDeath,
            dropItemIds: [kunai, shuriken],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Giant Centipede",
            description: "A massive insect that dwells in the Forest of Death. Its venomous bite can paralyze prey.",
            health: 60,
            damage: 15,
            locationId: forestOfDeath,
            dropItemIds: [antidote],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Rogue Ninja",
            description: "A missing-nin who abandoned their village. They'll attack anyone for money or survival.",
            health: 50,
            damage: 15,
            locationId: valleyOfEnd,
            dropItemIds: [kunai, soldierPill],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Curse Mark Experiment",
            description: "A failed experiment from Orochimaru's lab. Twisted by the curse mark, it attacks anything that moves.",
            health: 80,
            damage: 25,
            locationId: orochimairHideout,
            dropItemIds: [soldierPill, healingOintment],
        });

        // === CREATE QUESTS ===
        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Bells of Destiny",
            description: "Report to Training Ground 7 for your first test as a Genin. Kakashi-sensei will evaluate if you have what it takes to become a true ninja. The objective: take the bells from him before noon.",
            status: "active",
            locationId: trainingGround,
            source: "creator",
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Forest of Death Survival",
            description: "The Chunin Exams have begun! Enter the Forest of Death and obtain both Heaven and Earth scrolls to advance. Beware of other teams and the deadly creatures within.",
            status: "active",
            locationId: forestOfDeath,
            source: "creator",
            rewardItemIds: [flakJacket],
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Serpent's Shadow",
            description: "Intelligence reports suggest Orochimaru has a hidden laboratory nearby. Infiltrate his hideout, gather evidence of his crimes, and escape alive.",
            status: "active",
            locationId: orochimairHideout,
            source: "creator",
            rewardItemIds: [rasenganScroll],
        });

        await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Ramen Delivery Mission",
            description: "Teuchi needs help delivering a special order to the Hokage's office. Simple enough, right? Just don't spill the ramen!",
            status: "active",
            locationId: ichiraku,
            source: "creator",
        });

        // === CREATE LORE ===
        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "The Will of Fire",
            content: "The philosophy that binds the Hidden Leaf Village together. It teaches that true strength comes from protecting those you love, not from jutsu alone. Every Hokage has embodied this will, passing it down to the next generation.",
            category: "Philosophy",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "The Uchiha Massacre",
            content: "One night, the entire Uchiha clan was slaughtered by one of their own - Itachi Uchiha. Only his younger brother Sasuke survived. The truth behind this tragedy remains classified at the highest level.",
            category: "History",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "Chakra and Jutsu",
            content: "Chakra is the energy that flows through all living things, created by mixing physical and spiritual energy. By molding chakra and forming hand seals, ninja can perform jutsu - techniques that defy normal physics.",
            category: "Magic",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "The Nine-Tailed Fox",
            content: "Years ago, a massive demon fox with nine tails attacked the Hidden Leaf Village. The Fourth Hokage sacrificed his life to seal the beast away. The details of where it was sealed remain a village secret.",
            category: "History",
        });

        // === CREATE INITIAL RUMOR ===
        await ctx.db.insert("rumors", {
            campaignId,
            content: "Strange sounds have been heard coming from the old Uchiha compound at night...",
            type: "major_event",
            originLocationId: uchihaCompound,
            spreadRadius: 2,
            maxSpreadRadius: 4,
            timestamp: Date.now(),
            isActive: true,
        });

        // === CREATE JUTSU/ABILITIES ===
        // Basic Ninjutsu
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Shadow Clone Jutsu",
            level: 2,
            school: "Ninjutsu",
            description: "Creates solid clones that can attack and gather information. A forbidden technique.",
            castingTime: "1 action",
            range: "Self",
            duration: "Until dispelled",
            energyCost: 30,
            cooldown: 0,
            damage: 0,
            buffEffect: JSON.stringify({ stat: "attack", amount: 2, duration: 3 }),
            iconEmoji: "👥",
            tags: ["clone", "forbidden", "buff"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Rasengan",
            level: 4,
            school: "Ninjutsu",
            description: "A spinning sphere of pure chakra that requires no hand signs. Created by the Fourth Hokage.",
            castingTime: "1 action",
            range: "Touch",
            duration: "Instant",
            energyCost: 40,
            cooldown: 2,
            damage: 45,
            damageType: "chakra",
            iconEmoji: "🌀",
            tags: ["offensive", "melee", "legendary"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Fireball Jutsu",
            level: 2,
            school: "Fire",
            description: "A classic Uchiha technique that shoots a massive fireball. Requires fire chakra nature.",
            castingTime: "1 action",
            range: "60 feet",
            duration: "Instant",
            energyCost: 25,
            cooldown: 1,
            damage: 30,
            damageType: "fire",
            damageDice: "3d6",
            iconEmoji: "🔥",
            tags: ["offensive", "ranged", "uchiha"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Chidori",
            level: 4,
            school: "Lightning",
            description: "Lightning chakra concentrated in the hand, producing a sound like a thousand birds chirping.",
            castingTime: "1 action",
            range: "Touch",
            duration: "Instant",
            energyCost: 45,
            cooldown: 3,
            damage: 50,
            damageType: "lightning",
            iconEmoji: "⚡",
            tags: ["offensive", "melee", "assassination"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Substitution Jutsu",
            level: 1,
            school: "Ninjutsu",
            description: "Replace yourself with a nearby object to avoid an attack. Basic academy technique.",
            castingTime: "Reaction",
            range: "Self",
            duration: "Instant",
            energyCost: 10,
            cooldown: 2,
            damage: 0,
            buffEffect: JSON.stringify({ stat: "dodge", amount: 100, duration: 1 }),
            iconEmoji: "🪵",
            tags: ["defensive", "basic", "escape"],
        });

        // Taijutsu
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Leaf Hurricane",
            level: 2,
            school: "Taijutsu",
            description: "A powerful spinning kick that can hit multiple targets. Favored by the Leaf's Taijutsu masters.",
            castingTime: "1 action",
            range: "5 feet",
            duration: "Instant",
            energyCost: 15,
            cooldown: 0,
            damage: 25,
            damageType: "physical",
            iconEmoji: "🌿",
            tags: ["offensive", "melee", "aoe"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Primary Lotus",
            level: 3,
            school: "Taijutsu",
            description: "An extreme technique that opens the first chakra gate. Devastating power at great cost.",
            castingTime: "1 action",
            range: "Touch",
            duration: "Instant",
            energyCost: 35,
            cooldown: 4,
            damage: 60,
            damageType: "physical",
            debuffEffect: JSON.stringify({ stat: "speed", amount: -5, duration: 2 }),
            iconEmoji: "🌸",
            tags: ["offensive", "melee", "forbidden", "gate"],
        });

        // Genjutsu
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Demonic Illusion",
            level: 3,
            school: "Genjutsu",
            description: "Traps the target in a terrifying illusion, paralyzing them with fear.",
            castingTime: "1 action",
            range: "30 feet",
            duration: "2 turns",
            energyCost: 30,
            cooldown: 3,
            damage: 0,
            debuffEffect: JSON.stringify({ stat: "stunned", amount: 1, duration: 2 }),
            iconEmoji: "👁️",
            tags: ["control", "ranged", "illusion"],
        });

        // Medical Ninjutsu
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Mystical Palm Technique",
            level: 2,
            school: "Healing",
            description: "Channel chakra through your hands to heal wounds. The foundation of medical ninjutsu.",
            castingTime: "1 action",
            range: "Touch",
            duration: "Instant",
            energyCost: 25,
            cooldown: 1,
            healing: 35,
            iconEmoji: "💚",
            tags: ["healing", "medical", "support"],
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Chakra Scalpel",
            level: 3,
            school: "Healing",
            description: "Form chakra into a blade that can cut without breaking skin. Used for surgery and combat.",
            castingTime: "1 action",
            range: "Touch",
            duration: "3 turns",
            energyCost: 20,
            cooldown: 2,
            damage: 20,
            damageType: "chakra",
            buffEffect: JSON.stringify({ stat: "precision", amount: 3, duration: 3 }),
            iconEmoji: "🔪",
            tags: ["offensive", "medical", "melee"],
        });

        // Passive Ability
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Chakra Control",
            level: 1,
            school: "Ninjutsu",
            description: "Your refined chakra control reduces the cost of all jutsu. Passive ability.",
            castingTime: "Passive",
            range: "Self",
            duration: "Permanent",
            energyCost: 0,
            cooldown: 0,
            isPassive: true,
            iconEmoji: "☯️",
            tags: ["passive", "support"],
        });

        return { success: true, campaignId, message: "Naruto realm created successfully! Believe it!" };
    },
});

// --- NPC DEATH SYSTEM ---

// Mark an NPC as dead
export const killNPC = mutation({
    args: {
        npcId: v.id("npcs"),
        deathCause: v.string(),
        killedBy: v.string(), // "player" or NPC name
    },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");
        
        // Check if NPC is essential
        if (npc.isEssential) {
            return { success: false, message: `${npc.name} is essential and cannot be killed.` };
        }
        
        // Mark as dead
        await ctx.db.patch(args.npcId, {
            isDead: true,
            deathCause: args.deathCause,
            killedBy: args.killedBy,
            deathTimestamp: Date.now(),
        });
        
        return { success: true, message: `${npc.name} has been killed.` };
    },
});

// Get all dead NPCs for a campaign (for AI context)
export const getDeadNPCs = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const allNpcs = await ctx.db
            .query("npcs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        return allNpcs.filter((npc) => npc.isDead);
    },
});

// Resurrect an NPC (for creator/admin use)
export const resurrectNPC = mutation({
    args: { npcId: v.id("npcs") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        
        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");
        
        // Verify ownership of campaign
        const campaign = await ctx.db.get(npc.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }
        
        await ctx.db.patch(args.npcId, {
            isDead: false,
            deathCause: undefined,
            killedBy: undefined,
            deathTimestamp: undefined,
        });
        
        return { success: true };
    },
});

// Update NPC faction
export const updateNPCFaction = mutation({
    args: {
        npcId: v.id("npcs"),
        factionId: v.optional(v.id("factions")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify NPC exists and user owns the campaign
        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");

        const campaign = await ctx.db.get(npc.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        await ctx.db.patch(args.npcId, {
            factionId: args.factionId,
        });
    },
});

// Toggle essential status
export const setNPCEssential = mutation({
    args: {
        npcId: v.id("npcs"),
        isEssential: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify NPC exists and user owns the campaign
        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");

        const campaign = await ctx.db.get(npc.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        await ctx.db.patch(args.npcId, {
            isEssential: args.isEssential,
        });
    },
});

// --- FACTION MANAGEMENT ---

export const createFaction = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        description: v.string(),
        territory: v.optional(v.string()),
        headquartersId: v.optional(v.id("locations")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        return await ctx.db.insert("factions", {
            campaignId: args.campaignId,
            name: args.name,
            description: args.description,
            territory: args.territory,
            headquartersId: args.headquartersId,
        });
    },
});

export const getFactions = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("factions")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
    },
});

// --- REGION MANAGEMENT ---

export const createRegion = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        description: v.optional(v.string()),
        locationIds: v.array(v.id("locations")),
        governingFactionId: v.optional(v.id("factions")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        return await ctx.db.insert("regions", {
            campaignId: args.campaignId,
            name: args.name,
            description: args.description,
            locationIds: args.locationIds,
            governingFactionId: args.governingFactionId,
        });
    },
});

export const getRegions = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("regions")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
    },
});

// Toggle bounty system for a campaign
export const toggleBountySystem = mutation({
    args: {
        campaignId: v.id("campaigns"),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.campaignId, {
            bountyEnabled: args.enabled,
        });
    },
});

// --- LOCATION-BASED QUERIES FOR MAP EDITOR ---

// Get NPCs at a specific location
export const getNPCsByLocation = query({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        const npcs = await ctx.db
            .query("npcs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        return npcs.filter((npc) => npc.locationId === args.locationId && !npc.isDead);
    },
});

// Get monsters at a specific location
export const getMonstersByLocation = query({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        const monsters = await ctx.db
            .query("monsters")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        return monsters.filter((monster) => monster.locationId === args.locationId);
    },
});

// Delete an NPC
export const deleteNPC = mutation({
    args: { npcId: v.id("npcs") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");

        // Verify campaign ownership
        const campaign = await ctx.db.get(npc.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        await ctx.db.delete(args.npcId);
        return { success: true };
    },
});

// Delete a monster
export const deleteMonster = mutation({
    args: { monsterId: v.id("monsters") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const monster = await ctx.db.get(args.monsterId);
        if (!monster) throw new Error("Monster not found");

        // Verify campaign ownership
        const campaign = await ctx.db.get(monster.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        await ctx.db.delete(args.monsterId);
        return { success: true };
    },
});

// Update character stats (for character sheet editing)
export const updateCharacterStats = mutation({
    args: {
        characterId: v.id("characters"),
        stats: v.string(), // JSON string of stats
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const character = await ctx.db.get(args.characterId);
        if (!character) throw new Error("Character not found");

        // Verify ownership
        if (character.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this character");
        }

        await ctx.db.patch(args.characterId, {
            stats: args.stats,
        });

        return { success: true };
    },
});