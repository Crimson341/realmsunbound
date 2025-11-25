import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- QUERIES ---

// Get or create the current user's hub
export const getOrCreateMyHub = query({
    args: {},
    returns: v.union(
        v.object({
            _id: v.id("hubs"),
            _creationTime: v.number(),
            creatorId: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            imageId: v.optional(v.id("_storage")),
            imageUrl: v.union(v.string(), v.null()),
            channels: v.array(v.object({
                _id: v.id("hubChannels"),
                _creationTime: v.number(),
                hubId: v.id("hubs"),
                name: v.string(),
                description: v.optional(v.string()),
                order: v.number(),
            })),
        }),
        v.null()
    ),
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        // Try to find existing hub
        const hub = await ctx.db
            .query("hubs")
            .withIndex("by_creator", (q) => q.eq("creatorId", identity.tokenIdentifier))
            .unique();

        if (!hub) {
            return null;
        }

        // Get channels for this hub
        const channels = await ctx.db
            .query("hubChannels")
            .withIndex("by_hub", (q) => q.eq("hubId", hub._id))
            .collect();

        // Sort by order
        channels.sort((a, b) => a.order - b.order);

        const imageUrl = hub.imageId ? await ctx.storage.getUrl(hub.imageId) : null;

        return {
            ...hub,
            imageUrl,
            channels,
        };
    },
});

// Get a hub by creator ID (for visitors)
export const getHubByCreatorId = query({
    args: { creatorId: v.string() },
    returns: v.union(
        v.object({
            _id: v.id("hubs"),
            _creationTime: v.number(),
            creatorId: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            imageId: v.optional(v.id("_storage")),
            imageUrl: v.union(v.string(), v.null()),
            creatorName: v.string(),
            creatorAvatar: v.union(v.string(), v.null()),
            channels: v.array(v.object({
                _id: v.id("hubChannels"),
                _creationTime: v.number(),
                hubId: v.id("hubs"),
                name: v.string(),
                description: v.optional(v.string()),
                order: v.number(),
            })),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const hub = await ctx.db
            .query("hubs")
            .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
            .unique();

        if (!hub) return null;

        // Get creator info
        const creator = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.creatorId))
            .unique();

        // Get channels for this hub
        const channels = await ctx.db
            .query("hubChannels")
            .withIndex("by_hub", (q) => q.eq("hubId", hub._id))
            .collect();

        // Sort by order
        channels.sort((a, b) => a.order - b.order);

        const imageUrl = hub.imageId ? await ctx.storage.getUrl(hub.imageId) : null;

        return {
            ...hub,
            imageUrl,
            creatorName: creator?.name || creator?.studioName || "Unknown Creator",
            creatorAvatar: creator?.pictureUrl || null,
            channels,
        };
    },
});

// Get messages for a channel (real-time subscription)
export const getChannelMessages = query({
    args: { 
        channelId: v.id("hubChannels"),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.object({
        _id: v.id("hubMessages"),
        _creationTime: v.number(),
        channelId: v.id("hubChannels"),
        userId: v.string(),
        userName: v.string(),
        userAvatar: v.optional(v.string()),
        content: v.string(),
    })),
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        
        const messages = await ctx.db
            .query("hubMessages")
            .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
            .order("desc")
            .take(limit);

        // Return in chronological order
        return messages.reverse();
    },
});

// --- MUTATIONS ---

// Create a new hub for the current user
export const createHub = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        imageId: v.optional(v.id("_storage")),
    },
    returns: v.id("hubs"),
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Check if user already has a hub
        const existing = await ctx.db
            .query("hubs")
            .withIndex("by_creator", (q) => q.eq("creatorId", identity.tokenIdentifier))
            .unique();

        if (existing) {
            throw new Error("You already have a hub");
        }

        // Create the hub
        const hubId = await ctx.db.insert("hubs", {
            creatorId: identity.tokenIdentifier,
            name: args.name,
            description: args.description,
            imageId: args.imageId,
        });

        // Create default channels
        const defaultChannels = [
            { name: "general", description: "General discussion", order: 0 },
            { name: "quest-help", description: "Get help with quests", order: 1 },
            { name: "off-topic", description: "Chat about anything", order: 2 },
        ];

        for (const channel of defaultChannels) {
            await ctx.db.insert("hubChannels", {
                hubId,
                name: channel.name,
                description: channel.description,
                order: channel.order,
            });
        }

        return hubId;
    },
});

// Update hub details
export const updateHub = mutation({
    args: {
        hubId: v.id("hubs"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        imageId: v.optional(v.id("_storage")),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const hub = await ctx.db.get(args.hubId);
        if (!hub) throw new Error("Hub not found");
        if (hub.creatorId !== identity.tokenIdentifier) {
            throw new Error("You can only update your own hub");
        }

        await ctx.db.patch(args.hubId, {
            ...(args.name !== undefined && { name: args.name }),
            ...(args.description !== undefined && { description: args.description }),
            ...(args.imageId !== undefined && { imageId: args.imageId }),
        });

        return null;
    },
});

// Create a new channel in a hub
export const createChannel = mutation({
    args: {
        hubId: v.id("hubs"),
        name: v.string(),
        description: v.optional(v.string()),
    },
    returns: v.id("hubChannels"),
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const hub = await ctx.db.get(args.hubId);
        if (!hub) throw new Error("Hub not found");
        if (hub.creatorId !== identity.tokenIdentifier) {
            throw new Error("Only the hub owner can create channels");
        }

        // Get current max order
        const channels = await ctx.db
            .query("hubChannels")
            .withIndex("by_hub", (q) => q.eq("hubId", args.hubId))
            .collect();

        const maxOrder = channels.reduce((max, c) => Math.max(max, c.order), -1);

        return await ctx.db.insert("hubChannels", {
            hubId: args.hubId,
            name: args.name.toLowerCase().replace(/\s+/g, '-'),
            description: args.description,
            order: maxOrder + 1,
        });
    },
});

// Delete a channel
export const deleteChannel = mutation({
    args: { channelId: v.id("hubChannels") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");

        const hub = await ctx.db.get(channel.hubId);
        if (!hub) throw new Error("Hub not found");
        if (hub.creatorId !== identity.tokenIdentifier) {
            throw new Error("Only the hub owner can delete channels");
        }

        // Delete all messages in the channel
        const messages = await ctx.db
            .query("hubMessages")
            .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
            .collect();

        for (const message of messages) {
            await ctx.db.delete(message._id);
        }

        // Delete the channel
        await ctx.db.delete(args.channelId);

        return null;
    },
});

// Send a message to a channel
export const sendMessage = mutation({
    args: {
        channelId: v.id("hubChannels"),
        content: v.string(),
    },
    returns: v.id("hubMessages"),
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Validate channel exists
        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");

        // Get user info for display
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        const userName = user?.name || identity.name || "Anonymous";
        const userAvatar = user?.pictureUrl || identity.pictureUrl;

        return await ctx.db.insert("hubMessages", {
            channelId: args.channelId,
            userId: identity.tokenIdentifier,
            userName,
            userAvatar,
            content: args.content,
        });
    },
});

// Delete a message (only by sender or hub owner)
export const deleteMessage = mutation({
    args: { messageId: v.id("hubMessages") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        const channel = await ctx.db.get(message.channelId);
        if (!channel) throw new Error("Channel not found");

        const hub = await ctx.db.get(channel.hubId);
        if (!hub) throw new Error("Hub not found");

        // Only sender or hub owner can delete
        const isSender = message.userId === identity.tokenIdentifier;
        const isOwner = hub.creatorId === identity.tokenIdentifier;

        if (!isSender && !isOwner) {
            throw new Error("You can only delete your own messages");
        }

        await ctx.db.delete(args.messageId);

        return null;
    },
});

