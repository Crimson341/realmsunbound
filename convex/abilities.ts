import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
    getPlayerGameState,
    parseCooldowns,
    rollDamageDice,
    getEnergy,
    getMaxEnergy,
} from "./lib/helpers";
import { PLAYER_DEFAULTS } from "./lib/constants";

// --- TYPES ---

type TargetEffect = {
    npcId: Id<"npcs">;
    damage: number;
    killed: boolean;
    npcName: string;
};

type UseAbilityResult =
    | {
          success: true;
          spell: {
              name: string;
              damage: number;
              healing: number;
              energyCost: number;
              school: string | undefined;
          };
          targetEffect: TargetEffect | null;
          newEnergy: number;
          newHp: number;
      }
    | {
          success: false;
          message: string;
          requiresEnergy?: number;
          currentEnergy?: number;
          cooldownRemaining?: number;
      };

// --- QUERIES ---

export const getPlayerAbilities = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const spells = await ctx.db
            .query("spells")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const gameState = await getPlayerGameState(ctx, args.campaignId, args.playerId);
        const cooldowns = parseCooldowns(gameState?.activeCooldowns);

        return spells.map((spell) => ({
            ...spell,
            cooldownRemaining: cooldowns[spell._id] ?? 0,
            canUse: (cooldowns[spell._id] ?? 0) === 0,
        }));
    },
});

export const getPlayerEnergy = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const gameState = await getPlayerGameState(ctx, args.campaignId, args.playerId);

        if (!gameState) {
            return {
                energy: PLAYER_DEFAULTS.ENERGY,
                maxEnergy: PLAYER_DEFAULTS.MAX_ENERGY,
            };
        }

        return {
            energy: getEnergy(gameState),
            maxEnergy: getMaxEnergy(gameState),
        };
    },
});

export const getPlayerGold = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const gameState = await getPlayerGameState(ctx, args.campaignId, args.playerId);
        return gameState?.gold ?? PLAYER_DEFAULTS.GOLD;
    },
});

// --- MUTATIONS ---

export const useAbility = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        spellId: v.id("spells"),
        targetNpcId: v.optional(v.id("npcs")),
    },
    handler: async (ctx, args): Promise<UseAbilityResult> => {
        const spell = await ctx.db.get(args.spellId);
        if (!spell) {
            return { success: false, message: "Ability not found" };
        }

        const gameState = await getPlayerGameState(ctx, args.campaignId, args.playerId);
        if (!gameState) {
            return { success: false, message: "Player state not found" };
        }

        const currentEnergy = getEnergy(gameState);
        const energyCost = spell.energyCost ?? 0;

        if (currentEnergy < energyCost) {
            return {
                success: false,
                message: "Not enough energy",
                requiresEnergy: energyCost,
                currentEnergy,
            };
        }

        const cooldowns = parseCooldowns(gameState.activeCooldowns);
        const cooldownRemaining = cooldowns[args.spellId] ?? 0;

        if (cooldownRemaining > 0) {
            return {
                success: false,
                message: `Ability on cooldown (${cooldownRemaining} turns)`,
                cooldownRemaining,
            };
        }

        // Calculate effects
        let damage = spell.damage ?? 0;
        let healing = spell.healing ?? 0;
        let targetEffect: TargetEffect | null = null;

        // Damage dice - use deterministic seed based on game state ID + current time
        if (spell.damageDice) {
            // Create seed from ID string - sum of char codes
            const idStr = gameState._id.toString();
            const seed = idStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) + Date.now();
            const diceResult = rollDamageDice(spell.damageDice, seed);
            if (diceResult !== null) {
                damage += diceResult;
            }
        }

        // Apply damage to target NPC
        if (args.targetNpcId && damage > 0) {
            const npc = await ctx.db.get(args.targetNpcId);
            if (npc) {
                const npcHealth = npc.health ?? PLAYER_DEFAULTS.HP;
                const newHealth = Math.max(0, npcHealth - damage);
                const killed = newHealth <= 0;

                await ctx.db.patch(args.targetNpcId, {
                    health: newHealth,
                    ...(killed && {
                        isDead: true,
                        deathCause: `Killed by ${spell.name}`,
                        killedBy: args.playerId,
                        deathTimestamp: Date.now(),
                    }),
                });

                targetEffect = {
                    npcId: args.targetNpcId,
                    damage,
                    killed,
                    npcName: npc.name,
                };
            }
        }

        // Apply healing
        let newHp = gameState.hp;
        if (healing > 0) {
            newHp = Math.min(gameState.maxHp, gameState.hp + healing);
        }

        // Update cooldowns
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

export const tickCooldowns = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const gameState = await getPlayerGameState(ctx, args.campaignId, args.playerId);
        if (!gameState?.activeCooldowns) return;

        const cooldowns = parseCooldowns(gameState.activeCooldowns);
        const newCooldowns: Record<string, number> = {};

        for (const [spellId, turns] of Object.entries(cooldowns)) {
            if (typeof turns !== "number") continue;
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

export const regenerateEnergy = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        amount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const gameState = await getPlayerGameState(ctx, args.campaignId, args.playerId);
        if (!gameState) return;

        const currentEnergy = getEnergy(gameState);
        const maxEnergy = getMaxEnergy(gameState);
        const regenAmount = args.amount ?? maxEnergy;

        await ctx.db.patch(gameState._id, {
            energy: Math.min(maxEnergy, currentEnergy + regenAmount),
        });
    },
});

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
        return ctx.db.insert("spells", {
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
    },
});

