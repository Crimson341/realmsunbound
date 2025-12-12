import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { PLAYER_DEFAULTS, DAMAGE_DICE_PATTERN } from "./constants";

/**
 * Type for any document that might have an imageId field
 */
type WithOptionalImage = {
    imageId?: Id<"_storage"> | null;
};

/**
 * Adds imageUrl to a single document that has an optional imageId field.
 * Returns the document with imageUrl added.
 */
export async function withImageUrl<T extends WithOptionalImage>(
    ctx: QueryCtx,
    doc: T
): Promise<T & { imageUrl: string | null }> {
    return {
        ...doc,
        imageUrl: doc.imageId ? await ctx.storage.getUrl(doc.imageId) : null,
    };
}

/**
 * Adds imageUrl to an array of documents that have optional imageId fields.
 * Returns the documents with imageUrl added.
 */
export async function withImageUrls<T extends WithOptionalImage>(
    ctx: QueryCtx,
    docs: T[]
): Promise<Array<T & { imageUrl: string | null }>> {
    return Promise.all(docs.map((doc) => withImageUrl(ctx, doc)));
}

/**
 * Validates that a string is not empty after trimming.
 * Throws an error with the provided field name if invalid.
 */
export function validateNonEmptyString(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
        throw new Error(`${fieldName} cannot be empty`);
    }
}

/**
 * Validates that a number is positive (> 0).
 * Throws an error with the provided field name if invalid.
 */
export function validatePositiveNumber(value: number, fieldName: string): void {
    if (value <= 0) {
        throw new Error(`${fieldName} must be positive`);
    }
}

/**
 * Validates that a number is non-negative (>= 0).
 * Throws an error with the provided field name if invalid.
 */
export function validateNonNegativeNumber(value: number, fieldName: string): void {
    if (value < 0) {
        throw new Error(`${fieldName} cannot be negative`);
    }
}

/**
 * Safely parses a JSON string. Returns null if parsing fails.
 */
export function safeJsonParse<T>(json: string | undefined | null): T | null {
    if (!json) return null;
    try {
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}

/**
 * Standard result type for auth failures - returns null consistently
 */
export type AuthResult<T> = T | null;

/**
 * Standard empty array for auth failures on list queries
 */
export const EMPTY_ARRAY: readonly never[] = [] as const;

/**
 * Fetches player game state for a campaign.
 * Returns null if not found.
 */
export async function getPlayerGameState(
    ctx: QueryCtx | MutationCtx,
    campaignId: Id<"campaigns">,
    playerId: string
): Promise<Doc<"playerGameState"> | null> {
    return ctx.db
        .query("playerGameState")
        .withIndex("by_campaign_and_player", (q) =>
            q.eq("campaignId", campaignId).eq("playerId", playerId)
        )
        .first();
}

/**
 * Gets player game state or throws if not found.
 */
export async function requirePlayerGameState(
    ctx: QueryCtx | MutationCtx,
    campaignId: Id<"campaigns">,
    playerId: string
): Promise<Doc<"playerGameState">> {
    const state = await getPlayerGameState(ctx, campaignId, playerId);
    if (!state) {
        throw new Error(`Player game state not found for player ${playerId} in campaign ${campaignId}`);
    }
    return state;
}

/**
 * Parses cooldowns JSON safely, returns empty object on failure.
 */
export function parseCooldowns(cooldownsJson: string | undefined): Record<string, number> {
    if (!cooldownsJson) return {};
    try {
        const parsed = JSON.parse(cooldownsJson);
        if (typeof parsed !== "object" || parsed === null) return {};
        return parsed as Record<string, number>;
    } catch {
        return {};
    }
}

/**
 * Parses damage dice notation (e.g., "2d6+3") and rolls deterministically
 * using a seed value for reproducibility.
 *
 * @param dice - Dice notation like "2d6", "1d20+5", "3d8-2"
 * @param seed - Numeric seed for reproducible rolls
 * @returns Total damage, or null if invalid format
 */
export function rollDamageDice(dice: string, seed: number): number | null {
    const match = dice.match(DAMAGE_DICE_PATTERN);
    if (!match) return null;

    const numDice = parseInt(match[1], 10);
    const dieSize = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    // Simple seeded PRNG (mulberry32)
    let state = seed;
    const random = (): number => {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    let total = 0;
    for (let i = 0; i < numDice; i++) {
        total += Math.floor(random() * dieSize) + 1;
    }

    return total + modifier;
}

/**
 * Gets energy with fallback to default.
 */
export function getEnergy(gameState: Doc<"playerGameState">): number {
    return gameState.energy ?? PLAYER_DEFAULTS.ENERGY;
}

/**
 * Gets max energy with fallback to default.
 */
export function getMaxEnergy(gameState: Doc<"playerGameState">): number {
    return gameState.maxEnergy ?? PLAYER_DEFAULTS.MAX_ENERGY;
}
