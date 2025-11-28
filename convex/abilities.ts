import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- ABILITY/SPELL SYSTEM ---

// Get all abilities/spells available to a player for a campaign
export const getPlayerAbilities = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        // Get campaign spells
        const spells = await ctx.db
            .query("spells")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        // Get player's game state for cooldowns
        const gameState = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .first();

        let cooldowns: Record<string, number> = {};
        if (gameState?.activeCooldowns) {
            try {
                cooldowns = JSON.parse(gameState.activeCooldowns);
            } catch {
                console.error("Failed to parse activeCooldowns in getPlayerAbilities");
            }
        }

        // Return spells with cooldown status
        return spells.map((spell) => ({
            ...spell,
            cooldownRemaining: cooldowns[spell._id] || 0,
            canUse: (cooldowns[spell._id] || 0) === 0,
        }));
    },
});

// Get player's current energy
export const getPlayerEnergy = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const gameState = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .first();

        if (!gameState) {
            return { energy: 100, maxEnergy: 100 };
        }

        return {
            energy: gameState.energy ?? 100,
            maxEnergy: gameState.maxEnergy ?? 100,
        };
    },
});

// Get player's current gold (source of truth for gold tracking)
export const getPlayerGold = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const gameState = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .first();

        return gameState?.gold ?? 0;
    },
});

// Use an ability
export const useAbility = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        spellId: v.id("spells"),
        targetNpcId: v.optional(v.id("npcs")),
    },
    handler: async (ctx, args) => {
        // Get the spell
        const spell = await ctx.db.get(args.spellId);
        if (!spell) {
            return { success: false, message: "Ability not found" };
        }

        // Get player game state
        const gameState = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .first();

        if (!gameState) {
            return { success: false, message: "Player state not found" };
        }

        const currentEnergy = gameState.energy ?? 100;
        const energyCost = spell.energyCost ?? 0;

        // Check energy
        if (currentEnergy < energyCost) {
            return { success: false, message: "Not enough energy", requiresEnergy: energyCost, currentEnergy };
        }

        // Check cooldown
        let cooldowns: Record<string, number> = {};
        if (gameState.activeCooldowns) {
            try {
                cooldowns = JSON.parse(gameState.activeCooldowns);
            } catch {
                console.error("Failed to parse activeCooldowns in useAbility");
            }
        }
        if (typeof cooldowns[args.spellId] === 'number' && cooldowns[args.spellId] > 0) {
            return {
                success: false,
                message: `Ability on cooldown (${cooldowns[args.spellId]} turns)`,
                cooldownRemaining: cooldowns[args.spellId],
            };
        }

        // Calculate effects
        let damage = 0;
        let healing = 0;
        let targetEffect: {
            npcId?: string;
            damage?: number;
            killed?: boolean;
            npcName?: string;
        } | null = null;

        // Direct damage
        if (spell.damage) {
            damage = spell.damage;
        }

        // Damage dice (e.g., "2d6+3")
        if (spell.damageDice) {
            const parsed = parseDamageDice(spell.damageDice);
            damage += parsed;
        }

        // Healing
        if (spell.healing) {
            healing = spell.healing;
        }

        // Apply damage to target NPC if specified
        if (args.targetNpcId && damage > 0) {
            const npc = await ctx.db.get(args.targetNpcId);
            if (npc) {
                const npcHealth = npc.health ?? 100;
                const newHealth = Math.max(0, npcHealth - damage);
                const killed = newHealth <= 0;

                await ctx.db.patch(args.targetNpcId, {
                    health: newHealth,
                    ...(killed
                        ? {
                              isDead: true,
                              deathCause: `Killed by ${spell.name}`,
                              killedBy: args.playerId,
                              deathTimestamp: Date.now(),
                          }
                        : {}),
                });

                targetEffect = {
                    npcId: args.targetNpcId,
                    damage,
                    killed,
                    npcName: npc.name,
                };
            }
        }

        // Apply healing to player
        let newHp = gameState.hp;
        if (healing > 0) {
            newHp = Math.min(gameState.maxHp, gameState.hp + healing);
        }

        // Update player state (energy, cooldowns, hp)
        const newCooldowns = { ...cooldowns };
        if (spell.cooldown && spell.cooldown > 0) {
            newCooldowns[args.spellId] = spell.cooldown;
        }

        await ctx.db.patch(gameState._id, {
            energy: currentEnergy - energyCost,
            hp: newHp,
            activeCooldowns: JSON.stringify(newCooldowns),
        });

        return {
            success: true,
            spell: {
                name: spell.name,
                damage,
                healing,
                energyCost,
                school: spell.school,
            },
            targetEffect,
            newEnergy: currentEnergy - energyCost,
            newHp,
        };
    },
});

// Tick cooldowns (call at end of player turn)
export const tickCooldowns = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const gameState = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .first();

        if (!gameState?.activeCooldowns) return;

        let cooldowns: Record<string, number> = {};
        try {
            cooldowns = JSON.parse(gameState.activeCooldowns);
        } catch {
            console.error("Failed to parse activeCooldowns in tickCooldowns");
            return;
        }

        const newCooldowns: Record<string, number> = {};

        for (const [spellId, turns] of Object.entries(cooldowns)) {
            if (typeof turns !== 'number') continue;
            const remaining = Math.max(0, turns - 1);
            if (remaining > 0) {
                newCooldowns[spellId] = remaining;
            }
        }

        await ctx.db.patch(gameState._id, {
            activeCooldowns: JSON.stringify(newCooldowns),
        });
    },
});

// Regenerate energy (call at rest or end of combat)
export const regenerateEnergy = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        amount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const gameState = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .first();

        if (!gameState) return;

        const currentEnergy = gameState.energy ?? 0;
        const maxEnergy = gameState.maxEnergy ?? 100;
        const regenAmount = args.amount ?? maxEnergy; // Full restore by default

        await ctx.db.patch(gameState._id, {
            energy: Math.min(maxEnergy, currentEnergy + regenAmount),
        });
    },
});

// Create a new ability/spell
export const createAbility = mutation({
    args: {
        campaignId: v.id("campaigns"),
        userId: v.string(),
        name: v.string(),
        level: v.number(),
        school: v.string(),
        description: v.optional(v.string()),
        energyCost: v.optional(v.number()),
        cooldown: v.optional(v.number()),
        damage: v.optional(v.number()),
        damageDice: v.optional(v.string()),
        damageType: v.optional(v.string()),
        healing: v.optional(v.number()),
        castingTime: v.optional(v.string()),
        range: v.optional(v.string()),
        duration: v.optional(v.string()),
        buffEffect: v.optional(v.string()),
        debuffEffect: v.optional(v.string()),
        isPassive: v.optional(v.boolean()),
        iconEmoji: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const spellId = await ctx.db.insert("spells", {
            campaignId: args.campaignId,
            userId: args.userId,
            name: args.name,
            level: args.level,
            school: args.school,
            description: args.description,
            energyCost: args.energyCost ?? 0,
            cooldown: args.cooldown ?? 0,
            damage: args.damage,
            damageDice: args.damageDice,
            damageType: args.damageType,
            healing: args.healing,
            castingTime: args.castingTime ?? "1 action",
            range: args.range ?? "60 feet",
            duration: args.duration ?? "Instant",
            buffEffect: args.buffEffect,
            debuffEffect: args.debuffEffect,
            isPassive: args.isPassive ?? false,
            iconEmoji: args.iconEmoji ?? "✨",
            tags: args.tags,
        });

        return spellId;
    },
});

// Helper function to parse damage dice (e.g., "2d6+3")
function parseDamageDice(dice: string): number {
    // Parse "XdY+Z" format
    const match = dice.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return 0;

    const numDice = parseInt(match[1], 10);
    const dieSize = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    let total = 0;
    for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * dieSize) + 1;
    }
    return total + modifier;
}





