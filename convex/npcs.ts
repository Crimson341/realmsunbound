import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- NPC INVENTORY & LOOT SYSTEM ---

// Get an NPC's full details including inventory
export const getNPCDetails = query({
    args: { npcId: v.id("npcs") },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) return null;

        // Get full item details for inventory
        const inventoryWithDetails = npc.inventoryItems
            ? await Promise.all(
                  npc.inventoryItems.map(async (itemId) => {
                      const item = await ctx.db.get(itemId);
                      return item;
                  })
              )
            : [];

        // Get full item details for drop items
        const dropItemsWithDetails = npc.dropItems
            ? await Promise.all(
                  npc.dropItems.map(async (itemId) => {
                      const item = await ctx.db.get(itemId);
                      return item;
                  })
              )
            : [];

        // Get full item details for trade inventory
        const tradeInventoryWithDetails = npc.tradeInventory
            ? await Promise.all(
                  npc.tradeInventory.map(async (itemId) => {
                      const item = await ctx.db.get(itemId);
                      return item;
                  })
              )
            : [];

        return {
            ...npc,
            inventoryWithDetails: inventoryWithDetails.filter(Boolean),
            dropItemsWithDetails: dropItemsWithDetails.filter(Boolean),
            tradeInventoryWithDetails: tradeInventoryWithDetails.filter(Boolean),
        };
    },
});

// Search a dead NPC's body and loot their items
export const lootNPCBody = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        npcId: v.id("npcs"),
    },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) {
            return { success: false, message: "NPC not found.", items: [], gold: 0 };
        }

        if (!npc.isDead) {
            return { success: false, message: `${npc.name} is still alive!`, items: [], gold: 0 };
        }

        if (npc.hasBeenLooted) {
            return { success: false, message: `${npc.name}'s body has already been searched.`, items: [], gold: 0 };
        }

        // Get items to drop (use dropItems if specified, otherwise fall back to full inventory)
        const itemsToLoot = npc.dropItems || npc.inventoryItems || [];
        const goldToLoot = npc.gold || 0;

        // Get full item details for the loot
        const lootedItems = await Promise.all(
            itemsToLoot.map(async (itemId) => {
                const item = await ctx.db.get(itemId);
                if (!item) return null;

                // Add to player inventory
                const existing = await ctx.db
                    .query("playerInventory")
                    .withIndex("by_campaign_and_player", (q) =>
                        q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
                    )
                    .collect();

                const existingItem = existing.find((inv) => inv.itemId === itemId);

                if (existingItem) {
                    await ctx.db.patch(existingItem._id, {
                        quantity: existingItem.quantity + 1,
                    });
                } else {
                    await ctx.db.insert("playerInventory", {
                        campaignId: args.campaignId,
                        playerId: args.playerId,
                        itemId: itemId,
                        quantity: 1,
                        acquiredAt: Date.now(),
                    });
                }

                return {
                    id: item._id,
                    name: item.name,
                    type: item.type,
                    rarity: item.rarity,
                    textColor: item.textColor,
                    description: item.description,
                };
            })
        );

        // Add gold to player (using playerGameState)
        if (goldToLoot > 0) {
            const playerStates = await ctx.db
                .query("playerGameState")
                .withIndex("by_campaign_and_player", (q) =>
                    q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
                )
                .collect();

            if (playerStates.length > 0) {
                await ctx.db.patch(playerStates[0]._id, {
                    gold: (playerStates[0].gold || 0) + goldToLoot,
                });
            }
        }

        // Mark body as looted
        await ctx.db.patch(args.npcId, {
            hasBeenLooted: true,
        });

        const validItems = lootedItems.filter(Boolean);

        return {
            success: true,
            message: `You search ${npc.name}'s body${validItems.length > 0 ? ` and find ${validItems.length} item(s)` : ""}${goldToLoot > 0 ? ` and ${goldToLoot} gold` : ""}.`,
            items: validItems,
            gold: goldToLoot,
        };
    },
});

// Check if an NPC can be looted (helper for UI)
export const canLootNPC = query({
    args: { npcId: v.id("npcs") },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) return { canLoot: false, reason: "NPC not found" };

        if (!npc.isDead) return { canLoot: false, reason: "NPC is alive" };
        if (npc.hasBeenLooted) return { canLoot: false, reason: "Already looted" };

        const hasLoot =
            (npc.dropItems && npc.dropItems.length > 0) ||
            (npc.inventoryItems && npc.inventoryItems.length > 0) ||
            (npc.gold && npc.gold > 0);

        return {
            canLoot: hasLoot,
            reason: hasLoot ? "Has items" : "Nothing to loot",
            npcName: npc.name,
        };
    },
});

// --- TRADING SYSTEM ---

// Check if an NPC is willing to trade
export const canTradeWithNPC = query({
    args: { npcId: v.id("npcs") },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) return { canTrade: false, reason: "NPC not found" };

        if (npc.isDead) return { canTrade: false, reason: `${npc.name} is dead` };

        // Check attitude and willTrade flag
        if (npc.attitude === "Hostile") {
            return { canTrade: false, reason: `${npc.name} is hostile and won't trade with you` };
        }

        if (npc.willTrade === false) {
            return { canTrade: false, reason: `${npc.name} is not interested in trading` };
        }

        // Default: merchants always trade, others may or may not
        const isMerchant = npc.role?.toLowerCase().includes("merchant") || 
                          npc.role?.toLowerCase().includes("trader") ||
                          npc.role?.toLowerCase().includes("shopkeeper");

        if (!isMerchant && !npc.willTrade) {
            return { canTrade: false, reason: `${npc.name} doesn't seem interested in trading` };
        }

        const hasTradeItems = npc.tradeInventory && npc.tradeInventory.length > 0;

        return {
            canTrade: hasTradeItems,
            reason: hasTradeItems ? "Ready to trade" : "Nothing available for trade",
            npcName: npc.name,
            priceModifier: npc.tradePriceModifier || 1.0,
        };
    },
});

// Get NPC's trade inventory with prices
export const getNPCTradeInventory = query({
    args: { npcId: v.id("npcs") },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc || !npc.tradeInventory) return [];

        const priceModifier = npc.tradePriceModifier || 1.0;

        const items = await Promise.all(
            npc.tradeInventory.map(async (itemId) => {
                const item = await ctx.db.get(itemId);
                if (!item) return null;

                // Calculate base price based on rarity
                const basePrices: Record<string, number> = {
                    common: 10,
                    uncommon: 25,
                    rare: 75,
                    epic: 200,
                    legendary: 500,
                    mythic: 1000,
                };

                const basePrice = basePrices[item.rarity.toLowerCase()] || 10;
                const finalPrice = Math.floor(basePrice * priceModifier);

                return {
                    id: item._id,
                    name: item.name,
                    type: item.type,
                    rarity: item.rarity,
                    description: item.description,
                    effects: item.effects,
                    textColor: item.textColor,
                    price: finalPrice,
                };
            })
        );

        return items.filter(Boolean);
    },
});

// Buy an item from an NPC
export const buyFromNPC = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        npcId: v.id("npcs"),
        itemId: v.id("items"),
    },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) return { success: false, message: "NPC not found" };
        if (npc.isDead) return { success: false, message: `${npc.name} is dead` };
        if (!npc.tradeInventory?.includes(args.itemId)) {
            return { success: false, message: "Item not available for purchase" };
        }

        // Get item and calculate price
        const item = await ctx.db.get(args.itemId);
        if (!item) return { success: false, message: "Item not found" };

        const priceModifier = npc.tradePriceModifier || 1.0;
        const basePrices: Record<string, number> = {
            common: 10,
            uncommon: 25,
            rare: 75,
            epic: 200,
            legendary: 500,
            mythic: 1000,
        };
        const price = Math.floor((basePrices[item.rarity.toLowerCase()] || 10) * priceModifier);

        // Check player gold
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        const playerGold = playerStates[0]?.gold || 0;

        if (playerGold < price) {
            return { success: false, message: `Not enough gold. Need ${price}, have ${playerGold}.` };
        }

        // Deduct gold
        if (playerStates.length > 0) {
            await ctx.db.patch(playerStates[0]._id, {
                gold: playerGold - price,
            });
        }

        // Add item to player inventory
        const existing = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        const existingItem = existing.find((inv) => inv.itemId === args.itemId);

        if (existingItem) {
            await ctx.db.patch(existingItem._id, {
                quantity: existingItem.quantity + 1,
            });
        } else {
            await ctx.db.insert("playerInventory", {
                campaignId: args.campaignId,
                playerId: args.playerId,
                itemId: args.itemId,
                quantity: 1,
                acquiredAt: Date.now(),
            });
        }

        // Remove from NPC's trade inventory (optional - can be unlimited stock)
        // For realism, we'll remove it
        const newTradeInventory = npc.tradeInventory.filter((id) => id !== args.itemId);
        await ctx.db.patch(args.npcId, {
            tradeInventory: newTradeInventory,
            gold: (npc.gold || 0) + price, // NPC gains the gold
        });

        return {
            success: true,
            message: `Purchased ${item.name} for ${price} gold.`,
            itemName: item.name,
            goldSpent: price,
            remainingGold: playerGold - price,
        };
    },
});

// Sell an item to an NPC
export const sellToNPC = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        npcId: v.id("npcs"),
        itemId: v.id("items"),
    },
    handler: async (ctx, args) => {
        const npc = await ctx.db.get(args.npcId);
        if (!npc) return { success: false, message: "NPC not found" };
        if (npc.isDead) return { success: false, message: `${npc.name} is dead` };

        // Check if NPC will trade
        const isMerchant =
            npc.role?.toLowerCase().includes("merchant") ||
            npc.role?.toLowerCase().includes("trader") ||
            npc.willTrade;

        if (!isMerchant) {
            return { success: false, message: `${npc.name} is not interested in buying items` };
        }

        // Check player has the item
        const inventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        const playerItem = inventory.find((inv) => inv.itemId === args.itemId);
        if (!playerItem || playerItem.quantity < 1) {
            return { success: false, message: "You don't have that item" };
        }

        // Get item and calculate sell price (50% of buy price)
        const item = await ctx.db.get(args.itemId);
        if (!item) return { success: false, message: "Item not found" };

        const basePrices: Record<string, number> = {
            common: 10,
            uncommon: 25,
            rare: 75,
            epic: 200,
            legendary: 500,
            mythic: 1000,
        };
        const sellPrice = Math.floor((basePrices[item.rarity.toLowerCase()] || 10) * 0.5);

        // Check if NPC has enough gold
        const npcGold = npc.gold || 0;
        if (npcGold < sellPrice) {
            return { success: false, message: `${npc.name} doesn't have enough gold to buy that` };
        }

        // Remove from player inventory
        if (playerItem.quantity <= 1) {
            await ctx.db.delete(playerItem._id);
        } else {
            await ctx.db.patch(playerItem._id, {
                quantity: playerItem.quantity - 1,
            });
        }

        // Add gold to player
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        if (playerStates.length > 0) {
            await ctx.db.patch(playerStates[0]._id, {
                gold: (playerStates[0].gold || 0) + sellPrice,
            });
        }

        // Update NPC
        await ctx.db.patch(args.npcId, {
            gold: npcGold - sellPrice,
            tradeInventory: [...(npc.tradeInventory || []), args.itemId], // NPC now has the item for sale
        });

        return {
            success: true,
            message: `Sold ${item.name} for ${sellPrice} gold.`,
            itemName: item.name,
            goldGained: sellPrice,
        };
    },
});

// --- NPC MANAGEMENT (for creators) ---

// Update NPC with inventory and stats
export const updateNPCStats = mutation({
    args: {
        npcId: v.id("npcs"),
        health: v.optional(v.number()),
        maxHealth: v.optional(v.number()),
        damage: v.optional(v.number()),
        armorClass: v.optional(v.number()),
        gold: v.optional(v.number()),
        willTrade: v.optional(v.boolean()),
        tradePriceModifier: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");

        // Verify ownership of campaign
        const campaign = await ctx.db.get(npc.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        const updates: Record<string, number | boolean | undefined> = {};
        if (args.health !== undefined) updates.health = args.health;
        if (args.maxHealth !== undefined) updates.maxHealth = args.maxHealth;
        if (args.damage !== undefined) updates.damage = args.damage;
        if (args.armorClass !== undefined) updates.armorClass = args.armorClass;
        if (args.gold !== undefined) updates.gold = args.gold;
        if (args.willTrade !== undefined) updates.willTrade = args.willTrade;
        if (args.tradePriceModifier !== undefined) updates.tradePriceModifier = args.tradePriceModifier;

        await ctx.db.patch(args.npcId, updates);

        return { success: true };
    },
});

// Set NPC's inventory items
export const setNPCInventory = mutation({
    args: {
        npcId: v.id("npcs"),
        inventoryItems: v.array(v.id("items")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");

        const campaign = await ctx.db.get(npc.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.npcId, {
            inventoryItems: args.inventoryItems,
        });

        return { success: true };
    },
});

// Set NPC's drop items (what they drop on death)
export const setNPCDropItems = mutation({
    args: {
        npcId: v.id("npcs"),
        dropItems: v.array(v.id("items")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");

        const campaign = await ctx.db.get(npc.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.npcId, {
            dropItems: args.dropItems,
        });

        return { success: true };
    },
});

// Set NPC's trade inventory
export const setNPCTradeInventory = mutation({
    args: {
        npcId: v.id("npcs"),
        tradeInventory: v.array(v.id("items")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const npc = await ctx.db.get(args.npcId);
        if (!npc) throw new Error("NPC not found");

        const campaign = await ctx.db.get(npc.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.npcId, {
            tradeInventory: args.tradeInventory,
            willTrade: true, // Auto-enable trading
        });

        return { success: true };
    },
});

// Get all lootable dead NPCs at a location (for UI)
export const getLootableNPCsAtLocation = query({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        const npcs = await ctx.db
            .query("npcs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const lootableNpcs = npcs.filter(
            (npc) =>
                npc.locationId === args.locationId &&
                npc.isDead &&
                !npc.hasBeenLooted &&
                ((npc.dropItems && npc.dropItems.length > 0) ||
                    (npc.inventoryItems && npc.inventoryItems.length > 0) ||
                    (npc.gold && npc.gold > 0))
        );

        return lootableNpcs.map((npc) => ({
            id: npc._id,
            name: npc.name,
            role: npc.role,
            itemCount: (npc.dropItems?.length || 0) + (npc.inventoryItems?.length || 0),
            gold: npc.gold || 0,
        }));
    },
});

// Get all NPCs willing to trade at a location
export const getTradingNPCsAtLocation = query({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        const npcs = await ctx.db
            .query("npcs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const tradingNpcs = npcs.filter((npc) => {
            if (npc.locationId !== args.locationId) return false;
            if (npc.isDead) return false;
            if (npc.attitude === "Hostile") return false;

            const isMerchant =
                npc.role?.toLowerCase().includes("merchant") ||
                npc.role?.toLowerCase().includes("trader") ||
                npc.role?.toLowerCase().includes("shopkeeper");

            return (isMerchant || npc.willTrade) && npc.tradeInventory && npc.tradeInventory.length > 0;
        });

        return tradingNpcs.map((npc) => ({
            id: npc._id,
            name: npc.name,
            role: npc.role,
            attitude: npc.attitude,
            itemCount: npc.tradeInventory?.length || 0,
            priceModifier: npc.tradePriceModifier || 1.0,
        }));
    },
});

