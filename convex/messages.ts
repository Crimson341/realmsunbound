import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MESSAGE_LIMIT = 100;

// Get messages for a campaign/player (limited to last 100)
export const getMessages = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("gameMessages")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        // Sort by timestamp and return last 100
        const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
        return sorted.slice(-MESSAGE_LIMIT);
    },
});

// Save a message to the database
export const saveMessage = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        role: v.string(),
        content: v.string(),
        choices: v.optional(v.array(v.string())),
        questOffer: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // Insert the new message
        const messageId = await ctx.db.insert("gameMessages", {
            campaignId: args.campaignId,
            playerId: args.playerId,
            role: args.role,
            content: args.content,
            timestamp: Date.now(),
            choices: args.choices,
            questOffer: args.questOffer,
        });

        // Trim old messages if over limit
        const allMessages = await ctx.db
            .query("gameMessages")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        if (allMessages.length > MESSAGE_LIMIT) {
            // Sort by timestamp and find messages to delete
            const sorted = allMessages.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = sorted.slice(0, allMessages.length - MESSAGE_LIMIT);

            for (const msg of toDelete) {
                await ctx.db.delete(msg._id);
            }
        }

        return messageId;
    },
});

// Clear all messages for a campaign/player (for manual reset)
export const clearMessages = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("gameMessages")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        for (const msg of messages) {
            await ctx.db.delete(msg._id);
        }

        return { deleted: messages.length };
    },
});
