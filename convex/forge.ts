import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { withImageUrl, withImageUrls, validateNonEmptyString, validatePositiveNumber, validateNonNegativeNumber, safeJsonParse } from "./lib/helpers";
import { REALM_GENRES, DEFAULT_CHARACTER_CLASSES, DEFAULT_CHARACTER_RACES, DEFAULT_CHARACTER_STATS, PAGINATION } from "./lib/constants";

// Re-export constants for backwards compatibility
export { REALM_GENRES };

// ============================================================================
// CAMPAIGN QUERIES
// ============================================================================

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

        return withImageUrls(ctx, campaigns);
    },
});

export const getPlayedCampaigns = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const myCharacters = await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();

        const campaignIds = [...new Set(
            myCharacters
                .map((c) => c.campaignId)
                .filter((id): id is Id<"campaigns"> => id !== undefined)
        )];

        const campaigns = await Promise.all(
            campaignIds.map((id) => ctx.db.get(id))
        );

        const playedCampaigns = campaigns.filter(
            (c): c is Doc<"campaigns"> =>
                c !== null && c.userId !== identity.tokenIdentifier
        );

        return withImageUrls(ctx, playedCampaigns);
    },
});

export const getAllCampaigns = query({
    args: {
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const limit = Math.min(args.limit ?? PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

        // Only return public campaigns
        const campaigns = await ctx.db
            .query("campaigns")
            .order("desc")
            .take(limit + 1); // Take one extra to determine if there are more

        const hasMore = campaigns.length > limit;
        const results = hasMore ? campaigns.slice(0, limit) : campaigns;

        // Filter to only public campaigns (default to public if not set)
        const publicCampaigns = results.filter((c) => c.isPublic !== false);

        return {
            campaigns: await withImageUrls(ctx, publicCampaigns),
            hasMore,
            nextCursor: hasMore ? results[results.length - 1]._id : null,
        };
    },
});

export const getFeaturedRealms = query({
    args: {},
    handler: async (ctx) => {
        const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_featured", (q) => q.eq("isFeatured", true))
            .collect();

        return withImageUrls(ctx, campaigns);
    },
});

export const getPopularRealms = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = Math.min(args.limit ?? 10, PAGINATION.MAX_LIMIT);

        // TODO: Add a popularity index to avoid full table scan
        // For now, limit the scan to a reasonable number
        const campaigns = await ctx.db
            .query("campaigns")
            .order("desc")
            .take(200); // Cap the scan

        const sorted = campaigns
            .filter((c) => c.isPublic !== false)
            .sort((a, b) => {
                const scoreA = (a.viewCount ?? 0) + (a.playCount ?? 0) * 2;
                const scoreB = (b.viewCount ?? 0) + (b.playCount ?? 0) * 2;
                return scoreB - scoreA;
            })
            .slice(0, limit);

        return withImageUrls(ctx, sorted);
    },
});

export const getRealmsByGenre = query({
    args: {
        genre: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = Math.min(args.limit ?? PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

        const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_genre", (q) => q.eq("genre", args.genre))
            .take(limit);

        const publicCampaigns = campaigns.filter((c) => c.isPublic !== false);

        return withImageUrls(ctx, publicCampaigns);
    },
});

export const getNewestRealms = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = Math.min(args.limit ?? 10, PAGINATION.MAX_LIMIT);

        const campaigns = await ctx.db
            .query("campaigns")
            .order("desc")
            .take(limit);

        const publicCampaigns = campaigns.filter((c) => c.isPublic !== false);

        return withImageUrls(ctx, publicCampaigns);
    },
});

export const getRealmsGroupedByGenre = query({
    args: {
        limitPerGenre: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limitPerGenre = Math.min(args.limitPerGenre ?? 10, 50);

        // Fetch campaigns by genre using index for each genre
        const genreResults: Record<string, Awaited<ReturnType<typeof withImageUrls>>> = {};

        for (const genre of REALM_GENRES) {
            const campaigns = await ctx.db
                .query("campaigns")
                .withIndex("by_genre", (q) => q.eq("genre", genre.key))
                .take(limitPerGenre);

            const publicCampaigns = campaigns.filter((c) => c.isPublic !== false);

            if (publicCampaigns.length > 0) {
                genreResults[genre.key] = await withImageUrls(ctx, publicCampaigns);
            }
        }

        // Handle uncategorized campaigns
        const uncategorized = await ctx.db
            .query("campaigns")
            .filter((q) =>
                q.and(
                    q.eq(q.field("genre"), undefined),
                    q.neq(q.field("isPublic"), false)
                )
            )
            .take(limitPerGenre);

        if (uncategorized.length > 0) {
            genreResults["uncategorized"] = await withImageUrls(ctx, uncategorized);
        }

        return genreResults;
    },
});

export const getCampaignDetails = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;

        const identity = await ctx.auth.getUserIdentity();

        const [locations, allNpcs, items, quests, monsters, spells, lore, userCharacters, factions, regions] = await Promise.all([
            ctx.db.query("locations").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("npcs").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("items").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("quests").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("monsters").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("spells").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("lore").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            identity
                ? ctx.db.query("characters")
                    .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
                    .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                    .collect()
                : Promise.resolve([]),
            ctx.db.query("factions").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("regions").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
        ]);

        const campaignWithImage = await withImageUrl(ctx, campaign);

        const activeQuests = quests.filter((q) => q.status === "active");
        const character = userCharacters[0] ?? null;
        const npcs = allNpcs.filter((npc) => !npc.isDead);
        const deadNpcs = allNpcs.filter((npc) => npc.isDead);

        return {
            campaign: campaignWithImage,
            locations,
            npcs,
            deadNpcs,
            items,
            quests,
            activeQuests,
            monsters,
            spells,
            rules: campaign.rules,
            lore,
            character,
            inventory: items,
            factions,
            regions,
            bountyEnabled: campaign.bountyEnabled,
        };
    },
});

// ============================================================================
// CHARACTER QUERIES
// ============================================================================

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

        return withImageUrls(ctx, characters);
    },
});

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

        // Fetch all user data in parallel
        const [characters, allItems, allSpells] = await Promise.all([
            ctx.db
                .query("characters")
                .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
                .collect(),
            ctx.db
                .query("items")
                .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
                .collect(),
            ctx.db
                .query("spells")
                .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
                .collect(),
        ]);

        // Get unique campaign IDs and fetch campaigns in one batch
        const campaignIds = [...new Set(
            characters
                .map((c) => c.campaignId)
                .filter((id): id is Id<"campaigns"> => id !== undefined)
        )];

        const campaigns = await Promise.all(
            campaignIds.map((id) => ctx.db.get(id))
        );

        // Create lookup maps for O(1) access
        const campaignMap = new Map(
            campaigns
                .filter((c): c is Doc<"campaigns"> => c !== null)
                .map((c) => [c._id.toString(), c])
        );

        // Group items and spells by campaign for O(1) lookup
        const itemsByCampaign = new Map<string, Doc<"items">[]>();
        const spellsByCampaign = new Map<string, Doc<"spells">[]>();

        for (const item of allItems) {
            const key = item.campaignId?.toString() ?? "none";
            const existing = itemsByCampaign.get(key) ?? [];
            existing.push(item);
            itemsByCampaign.set(key, existing);
        }

        for (const spell of allSpells) {
            const key = spell.campaignId?.toString() ?? "none";
            const existing = spellsByCampaign.get(key) ?? [];
            existing.push(spell);
            spellsByCampaign.set(key, existing);
        }

        // Build enriched character data
        const enrichedCharacters = await Promise.all(
            characters.map(async (char) => {
                const campaignKey = char.campaignId?.toString() ?? "none";
                const campaign = char.campaignId ? campaignMap.get(char.campaignId.toString()) : null;
                const campaignItems = itemsByCampaign.get(campaignKey) ?? [];
                const campaignSpells = spellsByCampaign.get(campaignKey) ?? [];

                const [campaignImageUrl, characterImageUrl] = await Promise.all([
                    campaign?.imageId ? ctx.storage.getUrl(campaign.imageId) : null,
                    char.imageId ? ctx.storage.getUrl(char.imageId) : null,
                ]);

                return {
                    _id: char._id,
                    _creationTime: char._creationTime,
                    name: char.name,
                    class: char.class,
                    level: char.level,
                    stats: char.stats,
                    campaignId: char.campaignId,
                    campaignTitle: campaign?.title ?? "No Realm",
                    campaignImageUrl,
                    characterImageUrl,
                    itemCount: campaignItems.length,
                    spellCount: campaignSpells.length,
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

        return {
            characters: enrichedCharacters,
            totalLevel: characters.reduce((sum, c) => sum + c.level, 0),
            totalItems: allItems.length,
            totalSpells: allSpells.length,
        };
    },
});

export const getCharacterCreationStatus = query({
    args: {
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { needsCreation: true, character: null, config: null };
        }

        const [existingCharacter, campaign] = await Promise.all([
            ctx.db
                .query("characters")
                .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .first(),
            ctx.db.get(args.campaignId),
        ]);

        if (!campaign) {
            throw new Error("Campaign not found");
        }

        const config = {
            availableClasses: safeJsonParse(campaign.availableClasses) ?? DEFAULT_CHARACTER_CLASSES,
            availableRaces: safeJsonParse(campaign.availableRaces) ?? DEFAULT_CHARACTER_RACES,
            statAllocationMethod: campaign.statAllocationMethod ?? "standard_array",
            startingStatPoints: campaign.startingStatPoints ?? 27,
            allowCustomNames: campaign.allowCustomNames !== false,
            terminology: safeJsonParse(campaign.terminology) ?? {},
            statConfig: safeJsonParse(campaign.statConfig),
            theme: campaign.theme,
        };

        return {
            needsCreation: !existingCharacter,
            character: existingCharacter,
            config,
        };
    },
});

// ============================================================================
// ITEM & SPELL QUERIES
// ============================================================================

export const getMyItems = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const items = await ctx.db
            .query("items")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .collect();

        return withImageUrls(ctx, items);
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

// ============================================================================
// EFFECTS LIBRARY
// ============================================================================

export const getEffectsLibrary = query({
    args: {
        category: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = Math.min(args.limit ?? PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

        if (args.category) {
            return ctx.db
                .query("effectsLibrary")
                .withIndex("by_category", (q) => q.eq("category", args.category!))
                .take(limit);
        }

        return ctx.db.query("effectsLibrary").take(limit);
    },
});

// ============================================================================
// PLAYER RELATIONSHIPS
// ============================================================================

export const getPlayerRelationships = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const playerId = identity.tokenIdentifier;

        const [factions, npcs, reputations] = await Promise.all([
            ctx.db.query("factions").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("npcs").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
            ctx.db.query("playerReputation")
                .withIndex("by_campaign_player", (q) => q.eq("campaignId", args.campaignId).eq("playerId", playerId))
                .collect(),
        ]);

        const factionsWithImages = await withImageUrls(ctx, factions);

        const reputationMap = new Map(
            reputations.map((r) => [r.factionId.toString(), r.reputation])
        );

        const factionRelationships = factionsWithImages.map((faction) => ({
            id: faction._id,
            name: faction.name,
            description: faction.description,
            imageUrl: faction.imageUrl,
            reputation: reputationMap.get(faction._id.toString()) ?? 0,
            territory: faction.territory,
        }));

        const livingNpcs = npcs.filter((npc) => !npc.isDead);
        const npcRelationships = await Promise.all(
            livingNpcs.map(async (npc) => {
                const imageUrl = npc.imageId ? await ctx.storage.getUrl(npc.imageId) : null;
                const faction = npc.factionId ? factions.find((f) => f._id === npc.factionId) : null;
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

// ============================================================================
// PROFILE QUERIES
// ============================================================================

export const getMyProfile = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
    },
});

// ============================================================================
// CAMPAIGN MUTATIONS
// ============================================================================

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return ctx.storage.generateUploadUrl();
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

        // Validation
        validateNonEmptyString(args.title, "Title");
        validateNonEmptyString(args.description, "Description");
        validatePositiveNumber(args.xpRate, "XP Rate");

        return ctx.db.insert("campaigns", {
            userId: identity.tokenIdentifier,
            title: args.title.trim(),
            description: args.description.trim(),
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

export const incrementRealmView = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) {
            throw new Error("Campaign not found");
        }

        await ctx.db.patch(args.campaignId, {
            viewCount: (campaign.viewCount ?? 0) + 1,
        });
    },
});

export const incrementRealmPlay = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) {
            throw new Error("Campaign not found");
        }

        await ctx.db.patch(args.campaignId, {
            playCount: (campaign.playCount ?? 0) + 1,
        });
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

export const updateRarityColors = mutation({
    args: {
        campaignId: v.id("campaigns"),
        rarityColors: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.userId !== identity.tokenIdentifier) throw new Error("Unauthorized");

        await ctx.db.patch(args.campaignId, {
            rarityColors: args.rarityColors,
        });
    },
});

// ============================================================================
// CHARACTER MUTATIONS
// ============================================================================

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

        // Validation
        validateNonEmptyString(args.name, "Name");
        validateNonEmptyString(args.class, "Class");
        validatePositiveNumber(args.level, "Level");

        // If creating for a campaign, also create playerGameState
        if (args.campaignId) {
            const campaign = await ctx.db.get(args.campaignId);
            if (campaign) {
                await ctx.db.patch(args.campaignId, {
                    playCount: (campaign.playCount ?? 0) + 1,
                });
            }

            // Check if playerGameState already exists
            const existingGameState = await ctx.db
                .query("playerGameState")
                .withIndex("by_campaign_and_player", (q) =>
                    q.eq("campaignId", args.campaignId!).eq("playerId", identity.tokenIdentifier)
                )
                .first();

            if (!existingGameState) {
                // Find starting location for this campaign
                const startingLocation = await ctx.db
                    .query("locations")
                    .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
                    .first();

                await ctx.db.insert("playerGameState", {
                    campaignId: args.campaignId,
                    playerId: identity.tokenIdentifier,
                    currentLocationId: startingLocation?._id,
                    hp: 20,
                    maxHp: 20,
                    energy: 100,
                    maxEnergy: 100,
                    xp: 0,
                    level: args.level,
                    gold: 0,
                    isJailed: false,
                    activeBuffs: "[]",
                    activeCooldowns: "{}",
                    lastPlayed: Date.now(),
                });
            }
        }

        return ctx.db.insert("characters", {
            userId: identity.tokenIdentifier,
            name: args.name.trim(),
            class: args.class.trim(),
            race: args.race?.trim(),
            level: args.level,
            stats: args.stats,
            campaignId: args.campaignId,
            imageId: args.imageId,
            background: args.background,
        });
    },
});

export const ensureCharacterForCampaign = mutation({
    args: {
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const existingCharacter = await ctx.db
            .query("characters")
            .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
            .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
            .first();

        if (existingCharacter) {
            return { characterId: existingCharacter._id, created: false };
        }

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Use campaign's stat config if available, otherwise use defaults
        const statConfig = safeJsonParse<Array<{ key: string }>>(campaign.statConfig);
        let defaultStats: Record<string, number>;

        if (statConfig && statConfig.length > 0) {
            // Use campaign's custom stats
            defaultStats = {};
            for (const stat of statConfig) {
                defaultStats[stat.key] = 10;
            }
        } else {
            defaultStats = { ...DEFAULT_CHARACTER_STATS };
        }

        const characterId = await ctx.db.insert("characters", {
            userId: identity.tokenIdentifier,
            name: identity.name ?? "Traveler",
            class: "Adventurer",
            level: 1,
            stats: JSON.stringify(defaultStats),
            campaignId: args.campaignId,
        });

        const startingLocation = await ctx.db
            .query("locations")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .first();

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

        await ctx.db.patch(args.campaignId, {
            playCount: (campaign.playCount ?? 0) + 1,
        });

        return { characterId, created: true };
    },
});

export const updateCharacterStats = mutation({
    args: {
        characterId: v.id("characters"),
        stats: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const character = await ctx.db.get(args.characterId);
        if (!character) throw new Error("Character not found");
        if (character.userId !== identity.tokenIdentifier) throw new Error("Unauthorized");

        await ctx.db.patch(args.characterId, {
            stats: args.stats,
        });
    },
});

export const killNPC = mutation({
    args: {
        npcId: v.id("npcs"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");

        await ctx.db.patch(args.npcId, {
            isDead: true,
        });
    },
});

// ============================================================================
// ITEM MUTATIONS
// ============================================================================

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

        validateNonEmptyString(args.name, "Name");
        validateNonEmptyString(args.type, "Type");
        validateNonEmptyString(args.rarity, "Rarity");

        return ctx.db.insert("items", {
            userId: identity.tokenIdentifier,
            name: args.name.trim(),
            type: args.type.trim(),
            rarity: args.rarity.trim(),
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

// ============================================================================
// LOCATION MUTATIONS
// ============================================================================

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

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        validateNonEmptyString(args.name, "Name");
        validateNonEmptyString(args.type, "Type");
        validateNonEmptyString(args.description, "Description");

        return ctx.db.insert("locations", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name.trim(),
            type: args.type.trim(),
            environment: args.environment?.trim(),
            description: args.description.trim(),
            neighbors: args.neighbors ?? [],
        });
    },
});

// ============================================================================
// EVENT MUTATIONS
// ============================================================================

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

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        validateNonEmptyString(args.trigger, "Trigger");
        validateNonEmptyString(args.effect, "Effect");

        return ctx.db.insert("events", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            trigger: args.trigger.trim(),
            effect: args.effect.trim(),
            locationId: args.locationId,
        });
    },
});

// ============================================================================
// NPC MUTATIONS
// ============================================================================

export const createNPC = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        role: v.string(),
        attitude: v.string(),
        description: v.string(),
        locationId: v.optional(v.id("locations")),
        health: v.optional(v.number()),
        maxHealth: v.optional(v.number()),
        damage: v.optional(v.number()),
        armorClass: v.optional(v.number()),
        inventoryItems: v.optional(v.array(v.id("items"))),
        dropItems: v.optional(v.array(v.id("items"))),
        gold: v.optional(v.number()),
        willTrade: v.optional(v.boolean()),
        tradeInventory: v.optional(v.array(v.id("items"))),
        tradePriceModifier: v.optional(v.number()),
        isEssential: v.optional(v.boolean()),
        isRecruitable: v.optional(v.boolean()),
        recruitCost: v.optional(v.number()),
        factionId: v.optional(v.id("factions")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        validateNonEmptyString(args.name, "Name");
        validateNonEmptyString(args.role, "Role");
        validateNonEmptyString(args.attitude, "Attitude");
        validateNonEmptyString(args.description, "Description");

        if (args.gold !== undefined) {
            validateNonNegativeNumber(args.gold, "Gold");
        }

        const maxHealth = args.maxHealth ?? 20;
        const health = args.health ?? maxHealth;

        return ctx.db.insert("npcs", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name.trim(),
            role: args.role.trim(),
            attitude: args.attitude.trim(),
            description: args.description.trim(),
            locationId: args.locationId,
            health,
            maxHealth,
            damage: args.damage ?? 5,
            armorClass: args.armorClass ?? 10,
            inventoryItems: args.inventoryItems,
            dropItems: args.dropItems,
            gold: args.gold ?? 0,
            willTrade: args.willTrade,
            tradeInventory: args.tradeInventory,
            tradePriceModifier: args.tradePriceModifier ?? 1.0,
            isEssential: args.isEssential,
            isRecruitable: args.isRecruitable,
            recruitCost: args.recruitCost,
            factionId: args.factionId,
        });
    },
});

// ============================================================================
// QUEST MUTATIONS
// ============================================================================

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

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        validateNonEmptyString(args.title, "Title");
        validateNonEmptyString(args.description, "Description");

        return ctx.db.insert("quests", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            title: args.title.trim(),
            description: args.description.trim(),
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

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        validateNonEmptyString(args.title, "Title");
        validateNonEmptyString(args.description, "Description");

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

        // Create the quest with properly typed rewardItemIds
        return ctx.db.insert("quests", {
            userId: campaign.userId,
            campaignId: args.campaignId,
            locationId: args.locationId,
            title: args.title.trim(),
            description: args.description.trim(),
            status: "active",
            source: args.source,
            rewardItemIds,
            objectives: args.objectives,
            currentObjectiveIndex: 0,
            difficulty: args.difficulty ?? "medium",
            xpReward: args.xpReward ?? 50,
            goldReward: args.goldReward ?? 25,
        });
    },
});

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

        const updates: Partial<Doc<"quests">> = {};

        if (args.objectiveId && quest.objectives) {
            const objectives = [...quest.objectives];
            const objIndex = objectives.findIndex((o) => o.id === args.objectiveId);

            if (objIndex !== -1) {
                const obj = { ...objectives[objIndex] };

                if (args.incrementCount) {
                    obj.currentCount = (obj.currentCount ?? 0) + args.incrementCount;
                    if (obj.targetCount && obj.currentCount >= obj.targetCount) {
                        obj.isCompleted = true;
                    }
                }

                if (args.completeObjective) {
                    obj.isCompleted = true;
                }

                objectives[objIndex] = obj;
                updates.objectives = objectives;

                const allRequiredComplete = objectives
                    .filter((o) => !o.isOptional)
                    .every((o) => o.isCompleted);

                if (allRequiredComplete && quest.status === "active") {
                    updates.status = "completed";
                }
            }
        }

        if (args.newStatus) {
            updates.status = args.newStatus;
        }

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(args.questId, updates);
        }

        return { success: true, updates };
    },
});

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

        await ctx.db.patch(args.questId, { status: "completed" });

        const playerState = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .first();

        if (playerState) {
            const stateUpdates: Partial<Doc<"playerGameState">> = {};

            if (quest.xpReward) {
                stateUpdates.xp = (playerState.xp ?? 0) + quest.xpReward;
            }
            if (quest.goldReward) {
                stateUpdates.gold = (playerState.gold ?? 0) + quest.goldReward;
            }

            if (Object.keys(stateUpdates).length > 0) {
                await ctx.db.patch(playerState._id, stateUpdates);
            }
        }

        // Add reward items to player inventory
        if (quest.rewardItemIds && quest.rewardItemIds.length > 0) {
            for (const itemId of quest.rewardItemIds) {
                await ctx.db.insert("playerInventory", {
                    campaignId: args.campaignId,
                    playerId: args.playerId,
                    itemId,
                    quantity: 1,
                    acquiredAt: Date.now(),
                });
            }
        }

        // Apply reputation changes with proper error handling
        if (quest.rewardReputation) {
            const repChanges = safeJsonParse<Record<string, number>>(quest.rewardReputation);

            if (!repChanges) {
                // Log but don't throw - partial success is better than total failure
                console.error("Failed to parse reputation rewards for quest:", args.questId);
            } else {
                for (const [factionName, change] of Object.entries(repChanges)) {
                    const faction = await ctx.db
                        .query("factions")
                        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
                        .filter((q) => q.eq(q.field("name"), factionName))
                        .first();

                    if (faction) {
                        const existingRep = await ctx.db
                            .query("playerReputation")
                            .withIndex("by_campaign_player", (q) =>
                                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
                            )
                            .filter((q) => q.eq(q.field("factionId"), faction._id))
                            .first();

                        if (existingRep) {
                            await ctx.db.patch(existingRep._id, {
                                reputation: existingRep.reputation + change,
                                updatedAt: Date.now(),
                            });
                        } else {
                            await ctx.db.insert("playerReputation", {
                                campaignId: args.campaignId,
                                playerId: args.playerId,
                                factionId: faction._id,
                                reputation: change,
                                updatedAt: Date.now(),
                            });
                        }
                    }
                }
            }
        }

        // Activate next quest in chain
        if (quest.nextQuestId) {
            await ctx.db.patch(quest.nextQuestId, { status: "active" });
        }

        return {
            success: true,
            xpGranted: quest.xpReward ?? 0,
            goldGranted: quest.goldReward ?? 0,
            itemsGranted: quest.rewardItemIds?.length ?? 0,
            nextQuestActivated: !!quest.nextQuestId,
        };
    },
});

// ============================================================================
// MONSTER MUTATIONS
// ============================================================================

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

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        validateNonEmptyString(args.name, "Name");
        validateNonEmptyString(args.description, "Description");
        validatePositiveNumber(args.health, "Health");
        validateNonNegativeNumber(args.damage, "Damage");

        return ctx.db.insert("monsters", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name.trim(),
            description: args.description.trim(),
            health: args.health,
            damage: args.damage,
            locationId: args.locationId,
            dropItemIds: args.dropItemIds,
        });
    },
});

// ============================================================================
// SPELL MUTATIONS
// ============================================================================

export const createSpell = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        subcategory: v.optional(v.string()),
        iconEmoji: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        requiredLevel: v.optional(v.number()),
        requiredStats: v.optional(v.string()),
        requiredItems: v.optional(v.string()),
        requiredAbilities: v.optional(v.string()),
        energyCost: v.optional(v.number()),
        healthCost: v.optional(v.number()),
        cooldown: v.optional(v.number()),
        usesPerDay: v.optional(v.number()),
        isPassive: v.optional(v.boolean()),
        damage: v.optional(v.number()),
        damageDice: v.optional(v.string()),
        damageType: v.optional(v.string()),
        damageScaling: v.optional(v.string()),
        healing: v.optional(v.number()),
        healingScaling: v.optional(v.string()),
        buffEffect: v.optional(v.string()),
        debuffEffect: v.optional(v.string()),
        statusEffect: v.optional(v.string()),
        statusDuration: v.optional(v.number()),
        effectId: v.optional(v.id("effectsLibrary")),
        targetType: v.optional(v.string()),
        range: v.optional(v.string()),
        areaSize: v.optional(v.string()),
        castTime: v.optional(v.string()),
        interruptible: v.optional(v.boolean()),
        canUpgrade: v.optional(v.boolean()),
        upgradedVersion: v.optional(v.string()),
        lore: v.optional(v.string()),
        creator: v.optional(v.string()),
        rarity: v.optional(v.string()),
        isForbidden: v.optional(v.boolean()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized: You don't own this campaign");
        }

        validateNonEmptyString(args.name, "Name");

        if (args.requiredLevel !== undefined) {
            validatePositiveNumber(args.requiredLevel, "Required Level");
        }
        if (args.energyCost !== undefined) {
            validateNonNegativeNumber(args.energyCost, "Energy Cost");
        }
        if (args.healthCost !== undefined) {
            validateNonNegativeNumber(args.healthCost, "Health Cost");
        }

        return ctx.db.insert("spells", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name.trim(),
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
            damageDice: args.damageDice,
            damageType: args.damageType,
            damageScaling: args.damageScaling,
            healing: args.healing,
            healingScaling: args.healingScaling,
            buffEffect: args.buffEffect,
            debuffEffect: args.debuffEffect,
            statusEffect: args.statusEffect,
            statusDuration: args.statusDuration,
            effectId: args.effectId,
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

// ============================================================================
// PROFILE MUTATIONS
// ============================================================================

export const updateProfile = mutation({
    args: {
        name: v.optional(v.string()),
        studioName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        if (args.name !== undefined) {
            validateNonEmptyString(args.name, "Name");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, {
                name: args.name?.trim() ?? user.name,
                studioName: args.studioName?.trim(),
            });
        } else {
            await ctx.db.insert("users", {
                tokenIdentifier: identity.tokenIdentifier,
                name: args.name?.trim() ?? identity.name ?? "Unknown",
                studioName: args.studioName?.trim(),
            });
        }
    },
});
