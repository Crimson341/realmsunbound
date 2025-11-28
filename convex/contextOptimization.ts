import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";

// =============================================================================
// STORY EVENTS - Track key plot points for efficient context reconstruction
// =============================================================================

// Event types for classification
export const STORY_EVENT_TYPES = [
  "quest_started",
  "quest_completed",
  "quest_failed",
  "npc_met",
  "npc_killed",
  "npc_recruited",
  "location_discovered",
  "item_acquired",
  "item_lost",
  "item_used",
  "level_up",
  "faction_joined",
  "faction_left",
  "reputation_change",
  "major_choice",
  "combat_victory",
  "combat_defeat",
  "secret_found",
  "relationship_change",
  "story_milestone",
  "ability_learned",
  "death",
  "resurrection",
] as const;

export type StoryEventType = typeof STORY_EVENT_TYPES[number];

// Create a story event
export const createStoryEvent = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    importance: v.number(),
    relatedNpcIds: v.optional(v.array(v.id("npcs"))),
    relatedLocationId: v.optional(v.id("locations")),
    relatedQuestId: v.optional(v.id("quests")),
    relatedItemIds: v.optional(v.array(v.id("items"))),
    consequences: v.optional(v.string()),
    messageId: v.optional(v.id("gameMessages")),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("storyEvents", {
      ...args,
      timestamp: Date.now(),
    });

    // If there's an associated message, mark it as an anchor if importance >= 7
    if (args.messageId && args.importance >= 7) {
      await ctx.db.patch(args.messageId, {
        isAnchor: true,
        anchorReason: args.type,
      });
    }

    return eventId;
  },
});

// Internal version for use within actions (avoids circular reference)
export const internalCreateStoryEvent = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    importance: v.number(),
    messageId: v.optional(v.id("gameMessages")),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("storyEvents", {
      campaignId: args.campaignId,
      playerId: args.playerId,
      type: args.type,
      title: args.title,
      description: args.description,
      importance: args.importance,
      messageId: args.messageId,
      timestamp: Date.now(),
    });

    // If there's an associated message, mark it as an anchor if importance >= 7
    if (args.messageId && args.importance >= 7) {
      await ctx.db.patch(args.messageId, {
        isAnchor: true,
        anchorReason: args.type,
      });
    }

    return eventId;
  },
});

// Get story events for a player
export const getStoryEvents = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    limit: v.optional(v.number()),
    minImportance: v.optional(v.number()),
    types: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let events = await ctx.db
      .query("storyEvents")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("desc")
      .collect();

    // Filter by importance
    if (args.minImportance !== undefined) {
      events = events.filter((e) => e.importance >= args.minImportance!);
    }

    // Filter by types
    if (args.types && args.types.length > 0) {
      events = events.filter((e) => args.types!.includes(e.type));
    }

    // Limit results
    if (args.limit) {
      events = events.slice(0, args.limit);
    }

    return events;
  },
});

// Get recent important events for AI context
export const getRecentImportantEvents = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    maxEvents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxEvents = args.maxEvents ?? 15;

    const events = await ctx.db
      .query("storyEvents")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("desc")
      .take(50); // Get more than needed for filtering

    // Sort by importance and recency, take top N
    const scored = events.map((e) => ({
      ...e,
      // Score = importance * recency factor
      // Recent events get higher weight
      score:
        e.importance *
        (1 + Math.max(0, 1 - (Date.now() - e.timestamp) / (7 * 24 * 60 * 60 * 1000))),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxEvents);
  },
});

// =============================================================================
// ANCHOR MESSAGES - Mark messages that should never be trimmed
// =============================================================================

// Mark a message as an anchor
export const markMessageAsAnchor = mutation({
  args: {
    messageId: v.id("gameMessages"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isAnchor: true,
      anchorReason: args.reason,
    });
  },
});

// Get anchor messages for a player
export const getAnchorMessages = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameMessages")
      .withIndex("by_anchor", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("playerId", args.playerId)
          .eq("isAnchor", true)
      )
      .order("desc")
      .collect();
  },
});

// =============================================================================
// STORY SUMMARIES - Condensed narrative chunks
// =============================================================================

// Create or update a story summary
export const createStorySummary = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    type: v.string(),
    title: v.optional(v.string()),
    content: v.string(),
    startTimestamp: v.number(),
    endTimestamp: v.number(),
    messageCount: v.number(),
    eventIds: v.optional(v.array(v.id("storyEvents"))),
    lastSummarizedMessageId: v.optional(v.id("gameMessages")),
  },
  handler: async (ctx, args) => {
    const summaryId = await ctx.db.insert("storySummaries", {
      ...args,
      createdAt: Date.now(),
    });

    // Mark summarized messages
    if (args.lastSummarizedMessageId) {
      const messages = await ctx.db
        .query("gameMessages")
        .withIndex("by_campaign_and_player", (q) =>
          q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
        )
        .filter((q) =>
          q.and(
            q.gte(q.field("timestamp"), args.startTimestamp),
            q.lte(q.field("timestamp"), args.endTimestamp)
          )
        )
        .collect();

      for (const msg of messages) {
        if (!msg.isAnchor) {
          await ctx.db.patch(msg._id, { summarized: true });
        }
      }
    }

    return summaryId;
  },
});

// Get story summaries
export const getStorySummaries = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let summaries = await ctx.db
      .query("storySummaries")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("desc")
      .collect();

    if (args.type) {
      summaries = summaries.filter((s) => s.type === args.type);
    }

    return summaries;
  },
});

// =============================================================================
// SLIDING WINDOW - Get optimized message history
// =============================================================================

// Get messages with sliding window + anchors
export const getOptimizedMessageHistory = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    recentCount: v.optional(v.number()), // Recent messages to always include
    maxTotalMessages: v.optional(v.number()), // Total message limit
  },
  handler: async (ctx, args) => {
    const recentCount = args.recentCount ?? 20;
    const maxTotal = args.maxTotalMessages ?? 50;

    // Get all messages
    const allMessages = await ctx.db
      .query("gameMessages")
      .withIndex("by_campaign_and_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("desc")
      .collect();

    // Separate recent messages and older messages
    const recentMessages = allMessages.slice(0, recentCount);
    const olderMessages = allMessages.slice(recentCount);

    // Get anchor messages from older messages
    const anchorMessages = olderMessages.filter((m) => m.isAnchor);

    // Calculate remaining slots after recent + anchors
    const remainingSlots = maxTotal - recentMessages.length - anchorMessages.length;

    // Fill remaining slots with non-summarized older messages
    const fillMessages = olderMessages
      .filter((m) => !m.isAnchor && !m.summarized)
      .slice(0, Math.max(0, remainingSlots));

    // Combine and sort by timestamp
    const optimizedHistory = [
      ...recentMessages,
      ...anchorMessages,
      ...fillMessages,
    ].sort((a, b) => a.timestamp - b.timestamp);

    return {
      messages: optimizedHistory,
      totalMessages: allMessages.length,
      includedCount: optimizedHistory.length,
      summarizedCount: olderMessages.filter((m) => m.summarized).length,
      anchorCount: anchorMessages.length,
    };
  },
});

// =============================================================================
// CONTEXT BUILDER - Build optimized AI context
// =============================================================================

interface RelevanceFilter {
  currentLocationId?: Id<"locations">;
  activeQuestIds?: Id<"quests">[];
  recentNpcIds?: Id<"npcs">[];
  combatActive?: boolean;
}

// Get filtered NPCs based on relevance
export const getRelevantNpcs = query({
  args: {
    campaignId: v.id("campaigns"),
    currentLocationId: v.optional(v.id("locations")),
    recentInteractionIds: v.optional(v.array(v.id("npcs"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get all NPCs for campaign
    const allNpcs = await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    // Score NPCs by relevance
    const scored = allNpcs.map((npc) => {
      let score = 0;

      // At current location: highest priority
      if (
        args.currentLocationId &&
        npc.locationId?.toString() === args.currentLocationId.toString()
      ) {
        score += 100;
      }

      // Recently interacted with
      if (
        args.recentInteractionIds?.some(
          (id) => id.toString() === npc._id.toString()
        )
      ) {
        score += 50;
      }

      // Essential NPCs always somewhat relevant
      if (npc.isEssential) {
        score += 20;
      }

      // Living NPCs more relevant than dead
      if (!npc.isDead) {
        score += 10;
      }

      // Recruitable NPCs are interesting
      if (npc.isRecruitable) {
        score += 5;
      }

      return { ...npc, relevanceScore: score };
    });

    // Sort by score and take top N
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scored.slice(0, limit);
  },
});

// Get relevant locations (current + adjacent + quest-related)
export const getRelevantLocations = query({
  args: {
    campaignId: v.id("campaigns"),
    currentLocationId: v.optional(v.id("locations")),
    questLocationIds: v.optional(v.array(v.id("locations"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 15;

    const allLocations = await ctx.db
      .query("locations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    // Get current location for neighbor info
    let currentLocation: Doc<"locations"> | null = null;
    if (args.currentLocationId) {
      currentLocation = await ctx.db.get(args.currentLocationId);
    }

    const scored = allLocations.map((loc) => {
      let score = 0;

      // Current location: highest
      if (
        args.currentLocationId &&
        loc._id.toString() === args.currentLocationId.toString()
      ) {
        score += 100;
      }

      // Adjacent to current location
      if (
        currentLocation?.neighbors?.some(
          (n) => n.toString() === loc._id.toString()
        )
      ) {
        score += 50;
      }

      // Quest-related locations
      if (
        args.questLocationIds?.some((id) => id.toString() === loc._id.toString())
      ) {
        score += 40;
      }

      return { ...loc, relevanceScore: score };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scored.slice(0, limit);
  },
});

// Get relevant quests (active only, prioritize current objectives)
export const getRelevantQuests = query({
  args: {
    campaignId: v.id("campaigns"),
    currentLocationId: v.optional(v.id("locations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const allQuests = await ctx.db
      .query("quests")
      .withIndex("by_user", (q) => q)
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .collect();

    // Only include active/available quests, not completed
    const activeQuests = allQuests.filter(
      (q) => q.status === "active" || q.status === "available"
    );

    const scored = activeQuests.map((quest) => {
      let score = quest.status === "active" ? 50 : 20;

      // Quest at current location
      if (
        args.currentLocationId &&
        quest.locationId?.toString() === args.currentLocationId.toString()
      ) {
        score += 30;
      }

      return { ...quest, relevanceScore: score };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scored.slice(0, limit);
  },
});

// =============================================================================
// FULL OPTIMIZED CONTEXT - Combine all strategies
// =============================================================================

export const getOptimizedContext = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    currentLocationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    // Get story summary (if exists)
    const summaries = await ctx.db
      .query("storySummaries")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("desc")
      .take(1);

    const latestSummary = summaries[0];

    // Get recent story events (top 10 by importance)
    const recentEvents = await ctx.db
      .query("storyEvents")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("desc")
      .take(30);

    // Sort by importance and take top 10
    const topEvents = [...recentEvents]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);

    // Get anchor messages
    const anchorMessages = await ctx.db
      .query("gameMessages")
      .withIndex("by_anchor", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("playerId", args.playerId)
          .eq("isAnchor", true)
      )
      .order("desc")
      .take(10);

    // Get recent messages (sliding window)
    const recentMessages = await ctx.db
      .query("gameMessages")
      .withIndex("by_campaign_and_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("desc")
      .take(15);

    return {
      storySummary: latestSummary?.content || null,
      storyEvents: topEvents.map((e) => ({
        type: e.type,
        title: e.title,
        description: e.description,
        importance: e.importance,
      })),
      anchorMessages: anchorMessages.map((m) => ({
        role: m.role,
        content: m.content,
        reason: m.anchorReason,
      })),
      recentMessages: recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  },
});

// =============================================================================
// AUTO-SUMMARIZATION ACTION - Summarize old messages with AI
// =============================================================================

export const summarizeOldMessages = action({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    maxMessagesToSummarize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxMessages = args.maxMessagesToSummarize ?? 50;

    // Get messages that haven't been summarized
    const messages: Doc<"gameMessages">[] = await ctx.runQuery(
      api.contextOptimization.getUnsummarizedMessages,
      {
        campaignId: args.campaignId,
        playerId: args.playerId,
        limit: maxMessages,
      }
    );

    if (messages.length < 10) {
      return { success: false, reason: "Not enough messages to summarize" };
    }

    // Format messages for summarization
    const formattedMessages = messages
      .map((m) => `${m.role === "user" ? "Player" : "Narrator"}: ${m.content}`)
      .join("\n\n");

    // Call AI to summarize
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a story summarizer for a narrative RPG. Summarize the following conversation into a concise narrative (2-3 paragraphs max). Focus on:
1. Key plot developments and story progress
2. Important decisions the player made
3. Major NPC interactions
4. Significant items acquired or lost
5. Location changes

Keep it narrative and engaging, but brief. This summary will be used to remind the AI narrator of past events.

CONVERSATION TO SUMMARIZE:
${formattedMessages}

SUMMARY:`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      return { success: false, reason: "AI summarization failed" };
    }

    const data = await response.json();
    const summary =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated";

    // Save the summary
    await ctx.runMutation(api.contextOptimization.createStorySummary, {
      campaignId: args.campaignId,
      playerId: args.playerId,
      type: "session",
      content: summary,
      startTimestamp: messages[messages.length - 1].timestamp,
      endTimestamp: messages[0].timestamp,
      messageCount: messages.length,
      lastSummarizedMessageId: messages[0]._id,
    });

    return {
      success: true,
      messagesSummarized: messages.length,
      summaryPreview: summary.substring(0, 200) + "...",
    };
  },
});

// Helper query for summarization
export const getUnsummarizedMessages = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("gameMessages")
      .withIndex("by_campaign_and_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("asc") // Get oldest first
      .collect();

    // Filter unsummarized, non-anchor messages
    const unsummarized = messages.filter((m) => !m.summarized && !m.isAnchor);

    return unsummarized.slice(0, args.limit);
  },
});

// =============================================================================
// AUTO-DETECT STORY EVENTS - Extract events from AI responses
// =============================================================================

export const extractStoryEvents = action({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    messageContent: v.string(),
    messageId: v.id("gameMessages"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; events: Array<{ id?: Id<"storyEvents">; type: string; title: string; description: string; importance: number }> }> => {
    // Use AI to detect story events from the message
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Analyze this RPG game message and extract any significant story events. Return a JSON array of events, or an empty array if none.

Each event should have:
- type: one of [quest_started, quest_completed, quest_failed, npc_met, npc_killed, npc_recruited, location_discovered, item_acquired, item_lost, level_up, faction_joined, major_choice, combat_victory, combat_defeat, secret_found, ability_learned, story_milestone]
- title: short title (5-10 words)
- description: brief description (1-2 sentences)
- importance: 1-10 (10 = game-changing, 1 = minor)

MESSAGE:
${args.messageContent}

RESPONSE (JSON array only, no markdown):`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      return { success: false, events: [] };
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    try {
      // Parse the JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
      const events = JSON.parse(cleanedText);

      if (!Array.isArray(events)) {
        return { success: false, events: [] };
      }

      // Create each event
      const createdEvents: Array<{ id: Id<"storyEvents">; type: string; title: string; description: string; importance: number }> = [];
      for (const event of events) {
        if (event.type && event.title && event.description && event.importance) {
          const eventId = await ctx.runMutation(
            internal.contextOptimization.internalCreateStoryEvent,
            {
              campaignId: args.campaignId,
              playerId: args.playerId,
              type: event.type as string,
              title: event.title as string,
              description: event.description as string,
              importance: event.importance as number,
              messageId: args.messageId,
            }
          );
          createdEvents.push({ id: eventId, type: event.type, title: event.title, description: event.description, importance: event.importance });
        }
      }

      return { success: true, events: createdEvents };
    } catch {
      return { success: false, events: [] };
    }
  },
});
