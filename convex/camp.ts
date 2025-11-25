import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- PLAYER CAMP MANAGEMENT ---

// Create a new camp
export const createCamp = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        name: v.string(),
        locationId: v.id("locations"),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if player already has a camp in this campaign
        const existingCamps = await ctx.db
            .query("playerCamps")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const playerCamp = existingCamps.find((c) => c.playerId === args.playerId);
        if (playerCamp) {
            return { success: false, message: "You already have a camp in this realm.", campId: playerCamp._id };
        }
        
        const campId = await ctx.db.insert("playerCamps", {
            campaignId: args.campaignId,
            playerId: args.playerId,
            name: args.name,
            locationId: args.locationId,
            description: args.description,
            followers: [],
            resources: JSON.stringify({ gold: 0, food: 50, materials: 20 }),
            createdAt: Date.now(),
        });
        
        return { success: true, campId, message: `${args.name} has been established!` };
    },
});

// Get player's camp details
export const getCampDetails = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const camps = await ctx.db
            .query("playerCamps")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const camp = camps.find((c) => c.playerId === args.playerId);
        if (!camp) return null;
        
        // Get location details
        const location = await ctx.db.get(camp.locationId);
        
        // Get full NPC details for followers
        const followersWithDetails = await Promise.all(
            camp.followers.map(async (follower) => {
                const npc = await ctx.db.get(follower.npcId);
                return {
                    ...follower,
                    npc: npc ? {
                        id: npc._id,
                        name: npc.name,
                        role: npc.role,
                        description: npc.description,
                        attitude: npc.attitude,
                        isDead: npc.isDead,
                        loyalty: npc.loyalty,
                    } : null,
                };
            })
        );
        
        // Parse resources (with error handling)
        let resources = { gold: 0, food: 0, materials: 0 };
        if (camp.resources) {
            try {
                resources = JSON.parse(camp.resources);
            } catch {
                console.error("Failed to parse camp resources in getCampDetails");
            }
        }
        
        return {
            ...camp,
            location: location ? { id: location._id, name: location.name, type: location.type } : null,
            followers: followersWithDetails,
            resources,
            followerCount: camp.followers.length,
            maxFollowers: 10, // Could be dynamic based on camp upgrades
        };
    },
});

// Recruit an NPC to the camp
export const recruitFollower = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        npcId: v.id("npcs"),
        role: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get player's camp
        const camps = await ctx.db
            .query("playerCamps")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const camp = camps.find((c) => c.playerId === args.playerId);
        if (!camp) {
            return { success: false, message: "You don't have a camp. Establish one first!" };
        }
        
        // Check follower limit
        if (camp.followers.length >= 10) {
            return { success: false, message: "Your camp is at maximum capacity." };
        }
        
        // Get NPC
        const npc = await ctx.db.get(args.npcId);
        if (!npc) {
            return { success: false, message: "NPC not found." };
        }
        
        if (npc.isDead) {
            return { success: false, message: `${npc.name} is dead and cannot be recruited.` };
        }
        
        if (!npc.isRecruitable) {
            return { success: false, message: `${npc.name} is not interested in joining your camp.` };
        }
        
        // Check if already recruited
        if (camp.followers.some((f) => f.npcId === args.npcId)) {
            return { success: false, message: `${npc.name} is already at your camp.` };
        }
        
        // Check recruitment cost
        let resources = { gold: 0, food: 0, materials: 0 };
        if (camp.resources) {
            try {
                resources = JSON.parse(camp.resources);
            } catch {
                console.error("Failed to parse camp resources in recruitFollower");
            }
        }
        const cost = npc.recruitCost || 100;
        
        if (resources.gold < cost) {
            return { success: false, message: `Not enough gold. ${npc.name} requires ${cost} gold to recruit.` };
        }
        
        // Determine position on camp map (simple grid placement)
        const existingPositions = camp.followers.map((f) => ({ x: f.positionX || 0, y: f.positionY || 0 }));
        const newPosition = findAvailablePosition(existingPositions);
        
        // Add follower and deduct gold
        const updatedFollowers = [
            ...camp.followers,
            {
                npcId: args.npcId,
                role: args.role || "follower",
                joinedAt: Date.now(),
                positionX: newPosition.x,
                positionY: newPosition.y,
            },
        ];
        
        await ctx.db.patch(camp._id, {
            followers: updatedFollowers,
            resources: JSON.stringify({ ...resources, gold: resources.gold - cost }),
        });
        
        // Update NPC location to camp
        await ctx.db.patch(args.npcId, {
            locationId: camp.locationId,
        });
        
        return {
            success: true,
            message: `${npc.name} has joined your camp as a ${args.role || "follower"}!`,
            goldSpent: cost,
        };
    },
});

// Dismiss a follower from the camp
export const dismissFollower = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        npcId: v.id("npcs"),
    },
    handler: async (ctx, args) => {
        const camps = await ctx.db
            .query("playerCamps")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const camp = camps.find((c) => c.playerId === args.playerId);
        if (!camp) {
            return { success: false, message: "You don't have a camp." };
        }
        
        const follower = camp.followers.find((f) => f.npcId === args.npcId);
        if (!follower) {
            return { success: false, message: "This NPC is not at your camp." };
        }
        
        // Remove follower
        const updatedFollowers = camp.followers.filter((f) => f.npcId !== args.npcId);
        
        await ctx.db.patch(camp._id, {
            followers: updatedFollowers,
        });
        
        const npc = await ctx.db.get(args.npcId);
        
        return {
            success: true,
            message: `${npc?.name || "The follower"} has left your camp.`,
        };
    },
});

// Change follower role
export const changeFollowerRole = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        npcId: v.id("npcs"),
        newRole: v.string(),
    },
    handler: async (ctx, args) => {
        const camps = await ctx.db
            .query("playerCamps")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const camp = camps.find((c) => c.playerId === args.playerId);
        if (!camp) {
            return { success: false, message: "You don't have a camp." };
        }
        
        const followerIndex = camp.followers.findIndex((f) => f.npcId === args.npcId);
        if (followerIndex === -1) {
            return { success: false, message: "This NPC is not at your camp." };
        }
        
        const updatedFollowers = [...camp.followers];
        updatedFollowers[followerIndex] = {
            ...updatedFollowers[followerIndex],
            role: args.newRole,
        };
        
        await ctx.db.patch(camp._id, {
            followers: updatedFollowers,
        });
        
        const npc = await ctx.db.get(args.npcId);
        
        return {
            success: true,
            message: `${npc?.name}'s role changed to ${args.newRole}.`,
        };
    },
});

// Camp grid size constants
const CAMP_GRID_SIZE = 5;

// Update follower position on camp map
export const updateFollowerPosition = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        npcId: v.id("npcs"),
        positionX: v.number(),
        positionY: v.number(),
    },
    handler: async (ctx, args) => {
        // Server-side position validation - clamp to valid grid positions
        const clampedX = Math.max(0, Math.min(CAMP_GRID_SIZE - 1, Math.floor(args.positionX)));
        const clampedY = Math.max(0, Math.min(CAMP_GRID_SIZE - 1, Math.floor(args.positionY)));

        const camps = await ctx.db
            .query("playerCamps")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const camp = camps.find((c) => c.playerId === args.playerId);
        if (!camp) return { success: false, message: "Camp not found" };

        const followerIndex = camp.followers.findIndex((f) => f.npcId === args.npcId);
        if (followerIndex === -1) return { success: false, message: "Follower not found" };

        const updatedFollowers = [...camp.followers];
        updatedFollowers[followerIndex] = {
            ...updatedFollowers[followerIndex],
            positionX: clampedX,
            positionY: clampedY,
        };

        await ctx.db.patch(camp._id, {
            followers: updatedFollowers,
        });

        return { success: true, positionX: clampedX, positionY: clampedY };
    },
});

// --- CAMP RESOURCES ---

// Add resources to camp
export const addResources = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        gold: v.optional(v.number()),
        food: v.optional(v.number()),
        materials: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const camps = await ctx.db
            .query("playerCamps")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const camp = camps.find((c) => c.playerId === args.playerId);
        if (!camp) return { success: false };

        let resources = { gold: 0, food: 0, materials: 0 };
        if (camp.resources) {
            try {
                resources = JSON.parse(camp.resources);
            } catch {
                console.error("Failed to parse camp resources in addResources");
            }
        }

        await ctx.db.patch(camp._id, {
            resources: JSON.stringify({
                gold: resources.gold + (args.gold || 0),
                food: resources.food + (args.food || 0),
                materials: resources.materials + (args.materials || 0),
            }),
        });
        
        return { success: true };
    },
});

// Rename camp
export const renameCamp = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        newName: v.string(),
    },
    handler: async (ctx, args) => {
        const camps = await ctx.db
            .query("playerCamps")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const camp = camps.find((c) => c.playerId === args.playerId);
        if (!camp) return { success: false, message: "No camp found." };
        
        await ctx.db.patch(camp._id, {
            name: args.newName,
        });
        
        return { success: true, message: `Camp renamed to ${args.newName}.` };
    },
});

// Get recruitable NPCs at a location
export const getRecruitableNPCs = query({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        const npcs = await ctx.db
            .query("npcs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        // Filter to recruitable NPCs at this location
        const recruitable = npcs.filter(
            (npc) =>
                npc.locationId === args.locationId &&
                npc.isRecruitable &&
                !npc.isDead
        );
        
        return recruitable.map((npc) => ({
            id: npc._id,
            name: npc.name,
            role: npc.role,
            description: npc.description,
            recruitCost: npc.recruitCost || 100,
            loyalty: npc.loyalty || 50,
        }));
    },
});

// --- HELPER FUNCTIONS ---

// Find an available position on the camp map grid
function findAvailablePosition(existingPositions: { x: number; y: number }[]): { x: number; y: number } {
    // Camp positions are on a 5x5 grid, with (2,2) being the campfire center
    const positions = [
        { x: 1, y: 1 }, { x: 3, y: 1 }, // Top corners
        { x: 0, y: 2 }, { x: 4, y: 2 }, // Sides
        { x: 1, y: 3 }, { x: 3, y: 3 }, // Bottom corners
        { x: 2, y: 0 }, { x: 2, y: 4 }, // Top/bottom center
        { x: 0, y: 0 }, { x: 4, y: 0 }, // Far corners
    ];
    
    for (const pos of positions) {
        const isOccupied = existingPositions.some(
            (existing) => existing.x === pos.x && existing.y === pos.y
        );
        if (!isOccupied) return pos;
    }
    
    // Default fallback
    return { x: Math.floor(Math.random() * 5), y: Math.floor(Math.random() * 5) };
}

// Check if camp should be attacked (based on bounty, etc.)
export const shouldCampBeAttacked = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        // Get player's bounty status
        const bounties = await ctx.db
            .query("bounties")
            .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
            .collect();
        
        const activeBounties = bounties.filter(
            (b) => b.campaignId === args.campaignId && b.status === "active"
        );
        
        const totalBounty = activeBounties.reduce((sum, b) => sum + b.amount, 0);
        
        // Higher bounty = higher chance of camp being attacked
        // 1000+ gold: 5% chance per game day
        // 2000+ gold: 15% chance
        let attackChance = 0;
        if (totalBounty >= 2000) attackChance = 0.15;
        else if (totalBounty >= 1000) attackChance = 0.05;
        
        const random = Math.random();
        
        return {
            totalBounty,
            attackChance,
            shouldAttack: random < attackChance,
            attackerType: totalBounty >= 1500 ? "bandit_raid" : "bounty_hunter",
        };
    },
});


