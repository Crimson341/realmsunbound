import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

// Get player relationships - how factions and NPCs feel about the player
export const getPlayerRelationships = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const playerId = identity.tokenIdentifier;

        // Fetch factions, NPCs, and player reputation in parallel
        const [factions, npcs, reputations] = await Promise.all([
            ctx.db.query("factions").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("npcs").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("playerReputation")
                .withIndex("by_campaign_player", (q) => q.eq("campaignId", args.campaignId).eq("playerId", playerId))
                .collect(),
        ]);

        // Get image URLs for factions
        const factionsWithImages = await Promise.all(
            factions.map(async (faction) => ({
                ...faction,
                imageUrl: faction.imageId ? await ctx.storage.getUrl(faction.imageId) : null,
            }))
        );

        // Map reputation to faction IDs for easy lookup
        const reputationMap = new Map(
            reputations.map((r) => [r.factionId.toString(), r.reputation])
        );

        // Build faction relationships with reputation
        const factionRelationships = factionsWithImages.map((faction) => ({
            id: faction._id,
            name: faction.name,
            description: faction.description,
            imageUrl: faction.imageUrl,
            reputation: reputationMap.get(faction._id.toString()) ?? 0,
            territory: faction.territory,
        }));

        // Get NPC images and build NPC relationships
        const livingNpcs = npcs.filter((npc) => !npc.isDead);
        const npcRelationships = await Promise.all(
            livingNpcs.map(async (npc) => {
                const imageUrl = npc.imageId ? await ctx.storage.getUrl(npc.imageId) : null;
                const faction = npc.factionId ? factions.find((f) => f._id === npc.factionId) : null;

                // NPC attitude can be influenced by faction reputation
                const factionRep = npc.factionId
                    ? (reputationMap.get(npc.factionId.toString()) ?? 0)
                    : 0;

                return {
                    id: npc._id,
                    name: npc.name,
                    role: npc.role,
                    attitude: npc.attitude,
                    description: npc.description,
                    imageUrl,
                    factionId: npc.factionId,
                    factionName: faction?.name ?? null,
                    factionReputation: factionRep,
                    loyalty: npc.loyalty,
                    isRecruitable: npc.isRecruitable,
                };
            })
        );

        return {
            factions: factionRelationships,
            npcs: npcRelationships,
        };
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

        // Get starting location for the campaign (first location if available)
        const startingLocation = await ctx.db
            .query("locations")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .first();

        // Create playerGameState for this character
        await ctx.db.insert("playerGameState", {
            campaignId: args.campaignId,
            playerId: identity.tokenIdentifier,
            currentLocationId: startingLocation?._id,
            hp: 20,
            maxHp: 20,
            energy: 100,
            maxEnergy: 100,
            xp: 0,
            level: 1,
            gold: 0,
            isJailed: false,
            activeBuffs: "[]",
            activeCooldowns: "{}",
            lastPlayed: Date.now(),
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

// Save an AI-generated quest with its reward items
export const saveGeneratedQuest = mutation({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
        title: v.string(),
        description: v.string(),
        rewards: v.array(v.object({
            name: v.string(),
            type: v.string(),
            rarity: v.string(),
            effects: v.string(),
            description: v.optional(v.string()),
        })),
        source: v.string(),
        objectives: v.optional(v.array(v.object({
            id: v.string(),
            description: v.string(),
            type: v.string(),
            target: v.optional(v.string()),
            targetCount: v.optional(v.number()),
            isCompleted: v.boolean(),
            isOptional: v.optional(v.boolean()),
            hint: v.optional(v.string()),
        }))),
        difficulty: v.optional(v.string()),
        xpReward: v.optional(v.number()),
        goldReward: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Get campaign to use its userId (quest is for the campaign, not the player)
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Create reward items first
        const rewardItemIds: Id<"items">[] = [];
        for (const reward of args.rewards) {
            const itemId = await ctx.db.insert("items", {
                userId: campaign.userId,
                campaignId: args.campaignId,
                name: reward.name,
                type: reward.type,
                rarity: reward.rarity,
                effects: reward.effects,
                description: reward.description,
                source: "ai-quest",
            });
            rewardItemIds.push(itemId);
        }

        // Create the quest
        const questId = await ctx.db.insert("quests", {
            userId: campaign.userId,
            campaignId: args.campaignId,
            locationId: args.locationId,
            title: args.title,
            description: args.description,
            status: "active",
            source: args.source,
            rewardItemIds: rewardItemIds as any,
            objectives: args.objectives,
            currentObjectiveIndex: 0,
            difficulty: args.difficulty || "medium",
            xpReward: args.xpReward || 50,
            goldReward: args.goldReward || 25,
        });

        return questId;
    },
});

// Update quest progress (objective completion, status changes)
export const updateQuestProgress = mutation({
    args: {
        questId: v.id("quests"),
        objectiveId: v.optional(v.string()),
        incrementCount: v.optional(v.number()),
        completeObjective: v.optional(v.boolean()),
        newStatus: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const quest = await ctx.db.get(args.questId);
        if (!quest) throw new Error("Quest not found");

        const updates: Record<string, unknown> = {};

        // Update specific objective
        if (args.objectiveId && quest.objectives) {
            const objectives = [...quest.objectives];
            const objIndex = objectives.findIndex(o => o.id === args.objectiveId);

            if (objIndex !== -1) {
                const obj = { ...objectives[objIndex] };

                // Increment count
                if (args.incrementCount) {
                    obj.currentCount = (obj.currentCount || 0) + args.incrementCount;
                    if (obj.targetCount && obj.currentCount >= obj.targetCount) {
                        obj.isCompleted = true;
                    }
                }

                // Complete objective directly
                if (args.completeObjective) {
                    obj.isCompleted = true;
                }

                objectives[objIndex] = obj;
                updates.objectives = objectives;

                // Check if all required objectives are complete
                const allRequiredComplete = objectives
                    .filter(o => !o.isOptional)
                    .every(o => o.isCompleted);

                if (allRequiredComplete && quest.status === "active") {
                    updates.status = "completed";
                }
            }
        }

        // Direct status update
        if (args.newStatus) {
            updates.status = args.newStatus;
        }

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(args.questId, updates);
        }

        return { success: true, updates };
    },
});

// Complete a quest and grant rewards
export const completeQuest = mutation({
    args: {
        questId: v.id("quests"),
        playerId: v.string(),
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const quest = await ctx.db.get(args.questId);
        if (!quest) throw new Error("Quest not found");
        if (quest.status === "completed") throw new Error("Quest already completed");

        // Mark quest as completed
        await ctx.db.patch(args.questId, { status: "completed" });

        // Grant rewards to player game state
        const playerState = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", q =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .first();

        if (playerState) {
            const updates: Record<string, unknown> = {};

            if (quest.xpReward) {
                updates.xp = (playerState.xp || 0) + quest.xpReward;
            }
            if (quest.goldReward) {
                updates.gold = (playerState.gold || 0) + quest.goldReward;
            }

            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(playerState._id, updates);
            }
        }

        // Add reward items to player inventory
        if (quest.rewardItemIds && quest.rewardItemIds.length > 0) {
            for (const itemId of quest.rewardItemIds) {
                await ctx.db.insert("playerInventory", {
                    campaignId: args.campaignId,
                    playerId: args.playerId,
                    itemId: itemId,
                    quantity: 1,
                    acquiredAt: Date.now(),
                });
            }
        }

        // Apply reputation changes
        if (quest.rewardReputation) {
            try {
                const repChanges = JSON.parse(quest.rewardReputation);
                for (const [factionName, change] of Object.entries(repChanges)) {
                    // Find faction by name
                    const faction = await ctx.db
                        .query("factions")
                        .withIndex("by_campaign", q => q.eq("campaignId", args.campaignId))
                        .filter(q => q.eq(q.field("name"), factionName))
                        .first();

                    if (faction) {
                        // Update or create reputation
                        const existingRep = await ctx.db
                            .query("playerReputation")
                            .withIndex("by_campaign_player", q =>
                                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
                            )
                            .filter(q => q.eq(q.field("factionId"), faction._id))
                            .first();

                        if (existingRep) {
                            await ctx.db.patch(existingRep._id, {
                                reputation: existingRep.reputation + (change as number),
                                updatedAt: Date.now(),
                            });
                        } else {
                            await ctx.db.insert("playerReputation", {
                                campaignId: args.campaignId,
                                playerId: args.playerId,
                                factionId: faction._id,
                                reputation: change as number,
                                updatedAt: Date.now(),
                            });
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to parse reputation rewards:", e);
            }
        }

        // Activate next quest in chain
        if (quest.nextQuestId) {
            await ctx.db.patch(quest.nextQuestId, { status: "active" });
        }

        return {
            success: true,
            xpGranted: quest.xpReward || 0,
            goldGranted: quest.goldReward || 0,
            itemsGranted: quest.rewardItemIds?.length || 0,
            nextQuestActivated: !!quest.nextQuestId,
        };
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
