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

// Get full campaign details with all related entities
export const getCampaignDetails = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;

        // Get current user for character lookup
        const identity = await ctx.auth.getUserIdentity();

        const [locations, npcs, items, quests, monsters, spells, lore, userCharacters] = await Promise.all([
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
        ]);

        const imageUrl = campaign.imageId ? await ctx.storage.getUrl(campaign.imageId) : null;

        // Filter items and quests for this campaign
        const campaignItems = items.filter((i) => !i.campaignId || i.campaignId === args.campaignId);
        const campaignQuests = quests.filter((q) => !q.campaignId || q.campaignId === args.campaignId);
        
        // Get active quests
        const activeQuests = campaignQuests.filter((q) => q.status === "active");
        
        // Get user's character for this campaign (or first character)
        const character = userCharacters.find((c) => c.campaignId === args.campaignId) || userCharacters[0] || null;

        return {
            campaign: { ...campaign, imageUrl },
            locations,
            npcs,
            items: campaignItems,
            quests: campaignQuests,
            activeQuests,
            monsters,
            spells,
            rules: campaign.rules,
            lore,
            character,
            inventory: campaignItems, // For now, all items are available as inventory
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
        });
    },
});

export const createCharacter = mutation({
    args: {
        name: v.string(),
        class: v.string(),
        level: v.number(),
        stats: v.string(),
        campaignId: v.optional(v.id("campaigns")),
        imageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        return await ctx.db.insert("characters", {
            userId: identity.tokenIdentifier,
            name: args.name,
            class: args.class,
            level: args.level,
            stats: args.stats,
            campaignId: args.campaignId,
            imageId: args.imageId,
        });
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
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        return await ctx.db.insert("npcs", {
            userId: identity.tokenIdentifier,
            campaignId: args.campaignId,
            name: args.name,
            role: args.role,
            attitude: args.attitude,
            description: args.description,
            locationId: args.locationId,
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