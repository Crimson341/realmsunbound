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

// Create Ability/Spell/Jutsu/Power - Genre-agnostic
export const createSpell = mutation({
    args: {
        campaignId: v.id("campaigns"),
        // Core Identity
        name: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        subcategory: v.optional(v.string()),
        iconEmoji: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        // Requirements
        requiredLevel: v.optional(v.number()),
        requiredStats: v.optional(v.string()),
        requiredItems: v.optional(v.string()),
        requiredAbilities: v.optional(v.string()),
        // Cost & Cooldown
        energyCost: v.optional(v.number()),
        healthCost: v.optional(v.number()),
        cooldown: v.optional(v.number()),
        usesPerDay: v.optional(v.number()),
        isPassive: v.optional(v.boolean()),
        // Effects
        damage: v.optional(v.number()),
        damageType: v.optional(v.string()),
        damageScaling: v.optional(v.string()),
        healing: v.optional(v.number()),
        healingScaling: v.optional(v.string()),
        buffEffect: v.optional(v.string()),
        debuffEffect: v.optional(v.string()),
        statusEffect: v.optional(v.string()),
        statusDuration: v.optional(v.number()),
        // Targeting
        targetType: v.optional(v.string()),
        range: v.optional(v.string()),
        areaSize: v.optional(v.string()),
        // Special Properties
        castTime: v.optional(v.string()),
        interruptible: v.optional(v.boolean()),
        // Upgrade
        canUpgrade: v.optional(v.boolean()),
        upgradedVersion: v.optional(v.string()),
        // Lore
        lore: v.optional(v.string()),
        creator: v.optional(v.string()),
        rarity: v.optional(v.string()),
        isForbidden: v.optional(v.boolean()),
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
            description: args.description,
            category: args.category,
            subcategory: args.subcategory,
            iconEmoji: args.iconEmoji,
            tags: args.tags,
            requiredLevel: args.requiredLevel,
            requiredStats: args.requiredStats,
            requiredItems: args.requiredItems,
            requiredAbilities: args.requiredAbilities,
            energyCost: args.energyCost,
            healthCost: args.healthCost,
            cooldown: args.cooldown,
            usesPerDay: args.usesPerDay,
            isPassive: args.isPassive,
            damage: args.damage,
            damageType: args.damageType,
            damageScaling: args.damageScaling,
            healing: args.healing,
            healingScaling: args.healingScaling,
            buffEffect: args.buffEffect,
            debuffEffect: args.debuffEffect,
            statusEffect: args.statusEffect,
            statusDuration: args.statusDuration,
            targetType: args.targetType,
            range: args.range,
            areaSize: args.areaSize,
            castTime: args.castTime,
            interruptible: args.interruptible,
            canUpgrade: args.canUpgrade,
            upgradedVersion: args.upgradedVersion,
            lore: args.lore,
            creator: args.creator,
            rarity: args.rarity,
            isForbidden: args.isForbidden,
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

// === DRAGON BALL Z SEED ===
// Comprehensive seed that tests ALL creator features including conditions, shops, abilities, and more

export const seedDragonBall = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const userId = identity.tokenIdentifier;

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                         CAMPAIGN                                ║
        // ╚════════════════════════════════════════════════════════════════╝

        const campaignId = await ctx.db.insert("campaigns", {
            userId,
            title: "Dragon Ball Z: Warriors of Earth",
            description: "Experience the legendary saga of the Dragon Ball universe! Train to become the strongest warrior in the universe, collect the seven Dragon Balls, and protect Earth from powerful villains. Will you achieve the legendary Super Saiyan transformation?",
            xpRate: 2.0,
            rules: JSON.stringify({
                combatStyle: "ki-based",
                deathPenalty: "dragon_ball_revival",
                levelCap: 999,
                transformations: true,
                powerLevelScaling: "exponential",
            }),
            genre: "anime",
            isPublic: true,
            isFeatured: true,
            viewCount: 0,
            playCount: 0,
            tags: ["dragon-ball", "anime", "action", "martial-arts", "super-saiyan", "ki", "adventure"],
            bountyEnabled: true,

            // --- WORLD BIBLE ---
            worldBible: `Welcome to the Dragon Ball Universe - a world where warriors harness Ki energy to achieve incredible feats of power!

THE POWER SYSTEM:
- Ki (気) is the life force energy that flows through all living beings
- Power Level measures overall combat strength (average human: 5, Goku at start: 10, Frieza Final Form: 120,000,000)
- Fighters can sense Ki to detect opponents and gauge power levels
- Ki can be projected as blasts, barriers, and flight

TRANSFORMATIONS:
- Saiyans can transform under extreme emotional stress or training
- Super Saiyan (SSJ) multiplies power by 50x (golden aura, spiky hair)
- Super Saiyan 2 (SSJ2) = 100x base power (electricity crackling)
- Super Saiyan 3 (SSJ3) = 400x base power (long hair, no eyebrows)
- Super Saiyan God = Divine Ki, red aura
- Super Saiyan Blue = SSJ + God Ki, blue aura
- Ultra Instinct = automatic dodging, silver aura

RACES:
- Saiyans: Warrior race, zenkai boosts (get stronger after near-death)
- Humans: Limited power but can master techniques
- Namekians: Can regenerate, fuse, and create Dragon Balls
- Frieza's Race: Born with immense power, multiple transformation forms
- Androids: Infinite energy, cannot sense Ki

THE DRAGON BALLS:
- Seven magical orbs that summon Shenron the Eternal Dragon
- Can grant almost any wish (within Shenron's power)
- Turn to stone for one year after use
- Created by Namekians

MAJOR LOCATIONS:
- Earth (main setting) - Protected by the Z-Fighters
- Planet Namek - Home of the Namekians and their Dragon Balls
- Other World - Where dead warriors train with King Kai
- Beerus's Planet - Home of the God of Destruction
- The Hyperbolic Time Chamber - 1 day outside = 1 year inside`,

            // --- AI PERSONA ---
            aiPersona: `You are the dramatic narrator of Dragon Ball Z! Speak with intense emotion and hype up every battle moment.

Key narrative elements:
- Power level comparisons are EVERYTHING ("His power level is OVER 9000!")
- Transformations are epic moments that shake the very planet
- Training montages should feel inspiring and show growth
- Villains are intimidating but can be redeemed
- Friendship and determination can overcome any odds
- Death is not permanent (Dragon Balls exist!)
- Combat involves charging attacks, beam struggles, and martial arts

Use exclamations liberally! Describe auras, energy waves, and the ground shaking from power. Reference techniques by their Japanese names when dramatic (Kamehameha, Genki Dama, Kaioken).

Embrace the over-the-top nature of Dragon Ball - everything is epic, power levels are insane, and the fate of the universe is always at stake!`,

            // --- TERMINOLOGY ---
            terminology: JSON.stringify({
                spells: "Techniques",
                mana: "Ki",
                class: "Fighter Class",
                level: "Power Level Tier",
                guild: "Fighter Group",
                magic: "Ki Manipulation",
                health: "Vitality",
                experience: "Battle Experience",
            }),

            // --- STAT CONFIG ---
            statConfig: JSON.stringify([
                { key: "power", label: "Power Level", description: "Overall combat strength" },
                { key: "str", label: "Strength", description: "Physical attack power" },
                { key: "spd", label: "Speed", description: "Movement and reaction time" },
                { key: "ki", label: "Ki Control", description: "Energy manipulation mastery" },
                { key: "def", label: "Defense", description: "Damage resistance" },
                { key: "end", label: "Endurance", description: "Stamina and Ki reserves" },
                { key: "sense", label: "Ki Sense", description: "Ability to detect power levels" },
                { key: "technique", label: "Technique", description: "Martial arts mastery" },
            ]),

            // --- ABILITY SYSTEM CONFIG ---
            abilitySystemConfig: JSON.stringify({
                abilityTermSingular: "Technique",
                abilityTermPlural: "Techniques",
                energyTerm: "Ki",
                categories: ["Ki Blast", "Physical", "Transformation", "Support", "Ultimate", "Forbidden"],
                damageTypes: ["Ki", "Physical", "Divine", "Destruction", "Hakai"],
                statusEffects: ["Stunned", "Weakened", "Paralyzed", "Enraged", "Exhausted", "Zenkai"],
                rarityLevels: ["Basic", "Advanced", "Master", "Ultimate", "Legendary", "Divine"],
            }),

            theme: "anime",

            // --- CHARACTER CREATION ---
            availableClasses: JSON.stringify([
                { name: "Saiyan Warrior", description: "Born fighter with zenkai boost potential. Can achieve Super Saiyan transformations.", bonusStats: { power: 5, str: 3 } },
                { name: "Human Martial Artist", description: "Master of technique over raw power. Access to unique human techniques.", bonusStats: { technique: 5, ki: 3 } },
                { name: "Namekian", description: "Regeneration abilities and potential to fuse. Can create Dragon Balls at high levels.", bonusStats: { def: 4, end: 4 } },
                { name: "Frieza Race", description: "Born powerful with transformation forms. Naturally high power but slower growth.", bonusStats: { power: 8, spd: 2 } },
                { name: "Android", description: "Infinite energy but cannot sense Ki. Cannot use transformation abilities.", bonusStats: { end: 10, ki: -2 } },
            ]),
            availableRaces: JSON.stringify([
                { name: "Saiyan", description: "A proud warrior race. Gains zenkai boosts after recovering from near-death." },
                { name: "Human", description: "Earthlings with untapped potential. Can master any technique with training." },
                { name: "Namekian", description: "Green-skinned warriors from Planet Namek. Can regenerate and fuse." },
                { name: "Frieza Race", description: "Ice demons with immense latent power and multiple transformation stages." },
                { name: "Half-Saiyan", description: "Human-Saiyan hybrid. Potentially stronger than pure Saiyans." },
            ]),
            statAllocationMethod: "point_buy",
            startingStatPoints: 30,
            allowCustomNames: true,
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                         FACTIONS                                ║
        // ╚════════════════════════════════════════════════════════════════╝

        const zFightersFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Z-Fighters",
            description: "Earth's mightiest warriors! A group of powerful fighters who protect the planet from any threat. Led by Goku, they've saved Earth countless times.",
            territory: "Earth",
        });

        const capsuleCorpFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Capsule Corporation",
            description: "The world's leading technology company, founded by Dr. Brief. Provides equipment, vehicles, and support to the Z-Fighters. Home of Bulma and Vegeta.",
            territory: "West City",
        });

        const friezaForceFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Frieza Force",
            description: "The galactic army of the tyrant Frieza. Conquers and destroys planets for profit. Known for their scouters and ruthless soldiers.",
            territory: "Various Conquered Planets",
        });

        const redRibbonFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Red Ribbon Army",
            description: "A military organization that once sought world domination. Though destroyed by Goku, their android projects continue to pose threats.",
            territory: "Various Hidden Bases",
        });

        const kamiGuardiansFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Earth's Guardians",
            description: "The celestial protectors of Earth, led by Dende as Guardian. They maintain the Dragon Balls and watch over humanity from the Lookout.",
            territory: "Kami's Lookout",
        });

        const universeGodsFaction = await ctx.db.insert("factions", {
            campaignId,
            name: "Gods of Universe 7",
            description: "The divine hierarchy overseeing Universe 7. Includes Beerus the Destroyer, Whis the Angel, and the Supreme Kais.",
            territory: "Beerus's Planet & Sacred World of the Kai",
        });

        // Update faction relationships
        await ctx.db.patch(zFightersFaction, {
            allies: [capsuleCorpFaction, kamiGuardiansFaction],
            enemies: [friezaForceFaction, redRibbonFaction],
        });

        await ctx.db.patch(capsuleCorpFaction, {
            allies: [zFightersFaction, kamiGuardiansFaction],
        });

        await ctx.db.patch(friezaForceFaction, {
            enemies: [zFightersFaction],
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                           ITEMS                                 ║
        // ╚════════════════════════════════════════════════════════════════╝

        // --- CONSUMABLES ---
        const senzuBean = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Senzu Bean",
            type: "Consumable",
            category: "consumable",
            rarity: "Legendary",
            effects: "Fully restores HP, Ki, and cures all status effects. Fills you up for 10 days!",
            description: "A magical bean grown by Korin at Korin Tower. Eating one fully restores all energy and heals any injury instantly.",
            textColor: "#22c55e",
            usable: true,
            consumable: true,
            quantity: 1,
            useEffect: JSON.stringify({ type: "full_heal" }),
            lore: "Korin grows these beans in a special garden atop his tower. It takes a long time for each bean to mature.",
        });

        const kiRecoveryDrink = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Energy Drink MAX",
            type: "Consumable",
            category: "consumable",
            rarity: "Common",
            effects: "Restores 30 Ki",
            description: "A specially formulated drink that replenishes Ki energy. Popular among fighters during training.",
            usable: true,
            consumable: true,
            quantity: 5,
            useEffect: JSON.stringify({ type: "restore_mana", amount: 30 }),
        });

        const healingCapsule = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Medical Capsule",
            type: "Consumable",
            category: "consumable",
            rarity: "Uncommon",
            effects: "Heals 50 HP over time",
            description: "A capsule containing advanced medical technology. Deploys a healing field around the user.",
            textColor: "#22c55e",
            usable: true,
            consumable: true,
            useEffect: JSON.stringify({ type: "heal", amount: 50 }),
        });

        const proteinBar = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Saiyan Protein Bar",
            type: "Consumable",
            category: "consumable",
            rarity: "Common",
            effects: "+5 Strength for 10 turns",
            description: "A high-calorie protein bar designed for Saiyan appetites. One bar equals 10 normal meals.",
            usable: true,
            consumable: true,
            useEffect: JSON.stringify({ type: "buff", stat: "strength", amount: 5, duration: 10 }),
        });

        // --- EQUIPMENT ---
        const saiyanArmor = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Saiyan Battle Armor",
            type: "Armor",
            category: "armor",
            rarity: "Rare",
            effects: "+15 Defense. Stretches to accommodate transformations. Self-repairing.",
            description: "The signature armor of Saiyan warriors. Incredibly durable yet flexible, designed to withstand intense combat.",
            textColor: "#3b82f6",
            lore: "Standard issue for Frieza Force elites. Vegeta wore this armor when he first came to Earth.",
        });

        const turtleSchoolGi = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Turtle School Gi",
            type: "Armor",
            category: "armor",
            rarity: "Uncommon",
            effects: "+8 Defense, +5 Speed. Iconic orange color.",
            description: "The traditional uniform of Master Roshi's Turtle School. The kanji on the back represents the Turtle Hermit.",
            textColor: "#f97316",
            lore: "Goku has worn variations of this gi throughout his entire fighting career.",
        });

        const weightedClothing = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Weighted Training Clothes",
            type: "Armor",
            category: "armor",
            rarity: "Uncommon",
            effects: "-5 Speed while worn. Grants 2x training XP. Removing grants temporary +10 Speed.",
            description: "Extremely heavy clothing used for training. Wearing them in battle is a handicap, but removes them for a burst of speed!",
            textColor: "#6366f1",
            lore: "Goku and Piccolo both trained with weighted clothing to multiply their strength gains.",
        });

        const potaraEarrings = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Potara Earrings",
            type: "Accessory",
            category: "accessory",
            rarity: "Legendary",
            effects: "When two beings each wear one earring, they fuse permanently (1 hour for mortals). Combined power is multiplicative.",
            description: "Sacred earrings worn by Supreme Kais. Causes instant and permanent fusion between two individuals.",
            textColor: "#f59e0b",
            lore: "Elder Kai gave these to Goku to fuse with Gohan against Buu. The fusion of Goku and Vegeta created Vegito.",
        });

        const fusionEarpiece = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Fusion Dance Instructions",
            type: "Scroll",
            category: "scroll",
            rarity: "Epic",
            effects: "Teaches the Fusion Dance technique. Requires compatible power levels and matching poses.",
            description: "Detailed instructions for performing the Metamoran Fusion Dance. The fusion lasts 30 minutes.",
            textColor: "#a855f7",
        });

        // --- TOOLS & KEY ITEMS ---
        const dragonRadar = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Dragon Radar",
            type: "Tool",
            category: "quest",
            rarity: "Legendary",
            effects: "Detects the location of all Dragon Balls within range. Essential for collecting the Dragon Balls.",
            description: "Invented by Bulma, this device can detect the unique energy signature of Dragon Balls across the entire planet.",
            textColor: "#f59e0b",
            lore: "Bulma created this as a teenager, setting off the events of the entire Dragon Ball saga.",
        });

        const scouter = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Scouter",
            type: "Tool",
            category: "accessory",
            rarity: "Rare",
            effects: "Reads power levels up to 180,000. Explodes if reading exceeds limit. Communication device.",
            description: "Frieza Force standard equipment. Displays power levels numerically but cannot detect suppressed Ki.",
            textColor: "#3b82f6",
            usable: true,
            consumable: false,
            useEffect: JSON.stringify({ type: "scan_power_level" }),
        });

        const timeMachine = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Time Machine",
            type: "Vehicle",
            category: "quest",
            rarity: "Legendary",
            effects: "Travel through time. Warning: Creates alternate timelines. Fuel is extremely rare.",
            description: "Built by Future Bulma over 20 years. Can travel backwards or forwards in time.",
            textColor: "#f59e0b",
            lore: "Trunks used this to travel to the past and warn the Z-Fighters about the Androids.",
        });

        const flyingNimbus = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Flying Nimbus",
            type: "Vehicle",
            category: "accessory",
            rarity: "Epic",
            effects: "Summons a flying cloud. Can only be ridden by pure-hearted individuals. Speed: Mach 1.5.",
            description: "A magical flying cloud given to Goku by Master Roshi. It responds to the call 'Kinto'un!'",
            textColor: "#fbbf24",
            usable: true,
            useEffect: JSON.stringify({ type: "summon_vehicle" }),
        });

        const capsule = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Dyno-Cap House",
            type: "Tool",
            category: "consumable",
            rarity: "Uncommon",
            effects: "Deploys a fully-furnished house. Contains beds, kitchen, and bathroom. Can be re-capsuled.",
            description: "A Capsule Corporation invention that stores an entire house in a small capsule. Press the button and throw!",
            usable: true,
            consumable: false,
            useEffect: JSON.stringify({ type: "deploy_shelter" }),
        });

        // --- DRAGON BALLS ---
        const oneStarBall = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "One-Star Dragon Ball",
            type: "Quest Item",
            category: "quest",
            rarity: "Legendary",
            effects: "One of seven balls needed to summon Shenron. Cannot be destroyed.",
            description: "An orange crystalline orb containing one red star. Slightly warm to the touch and glows faintly.",
            textColor: "#f59e0b",
            lore: "The Dragon Balls were created by the Namekian Dragon Clan. Collecting all seven summons the Eternal Dragon.",
        });

        const fourStarBall = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Four-Star Dragon Ball",
            type: "Quest Item",
            category: "quest",
            rarity: "Legendary",
            effects: "Goku's keepsake from Grandpa Gohan. One of seven balls needed to summon Shenron.",
            description: "The Dragon Ball that once belonged to Goku's grandfather. It holds deep sentimental value.",
            textColor: "#f59e0b",
            lore: "Grandpa Gohan found baby Goku near this Dragon Ball. After Gohan's death, Goku kept it as a memento.",
        });

        // --- WEAPONS ---
        const powerPole = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Power Pole (Nyoibo)",
            type: "Weapon",
            category: "weapon",
            rarity: "Epic",
            effects: "+15 Attack. Extends to any length on command. Connects Korin Tower to Kami's Lookout.",
            description: "A magical red pole that extends and contracts at its user's will. Once belonged to Korin and Master Roshi.",
            textColor: "#ef4444",
            lore: "Originally one of the sacred treasures of Kami. Goku used it throughout his early adventures.",
        });

        const zSword = await ctx.db.insert("items", {
            userId,
            campaignId,
            name: "Z-Sword",
            type: "Weapon",
            category: "weapon",
            rarity: "Legendary",
            effects: "+30 Attack. Extremely heavy (nearly unliftable). Breaking it frees Elder Kai.",
            description: "The legendary sword sealed in the Sacred World of the Kai. Only the strongest can wield it.",
            textColor: "#6366f1",
            lore: "Gohan trained with and eventually broke this sword, freeing Elder Kai who had been sealed inside.",
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                         LOCATIONS                               ║
        // ╚════════════════════════════════════════════════════════════════╝

        const capsuleCorp = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Capsule Corporation",
            type: "City",
            description: "The headquarters of Capsule Corp in West City. Home to Bulma, Vegeta, and their family. Features advanced labs, training facilities, and the famous dome building.",
            environment: "Futuristic dome building with advanced technology. Gardens, labs, and a gravity training room. Dinosaurs roam the grounds.",
            neighbors: [],
            mapX: 300,
            mapY: 400,
        });

        const kameLookout = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Kami's Lookout",
            type: "Sacred Place",
            description: "The floating palace high above Earth where the Guardian resides. Home to Dende, Mr. Popo, and the entrance to the Hyperbolic Time Chamber.",
            environment: "A circular platform floating above the clouds. Palm trees, a grand temple, and perfectly maintained gardens. The air is thin but pure.",
            neighbors: [],
            mapX: 500,
            mapY: 100,
        });

        const hyperbolicTimeChamber = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Hyperbolic Time Chamber",
            type: "Training Area",
            description: "A dimension where one year passes inside for every day outside. The gravity is 10x Earth's and the atmosphere is sparse. Perfect for intense training.",
            environment: "An endless white void with extreme heat, cold, and thin air. Only a small living quarters exists at the entrance. Time flows differently here.",
            neighbors: [],
            mapX: 550,
            mapY: 150,
        });

        const korinTower = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Korin Tower",
            type: "Sacred Place",
            description: "A massive tower reaching above the clouds where Korin the cat lives. The training ground between Earth and Kami's Lookout. Home of the Senzu Beans.",
            environment: "The interior is a small room at the top of an impossibly tall tower. Senzu bean plants grow in pots. Korin's staff and jar are here.",
            neighbors: [],
            mapX: 500,
            mapY: 200,
        });

        const kameHouse = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Kame House",
            type: "Home",
            description: "Master Roshi's small pink house on a tiny island. The original training ground of the Turtle School and a gathering place for the Z-Fighters.",
            environment: "A tiny tropical island with a single palm tree. The pink house has 'Kame' written on it. The ocean stretches endlessly in all directions.",
            neighbors: [],
            mapX: 200,
            mapY: 600,
        });

        const kingKaiPlanet = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "King Kai's Planet",
            type: "Other World",
            description: "A tiny planet at the end of Snake Way in Other World. Home to King Kai, Bubbles, and Gregory. The gravity is 10x Earth's.",
            environment: "A small green planetoid with a single road, a small house, and a car. Bubbles the monkey and Gregory the cricket live here. King Kai tells bad jokes.",
            neighbors: [],
            mapX: 800,
            mapY: 100,
        });

        const worldTournament = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "World Martial Arts Tournament",
            type: "Arena",
            description: "The legendary arena on Papaya Island where the world's strongest fighters compete. Many historic battles have taken place here.",
            environment: "A raised stone platform surrounded by crowds. The tournament building hosts elimination rounds. Palm trees and ocean surround the island.",
            neighbors: [],
            mapX: 400,
            mapY: 700,
        });

        const cellGamesArena = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Cell Games Arena",
            type: "Arena",
            description: "The arena Cell constructed for his tournament. Now a memorial site for the battle that saved Earth from the bio-android.",
            environment: "A flat ring in a desert wasteland. The ground is still scarred from the battle. A small memorial stands nearby.",
            neighbors: [],
            mapX: 600,
            mapY: 500,
        });

        const namek = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Planet Namek",
            type: "Planet",
            description: "The home world of the Namekians. A planet with three suns that never sets, covered in blue-green grass and strange rock formations. Home to the original Dragon Balls.",
            environment: "Eternal day from three suns. Blue-green grass, tall rock spires, and Namekian villages. The sky is green and the water is blue.",
            neighbors: [],
            mapX: 900,
            mapY: 300,
        });

        const friezaShip = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Frieza's Spaceship",
            type: "Spaceship",
            description: "The massive flagship of the Frieza Force. A flying saucer design that houses thousands of soldiers and advanced medical pods.",
            environment: "Sleek white and purple corridors. Medical chambers, training rooms, and Frieza's throne room. Soldiers patrol constantly.",
            neighbors: [],
            mapX: 850,
            mapY: 400,
        });

        const beerusPlanet = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Beerus's Planet",
            type: "Divine Realm",
            description: "The home of Beerus, the God of Destruction of Universe 7. A surreal dimension with an inverted pyramid palace.",
            environment: "An alien landscape with floating rocks and strange trees. The palace is an ornate pyramid floating upside-down. Whis tends the gardens.",
            neighbors: [],
            mapX: 100,
            mapY: 100,
        });

        const redRibbonBase = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Red Ribbon Army Secret Lab",
            type: "Dungeon",
            description: "A hidden laboratory where Dr. Gero created the Androids. Contains cryogenic pods, computer banks, and secret chambers.",
            environment: "Underground facility carved into a mountain. Flickering lights, abandoned pods, and the remains of Android blueprints. Eerie and cold.",
            neighbors: [],
            mapX: 700,
            mapY: 600,
        });

        const orangeStarCity = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Orange Star City",
            type: "City",
            description: "A major city where Orange Star High School is located. Gohan attended school here and became the Great Saiyaman.",
            environment: "A bustling modern city with tall buildings, schools, and shopping districts. Satan City statue stands in the center.",
            neighbors: [],
            mapX: 400,
            mapY: 400,
        });

        const mountPaozu = await ctx.db.insert("locations", {
            userId,
            campaignId,
            name: "Mount Paozu",
            type: "Wilderness",
            description: "The mountain region where Goku grew up with Grandpa Gohan. A peaceful forest area home to dinosaurs and wild animals.",
            environment: "Dense forests, waterfalls, and small clearings. Goku's childhood home sits in a valley. Dinosaurs and giant fish are common.",
            neighbors: [],
            mapX: 250,
            mapY: 300,
        });

        // Update location neighbors
        await ctx.db.patch(capsuleCorp, { neighbors: [orangeStarCity, mountPaozu] });
        await ctx.db.patch(kameLookout, { neighbors: [korinTower, hyperbolicTimeChamber] });
        await ctx.db.patch(hyperbolicTimeChamber, { neighbors: [kameLookout] });
        await ctx.db.patch(korinTower, { neighbors: [kameLookout, mountPaozu] });
        await ctx.db.patch(kameHouse, { neighbors: [worldTournament, orangeStarCity] });
        await ctx.db.patch(worldTournament, { neighbors: [kameHouse, cellGamesArena] });
        await ctx.db.patch(cellGamesArena, { neighbors: [worldTournament, redRibbonBase] });
        await ctx.db.patch(namek, { neighbors: [friezaShip] });
        await ctx.db.patch(friezaShip, { neighbors: [namek, beerusPlanet] });
        await ctx.db.patch(orangeStarCity, { neighbors: [capsuleCorp, kameHouse, mountPaozu] });
        await ctx.db.patch(mountPaozu, { neighbors: [capsuleCorp, korinTower, orangeStarCity] });
        await ctx.db.patch(redRibbonBase, { neighbors: [cellGamesArena] });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                          REGIONS                                ║
        // ╚════════════════════════════════════════════════════════════════╝

        const earthRegion = await ctx.db.insert("regions", {
            campaignId,
            name: "Earth",
            description: "The home planet of humanity and the primary battleground for the Z-Fighters.",
            locationIds: [capsuleCorp, kameHouse, worldTournament, cellGamesArena, orangeStarCity, mountPaozu, redRibbonBase],
            governingFactionId: zFightersFaction,
        });

        const sacredRealm = await ctx.db.insert("regions", {
            campaignId,
            name: "Sacred Realm",
            description: "The divine locations above Earth, watched over by Kami's successors.",
            locationIds: [kameLookout, korinTower, hyperbolicTimeChamber],
            governingFactionId: kamiGuardiansFaction,
        });

        const outerSpace = await ctx.db.insert("regions", {
            campaignId,
            name: "Outer Space",
            description: "The various planets and locations beyond Earth.",
            locationIds: [namek, friezaShip, beerusPlanet, kingKaiPlanet],
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                           NPCS                                  ║
        // ╚════════════════════════════════════════════════════════════════╝

        // --- Z-FIGHTERS ---
        const goku = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Goku",
            role: "Saiyan Warrior",
            attitude: "Friendly",
            description: "Earth's greatest hero and a Saiyan raised on Earth! Always seeking stronger opponents and loves to fight. Pure-hearted and a bit naive, but becomes serious when friends are threatened.",
            locationId: mountPaozu,
            factionId: zFightersFaction,
            health: 500,
            maxHealth: 500,
            damage: 100,
            armorClass: 20,
            isEssential: true,
            willTrade: false,
            inventoryItems: [turtleSchoolGi, fourStarBall, flyingNimbus, powerPole],
            gold: 0, // Goku doesn't care about money
        });

        const vegeta = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Vegeta",
            role: "Saiyan Prince",
            attitude: "Proud",
            description: "The Prince of all Saiyans! Once a ruthless warrior, now a defender of Earth (though he'd never admit it). Obsessed with surpassing Goku. Lives at Capsule Corp with Bulma.",
            locationId: capsuleCorp,
            factionId: zFightersFaction,
            health: 480,
            maxHealth: 480,
            damage: 95,
            armorClass: 19,
            isEssential: true,
            willTrade: false,
            inventoryItems: [saiyanArmor],
            gold: 0, // Too proud to deal with money
        });

        const gohan = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Gohan",
            role: "Scholar/Fighter",
            attitude: "Kind",
            description: "Goku's eldest son with incredible hidden potential. Prefers studying to fighting but becomes the strongest when his loved ones are in danger. Married to Videl.",
            locationId: orangeStarCity,
            factionId: zFightersFaction,
            health: 400,
            maxHealth: 400,
            damage: 80,
            armorClass: 18,
            isEssential: false,
            willTrade: false,
            isRecruitable: true,
            recruitCost: 0, // He'll join to help
            gold: 500,
        });

        const piccolo = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Piccolo",
            role: "Namekian Warrior",
            attitude: "Stoic",
            description: "A Namekian warrior and Gohan's mentor. Once an enemy, now one of Earth's greatest defenders. Serious and tactical, he's the voice of reason among the Z-Fighters.",
            locationId: kameLookout,
            factionId: zFightersFaction,
            health: 350,
            maxHealth: 350,
            damage: 70,
            armorClass: 17,
            isEssential: false,
            willTrade: false,
            inventoryItems: [weightedClothing],
            isRecruitable: true,
            recruitCost: 0,
        });

        const krillin = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Krillin",
            role: "Human Martial Artist",
            attitude: "Brave",
            description: "Goku's best friend and the strongest human on Earth! Despite facing enemies far beyond his power level, he never backs down. Married to Android 18.",
            locationId: kameHouse,
            factionId: zFightersFaction,
            health: 150,
            maxHealth: 150,
            damage: 40,
            armorClass: 15,
            isEssential: false,
            willTrade: true,
            tradeInventory: [kiRecoveryDrink, healingCapsule],
            tradePriceModifier: 0.8,
            isRecruitable: true,
            recruitCost: 0,
            gold: 1000,
        });

        // --- MENTORS & ALLIES ---
        const masterRoshi = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Master Roshi",
            role: "Martial Arts Master",
            attitude: "Perverted but Wise",
            description: "The Turtle Hermit, over 300 years old! Inventor of the Kamehameha and teacher of Goku and Krillin. Spends most days reading 'magazines' but is secretly incredibly powerful.",
            locationId: kameHouse,
            factionId: zFightersFaction,
            health: 180,
            maxHealth: 180,
            damage: 50,
            armorClass: 16,
            isEssential: true,
            willTrade: true,
            tradeInventory: [turtleSchoolGi, proteinBar, kiRecoveryDrink],
            tradePriceModifier: 1.0,
            gold: 2000,
        });

        const korin = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Korin",
            role: "Hermit Cat",
            attitude: "Wise",
            description: "An 800-year-old martial arts master in the form of a white cat. Guards the Sacred Water and grows Senzu Beans. Speaks with ancient wisdom.",
            locationId: korinTower,
            factionId: kamiGuardiansFaction,
            health: 50,
            maxHealth: 50,
            damage: 10,
            armorClass: 12,
            isEssential: true,
            willTrade: true,
            tradeInventory: [senzuBean],
            tradePriceModifier: 2.0, // Senzu beans are precious
            gold: 0,
        });

        const dende = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Dende",
            role: "Earth's Guardian",
            attitude: "Gentle",
            description: "A young Namekian who became Earth's Guardian after Kami fused with Piccolo. Can heal any injury with his powers. Maintains the Earth's Dragon Balls.",
            locationId: kameLookout,
            factionId: kamiGuardiansFaction,
            health: 80,
            maxHealth: 80,
            damage: 5,
            armorClass: 10,
            isEssential: true,
            willTrade: false,
        });

        const bulma = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Bulma",
            role: "Scientist/Engineer",
            attitude: "Bossy but Caring",
            description: "Genius inventor and CEO of Capsule Corporation. Goku's oldest friend. Created the Dragon Radar and countless inventions. Married to Vegeta.",
            locationId: capsuleCorp,
            factionId: capsuleCorpFaction,
            health: 20,
            maxHealth: 20,
            damage: 1,
            armorClass: 8,
            isEssential: true,
            willTrade: true,
            tradeInventory: [dragonRadar, scouter, capsule, healingCapsule],
            tradePriceModifier: 1.2,
            gold: 50000, // She's rich!
        });

        const whis = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Whis",
            role: "Angel Attendant",
            attitude: "Cheerful",
            description: "The angelic attendant and martial arts teacher of Beerus. Incredibly powerful - can reverse time and defeat anyone with a single tap. Loves Earth's food.",
            locationId: beerusPlanet,
            factionId: universeGodsFaction,
            health: 9999,
            maxHealth: 9999,
            damage: 9999,
            armorClass: 30,
            isEssential: true,
            willTrade: false,
        });

        const kingKai = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "King Kai",
            role: "Martial Arts Teacher",
            attitude: "Comedic",
            description: "The ruler of the North Galaxy and teacher of the Kaio-ken and Spirit Bomb techniques. Loves bad puns and teaches through unusual methods.",
            locationId: kingKaiPlanet,
            factionId: kamiGuardiansFaction,
            health: 100,
            maxHealth: 100,
            damage: 30,
            armorClass: 14,
            isEssential: true,
            willTrade: false,
        });

        // --- VILLAINS ---
        const frieza = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Frieza",
            role: "Galactic Emperor",
            attitude: "Hostile",
            description: "The tyrannical emperor of the universe! Responsible for destroying Planet Vegeta and countless other worlds. Has multiple transformation forms, each more powerful than the last.",
            locationId: friezaShip,
            factionId: friezaForceFaction,
            health: 600,
            maxHealth: 600,
            damage: 120,
            armorClass: 22,
            isEssential: true, // Key villain
            willTrade: false,
            inventoryItems: [scouter],
            gold: 1000000,
        });

        const cell = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Cell",
            role: "Bio-Android",
            attitude: "Hostile",
            description: "The ultimate creation of Dr. Gero! A bio-android containing the cells of the strongest fighters. Seeks perfection through absorption and loves to test his power.",
            locationId: cellGamesArena,
            factionId: redRibbonFaction,
            health: 550,
            maxHealth: 550,
            damage: 110,
            armorClass: 21,
            isEssential: true,
            willTrade: false,
        });

        const beerus = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Beerus",
            role: "God of Destruction",
            attitude: "Neutral",
            description: "The God of Destruction of Universe 7! Immensely powerful but mostly just wants to eat and sleep. Can destroy planets with a sneeze. Has a cat-like appearance.",
            locationId: beerusPlanet,
            factionId: universeGodsFaction,
            health: 8000,
            maxHealth: 8000,
            damage: 1000,
            armorClass: 28,
            isEssential: true,
            willTrade: false,
        });

        // --- MERCHANTS ---
        const fortuneTeller = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Fortuneteller Baba",
            role: "Fortune Teller",
            attitude: "Greedy",
            description: "Master Roshi's older sister and a powerful witch. Can locate anything for a price, or you can win a tournament against her fighters for free.",
            locationId: orangeStarCity,
            factionId: undefined,
            health: 30,
            maxHealth: 30,
            damage: 5,
            armorClass: 10,
            isEssential: false,
            willTrade: true,
            tradeInventory: [potaraEarrings, fusionEarpiece],
            tradePriceModifier: 3.0, // She's expensive!
            gold: 10000,
        });

        const mrSatan = await ctx.db.insert("npcs", {
            userId,
            campaignId,
            name: "Mr. Satan (Hercule)",
            role: "World Champion",
            attitude: "Boastful",
            description: "The 'World Champion' who took credit for defeating Cell! Actually just a normal (if skilled) martial artist. Extremely wealthy and famous. Father of Videl.",
            locationId: worldTournament,
            factionId: zFightersFaction,
            health: 50,
            maxHealth: 50,
            damage: 8,
            armorClass: 12,
            isEssential: false,
            willTrade: true,
            tradeInventory: [proteinBar, kiRecoveryDrink],
            tradePriceModifier: 1.5,
            gold: 100000,
            isRecruitable: true,
            recruitCost: 10000, // He's expensive to hire
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                         MONSTERS                                ║
        // ╚════════════════════════════════════════════════════════════════╝

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Frieza Force Soldier",
            description: "A common soldier in Frieza's army. Equipped with a scouter and blaster. Power level: Around 1,000.",
            health: 30,
            damage: 10,
            locationId: friezaShip,
            dropItemIds: [scouter, kiRecoveryDrink],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Saibaman",
            description: "Green humanoid creatures grown from seeds. Power level equivalent to Raditz (1,200). Can self-destruct as a last resort!",
            health: 50,
            damage: 20,
            locationId: cellGamesArena,
            dropItemIds: [proteinBar],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Cell Jr.",
            description: "Small blue offspring spawned by Perfect Cell. Each has power comparable to a Super Saiyan! Extremely dangerous in groups.",
            health: 150,
            damage: 60,
            locationId: cellGamesArena,
            dropItemIds: [healingCapsule, kiRecoveryDrink],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Red Ribbon Android",
            description: "An older model android from Dr. Gero's lab. Limited AI but still dangerous. Powered by an energy reactor.",
            health: 80,
            damage: 25,
            locationId: redRibbonBase,
            dropItemIds: [healingCapsule],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Dinosaur",
            description: "The dinosaurs of Earth somehow survived! This carnivorous one sees you as lunch. Common in wilderness areas.",
            health: 40,
            damage: 12,
            locationId: mountPaozu,
            dropItemIds: [proteinBar, proteinBar],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Dodoria",
            description: "One of Frieza's elite soldiers. A fat pink alien with immense strength. Power level: 22,000. Brutal and ruthless.",
            health: 200,
            damage: 45,
            locationId: namek,
            dropItemIds: [saiyanArmor, scouter],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Zarbon (Transformed)",
            description: "Frieza's handsome elite warrior in his ugly transformed state. Power level: 30,000+. A fearsome beast!",
            health: 250,
            damage: 55,
            locationId: namek,
            dropItemIds: [saiyanArmor, kiRecoveryDrink, healingCapsule],
        });

        await ctx.db.insert("monsters", {
            userId,
            campaignId,
            name: "Ginyu Force Member",
            description: "A member of the elite Ginyu Force! They pose dramatically before fighting. Each has unique special abilities.",
            health: 180,
            damage: 50,
            locationId: friezaShip,
            dropItemIds: [saiyanArmor, scouter, kiRecoveryDrink],
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                          QUESTS                                 ║
        // ╚════════════════════════════════════════════════════════════════╝

        const collectDragonBallsQuest = await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "The Dragon Ball Hunt",
            description: "Gather all seven Dragon Balls before anyone else! Use the Dragon Radar to track them down across the world. But beware - you're not the only one searching...",
            status: "active",
            source: "creator",
            rewardItemIds: [senzuBean, senzuBean, senzuBean],
            rewards: "Summon Shenron and make ONE wish!",
        });

        const trainWithRoshi = await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Turtle School Training",
            description: "Master Roshi has agreed to train you! Complete his rigorous training program: deliver milk across the island, plow fields with your bare hands, and survive his... unique teaching methods.",
            status: "active",
            locationId: kameHouse,
            npcId: masterRoshi,
            source: "creator",
            rewardItemIds: [turtleSchoolGi],
            rewards: "Learn the Kamehameha technique!",
        });

        const hyperbolicTraining = await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "A Year in a Day",
            description: "Enter the Hyperbolic Time Chamber and spend one year training inside (only one day passes outside). Can you handle the extreme conditions and emerge stronger?",
            status: "active",
            locationId: hyperbolicTimeChamber,
            source: "creator",
            rewards: "+100 to all stats, unlock transformation potential",
        });

        const worldTournamentQuest = await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "World Martial Arts Tournament",
            description: "The World Martial Arts Tournament is beginning! Register and fight your way through the preliminary rounds to reach the finals. The champion wins 10 million Zeni!",
            status: "active",
            locationId: worldTournament,
            source: "creator",
            rewards: "10,000,000 Zeni and the title of World Champion",
        });

        const stopFrieza = await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Frieza Saga: The Tyrant Approaches",
            description: "Frieza has arrived on Planet Namek seeking the Dragon Balls for immortality! Race against time to collect the balls first and stop the galactic emperor before he becomes unstoppable.",
            status: "active",
            locationId: namek,
            source: "creator",
            rewardItemIds: [saiyanArmor],
            rewards: "Potential to unlock Super Saiyan transformation through extreme emotion",
        });

        const cellGamesQuest = await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "The Cell Games",
            description: "Cell has announced a tournament to determine Earth's fate! You have 10 days to prepare. Train hard, gather allies, and face the perfect being in single combat. The fate of Earth is at stake!",
            status: "active",
            locationId: cellGamesArena,
            source: "creator",
            rewardItemIds: [senzuBean],
            rewards: "Save the Earth! Recognition as a true hero (that Mr. Satan will take credit for).",
        });

        const meetBeerus = await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Battle of Gods",
            description: "The God of Destruction Beerus has awakened! He's searching for the 'Super Saiyan God' from his prophetic dream. Prevent him from destroying Earth by finding a way to entertain him!",
            status: "active",
            locationId: beerusPlanet,
            source: "creator",
            rewards: "Learn about God Ki and potential divine training with Whis",
        });

        const findSenzuBeans = await ctx.db.insert("quests", {
            userId,
            campaignId,
            title: "Senzu Bean Supply Run",
            description: "Korin is running low on Senzu Beans! Help him gather the rare ingredients needed to grow more. Travel across Earth to find Sacred Water, Ultra Divine Water, and rare herbs.",
            status: "active",
            locationId: korinTower,
            npcId: korin,
            source: "creator",
            rewardItemIds: [senzuBean, senzuBean],
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                           LORE                                  ║
        // ╚════════════════════════════════════════════════════════════════╝

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "The Saiyan Race",
            content: `The Saiyans were a warrior race from Planet Vegeta, known for their love of battle and incredible fighting potential. Key traits:

- All Saiyans are born with a tail that allows them to transform into Great Apes (Oozaru) under a full moon
- They experience Zenkai boosts - growing dramatically stronger after recovering from near-death
- Their hair never changes from birth (except through transformations)
- Super Saiyan is a legendary transformation achieved through intense emotional trigger
- The Saiyan royal family had the highest power levels
- Frieza destroyed Planet Vegeta fearing the Super Saiyan legend

Notable Saiyans: Goku (Kakarot), Vegeta, Gohan, Goten, Trunks, Bardock, Raditz, Nappa, Broly`,
            category: "Faction",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "The Dragon Balls",
            content: `The Dragon Balls are magical orbs that, when gathered, can summon the Eternal Dragon to grant wishes:

EARTH'S DRAGON BALLS (Created by Kami/Dende):
- 7 orange balls with red stars (1-7)
- Summon Shenron
- Can grant 2 wishes (Dende's upgrade)
- Turn to stone for 1 year after use
- Scatter across Earth after wishes

NAMEKIAN DRAGON BALLS:
- Larger, summon Porunga
- 3 wishes per summoning
- Can revive the same person multiple times
- Require wishes spoken in Namekian

SUPER DRAGON BALLS:
- Planet-sized balls scattered across Universes 6 and 7
- Summon Super Shenron
- Can grant any wish without limitation
- Require divine language to activate`,
            category: "Magic",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "Ki and Power Levels",
            content: `Ki (気) is the life force energy that flows through all living beings:

BASICS:
- Every living being has Ki
- Can be trained and increased through martial arts
- Allows flight, energy projection, and superhuman feats
- Can be sensed by trained warriors (except for androids and gods)

POWER LEVELS (approximate):
- Average Human: 5
- Farmer with Shotgun: 5
- Mr. Satan: 10
- Master Roshi (suppressed): 139
- Goku (start of Z): 334
- Raditz: 1,500
- Nappa: 4,000
- Vegeta (Saiyan Saga): 18,000
- Frieza (Final Form): 120,000,000
- Super Saiyan Goku: 150,000,000
- Perfect Cell: 900,000,000+

Power levels become less reliable after the Frieza Saga due to God Ki and other factors.`,
            category: "Magic",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "Transformations",
            content: `SAIYAN TRANSFORMATIONS:
- Great Ape (Oozaru): 10x power, requires tail and full moon
- Super Saiyan: 50x power, golden hair and aura, green eyes
- Super Saiyan 2: 100x power, electric sparks, spikier hair
- Super Saiyan 3: 400x power, long hair, no eyebrows, massive drain
- Super Saiyan God: Divine ki, red hair and aura, calm power
- Super Saiyan Blue: SSJ + God Ki, blue hair, ultimate Saiyan form
- Ultra Instinct: Automatic dodging, silver/white aura, godly technique

FRIEZA RACE:
- Multiple suppression forms (1st, 2nd, 3rd, Final)
- Golden Frieza: 100x Final Form
- Black Frieza: Beyond Golden

OTHER:
- Namekian Fusion: Permanent power combination
- Potential Unleashed: All hidden power accessed
- Buff Form: Muscle mass increase (usually a trap)`,
            category: "Magic",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "The Frieza Force",
            content: `Emperor Frieza's galactic army that conquered and sold planets:

STRUCTURE:
- Frieza at the top (with Cold as his father)
- Elite warriors (Zarbon, Dodoria)
- Ginyu Force (special forces)
- Appule, Cui, and other commanders
- Countless foot soldiers across the galaxy

NOTABLE ACTIONS:
- Destroyed Planet Vegeta and the Saiyan race
- Conquered Planet Namek for the Dragon Balls
- Controlled the Saiyans as soldiers before their destruction
- Sold conquered planets to the highest bidder

The Frieza Force used scouters to measure power levels and relied on technology and numbers over individual training.`,
            category: "Faction",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "The Red Ribbon Army & Androids",
            content: `The Red Ribbon Army was a paramilitary organization destroyed by young Goku:

HISTORY:
- Sought the Dragon Balls for world domination
- Goku single-handedly destroyed them as a child
- Dr. Gero survived and swore revenge

DR. GERO'S ANDROIDS:
- Android 8: Gentle giant, refused to fight
- Android 16: Nature-loving, programmed to kill Goku
- Android 17: Rebellious teen, eventually became a ranger
- Android 18: Married Krillin, has a daughter
- Android 19 & 20 (Gero): Energy absorption models
- Cell: Bio-android with cells of strongest fighters

The Androids proved that artificial beings could surpass natural warriors.`,
            category: "Faction",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "Other World and the Afterlife",
            content: `When beings die in the Dragon Ball universe:

THE PROCESS:
1. Soul travels to Other World
2. Judged by King Yemma (the massive red ogre)
3. Sent to Heaven or Hell (HFIL in dub)

SPECIAL CASES:
- Great warriors may keep their bodies
- Can train on King Kai's planet at end of Snake Way
- Snake Way is 1 million kilometers long!
- Hell is actually pretty nice (more like annoying purgatory)

LOCATIONS:
- King Kai's Planet: Small planet, 10x gravity
- Grand Kai's Planet: Martial arts tournament venue
- Sacred World of the Kai: Home of Supreme Kais

The Z-Fighters have died and been revived multiple times through Dragon Balls.`,
            category: "History",
        });

        await ctx.db.insert("lore", {
            userId,
            campaignId,
            title: "The Tournament of Power",
            content: `The ultimate multiversal battle royale:

PREMISE:
- Zen-Oh (King of Everything) wanted entertainment
- 8 universes compete, losers get erased
- 10 fighters per universe, 48-minute battle royale
- Ring-out elimination only (no killing)

UNIVERSE 7'S TEAM:
Goku, Vegeta, Gohan, Piccolo, Frieza, Android 17, Android 18, Krillin, Master Roshi, Tien

RESULT:
- Android 17 won by being the last fighter standing
- Wished for all erased universes to return
- Zen-Oh was pleased by the "good wish"
- Frieza was revived as thanks for his help

The Tournament demonstrated that teamwork and strategy could overcome raw power.`,
            category: "History",
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                          RUMORS                                 ║
        // ╚════════════════════════════════════════════════════════════════╝

        await ctx.db.insert("rumors", {
            campaignId,
            content: "They say Frieza has returned from Hell... again. And this time, he's been training.",
            type: "major_event",
            originLocationId: capsuleCorp,
            spreadRadius: 3,
            maxSpreadRadius: 5,
            timestamp: Date.now(),
            isActive: true,
        });

        await ctx.db.insert("rumors", {
            campaignId,
            content: "A fighter with golden hair was spotted near Mount Paozu. Could the Super Saiyan legend be real?",
            type: "major_event",
            originLocationId: mountPaozu,
            spreadRadius: 2,
            maxSpreadRadius: 4,
            timestamp: Date.now(),
            isActive: true,
        });

        await ctx.db.insert("rumors", {
            campaignId,
            content: "Mr. Satan claims he's the one who really defeated Cell. But some witnesses tell a different story...",
            type: "quest_complete",
            originLocationId: worldTournament,
            spreadRadius: 5,
            maxSpreadRadius: 5,
            timestamp: Date.now(),
            isActive: true,
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                   TECHNIQUES/ABILITIES                          ║
        // ╚════════════════════════════════════════════════════════════════╝

        // --- BASIC TECHNIQUES ---
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Flight",
            description: "Use Ki to levitate and fly through the air at high speeds. A fundamental skill for any serious fighter.",
            category: "Support",
            requiredLevel: 1,
            energyCost: 5,
            isPassive: false,
            iconEmoji: "🕊️",
            tags: ["movement", "basic"],
            rarity: "Basic",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Ki Sense",
            description: "Feel the Ki of other beings to detect their location and estimate their power level. Cannot sense androids or gods.",
            category: "Support",
            requiredLevel: 2,
            energyCost: 0,
            isPassive: true,
            iconEmoji: "👁️",
            tags: ["detection", "passive"],
            rarity: "Basic",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Ki Blast",
            description: "Fire a basic ball of Ki energy at an opponent. The bread and butter of Ki combat.",
            category: "Ki Blast",
            requiredLevel: 1,
            energyCost: 10,
            damage: 15,
            damageType: "Ki",
            targetType: "single",
            range: "long",
            iconEmoji: "💥",
            tags: ["offensive", "ranged", "basic"],
            rarity: "Basic",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Ki Barrier",
            description: "Create a protective dome of Ki energy around yourself. Blocks incoming attacks but drains Ki continuously.",
            category: "Support",
            requiredLevel: 5,
            energyCost: 30,
            buffEffect: JSON.stringify({ stat: "defense", amount: 20, duration: 3 }),
            iconEmoji: "🛡️",
            tags: ["defensive", "barrier"],
            rarity: "Advanced",
        });

        // --- SIGNATURE TECHNIQUES ---
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Kamehameha",
            description: "The signature technique of the Turtle School! A powerful beam of concentrated Ki. Requires the famous stance and chant.",
            category: "Ki Blast",
            requiredLevel: 10,
            energyCost: 50,
            damage: 80,
            damageType: "Ki",
            damageScaling: JSON.stringify({ stat: "ki", ratio: 1.5 }),
            targetType: "single",
            range: "long",
            castTime: "1 turn",
            iconEmoji: "🌊",
            tags: ["offensive", "beam", "signature"],
            rarity: "Master",
            lore: "Invented by Master Roshi over 50 years of training. Goku learned it by watching it once.",
            creator: "Master Roshi",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Galick Gun",
            description: "Vegeta's signature attack! A purple energy wave fired from both hands. Rivals the Kamehameha in power.",
            category: "Ki Blast",
            requiredLevel: 10,
            energyCost: 50,
            damage: 85,
            damageType: "Ki",
            damageScaling: JSON.stringify({ stat: "power", ratio: 1.4 }),
            targetType: "single",
            range: "long",
            castTime: "1 turn",
            iconEmoji: "💜",
            tags: ["offensive", "beam", "signature"],
            rarity: "Master",
            creator: "Vegeta",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Special Beam Cannon",
            description: "Piccolo's deadly drilling beam! Concentrates all energy into a spiraling penetrating attack. Ignores a portion of defense.",
            category: "Ki Blast",
            requiredLevel: 12,
            energyCost: 70,
            damage: 100,
            damageType: "Ki",
            targetType: "single",
            range: "long",
            castTime: "2 turns",
            iconEmoji: "🔩",
            tags: ["offensive", "beam", "piercing"],
            rarity: "Master",
            lore: "Piccolo developed this to kill Goku but first used it to defeat Raditz.",
            creator: "Piccolo",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Destructo Disc",
            description: "Krillin's signature attack! A razor-sharp disc of Ki that can cut through almost anything. Difficult to control.",
            category: "Ki Blast",
            requiredLevel: 8,
            energyCost: 40,
            damage: 90,
            damageType: "Ki",
            targetType: "single",
            range: "medium",
            iconEmoji: "💿",
            tags: ["offensive", "cutting", "signature"],
            rarity: "Advanced",
            lore: "Can cut through opponents much stronger than the user. Even cut Frieza's tail!",
            creator: "Krillin",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Final Flash",
            description: "Vegeta's ultimate attack! A massive beam of golden energy that requires full power charging. Devastatingly powerful.",
            category: "Ultimate",
            requiredLevel: 25,
            energyCost: 100,
            damage: 200,
            damageType: "Ki",
            damageScaling: JSON.stringify({ stat: "power", ratio: 2.0 }),
            targetType: "single",
            range: "long",
            areaSize: "medium",
            castTime: "2 turns",
            interruptible: true,
            iconEmoji: "⚡",
            tags: ["offensive", "beam", "ultimate"],
            rarity: "Ultimate",
            lore: "Vegeta used this against Perfect Cell. The charge time is its biggest weakness.",
            creator: "Vegeta",
        });

        // --- SPIRIT BOMB ---
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Spirit Bomb (Genki Dama)",
            description: "Gather energy from all living things to form a massive sphere of pure life force! Only usable by those with a pure heart. Devastating against evil.",
            category: "Ultimate",
            requiredLevel: 30,
            requiredStats: JSON.stringify({ technique: 20, ki: 25 }),
            energyCost: 0, // Uses borrowed energy
            damage: 500,
            damageType: "Divine",
            targetType: "single",
            range: "unlimited",
            areaSize: "massive",
            castTime: "5 turns",
            interruptible: true,
            iconEmoji: "🌍",
            tags: ["ultimate", "good-only", "borrowed-power"],
            rarity: "Legendary",
            lore: "Taught by King Kai. Used to defeat Frieza, Kid Buu, and in the Tournament of Power.",
            creator: "King Kai",
            notes: "Deals 2x damage to evil beings. User must be pure of heart.",
        });

        // --- KAIO-KEN ---
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Kaio-Ken",
            description: "A technique that multiplies all abilities but damages the body! Can be stacked (x2, x3, x10, x20) for greater power and greater risk.",
            category: "Transformation",
            requiredLevel: 15,
            healthCost: 20,
            energyCost: 40,
            buffEffect: JSON.stringify({ stat: "all", amount: 50, duration: 3 }),
            debuffEffect: JSON.stringify({ stat: "health", amount: -10, duration: 3 }),
            iconEmoji: "🔴",
            tags: ["transformation", "power-up", "risky"],
            rarity: "Master",
            lore: "Taught by King Kai. Goku combined it with Super Saiyan Blue for Kaio-Ken Blue!",
            creator: "King Kai",
            notes: "Higher multipliers = more power but more damage to user.",
        });

        // --- TRANSFORMATIONS ---
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Super Saiyan",
            description: "THE legendary transformation! Multiplies power by 50x. Golden hair, green eyes, and a fierce golden aura. Achieved through intense rage.",
            category: "Transformation",
            requiredLevel: 20,
            requiredStats: JSON.stringify({ power: 30 }),
            energyCost: 60,
            buffEffect: JSON.stringify({ stat: "all", amount: 100, duration: 10 }),
            iconEmoji: "💛",
            tags: ["transformation", "saiyan-only", "legendary"],
            rarity: "Legendary",
            lore: "The legend says a Super Saiyan appears once every 1000 years. Goku first achieved it against Frieza.",
            notes: "Saiyan race only. Initial trigger requires extreme emotional distress.",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Super Saiyan 2",
            description: "The ascended Super Saiyan form! 100x base power. Electricity crackles around the aura, and the hair becomes spikier.",
            category: "Transformation",
            requiredLevel: 35,
            requiredAbilities: JSON.stringify(["Super Saiyan"]),
            energyCost: 100,
            buffEffect: JSON.stringify({ stat: "all", amount: 200, duration: 8 }),
            iconEmoji: "⚡",
            tags: ["transformation", "saiyan-only", "ascended"],
            rarity: "Legendary",
            lore: "Gohan first achieved this form in rage after Cell killed Android 16.",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Super Saiyan 3",
            description: "The ultimate Super Saiyan form through training! 400x power. Extremely long hair, no eyebrows, massive energy drain.",
            category: "Transformation",
            requiredLevel: 50,
            requiredAbilities: JSON.stringify(["Super Saiyan 2"]),
            energyCost: 200,
            buffEffect: JSON.stringify({ stat: "all", amount: 400, duration: 5 }),
            debuffEffect: JSON.stringify({ stat: "endurance", amount: -30, duration: 5 }),
            iconEmoji: "💫",
            tags: ["transformation", "saiyan-only", "ultimate"],
            rarity: "Divine",
            lore: "Goku achieved this through training in Other World. The energy drain is so severe it significantly shortens time on Earth.",
            notes: "Continuous Ki drain. Not recommended for extended battles.",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Super Saiyan God",
            description: "Divine transformation achieved through ritual! Red hair and aura, calm demeanor. Grants God Ki which cannot be sensed by mortals.",
            category: "Transformation",
            requiredLevel: 70,
            energyCost: 150,
            buffEffect: JSON.stringify({ stat: "all", amount: 500, duration: 10 }),
            iconEmoji: "❤️",
            tags: ["transformation", "saiyan-only", "divine", "god-ki"],
            rarity: "Divine",
            lore: "Achieved through a ritual with 5 righteous Saiyans pouring energy into a 6th. Goku first achieved this to fight Beerus.",
            notes: "Grants God Ki. Can be sensed only by those with divine ki.",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Super Saiyan Blue",
            description: "The combination of Super Saiyan with God Ki! Blue hair and aura. Perfect Ki control allows for precise power management.",
            category: "Transformation",
            requiredLevel: 80,
            requiredAbilities: JSON.stringify(["Super Saiyan", "Super Saiyan God"]),
            energyCost: 180,
            buffEffect: JSON.stringify({ stat: "all", amount: 600, duration: 10 }),
            iconEmoji: "💙",
            tags: ["transformation", "saiyan-only", "divine", "god-ki"],
            rarity: "Divine",
            lore: "Achieved by Goku and Vegeta through training with Whis. Also known as Super Saiyan God Super Saiyan.",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Ultra Instinct -Sign-",
            description: "The beginning of the divine technique! The body moves on its own to dodge attacks. Silver eyes and a heatwave-like aura.",
            category: "Transformation",
            requiredLevel: 90,
            energyCost: 250,
            buffEffect: JSON.stringify({ stat: "speed", amount: 1000, duration: 5 }),
            statusEffect: "auto_dodge",
            statusDuration: 5,
            iconEmoji: "⚪",
            tags: ["transformation", "divine", "technique", "angel-technique"],
            rarity: "Divine",
            lore: "A technique of the angels. The user's body reacts without thinking. Even Beerus hasn't mastered it.",
            notes: "Incomplete form. Dodge rate significantly increased but attack power unchanged.",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Mastered Ultra Instinct",
            description: "THE ultimate form! Silver hair, silver eyes, complete body autonomy. Both offense and defense are perfected. The power of the angels!",
            category: "Transformation",
            requiredLevel: 99,
            requiredAbilities: JSON.stringify(["Ultra Instinct -Sign-"]),
            energyCost: 400,
            buffEffect: JSON.stringify({ stat: "all", amount: 2000, duration: 3 }),
            iconEmoji: "🤍",
            tags: ["transformation", "divine", "ultimate", "angel-technique"],
            rarity: "Divine",
            lore: "The complete Ultra Instinct. Goku achieved this in the Tournament of Power against Jiren.",
            notes: "Extremely difficult to maintain. Most powerful mortal transformation.",
        });

        // --- PHYSICAL TECHNIQUES ---
        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Instant Transmission",
            description: "Teleport instantly to any Ki signature you can sense! Lock onto someone's energy and appear right next to them.",
            category: "Support",
            requiredLevel: 25,
            energyCost: 20,
            range: "unlimited",
            iconEmoji: "✨",
            tags: ["movement", "teleportation", "utility"],
            rarity: "Master",
            lore: "Goku learned this from the Yardrats after escaping Namek. Requires sensing the destination Ki.",
            creator: "Yardrat Race",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Solar Flare",
            description: "Emit an blinding flash of light! Temporarily blinds all enemies looking at you. A great escape or setup technique.",
            category: "Support",
            requiredLevel: 5,
            energyCost: 15,
            statusEffect: "Blind",
            statusDuration: 2,
            targetType: "all_enemies",
            iconEmoji: "☀️",
            tags: ["utility", "blind", "escape"],
            rarity: "Advanced",
            lore: "Signature move of Tien Shinhan, but widely adopted by many fighters.",
            creator: "Tien Shinhan",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Fusion Dance",
            description: "Perform the Metamoran Fusion Dance with a partner of similar power level! Creates a fused warrior for 30 minutes with combined power.",
            category: "Support",
            requiredLevel: 20,
            requiredItems: JSON.stringify(["Fusion Dance Instructions"]),
            energyCost: 100,
            buffEffect: JSON.stringify({ stat: "all", amount: 300, duration: 30 }),
            iconEmoji: "💃",
            tags: ["fusion", "partner", "time-limited"],
            rarity: "Legendary",
            lore: "Taught to Goku by the Metamorans. Must be performed perfectly or results in a failed fusion!",
            notes: "Requires partner with similar power level. Both must perform dance perfectly.",
        });

        await ctx.db.insert("spells", {
            userId,
            campaignId,
            name: "Hakai",
            description: "The power to destroy anything! The signature technique of Gods of Destruction. Erases the target from existence completely.",
            category: "Forbidden",
            requiredLevel: 95,
            energyCost: 300,
            damage: 9999,
            damageType: "Hakai",
            targetType: "single",
            range: "short",
            iconEmoji: "💀",
            tags: ["destruction", "god-only", "erase"],
            rarity: "Divine",
            isForbidden: true,
            lore: "Only Gods of Destruction should wield this power. Erases targets completely - no afterlife, no resurrection.",
            notes: "Cannot be used on immortal beings or those stronger than the user.",
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                          SHOPS                                  ║
        // ╚════════════════════════════════════════════════════════════════╝

        // Capsule Corp Shop
        await ctx.db.insert("shops", {
            campaignId,
            locationId: capsuleCorp,
            name: "Capsule Corp Technology Store",
            description: "The latest inventions from Capsule Corporation! Capsules, scouters, vehicles, and more. Run by the Brief family.",
            type: "general",
            shopkeeperId: bulma,
            inventory: [
                { itemId: scouter, stock: 10, basePrice: 5000 },
                { itemId: capsule, stock: 20, basePrice: 1000 },
                { itemId: healingCapsule, stock: 15, basePrice: 500 },
                { itemId: dragonRadar, stock: 1, basePrice: 100000 },
            ],
            basePriceModifier: 1.0,
            buybackModifier: 0.4,
            isOpen: true,
        });

        // Korin's Senzu Shop
        await ctx.db.insert("shops", {
            campaignId,
            locationId: korinTower,
            name: "Korin's Senzu Garden",
            description: "The only source of Senzu Beans in the world! Korin grows them himself. Limited supply - these beans take time to grow.",
            type: "potion",
            shopkeeperId: korin,
            inventory: [
                { itemId: senzuBean, stock: 5, basePrice: 10000, restockRate: 1 },
                { itemId: kiRecoveryDrink, stock: 10, basePrice: 200 },
            ],
            basePriceModifier: 2.0, // Senzu are precious
            buybackModifier: 0.2, // Korin doesn't really buy things
            dynamicPricing: {
                supplyDemandFactor: true,
            },
            isOpen: true,
        });

        // Roshi's Turtle Shop
        await ctx.db.insert("shops", {
            campaignId,
            locationId: kameHouse,
            name: "Turtle School Supplies",
            description: "Training gear and recovery items for aspiring martial artists. Master Roshi runs this shop between magazine readings.",
            type: "general",
            shopkeeperId: masterRoshi,
            inventory: [
                { itemId: turtleSchoolGi, stock: 5, basePrice: 3000 },
                { itemId: weightedClothing, stock: 3, basePrice: 5000 },
                { itemId: proteinBar, stock: 20, basePrice: 100 },
                { itemId: kiRecoveryDrink, stock: 15, basePrice: 150 },
            ],
            basePriceModifier: 0.8, // Roshi gives discounts to students
            buybackModifier: 0.5,
            dynamicPricing: {
                reputationFactor: true,
            },
            isOpen: true,
        });

        // Frieza Force Supply Depot
        await ctx.db.insert("shops", {
            campaignId,
            locationId: friezaShip,
            name: "Frieza Force Quartermaster",
            description: "Military supplies for Frieza's soldiers. Standard issue equipment and medical supplies. Don't ask questions.",
            type: "armor",
            inventory: [
                { itemId: saiyanArmor, stock: 10, basePrice: 8000 },
                { itemId: scouter, stock: 20, basePrice: 3000 },
                { itemId: healingCapsule, stock: 30, basePrice: 400 },
            ],
            basePriceModifier: 1.5, // Military markup
            buybackModifier: 0.3,
            isOpen: true,
        });

        // World Tournament Prize Shop
        await ctx.db.insert("shops", {
            campaignId,
            locationId: worldTournament,
            name: "Tournament Prize Shop",
            description: "Exclusive items available only to tournament participants! Spend your prize money on rare martial arts equipment.",
            type: "general",
            inventory: [
                { itemId: powerPole, stock: 1, basePrice: 50000 },
                { itemId: potaraEarrings, stock: 1, basePrice: 500000 },
                { itemId: flyingNimbus, stock: 2, basePrice: 30000 },
                { itemId: proteinBar, stock: 50, basePrice: 50 },
            ],
            basePriceModifier: 1.2,
            buybackModifier: 0.6,
            isOpen: true,
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                        CONDITIONS                               ║
        // ╚════════════════════════════════════════════════════════════════╝

        // Power Level Gate - Hyperbolic Time Chamber
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Hyperbolic Time Chamber Entry Check",
            description: "Only those with sufficient power level or permission from Dende may enter the Time Chamber.",
            trigger: "on_enter_location",
            triggerContext: hyperbolicTimeChamber.toString(),
            rules: JSON.stringify({
                or: [
                    { gte: ["player.level", 20] },
                    { has_flag: "dende_permission" },
                    { has_flag: "time_chamber_key" },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "allow_entry" },
                { type: "display_message", message: "The door to the Hyperbolic Time Chamber opens before you..." },
            ]),
            elseActions: JSON.stringify([
                { type: "block_entry", message: "Mr. Popo blocks your path. 'You're not ready for this training. Come back when you're stronger.'" },
            ]),
            priority: 10,
            isActive: true,
            createdAt: Date.now(),
        });

        // Beerus Planet - God Ki Check
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Divine Realm Access",
            description: "Only those with God Ki or divine invitation may travel to Beerus's planet.",
            trigger: "on_enter_location",
            triggerContext: beerusPlanet.toString(),
            rules: JSON.stringify({
                or: [
                    { has_ability: "Super Saiyan God" },
                    { has_ability: "Super Saiyan Blue" },
                    { has_flag: "whis_invitation" },
                    { gte: ["player.level", 70] },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "allow_entry" },
                { type: "display_message", message: "Whis's staff glows and transports you to Lord Beerus's planet!" },
            ]),
            elseActions: JSON.stringify([
                { type: "block_entry", message: "You lack the divine Ki necessary to reach this realm. Perhaps training with the gods could help..." },
            ]),
            priority: 10,
            isActive: true,
            createdAt: Date.now(),
        });

        // Super Saiyan Unlock Condition
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Super Saiyan Awakening",
            description: "When a Saiyan experiences extreme rage after a friend dies, they may unlock Super Saiyan.",
            trigger: "on_npc_interact",
            rules: JSON.stringify({
                and: [
                    { eq: ["player.race", "Saiyan"] },
                    { gte: ["player.level", 15] },
                    { has_flag: "witnessed_friend_death" },
                    { not: { has_ability: "Super Saiyan" } },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "grant_ability", ability: "Super Saiyan" },
                { type: "display_message", message: "YOUR RAGE EXPLODES! Golden energy erupts around you as your hair stands on end and turns gold. YOU'VE BECOME A SUPER SAIYAN!" },
                { type: "set_flag", key: "achieved_super_saiyan", value: true },
            ]),
            priority: 100,
            isActive: true,
            executeOnce: true,
            createdAt: Date.now(),
        });

        // Senzu Bean Limit
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Senzu Bean Rationing",
            description: "Korin only allows a limited number of Senzu Beans per visit.",
            trigger: "on_item_use",
            rules: JSON.stringify({
                and: [
                    { eq: ["item.name", "Senzu Bean"] },
                    { gte: ["player.senzu_used_today", 3] },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "block_action", message: "You've already used too many Senzu Beans today! Your body needs time to process them." },
            ]),
            priority: 5,
            isActive: true,
            createdAt: Date.now(),
        });

        // Z-Fighter Reputation Bonus
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Z-Fighter Ally Discount",
            description: "Those with good reputation with the Z-Fighters get discounts at friendly shops.",
            trigger: "on_npc_interact",
            rules: JSON.stringify({
                and: [
                    { gte: ["player.reputation.Z-Fighters", 50] },
                    { eq: ["interaction.type", "trade"] },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "modify_prices", modifier: 0.8 },
                { type: "display_message", message: "As a friend of the Z-Fighters, you receive a 20% discount!" },
            ]),
            priority: 3,
            isActive: true,
            createdAt: Date.now(),
        });

        // Combat Power Check
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Power Level Warning",
            description: "Warn players when entering areas with enemies far above their level.",
            trigger: "on_enter_location",
            rules: JSON.stringify({
                and: [
                    { lt: ["player.level", 50] },
                    {
                        or: [
                            { eq: ["location.name", "Frieza's Spaceship"] },
                            { eq: ["location.name", "Cell Games Arena"] },
                        ],
                    },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "display_message", message: "WARNING: You sense overwhelming power in this area! The enemies here are far beyond your current strength. Proceed with extreme caution!" },
                { type: "set_flag", key: "entered_danger_zone", value: true },
            ]),
            priority: 1,
            isActive: true,
            createdAt: Date.now(),
        });

        // Tournament Registration
        await ctx.db.insert("conditions", {
            campaignId,
            name: "World Tournament Registration",
            description: "Players must register before participating in the tournament.",
            trigger: "on_enter_location",
            triggerContext: worldTournament.toString(),
            rules: JSON.stringify({
                and: [
                    { not: { has_flag: "tournament_registered" } },
                    { gte: ["player.level", 5] },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "display_message", message: "Welcome to the World Martial Arts Tournament! Would you like to register as a competitor?" },
                { type: "offer_choice", options: ["Register (100 Zeni)", "Just Spectating"] },
            ]),
            priority: 5,
            isActive: true,
            createdAt: Date.now(),
        });

        // Zenkai Boost (Saiyan near-death power up)
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Saiyan Zenkai Boost",
            description: "Saiyans grow dramatically stronger after recovering from near-death experiences.",
            trigger: "on_combat_start",
            rules: JSON.stringify({
                and: [
                    { eq: ["player.race", "Saiyan"] },
                    { has_flag: "near_death_recovery" },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "apply_buff", stat: "power", amount: 25, duration: -1 },
                { type: "display_message", message: "Your Saiyan blood surges! The near-death experience has made you significantly stronger!" },
                { type: "remove_flag", key: "near_death_recovery" },
                { type: "set_flag", key: "zenkai_count", value: "+1" },
            ]),
            priority: 50,
            isActive: true,
            createdAt: Date.now(),
        });

        // Dragon Ball Collection Check
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Dragon Ball Gathering Complete",
            description: "When all seven Dragon Balls are collected, Shenron can be summoned!",
            trigger: "on_item_use",
            rules: JSON.stringify({
                and: [
                    { has_item: "One-Star Dragon Ball" },
                    { has_item: "Two-Star Dragon Ball" },
                    { has_item: "Three-Star Dragon Ball" },
                    { has_item: "Four-Star Dragon Ball" },
                    { has_item: "Five-Star Dragon Ball" },
                    { has_item: "Six-Star Dragon Ball" },
                    { has_item: "Seven-Star Dragon Ball" },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "display_message", message: "The Dragon Balls glow intensely and float into the air! The sky darkens as lightning crackles across the heavens... SHENRON APPEARS!" },
                { type: "trigger_event", event: "summon_shenron" },
                { type: "set_flag", key: "shenron_summoned", value: true },
            ]),
            priority: 100,
            isActive: true,
            executeOnce: false,
            createdAt: Date.now(),
        });

        // Frieza Force Hostile Check
        await ctx.db.insert("conditions", {
            campaignId,
            name: "Frieza Force Hostility",
            description: "Members of the Frieza Force attack Z-Fighter allies on sight.",
            trigger: "on_enter_location",
            rules: JSON.stringify({
                and: [
                    { gte: ["player.reputation.Z-Fighters", 20] },
                    { eq: ["location.name", "Frieza's Spaceship"] },
                ],
            }),
            thenActions: JSON.stringify([
                { type: "trigger_combat", enemy_type: "Frieza Force Soldier", count: 3 },
                { type: "display_message", message: "INTRUDER ALERT! Frieza's soldiers recognize you as an enemy and attack!" },
            ]),
            priority: 20,
            isActive: true,
            cooldownSeconds: 300,
            createdAt: Date.now(),
        });

        // ╔════════════════════════════════════════════════════════════════╗
        // ║                      RETURN SUCCESS                             ║
        // ╚════════════════════════════════════════════════════════════════╝

        return {
            success: true,
            campaignId,
            message: "Dragon Ball Z realm created! The fate of the universe awaits! 🐉",
            stats: {
                factions: 6,
                items: 20,
                locations: 14,
                regions: 3,
                npcs: 17,
                monsters: 8,
                quests: 8,
                lore: 8,
                abilities: 25,
                shops: 5,
                conditions: 11,
            },
        };
    },
});