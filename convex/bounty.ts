import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Crime severity definitions for bounty amounts
const CRIME_BOUNTY_AMOUNTS: Record<string, number> = {
    trespassing: 25,
    theft: 50,
    assault: 100,
    murder: 500,
    regicide: 2000,
    treason: 1500,
};

// Jail time based on bounty amount (in game hours)
function calculateJailTime(bountyAmount: number): number {
    if (bountyAmount < 50) return 1;
    if (bountyAmount < 200) return 4;
    if (bountyAmount < 500) return 12;
    if (bountyAmount < 1000) return 24;
    return 48; // Max 2 days for serious crimes
}

// --- BOUNTY MANAGEMENT ---

// Add a bounty for a crime committed
export const addBounty = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        regionId: v.id("regions"),
        crimeType: v.string(),
        description: v.string(),
        victimName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if campaign has bounty system enabled
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign?.bountyEnabled) {
            return { success: false, message: "Bounty system is not enabled for this realm." };
        }
        
        const bountyAmount = CRIME_BOUNTY_AMOUNTS[args.crimeType] || 50;
        
        // Check for existing bounty in this region
        const existingBounties = await ctx.db
            .query("bounties")
            .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
            .collect();
        
        const regionBounty = existingBounties.find(
            (b) => b.regionId === args.regionId && b.status === "active"
        );
        
        if (regionBounty) {
            // Add to existing bounty
            await ctx.db.patch(regionBounty._id, {
                amount: regionBounty.amount + bountyAmount,
                crimes: [...regionBounty.crimes, {
                    type: args.crimeType,
                    description: args.description,
                    timestamp: Date.now(),
                    victimName: args.victimName,
                }],
                lastUpdated: Date.now(),
            });
            
            return {
                success: true,
                bountyId: regionBounty._id,
                totalBounty: regionBounty.amount + bountyAmount,
                added: bountyAmount,
            };
        } else {
            // Create new bounty
            const bountyId = await ctx.db.insert("bounties", {
                campaignId: args.campaignId,
                playerId: args.playerId,
                regionId: args.regionId,
                amount: bountyAmount,
                crimes: [{
                    type: args.crimeType,
                    description: args.description,
                    timestamp: Date.now(),
                    victimName: args.victimName,
                }],
                status: "active",
                lastUpdated: Date.now(),
            });
            
            return {
                success: true,
                bountyId,
                totalBounty: bountyAmount,
                added: bountyAmount,
            };
        }
    },
});

// Pay off a bounty
export const payBounty = mutation({
    args: {
        bountyId: v.id("bounties"),
        amountPaid: v.number(),
    },
    handler: async (ctx, args) => {
        const bounty = await ctx.db.get(args.bountyId);
        if (!bounty) throw new Error("Bounty not found");
        if (bounty.status !== "active") {
            return { success: false, message: "This bounty is no longer active." };
        }
        
        if (args.amountPaid >= bounty.amount) {
            // Full payment - clear bounty
            await ctx.db.patch(args.bountyId, {
                status: "paid",
                amount: 0,
                lastUpdated: Date.now(),
            });
            
            return {
                success: true,
                message: "Bounty paid in full. You are no longer wanted in this region.",
                remaining: 0,
            };
        } else {
            // Partial payment
            await ctx.db.patch(args.bountyId, {
                amount: bounty.amount - args.amountPaid,
                lastUpdated: Date.now(),
            });
            
            return {
                success: true,
                message: `Partial payment accepted. Remaining bounty: ${bounty.amount - args.amountPaid} gold.`,
                remaining: bounty.amount - args.amountPaid,
            };
        }
    },
});

// Get bounty status for a player
export const getBountyStatus = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const bounties = await ctx.db
            .query("bounties")
            .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
            .collect();
        
        const campaignBounties = bounties.filter(
            (b) => b.campaignId === args.campaignId
        );
        
        // Get region details for each bounty
        const bountyDetails = await Promise.all(
            campaignBounties.map(async (bounty) => {
                const region = await ctx.db.get(bounty.regionId);
                return {
                    ...bounty,
                    regionName: region?.name || "Unknown Region",
                };
            })
        );
        
        const activeBounties = bountyDetails.filter((b) => b.status === "active");
        const totalBounty = activeBounties.reduce((sum, b) => sum + b.amount, 0);
        
        return {
            bounties: bountyDetails,
            activeBounties,
            totalBounty,
            isWanted: totalBounty > 0,
            dangerLevel: totalBounty >= 1000 ? "high" : totalBounty >= 500 ? "medium" : totalBounty > 0 ? "low" : "none",
        };
    },
});

// Get bounty for current region
export const getBountyForRegion = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        // Find which region this location is in
        const regions = await ctx.db
            .query("regions")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const currentRegion = regions.find((r) => r.locationIds.includes(args.locationId));
        if (!currentRegion) {
            return { inRegion: false, bounty: null };
        }
        
        // Get bounty for this region
        const bounties = await ctx.db
            .query("bounties")
            .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
            .collect();
        
        const regionBounty = bounties.find(
            (b) => b.regionId === currentRegion._id && b.status === "active"
        );
        
        return {
            inRegion: true,
            regionId: currentRegion._id,
            regionName: currentRegion.name,
            bounty: regionBounty || null,
            isWanted: !!regionBounty && regionBounty.amount > 0,
        };
    },
});

// --- JAIL SYSTEM ---

// Jail a player
export const jailPlayer = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        regionId: v.id("regions"),
    },
    handler: async (ctx, args) => {
        // Get the player's bounty
        const bounties = await ctx.db
            .query("bounties")
            .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
            .collect();
        
        const bounty = bounties.find(
            (b) => b.regionId === args.regionId && b.status === "active"
        );
        
        if (!bounty) {
            return { success: false, message: "No active bounty to serve time for." };
        }
        
        const jailTime = calculateJailTime(bounty.amount);
        const jailEndTime = Date.now() + (jailTime * 60 * 60 * 1000); // Convert hours to ms
        
        // Update bounty status
        await ctx.db.patch(bounty._id, {
            status: "jailed",
            lastUpdated: Date.now(),
        });
        
        // Update player game state
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        if (playerStates.length > 0) {
            await ctx.db.patch(playerStates[0]._id, {
                isJailed: true,
                jailEndTime,
                jailRegionId: args.regionId,
            });
        }
        
        return {
            success: true,
            jailTime,
            jailEndTime,
            message: `You have been jailed for ${jailTime} hours.`,
        };
    },
});

// Release player from jail
export const releaseFromJail = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        if (playerStates.length === 0) {
            return { success: false, message: "Player state not found." };
        }
        
        const playerState = playerStates[0];
        if (!playerState.isJailed) {
            return { success: false, message: "Player is not jailed." };
        }
        
        // Clear the bounty that was served
        if (playerState.jailRegionId) {
            const bounties = await ctx.db
                .query("bounties")
                .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
                .collect();
            
            const servedBounty = bounties.find(
                (b) => b.regionId === playerState.jailRegionId && b.status === "jailed"
            );
            
            if (servedBounty) {
                await ctx.db.patch(servedBounty._id, {
                    status: "paid", // Served time counts as paid
                    amount: 0,
                    lastUpdated: Date.now(),
                });
            }
        }
        
        // Release player
        await ctx.db.patch(playerState._id, {
            isJailed: false,
            jailEndTime: undefined,
            jailRegionId: undefined,
        });
        
        return {
            success: true,
            message: "You have been released from jail. Your debt to society is paid.",
        };
    },
});

// Check jail status and auto-release if time served
export const checkJailStatus = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        if (playerStates.length === 0 || !playerStates[0].isJailed) {
            return { isJailed: false };
        }
        
        const playerState = playerStates[0];
        const now = Date.now();
        const timeRemaining = playerState.jailEndTime ? playerState.jailEndTime - now : 0;
        
        return {
            isJailed: true,
            jailEndTime: playerState.jailEndTime,
            timeRemaining: Math.max(0, timeRemaining),
            canBeReleased: timeRemaining <= 0,
        };
    },
});

// Attempt jail escape (skill check)
export const attemptJailEscape = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        skillRoll: v.number(), // 1-20
        modifier: v.number(), // Player's stealth/lockpicking modifier
    },
    handler: async (ctx, args) => {
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        if (playerStates.length === 0 || !playerStates[0].isJailed) {
            return { success: false, message: "You are not in jail." };
        }
        
        const playerState = playerStates[0];
        const total = args.skillRoll + args.modifier;
        const dc = 15; // Difficulty class for escape
        
        if (args.skillRoll === 20 || total >= dc) {
            // Successful escape!
            await ctx.db.patch(playerState._id, {
                isJailed: false,
                jailEndTime: undefined,
                jailRegionId: undefined,
            });
            
            // Mark bounty as escaped (higher bounty!)
            if (playerState.jailRegionId) {
                const bounties = await ctx.db
                    .query("bounties")
                    .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
                    .collect();
                
                const jailBounty = bounties.find(
                    (b) => b.regionId === playerState.jailRegionId && b.status === "jailed"
                );
                
                if (jailBounty) {
                    await ctx.db.patch(jailBounty._id, {
                        status: "active",
                        amount: jailBounty.amount + 100, // Escape adds to bounty
                        crimes: [...jailBounty.crimes, {
                            type: "escape",
                            description: "Escaped from prison",
                            timestamp: Date.now(),
                        }],
                        lastUpdated: Date.now(),
                    });
                }
            }
            
            return {
                success: true,
                message: args.skillRoll === 20 
                    ? "Critical success! You slip out of your cell unnoticed."
                    : "You managed to escape! But your bounty has increased...",
                roll: args.skillRoll,
                total,
                dc,
            };
        } else {
            // Failed escape - adds time
            const newJailEndTime = (playerState.jailEndTime || Date.now()) + (2 * 60 * 60 * 1000); // +2 hours
            
            await ctx.db.patch(playerState._id, {
                jailEndTime: newJailEndTime,
            });
            
            return {
                success: false,
                message: args.skillRoll === 1 
                    ? "Critical failure! The guards catch you and add time to your sentence."
                    : "Your escape attempt fails. The guards add time to your sentence.",
                roll: args.skillRoll,
                total,
                dc,
                additionalTime: 2, // hours
            };
        }
    },
});

// --- BOUNTY HUNTER SYSTEM ---

// Check if bounty hunters should spawn
export const shouldSpawnBountyHunter = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const bountyStatus = await ctx.db
            .query("bounties")
            .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
            .collect();
        
        const activeBounties = bountyStatus.filter(
            (b) => b.campaignId === args.campaignId && b.status === "active"
        );
        
        const totalBounty = activeBounties.reduce((sum, b) => sum + b.amount, 0);
        
        // Higher bounty = higher chance of hunters
        // 500+ gold: 10% chance per encounter
        // 1000+ gold: 25% chance
        // 2000+ gold: 50% chance
        let spawnChance = 0;
        if (totalBounty >= 2000) spawnChance = 0.5;
        else if (totalBounty >= 1000) spawnChance = 0.25;
        else if (totalBounty >= 500) spawnChance = 0.1;
        
        const random = Math.random();
        
        return {
            totalBounty,
            spawnChance,
            shouldSpawn: random < spawnChance,
            hunterStrength: totalBounty >= 1500 ? "elite" : totalBounty >= 750 ? "veteran" : "novice",
        };
    },
});

// Record bounty hunter encounter
export const recordBountyHunterEncounter = mutation({
    args: {
        bountyId: v.id("bounties"),
    },
    handler: async (ctx, args) => {
        const bounty = await ctx.db.get(args.bountyId);
        if (!bounty) return;
        
        await ctx.db.patch(args.bountyId, {
            bountyHuntersSent: (bounty.bountyHuntersSent || 0) + 1,
            lastUpdated: Date.now(),
        });
    },
});

// Pardon a bounty (for quest rewards, etc.)
export const pardonBounty = mutation({
    args: {
        bountyId: v.id("bounties"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        
        const bounty = await ctx.db.get(args.bountyId);
        if (!bounty) throw new Error("Bounty not found");
        
        // Verify campaign ownership
        const campaign = await ctx.db.get(bounty.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }
        
        await ctx.db.patch(args.bountyId, {
            status: "pardoned",
            amount: 0,
            lastUpdated: Date.now(),
        });
        
        return { success: true, message: "Bounty has been pardoned." };
    },
});

