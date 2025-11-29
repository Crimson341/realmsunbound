import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// --- RUMOR SYSTEM ---
// Rumors spread through the world based on proximity to their origin

// Create a new rumor that will spread through the world
export const spreadRumor = mutation({
    args: {
        campaignId: v.id("campaigns"),
        content: v.string(),
        type: v.string(), // "death", "crime", "quest_complete", "major_event"
        originLocationId: v.id("locations"),
        relatedNpcId: v.optional(v.id("npcs")),
        relatedPlayerId: v.optional(v.string()),
        maxSpreadRadius: v.optional(v.number()), // Default 3 hops
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("rumors", {
            campaignId: args.campaignId,
            content: args.content,
            type: args.type,
            originLocationId: args.originLocationId,
            spreadRadius: 0, // Starts at origin
            maxSpreadRadius: args.maxSpreadRadius ?? 3,
            timestamp: Date.now(),
            relatedNpcId: args.relatedNpcId,
            relatedPlayerId: args.relatedPlayerId,
            isActive: true,
        });
    },
});

// Helper to get all locations within N hops of a location
async function getLocationsWithinRadius(
    ctx: { db: { get: (id: Id<"locations">) => Promise<{ neighbors: Id<"locations">[] } | null> } },
    originId: Id<"locations">,
    radius: number
): Promise<Set<string>> {
    const visited = new Set<string>();
    const queue: { id: Id<"locations">; depth: number }[] = [{ id: originId, depth: 0 }];
    
    while (queue.length > 0) {
        const current = queue.shift()!;
        
        if (visited.has(current.id)) continue;
        visited.add(current.id);
        
        if (current.depth < radius) {
            const location = await ctx.db.get(current.id);
            if (location?.neighbors) {
                for (const neighborId of location.neighbors) {
                    if (!visited.has(neighborId)) {
                        queue.push({ id: neighborId, depth: current.depth + 1 });
                    }
                }
            }
        }
    }
    
    return visited;
}

// Get rumors known at a specific location
export const getRumorsAtLocation = query({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        // Get all active rumors for this campaign
        const allRumors = await ctx.db
            .query("rumors")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const activeRumors = allRumors.filter((r) => r.isActive !== false);
        
        // Filter to rumors that have spread to this location
        const knownRumors = [];
        
        for (const rumor of activeRumors) {
            const reachableLocations = await getLocationsWithinRadius(
                ctx,
                rumor.originLocationId,
                rumor.spreadRadius
            );
            
            if (reachableLocations.has(args.locationId)) {
                knownRumors.push(rumor);
            }
        }
        
        return knownRumors;
    },
});

// Advance rumor spreading (call periodically or after game events)
export const advanceRumorSpreading = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const rumors = await ctx.db
            .query("rumors")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const activeRumors = rumors.filter(
            (r) => r.isActive !== false && r.spreadRadius < (r.maxSpreadRadius ?? 3)
        );
        
        // Spread each rumor by 1 hop
        for (const rumor of activeRumors) {
            const newRadius = rumor.spreadRadius + 1;
            await ctx.db.patch(rumor._id, {
                spreadRadius: newRadius,
                isActive: newRadius < (rumor.maxSpreadRadius ?? 3),
            });
        }
        
        return { spreadCount: activeRumors.length };
    },
});

// Create death rumor when NPC is killed
export const createDeathRumor = mutation({
    args: {
        campaignId: v.id("campaigns"),
        npcId: v.id("npcs"),
        killedBy: v.string(),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");
        
        const killerText = args.killedBy === "player" 
            ? "an adventurer" 
            : args.killedBy;
        
        const content = `${npc.name} the ${npc.role} was killed by ${killerText}.`;
        
        return await ctx.db.insert("rumors", {
            campaignId: args.campaignId,
            content,
            type: "death",
            originLocationId: args.locationId,
            spreadRadius: 0,
            maxSpreadRadius: 4, // Death rumors spread further
            timestamp: Date.now(),
            relatedNpcId: args.npcId,
            isActive: true,
        });
    },
});

// Create crime rumor when player commits a crime
export const createCrimeRumor = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        crimeType: v.string(),
        description: v.string(),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        const content = `A criminal was spotted ${args.description.toLowerCase()} near the area.`;
        
        return await ctx.db.insert("rumors", {
            campaignId: args.campaignId,
            content,
            type: "crime",
            originLocationId: args.locationId,
            spreadRadius: 0,
            maxSpreadRadius: 2, // Crime rumors spread locally
            timestamp: Date.now(),
            relatedPlayerId: args.playerId,
            isActive: true,
        });
    },
});

// --- NPC KNOWLEDGE SYSTEM ---
// Determines what an NPC knows based on location, faction, and rumors

export const getNPCKnowledge = query({
    args: {
        campaignId: v.id("campaigns"),
        npcId: v.id("npcs"),
        aboutNpcId: v.optional(v.id("npcs")), // Asking about another NPC
    },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) return { knows: false, reason: "NPC not found" };
        
        // If asking about another NPC
        if (args.aboutNpcId) {
            const targetNpc = await ctx.db.get(args.aboutNpcId);
            if (!targetNpc) return { knows: false, reason: "Target NPC not found" };
            
            // 1. Same location - they know each other
            if (npc.locationId && targetNpc.locationId && npc.locationId === targetNpc.locationId) {
                return { 
                    knows: true, 
                    reason: "same_location",
                    detail: `${npc.name} knows ${targetNpc.name} - they are in the same location.`,
                    isDead: targetNpc.isDead,
                };
            }
            
            // 2. Same faction - they know of each other
            if (npc.factionId && targetNpc.factionId && npc.factionId === targetNpc.factionId) {
                return { 
                    knows: true, 
                    reason: "same_faction",
                    detail: `${npc.name} knows of ${targetNpc.name} through their shared faction.`,
                    isDead: targetNpc.isDead,
                };
            }
            
            // 3. Check if there's a death rumor that has spread to this NPC's location
            if (targetNpc.isDead && npc.locationId) {
                const rumors = await ctx.db
                    .query("rumors")
                    .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
                    .collect();
                
                const deathRumor = rumors.find(
                    (r) => r.relatedNpcId === args.aboutNpcId && r.type === "death"
                );
                
                if (deathRumor) {
                    const reachableLocations = await getLocationsWithinRadius(
                        ctx,
                        deathRumor.originLocationId,
                        deathRumor.spreadRadius
                    );
                    
                    if (reachableLocations.has(npc.locationId)) {
                        return {
                            knows: true,
                            reason: "rumor",
                            detail: `${npc.name} has heard rumors about ${targetNpc.name}'s death.`,
                            isDead: true,
                            rumorContent: deathRumor.content,
                        };
                    }
                }
            }
            
            // 4. Adjacent locations - might have heard of them
            if (npc.locationId && targetNpc.locationId) {
                const npcLocation = await ctx.db.get(npc.locationId);
                if (npcLocation?.neighbors.includes(targetNpc.locationId)) {
                    return {
                        knows: true,
                        reason: "adjacent_location",
                        detail: `${npc.name} has heard of ${targetNpc.name} from nearby travelers.`,
                        isDead: targetNpc.isDead,
                        vague: true, // They don't know details
                    };
                }
            }
            
            // They don't know the target
            return {
                knows: false,
                reason: "unknown",
                detail: `${npc.name} has never heard of ${targetNpc.name}.`,
            };
        }
        
        // General knowledge query - return what this NPC knows
        const knownNpcs: Id<"npcs">[] = [];
        const knownRumors: string[] = [];
        
        // Get all NPCs they know
        const allNpcs = await ctx.db
            .query("npcs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        for (const otherNpc of allNpcs) {
            if (otherNpc._id === npc._id) continue;
            
            // Same location or faction
            const sameLocation = npc.locationId && otherNpc.locationId && npc.locationId === otherNpc.locationId;
            const sameFaction = npc.factionId && otherNpc.factionId && npc.factionId === otherNpc.factionId;
            
            if (sameLocation || sameFaction) {
                knownNpcs.push(otherNpc._id);
            }
        }
        
        // Get rumors they've heard
        if (npc.locationId) {
            const rumors = await ctx.db
                .query("rumors")
                .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
                .collect();
            
            for (const rumor of rumors.filter((r) => r.isActive !== false)) {
                const reachableLocations = await getLocationsWithinRadius(
                    ctx,
                    rumor.originLocationId,
                    rumor.spreadRadius
                );
                
                if (reachableLocations.has(npc.locationId)) {
                    knownRumors.push(rumor.content);
                }
            }
        }
        
        return {
            npcId: npc._id,
            npcName: npc.name,
            knownNpcs,
            knownRumors,
            locationId: npc.locationId,
            factionId: npc.factionId,
        };
    },
});

// Get NPC knowledge context for AI (comprehensive)
export const getNPCKnowledgeContext = query({
    args: {
        campaignId: v.id("campaigns"),
        currentLocationId: v.optional(v.id("locations")),
    },
    handler: async (ctx, args) => {
        if (!args.currentLocationId) {
            return { npcsAtLocation: [], rumorsHere: [], nearbyNpcs: [] };
        }
        
        // Get all NPCs
        const allNpcs = await ctx.db
            .query("npcs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        // NPCs at current location (excluding dead ones)
        const npcsAtLocation = allNpcs.filter(
            (npc) => npc.locationId === args.currentLocationId && !npc.isDead
        );
        
        // Get current location for neighbors
        const currentLocation = await ctx.db.get(args.currentLocationId);
        const neighborIds = currentLocation?.neighbors || [];
        
        // NPCs at adjacent locations
        const nearbyNpcs = allNpcs.filter(
            (npc) => npc.locationId && neighborIds.includes(npc.locationId) && !npc.isDead
        );
        
        // Rumors known at this location
        const allRumors = await ctx.db
            .query("rumors")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        
        const rumorsHere = [];
        for (const rumor of allRumors.filter((r) => r.isActive !== false)) {
            const reachableLocations = await getLocationsWithinRadius(
                ctx,
                rumor.originLocationId,
                rumor.spreadRadius
            );
            
            if (reachableLocations.has(args.currentLocationId)) {
                rumorsHere.push({
                    content: rumor.content,
                    type: rumor.type,
                    isRecent: Date.now() - rumor.timestamp < 24 * 60 * 60 * 1000, // < 24h
                });
            }
        }
        
        // Dead NPCs that were at this location (for AI to reference)
        const deadAtLocation = allNpcs.filter(
            (npc) => npc.locationId === args.currentLocationId && npc.isDead
        );
        
        return {
            npcsAtLocation: npcsAtLocation.map((n) => ({
                id: n._id,
                name: n.name,
                role: n.role,
                attitude: n.attitude,
            })),
            nearbyNpcs: nearbyNpcs.map((n) => ({
                id: n._id,
                name: n.name,
                role: n.role,
            })),
            rumorsHere,
            deadAtLocation: deadAtLocation.map((n) => ({
                id: n._id,
                name: n.name,
                role: n.role,
                deathCause: n.deathCause,
                killedBy: n.killedBy,
            })),
        };
    },
});







