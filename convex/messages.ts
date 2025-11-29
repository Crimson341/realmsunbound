import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const MESSAGE_LIMIT = 100;

// Keywords that suggest important story events (for anchor detection)
const ANCHOR_KEYWORDS = [
  "quest complete",
  "quest failed",
  "level up",
  "you have died",
  "you are dead",
  "killed",
  "defeated",
  "joined",
  "recruited",
  "discovered",
  "secret",
  "legendary",
  "epic",
  "betrayed",
  "married",
  "crowned",
];

// Detect if a message should be an anchor
function shouldBeAnchor(content: string): { isAnchor: boolean; reason?: string } {
  const lowerContent = content.toLowerCase();

  for (const keyword of ANCHOR_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      // Determine the reason based on keyword
      if (keyword.includes("quest")) return { isAnchor: true, reason: "quest_update" };
      if (keyword.includes("level")) return { isAnchor: true, reason: "level_up" };
      if (keyword.includes("died") || keyword.includes("dead")) return { isAnchor: true, reason: "player_death" };
      if (keyword.includes("killed") || keyword.includes("defeated")) return { isAnchor: true, reason: "combat_outcome" };
      if (keyword.includes("recruited") || keyword.includes("joined")) return { isAnchor: true, reason: "recruitment" };
      if (keyword.includes("discovered") || keyword.includes("secret")) return { isAnchor: true, reason: "discovery" };
      if (keyword.includes("legendary") || keyword.includes("epic")) return { isAnchor: true, reason: "major_reward" };
      if (keyword.includes("betrayed")) return { isAnchor: true, reason: "betrayal" };
      return { isAnchor: true, reason: "story_milestone" };
    }
  }

  return { isAnchor: false };
}

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
        // Check if this message should be an anchor (important story moment)
        const anchorCheck = shouldBeAnchor(args.content);

        // Insert the new message with anchor info if applicable
        const messageId = await ctx.db.insert("gameMessages", {
            campaignId: args.campaignId,
            playerId: args.playerId,
            role: args.role,
            content: args.content,
            timestamp: Date.now(),
            choices: args.choices,
            questOffer: args.questOffer,
            // Add anchor fields if this is an important message
            isAnchor: anchorCheck.isAnchor || undefined,
            anchorReason: anchorCheck.reason || undefined,
        });

        // Schedule story event extraction for AI responses (model role)
        // This runs asynchronously to not block the message saving
        if (args.role === "model" && args.content.length > 100) {
            try {
                await ctx.scheduler.runAfter(0, api.contextOptimization.extractStoryEvents, {
                    campaignId: args.campaignId,
                    playerId: args.playerId,
                    messageContent: args.content,
                    messageId: messageId,
                });
            } catch (error) {
                console.warn("[Messages:StoryExtraction] Failed to extract story events (may not be set up yet):", error);
            }
        }

        // Trim old messages if over limit
        // But NEVER delete anchor messages - they're protected
        const allMessages = await ctx.db
            .query("gameMessages")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        if (allMessages.length > MESSAGE_LIMIT) {
            // Sort by timestamp and find messages to delete
            const sorted = allMessages.sort((a, b) => a.timestamp - b.timestamp);

            // Only delete non-anchor, non-summarized messages
            const deletable = sorted.filter((msg) => !msg.isAnchor);
            const toDelete = deletable.slice(0, allMessages.length - MESSAGE_LIMIT);

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
