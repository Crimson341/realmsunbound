import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all locations with shop counts for map display
export const getMapData = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();

    // Get shop counts for each location
    const locationsWithShops = await Promise.all(
      locations.map(async (location) => {
        const shops = await ctx.db
          .query("shops")
          .withIndex("by_location", (q) => q.eq("locationId", location._id))
          .collect();

        return {
          _id: location._id,
          name: location.name,
          type: location.type,
          description: location.description,
          neighbors: location.neighbors,
          mapX: location.mapX ?? null,
          mapY: location.mapY ?? null,
          mapIcon: location.mapIcon ?? null,
          shopCount: shops.length,
          hasShops: shops.length > 0,
        };
      })
    );

    return locationsWithShops;
  },
});

// Check if travel between two locations is valid
export const canTravelTo = query({
  args: {
    campaignId: v.id("campaigns"),
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
  },
  handler: async (ctx, { campaignId, fromLocationId, toLocationId }) => {
    const fromLocation = await ctx.db.get(fromLocationId);
    const toLocation = await ctx.db.get(toLocationId);

    if (!fromLocation || !toLocation) {
      return { canTravel: false, reason: "Location not found" };
    }

    if (fromLocation.campaignId !== campaignId || toLocation.campaignId !== campaignId) {
      return { canTravel: false, reason: "Location not in this campaign" };
    }

    // Check if destination is a neighbor
    const isNeighbor = fromLocation.neighbors.includes(toLocationId);

    if (!isNeighbor) {
      return {
        canTravel: false,
        reason: `${toLocation.name} is not directly connected to ${fromLocation.name}`
      };
    }

    return {
      canTravel: true,
      destination: {
        _id: toLocation._id,
        name: toLocation.name,
        type: toLocation.type,
        description: toLocation.description,
      },
    };
  },
});

// Update location position on map (creator tool)
export const updateLocationPosition = mutation({
  args: {
    locationId: v.id("locations"),
    mapX: v.number(),
    mapY: v.number(),
  },
  handler: async (ctx, { locationId, mapX, mapY }) => {
    await ctx.db.patch(locationId, { mapX, mapY });
    return { success: true };
  },
});

// Update location icon on map
export const updateLocationIcon = mutation({
  args: {
    locationId: v.id("locations"),
    mapIcon: v.string(),
  },
  handler: async (ctx, { locationId, mapIcon }) => {
    await ctx.db.patch(locationId, { mapIcon });
    return { success: true };
  },
});

// Connect two locations bidirectionally
export const connectLocations = mutation({
  args: {
    locationIdA: v.id("locations"),
    locationIdB: v.id("locations"),
  },
  handler: async (ctx, { locationIdA, locationIdB }) => {
    const locationA = await ctx.db.get(locationIdA);
    const locationB = await ctx.db.get(locationIdB);

    if (!locationA || !locationB) {
      throw new Error("Location not found");
    }

    // Add B to A's neighbors if not already there
    if (!locationA.neighbors.includes(locationIdB)) {
      await ctx.db.patch(locationIdA, {
        neighbors: [...locationA.neighbors, locationIdB],
      });
    }

    // Add A to B's neighbors if not already there
    if (!locationB.neighbors.includes(locationIdA)) {
      await ctx.db.patch(locationIdB, {
        neighbors: [...locationB.neighbors, locationIdA],
      });
    }

    return { success: true };
  },
});

// Disconnect two locations
export const disconnectLocations = mutation({
  args: {
    locationIdA: v.id("locations"),
    locationIdB: v.id("locations"),
  },
  handler: async (ctx, { locationIdA, locationIdB }) => {
    const locationA = await ctx.db.get(locationIdA);
    const locationB = await ctx.db.get(locationIdB);

    if (!locationA || !locationB) {
      throw new Error("Location not found");
    }

    // Remove B from A's neighbors
    await ctx.db.patch(locationIdA, {
      neighbors: locationA.neighbors.filter((id) => id !== locationIdB),
    });

    // Remove A from B's neighbors
    await ctx.db.patch(locationIdB, {
      neighbors: locationB.neighbors.filter((id) => id !== locationIdA),
    });

    return { success: true };
  },
});

// Execute travel - validates neighbor and updates player location
export const travelToLocation = mutation({
  args: {
    campaignId: v.id("campaigns"),
    playerId: v.string(),
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
  },
  handler: async (ctx, { campaignId, playerId, fromLocationId, toLocationId }) => {
    const fromLocation = await ctx.db.get(fromLocationId);
    const toLocation = await ctx.db.get(toLocationId);

    if (!fromLocation || !toLocation) {
      throw new Error("Location not found");
    }

    // Validate the travel is allowed (must be neighbors)
    const isNeighbor = fromLocation.neighbors.includes(toLocationId);
    if (!isNeighbor) {
      throw new Error(`Cannot travel directly from ${fromLocation.name} to ${toLocation.name}`);
    }

    // Update player game state with new location
    const playerState = await ctx.db
      .query("playerGameState")
      .withIndex("by_campaign_and_player", (q) =>
        q.eq("campaignId", campaignId).eq("playerId", playerId)
      )
      .first();

    if (playerState) {
      await ctx.db.patch(playerState._id, {
        currentLocationId: toLocationId,
      });
    }

    return {
      success: true,
      from: {
        _id: fromLocation._id,
        name: fromLocation.name,
      },
      to: {
        _id: toLocation._id,
        name: toLocation.name,
        type: toLocation.type,
        description: toLocation.description,
      },
    };
  },
});

// Auto-layout helper - set initial positions for locations without coordinates
export const autoLayoutLocations = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { campaignId }) => {
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();

    // Simple grid layout for locations without positions
    const unpositioned = locations.filter((loc) => loc.mapX === undefined || loc.mapY === undefined);

    const gridSize = Math.ceil(Math.sqrt(unpositioned.length));
    const spacing = 200;
    const offset = 100;

    for (let i = 0; i < unpositioned.length; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      await ctx.db.patch(unpositioned[i]._id, {
        mapX: offset + col * spacing,
        mapY: offset + row * spacing,
      });
    }

    return { success: true, positioned: unpositioned.length };
  },
});

// Get neighbors for a specific location
export const getLocationNeighbors = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, { locationId }) => {
    const location = await ctx.db.get(locationId);
    if (!location) return [];

    const neighbors = await Promise.all(
      location.neighbors.map(async (neighborId) => {
        const neighbor = await ctx.db.get(neighborId);
        return neighbor ? {
          _id: neighbor._id,
          name: neighbor.name,
          type: neighbor.type,
        } : null;
      })
    );

    return neighbors.filter((n): n is NonNullable<typeof n> => n !== null);
  },
});
