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

export const updateCampaignEngine = mutation({
    args: {
        campaignId: v.id("campaigns"),
        worldBible: v.optional(v.string()),
        aiPersona: v.optional(v.string()),
        terminology: v.optional(v.string()), // JSON string
        statConfig: v.optional(v.string()), // JSON string
        theme: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }
        const campaign = await ctx.db.get(args.campaignId);

        if (!campaign) {
            throw new Error("Campaign not found");
        }

        if (campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.campaignId, {
            worldBible: args.worldBible,
            aiPersona: args.aiPersona,
            terminology: args.terminology,
            statConfig: args.statConfig,
            theme: args.theme,
        });
    },
});