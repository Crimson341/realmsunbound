import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

// Trigger types for when conditions are evaluated
export type ConditionTrigger =
  | "on_enter_location"
  | "on_exit_location"
  | "on_combat_start"
  | "on_combat_end"
  | "on_item_use"
  | "on_item_pickup"
  | "on_npc_interact"
  | "on_npc_death"
  | "on_quest_update"
  | "on_quest_complete"
  | "on_level_up"
  | "on_ability_use"
  | "on_game_start"
  | "on_turn"
  | "on_rest"
  | "always";

// Rule operators for condition logic
export type RuleOperator =
  | "eq"      // equals
  | "neq"     // not equals
  | "gt"      // greater than
  | "gte"     // greater than or equal
  | "lt"      // less than
  | "lte"     // less than or equal
  | "and"     // all conditions must be true
  | "or"      // at least one condition must be true
  | "not"     // negate condition
  | "has_item"
  | "has_equipped"
  | "has_ability"
  | "quest_status"
  | "quest_completed"
  | "npc_alive"
  | "npc_dead"
  | "at_location"
  | "visited_location"
  | "in_region"
  | "flag"
  | "faction_is"
  | "faction_reputation";

// Action types that can be executed
export type ActionType =
  | "block_entry"
  | "allow_entry"
  | "show_message"
  | "grant_ability"
  | "remove_ability"
  | "give_item"
  | "remove_item"
  | "modify_stat"
  | "modify_hp"
  | "modify_energy"
  | "modify_gold"
  | "add_xp"
  | "set_level"
  | "set_flag"
  | "clear_flag"
  | "increment_counter"
  | "activate_quest"
  | "complete_quest"
  | "fail_quest"
  | "spawn_npc"
  | "despawn_npc"
  | "kill_npc"
  | "set_npc_hostile"
  | "set_npc_friendly"
  | "set_npc_attitude"
  | "teleport"
  | "unlock_location"
  | "lock_location"
  | "modify_reputation"
  | "start_combat"
  | "trigger_event"
  | "play_sound"
  | "add_choice";

// Context passed to condition evaluation
export interface EvaluationContext {
  campaignId: Id<"campaigns">;
  playerId: string;
  trigger: ConditionTrigger;
  triggerContextId?: string; // e.g., locationId, npcId

  // Cached player data (fetched before evaluation)
  playerState?: Doc<"playerGameState">;
  character?: Doc<"characters">;
  inventory?: Array<{ item: Doc<"items">; quantity: number; equippedSlot?: string }>;
  abilities?: Doc<"spells">[];
  flags?: Map<string, unknown>;
  visitedLocations?: Set<string>;
  reputation?: Map<string, number>;
  quests?: Array<{ quest: Doc<"quests">; status: string }>;
}

// Result of condition evaluation
export interface EvaluationResult {
  conditionId: Id<"conditions">;
  conditionName: string;
  matched: boolean;
  actions: ActionResult[];
  blocked?: boolean;
  blockMessage?: string;
}

// Result of action execution
export interface ActionResult {
  type: ActionType;
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// CONDITION EVALUATION ENGINE
// ============================================================================

/**
 * Evaluates a single rule node from the JSON AST
 */
export function evaluateRule(
  rule: Record<string, unknown>,
  context: EvaluationContext
): boolean {
  const operator = Object.keys(rule)[0] as RuleOperator;
  const operand = rule[operator];

  switch (operator) {
    // Comparison operators
    case "eq": {
      const [left, right] = operand as [string, unknown];
      return resolveValue(left, context) === right;
    }
    case "neq": {
      const [left, right] = operand as [string, unknown];
      return resolveValue(left, context) !== right;
    }
    case "gt": {
      const [left, right] = operand as [string, number];
      return (resolveValue(left, context) as number) > right;
    }
    case "gte": {
      const [left, right] = operand as [string, number];
      return (resolveValue(left, context) as number) >= right;
    }
    case "lt": {
      const [left, right] = operand as [string, number];
      return (resolveValue(left, context) as number) < right;
    }
    case "lte": {
      const [left, right] = operand as [string, number];
      return (resolveValue(left, context) as number) <= right;
    }

    // Logical operators
    case "and": {
      const conditions = operand as Record<string, unknown>[];
      return conditions.every((cond) => evaluateRule(cond, context));
    }
    case "or": {
      const conditions = operand as Record<string, unknown>[];
      return conditions.some((cond) => evaluateRule(cond, context));
    }
    case "not": {
      return !evaluateRule(operand as Record<string, unknown>, context);
    }

    // Game-specific operators
    case "has_item": {
      const itemName = operand as string;
      return context.inventory?.some((inv) => inv.item.name === itemName) ?? false;
    }
    case "has_equipped": {
      const itemName = operand as string;
      return context.inventory?.some(
        (inv) => inv.item.name === itemName && inv.equippedSlot
      ) ?? false;
    }
    case "has_ability": {
      const abilityName = operand as string;
      return context.abilities?.some((a) => a.name === abilityName) ?? false;
    }
    case "quest_status": {
      const [questTitle, status] = operand as [string, string];
      const quest = context.quests?.find((q) => q.quest.title === questTitle);
      return quest?.status === status;
    }
    case "quest_completed": {
      const questTitle = operand as string;
      const quest = context.quests?.find((q) => q.quest.title === questTitle);
      return quest?.status === "completed";
    }
    case "npc_alive": {
      // This requires fetching NPC data - handled at evaluation time
      return true; // Placeholder, actual check in evaluateConditions
    }
    case "npc_dead": {
      return true; // Placeholder
    }
    case "at_location": {
      const locationId = operand as string;
      return context.playerState?.currentLocationId === locationId;
    }
    case "visited_location": {
      const locationId = operand as string;
      return context.visitedLocations?.has(locationId) ?? false;
    }
    case "in_region": {
      // Requires region lookup - placeholder
      return true;
    }
    case "flag": {
      const [flagKey, expectedValue] = operand as [string, unknown];
      const flagValue = context.flags?.get(flagKey);
      return flagValue === expectedValue;
    }
    case "faction_is": {
      const factionName = operand as string;
      // Check character's faction from stats or a dedicated field
      const stats = context.character?.stats ? JSON.parse(context.character.stats) : {};
      return stats.faction === factionName;
    }
    case "faction_reputation": {
      const [factionName, minRep] = operand as [string, number];
      const rep = context.reputation?.get(factionName) ?? 0;
      return rep >= minRep;
    }

    default:
      console.warn(`Unknown rule operator: ${operator}`);
      return false;
  }
}

/**
 * Resolves a value reference like "player.level" or "player.stats.strength"
 */
function resolveValue(path: string, context: EvaluationContext): unknown {
  const parts = path.split(".");

  if (parts[0] === "player") {
    const field = parts[1];

    switch (field) {
      case "level":
        return context.playerState?.level ?? context.character?.level ?? 1;
      case "hp":
        return context.playerState?.hp ?? 0;
      case "maxHp":
        return context.playerState?.maxHp ?? 0;
      case "energy":
        return context.playerState?.energy ?? 0;
      case "maxEnergy":
        return context.playerState?.maxEnergy ?? 0;
      case "xp":
        return context.playerState?.xp ?? 0;
      case "gold":
        return context.playerState?.gold ?? 0;
      case "class":
        return context.character?.class ?? "";
      case "race":
        return context.character?.race ?? "";
      case "name":
        return context.character?.name ?? "";
      case "faction": {
        const stats = context.character?.stats ? JSON.parse(context.character.stats) : {};
        return stats.faction ?? "";
      }
      case "stats": {
        const statName = parts[2];
        const stats = context.character?.stats ? JSON.parse(context.character.stats) : {};
        return stats[statName] ?? 0;
      }
      case "reputation": {
        const factionName = parts[2];
        return context.reputation?.get(factionName) ?? 0;
      }
      case "location":
        return context.playerState?.currentLocationId ?? "";
      case "isJailed":
        return context.playerState?.isJailed ?? false;
      default:
        return undefined;
    }
  }

  if (parts[0] === "flag") {
    const flagKey = parts.slice(1).join(".");
    return context.flags?.get(flagKey);
  }

  if (parts[0] === "trigger") {
    return context.triggerContextId;
  }

  return path; // Return as literal if not a path
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all conditions for a campaign
 */
export const getConditions = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conditions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

/**
 * Get conditions for a specific trigger
 */
export const getConditionsByTrigger = query({
  args: {
    campaignId: v.id("campaigns"),
    trigger: v.string(),
  },
  handler: async (ctx, args) => {
    const conditions = await ctx.db
      .query("conditions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("trigger"), args.trigger))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Sort by priority (higher first)
    return conditions.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Get a single condition by ID
 */
export const getCondition = query({
  args: { conditionId: v.id("conditions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conditionId);
  },
});

/**
 * Get player flags for condition evaluation
 */
export const getPlayerFlags = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerFlags")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();
  },
});

/**
 * Get player abilities
 */
export const getPlayerAbilities = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const playerAbilities = await ctx.db
      .query("playerAbilities")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    // Fetch the actual spell data
    const abilities = await Promise.all(
      playerAbilities.map(async (pa) => {
        const spell = await ctx.db.get(pa.spellId);
        return spell;
      })
    );

    return abilities.filter((a): a is Doc<"spells"> => a !== null);
  },
});

/**
 * Get player visited locations
 */
export const getPlayerVisitedLocations = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerVisitedLocations")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();
  },
});

/**
 * Get player reputation with all factions
 */
export const getPlayerReputation = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const reputations = await ctx.db
      .query("playerReputation")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    // Fetch faction names
    const result: Array<{ factionId: Id<"factions">; factionName: string; reputation: number }> = [];
    for (const rep of reputations) {
      const faction = await ctx.db.get(rep.factionId);
      if (faction) {
        result.push({
          factionId: rep.factionId,
          factionName: faction.name,
          reputation: rep.reputation,
        });
      }
    }

    return result;
  },
});

// ============================================================================
// MUTATIONS - CRUD for Conditions
// ============================================================================

/**
 * Create a new condition
 */
export const createCondition = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.optional(v.string()),
    trigger: v.string(),
    triggerContext: v.optional(v.string()),
    rules: v.string(),
    thenActions: v.string(),
    elseActions: v.optional(v.string()),
    priority: v.optional(v.number()),
    executeOnce: v.optional(v.boolean()),
    cooldownSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conditionId = await ctx.db.insert("conditions", {
      campaignId: args.campaignId,
      name: args.name,
      description: args.description,
      trigger: args.trigger,
      triggerContext: args.triggerContext,
      rules: args.rules,
      thenActions: args.thenActions,
      elseActions: args.elseActions,
      priority: args.priority ?? 0,
      isActive: true,
      executeOnce: args.executeOnce,
      cooldownSeconds: args.cooldownSeconds,
      createdAt: Date.now(),
    });

    return conditionId;
  },
});

/**
 * Update an existing condition
 */
export const updateCondition = mutation({
  args: {
    conditionId: v.id("conditions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    trigger: v.optional(v.string()),
    triggerContext: v.optional(v.string()),
    rules: v.optional(v.string()),
    thenActions: v.optional(v.string()),
    elseActions: v.optional(v.string()),
    priority: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    executeOnce: v.optional(v.boolean()),
    cooldownSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { conditionId, ...updates } = args;

    const existing = await ctx.db.get(conditionId);
    if (!existing) {
      throw new Error("Condition not found");
    }

    await ctx.db.patch(conditionId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return conditionId;
  },
});

/**
 * Delete a condition
 */
export const deleteCondition = mutation({
  args: { conditionId: v.id("conditions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.conditionId);
    return { success: true };
  },
});

/**
 * Toggle condition active state
 */
export const toggleCondition = mutation({
  args: { conditionId: v.id("conditions") },
  handler: async (ctx, args) => {
    const condition = await ctx.db.get(args.conditionId);
    if (!condition) {
      throw new Error("Condition not found");
    }

    await ctx.db.patch(args.conditionId, {
      isActive: !condition.isActive,
      updatedAt: Date.now(),
    });

    return { isActive: !condition.isActive };
  },
});

// ============================================================================
// MUTATIONS - Player State
// ============================================================================

/**
 * Set a player flag
 */
export const setPlayerFlag = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    key: v.string(),
    value: v.string(),
    setBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if flag already exists
    const existing = await ctx.db
      .query("playerFlags")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        setAt: Date.now(),
        setBy: args.setBy,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("playerFlags", {
        campaignId: args.campaignId,
        playerId: args.playerId,
        key: args.key,
        value: args.value,
        setAt: Date.now(),
        setBy: args.setBy,
      });
    }
  },
});

/**
 * Clear a player flag
 */
export const clearPlayerFlag = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerFlags")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

/**
 * Grant an ability to a player
 */
export const grantPlayerAbility = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    spellId: v.id("spells"),
    learnedFrom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already has ability
    const existing = await ctx.db
      .query("playerAbilities")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .filter((q) => q.eq(q.field("spellId"), args.spellId))
      .first();

    if (existing) {
      return { success: false, message: "Player already has this ability" };
    }

    await ctx.db.insert("playerAbilities", {
      campaignId: args.campaignId,
      playerId: args.playerId,
      spellId: args.spellId,
      learnedAt: Date.now(),
      learnedFrom: args.learnedFrom,
    });

    return { success: true };
  },
});

/**
 * Remove an ability from a player
 */
export const removePlayerAbility = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    spellId: v.id("spells"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerAbilities")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .filter((q) => q.eq(q.field("spellId"), args.spellId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

/**
 * Record a location visit
 */
export const recordLocationVisit = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerVisitedLocations")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .filter((q) => q.eq(q.field("locationId"), args.locationId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastVisitAt: now,
        visitCount: existing.visitCount + 1,
      });
    } else {
      await ctx.db.insert("playerVisitedLocations", {
        campaignId: args.campaignId,
        playerId: args.playerId,
        locationId: args.locationId,
        firstVisitAt: now,
        lastVisitAt: now,
        visitCount: 1,
      });
    }

    return { success: true };
  },
});

/**
 * Update player reputation with a faction
 */
export const updatePlayerReputation = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    factionId: v.id("factions"),
    change: v.number(), // Positive or negative
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerReputation")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .filter((q) => q.eq(q.field("factionId"), args.factionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        reputation: existing.reputation + args.change,
        updatedAt: Date.now(),
      });
      return { newReputation: existing.reputation + args.change };
    } else {
      await ctx.db.insert("playerReputation", {
        campaignId: args.campaignId,
        playerId: args.playerId,
        factionId: args.factionId,
        reputation: args.change,
        updatedAt: Date.now(),
      });
      return { newReputation: args.change };
    }
  },
});

// ============================================================================
// CONDITION EVALUATION MUTATION
// ============================================================================

/**
 * Evaluate conditions for a specific trigger and execute matching actions
 */
export const evaluateConditions = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    trigger: v.string(),
    triggerContextId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Fetch all active conditions for this trigger
    const conditions = await ctx.db
      .query("conditions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("trigger"), args.trigger))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (conditions.length === 0) {
      return { results: [], blocked: false };
    }

    // Sort by priority
    conditions.sort((a, b) => b.priority - a.priority);

    // Fetch player context
    const playerState = await ctx.db
      .query("playerGameState")
      .withIndex("by_campaign_and_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .first();

    const characters = await ctx.db
      .query("characters")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("userId"), args.playerId))
      .collect();
    const character = characters[0];

    // Fetch inventory
    const playerInventory = await ctx.db
      .query("playerInventory")
      .withIndex("by_campaign_and_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    const inventory = await Promise.all(
      playerInventory.map(async (inv) => {
        const item = await ctx.db.get(inv.itemId);
        return item ? { item, quantity: inv.quantity, equippedSlot: inv.equippedSlot } : null;
      })
    ).then((items) => items.filter((i): i is NonNullable<typeof i> => i !== null));

    // Fetch abilities
    const playerAbilities = await ctx.db
      .query("playerAbilities")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    const abilities = await Promise.all(
      playerAbilities.map((pa) => ctx.db.get(pa.spellId))
    ).then((spells) => spells.filter((s): s is Doc<"spells"> => s !== null));

    // Fetch flags
    const flagDocs = await ctx.db
      .query("playerFlags")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    const flags = new Map<string, unknown>();
    for (const flag of flagDocs) {
      try {
        flags.set(flag.key, JSON.parse(flag.value));
      } catch {
        flags.set(flag.key, flag.value);
      }
    }

    // Fetch visited locations
    const visitedDocs = await ctx.db
      .query("playerVisitedLocations")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    const visitedLocations = new Set(visitedDocs.map((v) => v.locationId as string));

    // Fetch reputation
    const repDocs = await ctx.db
      .query("playerReputation")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    const reputation = new Map<string, number>();
    for (const rep of repDocs) {
      const faction = await ctx.db.get(rep.factionId);
      if (faction) {
        reputation.set(faction.name, rep.reputation);
      }
    }

    // Fetch quests
    const questDocs = await ctx.db
      .query("quests")
      .withIndex("by_user", (q) => q.eq("userId", args.playerId))
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .collect();

    const quests = questDocs.map((q) => ({ quest: q, status: q.status }));

    // Build evaluation context
    const evalContext: EvaluationContext = {
      campaignId: args.campaignId,
      playerId: args.playerId,
      trigger: args.trigger as ConditionTrigger,
      triggerContextId: args.triggerContextId,
      playerState: playerState ?? undefined,
      character: character ?? undefined,
      inventory,
      abilities,
      flags,
      visitedLocations,
      reputation,
      quests,
    };

    // Evaluate each condition
    const results: EvaluationResult[] = [];
    let blocked = false;
    let blockMessage = "";

    for (const condition of conditions) {
      // Check if executeOnce and already executed
      if (condition.executeOnce) {
        const execution = await ctx.db
          .query("conditionExecutions")
          .withIndex("by_condition", (q) => q.eq("conditionId", condition._id))
          .filter((q) => q.eq(q.field("playerId"), args.playerId))
          .filter((q) => q.eq(q.field("result"), true))
          .first();

        if (execution) {
          continue; // Skip - already executed for this player
        }
      }

      // Check cooldown
      if (condition.cooldownSeconds) {
        const recentExecution = await ctx.db
          .query("conditionExecutions")
          .withIndex("by_condition", (q) => q.eq("conditionId", condition._id))
          .filter((q) => q.eq(q.field("playerId"), args.playerId))
          .order("desc")
          .first();

        if (recentExecution) {
          const cooldownEnd = recentExecution.triggeredAt + condition.cooldownSeconds * 1000;
          if (Date.now() < cooldownEnd) {
            continue; // Skip - still on cooldown
          }
        }
      }

      // Check trigger context match if specified
      if (condition.triggerContext && condition.triggerContext !== args.triggerContextId) {
        continue; // Skip - context doesn't match
      }

      // Parse and evaluate rules
      let matched = false;
      try {
        const rules = JSON.parse(condition.rules);
        matched = evaluateRule(rules, evalContext);
      } catch (e) {
        console.error(`Failed to evaluate condition ${condition.name}:`, e);
        continue;
      }

      // Get actions to execute
      const actionsJson = matched ? condition.thenActions : condition.elseActions;
      const executedActions: ActionResult[] = [];

      if (actionsJson) {
        try {
          const actions = JSON.parse(actionsJson) as Array<Record<string, unknown>>;

          for (const action of actions) {
            const actionType = action.type as ActionType;

            // Handle blocking actions
            if (actionType === "block_entry") {
              blocked = true;
              blockMessage = (action.message as string) || "You cannot enter this area.";
              executedActions.push({
                type: actionType,
                success: true,
                message: blockMessage,
              });
            }
            // Handle message actions
            else if (actionType === "show_message") {
              executedActions.push({
                type: actionType,
                success: true,
                message: action.message as string,
              });
            }
            // Handle flag actions
            else if (actionType === "set_flag") {
              await ctx.db.insert("playerFlags", {
                campaignId: args.campaignId,
                playerId: args.playerId,
                key: action.key as string,
                value: JSON.stringify(action.value),
                setAt: Date.now(),
                setBy: "condition",
              });
              executedActions.push({ type: actionType, success: true });
            }
            // Handle stat modifications
            else if (actionType === "modify_hp" && playerState) {
              const newHp = Math.max(0, Math.min(playerState.maxHp, playerState.hp + (action.amount as number)));
              await ctx.db.patch(playerState._id, { hp: newHp });
              executedActions.push({
                type: actionType,
                success: true,
                data: { newHp },
              });
            }
            else if (actionType === "add_xp" && playerState) {
              const newXp = playerState.xp + (action.amount as number);
              await ctx.db.patch(playerState._id, { xp: newXp });
              executedActions.push({
                type: actionType,
                success: true,
                data: { newXp },
              });
            }
            // Handle ability grants
            else if (actionType === "grant_ability") {
              const spellName = action.abilityName as string;
              const spell = await ctx.db
                .query("spells")
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .filter((q) => q.eq(q.field("name"), spellName))
                .first();

              if (spell) {
                await ctx.db.insert("playerAbilities", {
                  campaignId: args.campaignId,
                  playerId: args.playerId,
                  spellId: spell._id,
                  learnedAt: Date.now(),
                  learnedFrom: "condition",
                });
                executedActions.push({
                  type: actionType,
                  success: true,
                  message: `Learned ${spellName}!`,
                });
              }
            }
            // Handle quest activation
            else if (actionType === "activate_quest") {
              const questTitle = action.questId as string;
              const quest = await ctx.db
                .query("quests")
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .filter((q) => q.eq(q.field("title"), questTitle))
                .first();

              if (quest) {
                await ctx.db.patch(quest._id, { status: "active" });
                executedActions.push({
                  type: actionType,
                  success: true,
                  message: `Quest activated: ${questTitle}`,
                });
              }
            }
            // Handle reputation changes
            else if (actionType === "modify_reputation") {
              const factionName = action.faction as string;
              const change = action.amount as number;

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
                executedActions.push({
                  type: actionType,
                  success: true,
                  data: { faction: factionName, change },
                });
              }
            }
            // Handle item giving
            else if (actionType === "give_item") {
              const itemName = action.itemName as string;
              const quantity = (action.quantity as number) || 1;

              const item = await ctx.db
                .query("items")
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .filter((q) => q.eq(q.field("name"), itemName))
                .first();

              if (item) {
                const existing = await ctx.db
                  .query("playerInventory")
                  .withIndex("by_campaign_and_player", (q) =>
                    q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
                  )
                  .filter((q) => q.eq(q.field("itemId"), item._id))
                  .first();

                if (existing) {
                  await ctx.db.patch(existing._id, {
                    quantity: existing.quantity + quantity,
                  });
                } else {
                  await ctx.db.insert("playerInventory", {
                    campaignId: args.campaignId,
                    playerId: args.playerId,
                    itemId: item._id,
                    quantity,
                    acquiredAt: Date.now(),
                  });
                }
                executedActions.push({
                  type: actionType,
                  success: true,
                  message: `Received ${quantity}x ${itemName}`,
                });
              }
            }
            // Handle item removal (consume one-time items like passes)
            else if (actionType === "remove_item") {
              const itemName = action.itemName as string;
              const quantity = (action.quantity as number) || 1;

              const item = await ctx.db
                .query("items")
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .filter((q) => q.eq(q.field("name"), itemName))
                .first();

              if (item) {
                const existing = await ctx.db
                  .query("playerInventory")
                  .withIndex("by_campaign_and_player", (q) =>
                    q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
                  )
                  .filter((q) => q.eq(q.field("itemId"), item._id))
                  .first();

                if (existing) {
                  const newQuantity = existing.quantity - quantity;
                  if (newQuantity <= 0) {
                    await ctx.db.delete(existing._id);
                  } else {
                    await ctx.db.patch(existing._id, { quantity: newQuantity });
                  }
                  executedActions.push({
                    type: actionType,
                    success: true,
                    message: `Consumed ${quantity}x ${itemName}`,
                  });
                }
              }
            }
            // Handle ability removal
            else if (actionType === "remove_ability") {
              const abilityName = action.abilityName as string;
              const spell = await ctx.db
                .query("spells")
                .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
                .filter((q) => q.eq(q.field("name"), abilityName))
                .first();

              if (spell) {
                const existing = await ctx.db
                  .query("playerAbilities")
                  .withIndex("by_campaign_player", (q) =>
                    q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
                  )
                  .filter((q) => q.eq(q.field("spellId"), spell._id))
                  .first();

                if (existing) {
                  await ctx.db.delete(existing._id);
                  executedActions.push({
                    type: actionType,
                    success: true,
                    message: `Lost ability: ${abilityName}`,
                  });
                }
              }
            }
            // Handle clearing flags
            else if (actionType === "clear_flag") {
              const flagKey = action.key as string;
              const existing = await ctx.db
                .query("playerFlags")
                .withIndex("by_campaign_player", (q) =>
                  q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
                )
                .filter((q) => q.eq(q.field("key"), flagKey))
                .first();

              if (existing) {
                await ctx.db.delete(existing._id);
              }
              executedActions.push({ type: actionType, success: true });
            }
            // Handle gold modification
            else if (actionType === "modify_gold" && playerState) {
              const change = action.amount as number;
              const currentGold = playerState.gold ?? 0;
              const newGold = Math.max(0, currentGold + change);
              await ctx.db.patch(playerState._id, { gold: newGold });
              executedActions.push({
                type: actionType,
                success: true,
                data: { newGold, change },
              });
            }
            // Handle teleport
            else if (actionType === "teleport" && playerState) {
              const locationId = action.locationId as Id<"locations">;
              await ctx.db.patch(playerState._id, { currentLocationId: locationId });
              executedActions.push({
                type: actionType,
                success: true,
                data: { locationId },
              });
            }
            // Handle NPC spawning (mark as alive)
            else if (actionType === "spawn_npc") {
              const npcId = action.npcId as string;
              const npc = await ctx.db.get(npcId as Id<"npcs">);
              if (npc && npc.isDead) {
                await ctx.db.patch(npc._id, {
                  isDead: false,
                  deathCause: undefined,
                  killedBy: undefined,
                  deathTimestamp: undefined,
                });
                executedActions.push({
                  type: actionType,
                  success: true,
                  message: `${npc.name} has appeared`,
                });
              }
            }
            // Handle NPC killing
            else if (actionType === "kill_npc") {
              const npcId = action.npcId as string;
              const npc = await ctx.db.get(npcId as Id<"npcs">);
              if (npc && !npc.isDead && !npc.isEssential) {
                await ctx.db.patch(npc._id, {
                  isDead: true,
                  deathCause: "condition",
                  deathTimestamp: Date.now(),
                });
                executedActions.push({
                  type: actionType,
                  success: true,
                  message: `${npc.name} has died`,
                });
              } else if (npc?.isEssential) {
                executedActions.push({
                  type: actionType,
                  success: false,
                  message: `${npc.name} is essential and cannot be killed`,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Failed to execute actions for condition ${condition.name}:`, e);
        }
      }

      // Log execution
      await ctx.db.insert("conditionExecutions", {
        campaignId: args.campaignId,
        conditionId: condition._id,
        playerId: args.playerId,
        result: matched,
        triggeredAt: Date.now(),
        actionsExecuted: JSON.stringify(executedActions),
      });

      results.push({
        conditionId: condition._id,
        conditionName: condition.name,
        matched,
        actions: executedActions,
        blocked: executedActions.some(a => a.type === "block_entry") ? blocked : undefined,
        blockMessage: blocked ? blockMessage : undefined,
      });
    }

    return {
      results,
      blocked,
      blockMessage,
    };
  },
});

/**
 * Get active conditions summary for AI context injection
 */
export const getActiveConditionsSummary = query({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all active conditions
    const conditions = await ctx.db
      .query("conditions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get player flags
    const flags = await ctx.db
      .query("playerFlags")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .collect();

    // Get recent executions to see what's been triggered
    const recentExecutions = await ctx.db
      .query("conditionExecutions")
      .withIndex("by_campaign_player", (q) =>
        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
      )
      .order("desc")
      .take(50);

    // Build summary for AI
    const summary: string[] = [];

    // Add active blocking conditions
    for (const condition of conditions) {
      if (condition.trigger === "on_enter_location" && condition.triggerContext) {
        try {
          const actions = JSON.parse(condition.thenActions) as Array<Record<string, unknown>>;
          const blockAction = actions.find((a) => a.type === "block_entry");
          if (blockAction) {
            const location = await ctx.db.get(condition.triggerContext as Id<"locations">);
            if (location) {
              summary.push(
                `BLOCKED: Player cannot enter "${location.name}" - ${condition.description || condition.name}`
              );
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Add active flags
    const flagsSummary = flags
      .map((f) => `${f.key}=${f.value}`)
      .join(", ");

    if (flagsSummary) {
      summary.push(`PLAYER FLAGS: ${flagsSummary}`);
    }

    return {
      conditions: conditions.map((c) => ({
        name: c.name,
        trigger: c.trigger,
        description: c.description,
      })),
      flags: flags.map((f) => ({ key: f.key, value: f.value })),
      summary: summary.join("\n"),
    };
  },
});
