import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- D&D-STYLE DICE SYSTEM ---

// Standard D&D dice types
export type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

// Skill to attribute mapping (D&D 5e style)
export const SKILL_ATTRIBUTES: Record<string, string> = {
    // Strength-based
    athletics: "strength",

    // Dexterity-based
    acrobatics: "dexterity",
    "sleight of hand": "dexterity",
    stealth: "dexterity",
    lockpicking: "dexterity",

    // Intelligence-based
    arcana: "intelligence",
    history: "intelligence",
    investigation: "intelligence",
    nature: "intelligence",
    religion: "intelligence",

    // Wisdom-based
    "animal handling": "wisdom",
    insight: "wisdom",
    medicine: "wisdom",
    perception: "wisdom",
    survival: "wisdom",

    // Charisma-based
    deception: "charisma",
    intimidation: "charisma",
    performance: "charisma",
    persuasion: "charisma",
};

// Action type to skill mapping
export const ACTION_SKILLS: Record<string, string[]> = {
    // Travel/Movement
    travel: ["survival", "athletics", "perception"],
    climb: ["athletics", "acrobatics"],
    swim: ["athletics"],
    jump: ["athletics", "acrobatics"],
    sneak: ["stealth"],
    hide: ["stealth"],

    // Combat-adjacent
    attack: ["athletics", "dexterity"], // Melee vs Ranged
    dodge: ["acrobatics", "dexterity"],
    grapple: ["athletics"],
    shove: ["athletics"],

    // Thievery
    steal: ["sleight of hand", "stealth"],
    pickpocket: ["sleight of hand"],
    lockpick: ["sleight of hand", "lockpicking"],
    disarm_trap: ["investigation", "sleight of hand"],

    // Social
    persuade: ["persuasion", "charisma"],
    deceive: ["deception"],
    intimidate: ["intimidation"],
    charm: ["persuasion", "performance"],
    barter: ["persuasion", "insight"],

    // Exploration
    search: ["investigation", "perception"],
    examine: ["investigation"],
    track: ["survival", "perception"],
    forage: ["survival", "nature"],

    // Magic/Arcane
    cast_spell: ["arcana", "intelligence"],
    identify_magic: ["arcana"],
    ritual: ["arcana", "religion"],

    // Other
    medicine_check: ["medicine"],
    recall_lore: ["history", "religion", "arcana"],
    sense_motive: ["insight"],
    calm_animal: ["animal handling"],
};

// Difficulty Class (DC) thresholds
export const DIFFICULTY_CLASS = {
    trivial: 5,
    easy: 10,
    medium: 15,
    hard: 20,
    very_hard: 25,
    nearly_impossible: 30,
};

// --- UTILITY FUNCTIONS ---

// Roll a single die
export function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
}

// Parse dice notation like "2d6+3" and roll
export function rollDice(notation: string): {
    total: number;
    rolls: number[];
    modifier: number;
    formula: string;
} {
    const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) {
        return { total: 0, rolls: [], modifier: 0, formula: notation };
    }

    const numDice = parseInt(match[1], 10);
    const dieSize = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    const rolls: number[] = [];
    for (let i = 0; i < numDice; i++) {
        rolls.push(rollDie(dieSize));
    }

    const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;

    return {
        total,
        rolls,
        modifier,
        formula: notation,
    };
}

// Calculate ability modifier from attribute score (D&D style: (score - 10) / 2)
export function getAbilityModifier(attributeScore: number): number {
    return Math.floor((attributeScore - 10) / 2);
}

// Calculate proficiency bonus based on level
export function getProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1; // +2 at level 1, +3 at level 5, etc.
}

// --- QUERIES & MUTATIONS ---

// Get player's character stats/attributes
export const getPlayerAttributes = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const character = await ctx.db
            .query("characters")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .filter((q) => q.eq(q.field("userId"), args.playerId))
            .first();

        if (!character || !character.stats) {
            // Return default stats if not set
            return {
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10,
                level: character?.level || 1,
            };
        }

        try {
            const stats = JSON.parse(character.stats);
            return {
                strength: stats.strength || stats.str || 10,
                dexterity: stats.dexterity || stats.dex || 10,
                constitution: stats.constitution || stats.con || 10,
                intelligence: stats.intelligence || stats.int || 10,
                wisdom: stats.wisdom || stats.wis || 10,
                charisma: stats.charisma || stats.cha || 10,
                level: character.level || 1,
                // Also include any custom stats
                ...stats,
            };
        } catch {
            return {
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10,
                level: character?.level || 1,
            };
        }
    },
});

// Perform a skill check with proper attribute scaling
export const performSkillCheck = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        skill: v.string(), // e.g., "stealth", "persuasion", "athletics"
        difficulty: v.optional(v.number()), // DC, defaults to 15 (medium)
        advantage: v.optional(v.boolean()), // Roll twice, take higher
        disadvantage: v.optional(v.boolean()), // Roll twice, take lower
        bonusModifier: v.optional(v.number()), // Extra bonus from items, spells, etc.
    },
    handler: async (ctx, args) => {
        // Get player's character
        const character = await ctx.db
            .query("characters")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .filter((q) => q.eq(q.field("userId"), args.playerId))
            .first();

        // Parse stats
        let attributes = {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
        };
        let level = 1;

        if (character?.stats) {
            try {
                const stats = JSON.parse(character.stats);
                attributes = {
                    strength: stats.strength || stats.str || 10,
                    dexterity: stats.dexterity || stats.dex || 10,
                    constitution: stats.constitution || stats.con || 10,
                    intelligence: stats.intelligence || stats.int || 10,
                    wisdom: stats.wisdom || stats.wis || 10,
                    charisma: stats.charisma || stats.cha || 10,
                };
                level = character.level || 1;
            } catch {
                // Use defaults
            }
        }

        // Determine which attribute to use for this skill
        const skillLower = args.skill.toLowerCase();
        const attributeName = SKILL_ATTRIBUTES[skillLower] || "dexterity"; // Default to DEX
        const attributeScore = attributes[attributeName as keyof typeof attributes] || 10;

        // Calculate modifiers
        const abilityMod = getAbilityModifier(attributeScore);
        const proficiencyBonus = getProficiencyBonus(level);
        const bonusMod = args.bonusModifier || 0;
        const totalModifier = abilityMod + proficiencyBonus + bonusMod;

        // Roll the d20
        const roll1 = rollDie(20);
        const roll2 = rollDie(20);
        let finalRoll = roll1;

        // Handle advantage/disadvantage
        if (args.advantage && !args.disadvantage) {
            finalRoll = Math.max(roll1, roll2);
        } else if (args.disadvantage && !args.advantage) {
            finalRoll = Math.min(roll1, roll2);
        }

        // Check for critical success/failure (nat 20/nat 1)
        const isCriticalSuccess = finalRoll === 20;
        const isCriticalFailure = finalRoll === 1;

        // Calculate total
        const total = finalRoll + totalModifier;
        const dc = args.difficulty || DIFFICULTY_CLASS.medium;
        const success = isCriticalSuccess || (!isCriticalFailure && total >= dc);

        // Calculate degree of success/failure
        const margin = total - dc;
        let degree: "critical_success" | "success" | "failure" | "critical_failure";
        if (isCriticalSuccess || margin >= 10) {
            degree = "critical_success";
        } else if (success) {
            degree = "success";
        } else if (isCriticalFailure || margin <= -10) {
            degree = "critical_failure";
        } else {
            degree = "failure";
        }

        return {
            success,
            roll: finalRoll,
            total,
            modifier: totalModifier,
            target: dc,
            skill: args.skill,
            attribute: attributeName,
            attributeScore,
            abilityMod,
            proficiencyBonus,
            bonusMod,
            isCriticalSuccess,
            isCriticalFailure,
            degree,
            margin,
            hadAdvantage: args.advantage && !args.disadvantage,
            hadDisadvantage: args.disadvantage && !args.advantage,
            rolls: args.advantage || args.disadvantage ? [roll1, roll2] : [finalRoll],
        };
    },
});

// Perform an attack roll
export const performAttackRoll = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        targetArmorClass: v.number(),
        isMelee: v.optional(v.boolean()), // True = STR, False = DEX
        advantage: v.optional(v.boolean()),
        disadvantage: v.optional(v.boolean()),
        weaponBonus: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Get player's character
        const character = await ctx.db
            .query("characters")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .filter((q) => q.eq(q.field("userId"), args.playerId))
            .first();

        // Parse stats
        let attributes = { strength: 10, dexterity: 10 };
        let level = 1;

        if (character?.stats) {
            try {
                const stats = JSON.parse(character.stats);
                attributes = {
                    strength: stats.strength || stats.str || 10,
                    dexterity: stats.dexterity || stats.dex || 10,
                };
                level = character.level || 1;
            } catch {
                // Use defaults
            }
        }

        const attributeScore = args.isMelee !== false
            ? attributes.strength
            : attributes.dexterity;
        const abilityMod = getAbilityModifier(attributeScore);
        const profBonus = getProficiencyBonus(level);
        const weaponBonus = args.weaponBonus || 0;
        const totalModifier = abilityMod + profBonus + weaponBonus;

        // Roll
        const roll1 = rollDie(20);
        const roll2 = rollDie(20);
        let finalRoll = roll1;

        if (args.advantage && !args.disadvantage) {
            finalRoll = Math.max(roll1, roll2);
        } else if (args.disadvantage && !args.advantage) {
            finalRoll = Math.min(roll1, roll2);
        }

        const isCriticalHit = finalRoll === 20;
        const isCriticalMiss = finalRoll === 1;
        const total = finalRoll + totalModifier;
        const hits = isCriticalHit || (!isCriticalMiss && total >= args.targetArmorClass);

        return {
            hits,
            roll: finalRoll,
            total,
            modifier: totalModifier,
            targetAC: args.targetArmorClass,
            isCriticalHit,
            isCriticalMiss,
            hadAdvantage: args.advantage && !args.disadvantage,
            hadDisadvantage: args.disadvantage && !args.advantage,
            rolls: args.advantage || args.disadvantage ? [roll1, roll2] : [finalRoll],
        };
    },
});

// Roll damage dice
export const rollDamage = mutation({
    args: {
        damageDice: v.string(), // e.g., "2d6+3"
        isCritical: v.optional(v.boolean()), // Double dice on crit
    },
    handler: async (_ctx, args) => {
        const result = rollDice(args.damageDice);

        if (args.isCritical) {
            // Roll the dice portion again (not the modifier)
            const match = args.damageDice.match(/^(\d+)d(\d+)/);
            if (match) {
                const numDice = parseInt(match[1], 10);
                const dieSize = parseInt(match[2], 10);
                for (let i = 0; i < numDice; i++) {
                    const critRoll = rollDie(dieSize);
                    result.rolls.push(critRoll);
                    result.total += critRoll;
                }
            }
        }

        return {
            ...result,
            isCritical: args.isCritical || false,
        };
    },
});

// Saving throw
export const performSavingThrow = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        attribute: v.string(), // "strength", "dexterity", etc.
        dc: v.number(),
        advantage: v.optional(v.boolean()),
        disadvantage: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // Get player's character
        const character = await ctx.db
            .query("characters")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .filter((q) => q.eq(q.field("userId"), args.playerId))
            .first();

        let attributeScore = 10;
        let level = 1;

        if (character?.stats) {
            try {
                const stats = JSON.parse(character.stats);
                const attrKey = args.attribute.toLowerCase();
                attributeScore = stats[attrKey] || stats[attrKey.slice(0, 3)] || 10;
                level = character.level || 1;
            } catch {
                // Use defaults
            }
        }

        const abilityMod = getAbilityModifier(attributeScore);
        // For simplicity, assume proficiency in saving throws at higher levels
        const profBonus = level >= 5 ? getProficiencyBonus(level) : 0;
        const totalModifier = abilityMod + profBonus;

        // Roll
        const roll1 = rollDie(20);
        const roll2 = rollDie(20);
        let finalRoll = roll1;

        if (args.advantage && !args.disadvantage) {
            finalRoll = Math.max(roll1, roll2);
        } else if (args.disadvantage && !args.advantage) {
            finalRoll = Math.min(roll1, roll2);
        }

        const total = finalRoll + totalModifier;
        const success = finalRoll === 20 || (finalRoll !== 1 && total >= args.dc);

        return {
            success,
            roll: finalRoll,
            total,
            modifier: totalModifier,
            dc: args.dc,
            attribute: args.attribute,
            isNat20: finalRoll === 20,
            isNat1: finalRoll === 1,
        };
    },
});

// Update character stats/attributes
export const updateCharacterAttributes = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        attributes: v.object({
            strength: v.optional(v.number()),
            dexterity: v.optional(v.number()),
            constitution: v.optional(v.number()),
            intelligence: v.optional(v.number()),
            wisdom: v.optional(v.number()),
            charisma: v.optional(v.number()),
        }),
    },
    handler: async (ctx, args) => {
        const character = await ctx.db
            .query("characters")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .filter((q) => q.eq(q.field("userId"), args.playerId))
            .first();

        if (!character) {
            throw new Error("Character not found");
        }

        // Merge with existing stats
        let existingStats: Record<string, unknown> = {};
        if (character.stats) {
            try {
                existingStats = JSON.parse(character.stats);
            } catch {
                // Ignore
            }
        }

        const newStats = {
            ...existingStats,
            strength: args.attributes.strength ?? existingStats.strength ?? 10,
            dexterity: args.attributes.dexterity ?? existingStats.dexterity ?? 10,
            constitution: args.attributes.constitution ?? existingStats.constitution ?? 10,
            intelligence: args.attributes.intelligence ?? existingStats.intelligence ?? 10,
            wisdom: args.attributes.wisdom ?? existingStats.wisdom ?? 10,
            charisma: args.attributes.charisma ?? existingStats.charisma ?? 10,
        };

        await ctx.db.patch(character._id, {
            stats: JSON.stringify(newStats),
        });

        return newStats;
    },
});

// Initialize character with random or point-buy stats
export const initializeCharacterStats = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        method: v.optional(v.string()), // "random" | "standard_array" | "point_buy"
    },
    handler: async (ctx, args) => {
        const character = await ctx.db
            .query("characters")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .filter((q) => q.eq(q.field("userId"), args.playerId))
            .first();

        if (!character) {
            throw new Error("Character not found");
        }

        let stats: Record<string, number>;

        switch (args.method) {
            case "random":
                // Roll 4d6 drop lowest for each stat
                const rollStat = () => {
                    const rolls = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)];
                    rolls.sort((a, b) => b - a);
                    return rolls[0] + rolls[1] + rolls[2]; // Drop lowest
                };
                stats = {
                    strength: rollStat(),
                    dexterity: rollStat(),
                    constitution: rollStat(),
                    intelligence: rollStat(),
                    wisdom: rollStat(),
                    charisma: rollStat(),
                };
                break;

            case "standard_array":
                // D&D 5e standard array
                const standardArray = [15, 14, 13, 12, 10, 8];
                const shuffled = [...standardArray].sort(() => Math.random() - 0.5);
                stats = {
                    strength: shuffled[0],
                    dexterity: shuffled[1],
                    constitution: shuffled[2],
                    intelligence: shuffled[3],
                    wisdom: shuffled[4],
                    charisma: shuffled[5],
                };
                break;

            case "point_buy":
            default:
                // Default balanced stats
                stats = {
                    strength: 10,
                    dexterity: 10,
                    constitution: 10,
                    intelligence: 10,
                    wisdom: 10,
                    charisma: 10,
                };
                break;
        }

        // Merge with any existing custom stats
        let existingStats: Record<string, unknown> = {};
        if (character.stats) {
            try {
                existingStats = JSON.parse(character.stats);
            } catch {
                // Ignore
            }
        }

        const newStats = { ...existingStats, ...stats };

        await ctx.db.patch(character._id, {
            stats: JSON.stringify(newStats),
        });

        return stats;
    },
});
