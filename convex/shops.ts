import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// --- PRICE CALCULATION HELPERS ---

const BASE_PRICES: Record<string, number> = {
    common: 10,
    uncommon: 25,
    rare: 75,
    epic: 200,
    legendary: 500,
    mythic: 1000,
};

function calculateItemPrice(
    item: { rarity: string },
    shop: { basePriceModifier: number; dynamicPricing?: { supplyDemandFactor?: boolean } | null },
    stock: number,
    isSelling: boolean,
    baseOverride?: number
): number {
    // Start with base price (override or rarity-based)
    let price = baseOverride ?? BASE_PRICES[item.rarity.toLowerCase()] ?? 10;

    // Apply shop modifier
    price = Math.floor(price * shop.basePriceModifier);

    // Apply supply/demand if enabled and stock is low
    if (shop.dynamicPricing?.supplyDemandFactor && stock > 0 && stock < 3) {
        price = Math.floor(price * 1.25); // 25% markup for low stock
    }

    // Selling price is 50% of buy price
    if (isSelling) {
        price = Math.floor(price * 0.5);
    }

    return Math.max(1, price);
}

// --- SHOP TYPES ---

export const SHOP_TYPES = [
    { key: "blacksmith", label: "Blacksmith", icon: "hammer", categories: ["weapon", "armor"] },
    { key: "potion", label: "Potion Shop", icon: "flask", categories: ["consumable", "potion"] },
    { key: "general", label: "General Store", icon: "store", categories: ["all"] },
    { key: "magic", label: "Magic Shop", icon: "sparkles", categories: ["scroll", "wand", "magic"] },
    { key: "armor", label: "Armorer", icon: "shield", categories: ["armor", "shield"] },
    { key: "tailor", label: "Tailor", icon: "shirt", categories: ["clothing", "accessory"] },
    { key: "jeweler", label: "Jeweler", icon: "gem", categories: ["ring", "amulet", "gem"] },
    { key: "provisioner", label: "Provisioner", icon: "backpack", categories: ["food", "supply", "tool"] },
];

// --- QUERIES ---

// Get all shops at a specific location
export const getShopsAtLocation = query({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
    },
    handler: async (ctx, args) => {
        const shops = await ctx.db
            .query("shops")
            .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
            .collect();

        // Filter by campaign and get shopkeeper details
        const shopsWithDetails = await Promise.all(
            shops
                .filter((shop) => shop.campaignId === args.campaignId)
                .map(async (shop) => {
                    let shopkeeper = null;
                    if (shop.shopkeeperId) {
                        shopkeeper = await ctx.db.get(shop.shopkeeperId);
                    }

                    return {
                        id: shop._id,
                        name: shop.name,
                        description: shop.description,
                        type: shop.type,
                        itemCount: shop.inventory.length,
                        isOpen: shop.isOpen !== false,
                        shopkeeper: shopkeeper
                            ? { id: shopkeeper._id, name: shopkeeper.name, role: shopkeeper.role }
                            : null,
                    };
                })
        );

        return shopsWithDetails;
    },
});

// Get full shop details with inventory
export const getShopDetails = query({
    args: {
        shopId: v.id("shops"),
        playerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const shop = await ctx.db.get(args.shopId);
        if (!shop) return null;

        // Get location name
        const location = await ctx.db.get(shop.locationId);

        // Get shopkeeper if exists
        let shopkeeper = null;
        if (shop.shopkeeperId) {
            shopkeeper = await ctx.db.get(shop.shopkeeperId);
        }

        // Get full inventory with item details and prices
        const inventoryWithDetails = await Promise.all(
            shop.inventory.map(async (invItem) => {
                const item = await ctx.db.get(invItem.itemId);
                if (!item) return null;

                const price = calculateItemPrice(
                    item,
                    shop,
                    invItem.stock,
                    false,
                    invItem.basePrice
                );

                return {
                    itemId: item._id,
                    name: item.name,
                    type: item.type,
                    category: item.category || item.type,
                    rarity: item.rarity,
                    description: item.description,
                    effects: item.effects,
                    textColor: item.textColor,
                    stock: invItem.stock,
                    price,
                    basePrice: invItem.basePrice,
                    inStock: invItem.stock === -1 || invItem.stock > 0,
                };
            })
        );

        // Get buyback items for this player
        let buybackItems: {
            index: number;
            itemId: Id<"items">;
            name: string;
            type: string;
            rarity: string;
            textColor?: string;
            buybackPrice: number;
            expiresAt?: number;
            timeRemaining?: number;
        }[] = [];
        if (args.playerId && shop.buybackInventory) {
            const now = Date.now();
            const buybackResults = await Promise.all(
                shop.buybackInventory
                    .map(async (bb, index) => {
                        if (bb.soldByPlayerId !== args.playerId) return null;
                        // Check if expired
                        if (bb.expiresAt && bb.expiresAt < now) return null;

                        const item = await ctx.db.get(bb.itemId);
                        if (!item) return null;

                        return {
                            index,
                            itemId: item._id,
                            name: item.name,
                            type: item.type,
                            rarity: item.rarity,
                            textColor: item.textColor,
                            buybackPrice: bb.buybackPrice,
                            expiresAt: bb.expiresAt,
                            timeRemaining: bb.expiresAt ? bb.expiresAt - now : undefined,
                        };
                    })
            );
            buybackItems = buybackResults.filter((item): item is NonNullable<typeof item> => item !== null);
        }

        return {
            ...shop,
            locationName: location?.name || "Unknown",
            shopkeeper: shopkeeper
                ? { id: shopkeeper._id, name: shopkeeper.name, role: shopkeeper.role }
                : null,
            inventoryWithDetails: inventoryWithDetails.filter(Boolean),
            buybackItems,
        };
    },
});

// Get shop inventory filtered by category
export const getShopInventory = query({
    args: {
        shopId: v.id("shops"),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const shop = await ctx.db.get(args.shopId);
        if (!shop) return [];

        const items = await Promise.all(
            shop.inventory.map(async (invItem) => {
                const item = await ctx.db.get(invItem.itemId);
                if (!item) return null;

                // Filter by category if specified
                const itemCategory = item.category || item.type;
                if (args.category && args.category !== "all" && itemCategory !== args.category) {
                    return null;
                }

                const price = calculateItemPrice(
                    item,
                    shop,
                    invItem.stock,
                    false,
                    invItem.basePrice
                );

                return {
                    itemId: item._id,
                    name: item.name,
                    type: item.type,
                    category: itemCategory,
                    rarity: item.rarity,
                    description: item.description,
                    effects: item.effects,
                    textColor: item.textColor,
                    stock: invItem.stock,
                    price,
                    inStock: invItem.stock === -1 || invItem.stock > 0,
                };
            })
        );

        return items.filter(Boolean);
    },
});

// Get all shops in a campaign (for creator tools)
export const getCampaignShops = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const shops = await ctx.db
            .query("shops")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const shopsWithLocations = await Promise.all(
            shops.map(async (shop) => {
                const location = await ctx.db.get(shop.locationId);
                let shopkeeper = null;
                if (shop.shopkeeperId) {
                    shopkeeper = await ctx.db.get(shop.shopkeeperId);
                }

                return {
                    ...shop,
                    locationName: location?.name || "Unknown",
                    shopkeeperName: shopkeeper?.name || null,
                };
            })
        );

        return shopsWithLocations;
    },
});

// --- PLAYER MUTATIONS ---

// Buy an item from a shop
export const buyFromShop = mutation({
    args: {
        campaignId: v.id("campaigns"),
        shopId: v.id("shops"),
        playerId: v.string(),
        itemId: v.id("items"),
        quantity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const quantity = args.quantity || 1;
        const shop = await ctx.db.get(args.shopId);
        if (!shop) return { success: false, message: "Shop not found" };
        if (shop.isOpen === false) return { success: false, message: "This shop is closed" };

        // Find item in shop inventory
        const invItemIndex = shop.inventory.findIndex((i) => i.itemId === args.itemId);
        if (invItemIndex === -1) return { success: false, message: "Item not available in this shop" };

        const invItem = shop.inventory[invItemIndex];

        // Check stock
        if (invItem.stock !== -1 && invItem.stock < quantity) {
            return { success: false, message: `Not enough stock. Only ${invItem.stock} available.` };
        }

        // Get item details
        const item = await ctx.db.get(args.itemId);
        if (!item) return { success: false, message: "Item not found" };

        // Calculate price
        const pricePerUnit = calculateItemPrice(item, shop, invItem.stock, false, invItem.basePrice);
        const totalPrice = pricePerUnit * quantity;

        // Check player gold
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        const playerGold = playerStates[0]?.gold || 0;
        if (playerGold < totalPrice) {
            return { success: false, message: `Not enough gold. Need ${totalPrice}, have ${playerGold}.` };
        }

        // Deduct gold from player
        if (playerStates.length > 0) {
            await ctx.db.patch(playerStates[0]._id, {
                gold: playerGold - totalPrice,
            });
        }

        // Add item to player inventory
        const existingInventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        const existingItem = existingInventory.find((inv) => inv.itemId === args.itemId);

        if (existingItem) {
            await ctx.db.patch(existingItem._id, {
                quantity: existingItem.quantity + quantity,
            });
        } else {
            await ctx.db.insert("playerInventory", {
                campaignId: args.campaignId,
                playerId: args.playerId,
                itemId: args.itemId,
                quantity: quantity,
                acquiredAt: Date.now(),
            });
        }

        // Update shop stock
        if (invItem.stock !== -1) {
            const newInventory = [...shop.inventory];
            newInventory[invItemIndex] = {
                ...invItem,
                stock: invItem.stock - quantity,
            };
            await ctx.db.patch(args.shopId, { inventory: newInventory });
        }

        // Log transaction
        await ctx.db.insert("shopTransactions", {
            campaignId: args.campaignId,
            shopId: args.shopId,
            playerId: args.playerId,
            type: "buy",
            itemId: args.itemId,
            quantity,
            pricePerUnit,
            totalPrice,
            timestamp: Date.now(),
        });

        return {
            success: true,
            message: `Purchased ${quantity}x ${item.name} for ${totalPrice} gold.`,
            itemName: item.name,
            quantity,
            goldSpent: totalPrice,
            remainingGold: playerGold - totalPrice,
        };
    },
});

// Sell an item to a shop
export const sellToShop = mutation({
    args: {
        campaignId: v.id("campaigns"),
        shopId: v.id("shops"),
        playerId: v.string(),
        itemId: v.id("items"),
        quantity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const quantity = args.quantity || 1;
        const shop = await ctx.db.get(args.shopId);
        if (!shop) return { success: false, message: "Shop not found" };
        if (shop.isOpen === false) return { success: false, message: "This shop is closed" };

        // Check player has the item
        const inventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        const playerItem = inventory.find((inv) => inv.itemId === args.itemId);
        if (!playerItem || playerItem.quantity < quantity) {
            return { success: false, message: "You don't have enough of that item" };
        }

        // Get item details
        const item = await ctx.db.get(args.itemId);
        if (!item) return { success: false, message: "Item not found" };

        // Calculate sell price (50% of buy price)
        const pricePerUnit = calculateItemPrice(item, shop, -1, true);
        const totalPrice = pricePerUnit * quantity;

        // Remove from player inventory
        if (playerItem.quantity <= quantity) {
            await ctx.db.delete(playerItem._id);
        } else {
            await ctx.db.patch(playerItem._id, {
                quantity: playerItem.quantity - quantity,
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
                gold: (playerStates[0].gold || 0) + totalPrice,
            });
        }

        // Add to buyback inventory
        const buybackPrice = Math.floor(totalPrice * (shop.buybackModifier || 1.2)); // Buyback costs more
        const expiresAt = shop.buybackDuration
            ? Date.now() + shop.buybackDuration * 60 * 1000 // Convert minutes to ms
            : undefined;

        const newBuybackInventory = [
            ...(shop.buybackInventory || []),
            {
                itemId: args.itemId,
                soldByPlayerId: args.playerId,
                soldAt: Date.now(),
                buybackPrice,
                expiresAt,
            },
        ];

        await ctx.db.patch(args.shopId, {
            buybackInventory: newBuybackInventory,
        });

        // Log transaction
        await ctx.db.insert("shopTransactions", {
            campaignId: args.campaignId,
            shopId: args.shopId,
            playerId: args.playerId,
            type: "sell",
            itemId: args.itemId,
            quantity,
            pricePerUnit,
            totalPrice,
            timestamp: Date.now(),
        });

        return {
            success: true,
            message: `Sold ${quantity}x ${item.name} for ${totalPrice} gold.`,
            itemName: item.name,
            quantity,
            goldGained: totalPrice,
            buybackPrice,
            buybackExpires: expiresAt,
        };
    },
});

// Buy back an item from a shop
export const buybackFromShop = mutation({
    args: {
        shopId: v.id("shops"),
        playerId: v.string(),
        buybackIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const shop = await ctx.db.get(args.shopId);
        if (!shop) return { success: false, message: "Shop not found" };
        if (shop.isOpen === false) return { success: false, message: "This shop is closed" };

        if (!shop.buybackInventory || !shop.buybackInventory[args.buybackIndex]) {
            return { success: false, message: "Buyback item not found" };
        }

        const buybackItem = shop.buybackInventory[args.buybackIndex];

        // Verify ownership
        if (buybackItem.soldByPlayerId !== args.playerId) {
            return { success: false, message: "This item wasn't sold by you" };
        }

        // Check if expired
        if (buybackItem.expiresAt && buybackItem.expiresAt < Date.now()) {
            return { success: false, message: "Buyback period has expired" };
        }

        // Get item details
        const item = await ctx.db.get(buybackItem.itemId);
        if (!item) return { success: false, message: "Item not found" };

        // Check player gold
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", shop.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        const playerGold = playerStates[0]?.gold || 0;
        if (playerGold < buybackItem.buybackPrice) {
            return {
                success: false,
                message: `Not enough gold. Need ${buybackItem.buybackPrice}, have ${playerGold}.`,
            };
        }

        // Deduct gold
        if (playerStates.length > 0) {
            await ctx.db.patch(playerStates[0]._id, {
                gold: playerGold - buybackItem.buybackPrice,
            });
        }

        // Add item back to player inventory
        const existingInventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) =>
                q.eq("campaignId", shop.campaignId).eq("playerId", args.playerId)
            )
            .collect();

        const existingItem = existingInventory.find((inv) => inv.itemId === buybackItem.itemId);

        if (existingItem) {
            await ctx.db.patch(existingItem._id, {
                quantity: existingItem.quantity + 1,
            });
        } else {
            await ctx.db.insert("playerInventory", {
                campaignId: shop.campaignId,
                playerId: args.playerId,
                itemId: buybackItem.itemId,
                quantity: 1,
                acquiredAt: Date.now(),
            });
        }

        // Remove from buyback inventory
        const newBuybackInventory = shop.buybackInventory.filter((_, i) => i !== args.buybackIndex);
        await ctx.db.patch(args.shopId, {
            buybackInventory: newBuybackInventory,
        });

        // Log transaction
        await ctx.db.insert("shopTransactions", {
            campaignId: shop.campaignId,
            shopId: args.shopId,
            playerId: args.playerId,
            type: "buyback",
            itemId: buybackItem.itemId,
            quantity: 1,
            pricePerUnit: buybackItem.buybackPrice,
            totalPrice: buybackItem.buybackPrice,
            timestamp: Date.now(),
        });

        return {
            success: true,
            message: `Bought back ${item.name} for ${buybackItem.buybackPrice} gold.`,
            itemName: item.name,
            goldSpent: buybackItem.buybackPrice,
            remainingGold: playerGold - buybackItem.buybackPrice,
        };
    },
});

// --- CREATOR MUTATIONS ---

// Create a new shop
export const createShop = mutation({
    args: {
        campaignId: v.id("campaigns"),
        locationId: v.id("locations"),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        shopkeeperId: v.optional(v.id("npcs")),
        basePriceModifier: v.optional(v.number()),
        buybackModifier: v.optional(v.number()),
        buybackDuration: v.optional(v.number()),
        dynamicPricing: v.optional(
            v.object({
                reputationFactor: v.optional(v.boolean()),
                supplyDemandFactor: v.optional(v.boolean()),
                eventFactor: v.optional(v.boolean()),
            })
        ),
        aiManaged: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify campaign ownership
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        const shopId = await ctx.db.insert("shops", {
            campaignId: args.campaignId,
            locationId: args.locationId,
            name: args.name,
            description: args.description,
            type: args.type,
            shopkeeperId: args.shopkeeperId,
            inventory: [],
            basePriceModifier: args.basePriceModifier ?? 1.0,
            buybackModifier: args.buybackModifier ?? 1.2,
            buybackDuration: args.buybackDuration,
            dynamicPricing: args.dynamicPricing,
            aiManaged: args.aiManaged,
            isOpen: true,
        });

        return { success: true, shopId };
    },
});

// Update shop details
export const updateShop = mutation({
    args: {
        shopId: v.id("shops"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        type: v.optional(v.string()),
        locationId: v.optional(v.id("locations")),
        shopkeeperId: v.optional(v.id("npcs")),
        basePriceModifier: v.optional(v.number()),
        buybackModifier: v.optional(v.number()),
        buybackDuration: v.optional(v.number()),
        dynamicPricing: v.optional(
            v.object({
                reputationFactor: v.optional(v.boolean()),
                supplyDemandFactor: v.optional(v.boolean()),
                eventFactor: v.optional(v.boolean()),
            })
        ),
        aiManaged: v.optional(v.boolean()),
        isOpen: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const shop = await ctx.db.get(args.shopId);
        if (!shop) throw new Error("Shop not found");

        // Verify campaign ownership
        const campaign = await ctx.db.get(shop.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        const updates: Record<string, unknown> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.description !== undefined) updates.description = args.description;
        if (args.type !== undefined) updates.type = args.type;
        if (args.locationId !== undefined) updates.locationId = args.locationId;
        if (args.shopkeeperId !== undefined) updates.shopkeeperId = args.shopkeeperId;
        if (args.basePriceModifier !== undefined) updates.basePriceModifier = args.basePriceModifier;
        if (args.buybackModifier !== undefined) updates.buybackModifier = args.buybackModifier;
        if (args.buybackDuration !== undefined) updates.buybackDuration = args.buybackDuration;
        if (args.dynamicPricing !== undefined) updates.dynamicPricing = args.dynamicPricing;
        if (args.aiManaged !== undefined) updates.aiManaged = args.aiManaged;
        if (args.isOpen !== undefined) updates.isOpen = args.isOpen;

        await ctx.db.patch(args.shopId, updates);

        return { success: true };
    },
});

// Delete a shop
export const deleteShop = mutation({
    args: { shopId: v.id("shops") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const shop = await ctx.db.get(args.shopId);
        if (!shop) throw new Error("Shop not found");

        // Verify campaign ownership
        const campaign = await ctx.db.get(shop.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.shopId);

        return { success: true };
    },
});

// Add item to shop inventory
export const addItemToShop = mutation({
    args: {
        shopId: v.id("shops"),
        itemId: v.id("items"),
        stock: v.number(), // -1 for unlimited
        basePrice: v.optional(v.number()),
        restockRate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const shop = await ctx.db.get(args.shopId);
        if (!shop) throw new Error("Shop not found");

        // Verify campaign ownership
        const campaign = await ctx.db.get(shop.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        // Check if item already in inventory
        const existingIndex = shop.inventory.findIndex((i) => i.itemId === args.itemId);

        if (existingIndex !== -1) {
            // Update existing
            const newInventory = [...shop.inventory];
            newInventory[existingIndex] = {
                itemId: args.itemId,
                stock: args.stock,
                basePrice: args.basePrice,
                restockRate: args.restockRate,
            };
            await ctx.db.patch(args.shopId, { inventory: newInventory });
        } else {
            // Add new
            await ctx.db.patch(args.shopId, {
                inventory: [
                    ...shop.inventory,
                    {
                        itemId: args.itemId,
                        stock: args.stock,
                        basePrice: args.basePrice,
                        restockRate: args.restockRate,
                    },
                ],
            });
        }

        return { success: true };
    },
});

// Remove item from shop inventory
export const removeItemFromShop = mutation({
    args: {
        shopId: v.id("shops"),
        itemId: v.id("items"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const shop = await ctx.db.get(args.shopId);
        if (!shop) throw new Error("Shop not found");

        // Verify campaign ownership
        const campaign = await ctx.db.get(shop.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        const newInventory = shop.inventory.filter((i) => i.itemId !== args.itemId);
        await ctx.db.patch(args.shopId, { inventory: newInventory });

        return { success: true };
    },
});

// Update shop item stock/price
export const updateShopItem = mutation({
    args: {
        shopId: v.id("shops"),
        itemId: v.id("items"),
        stock: v.optional(v.number()),
        basePrice: v.optional(v.number()),
        restockRate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const shop = await ctx.db.get(args.shopId);
        if (!shop) throw new Error("Shop not found");

        // Verify campaign ownership
        const campaign = await ctx.db.get(shop.campaignId);
        if (!campaign || campaign.userId !== identity.tokenIdentifier) {
            throw new Error("Unauthorized");
        }

        const itemIndex = shop.inventory.findIndex((i) => i.itemId === args.itemId);
        if (itemIndex === -1) throw new Error("Item not in shop inventory");

        const newInventory = [...shop.inventory];
        newInventory[itemIndex] = {
            ...newInventory[itemIndex],
            ...(args.stock !== undefined && { stock: args.stock }),
            ...(args.basePrice !== undefined && { basePrice: args.basePrice }),
            ...(args.restockRate !== undefined && { restockRate: args.restockRate }),
        };

        await ctx.db.patch(args.shopId, { inventory: newInventory });

        return { success: true };
    },
});

// --- AI MUTATIONS ---

// AI-triggered inventory update
export const aiUpdateShopInventory = mutation({
    args: {
        shopId: v.id("shops"),
        action: v.string(), // "add", "remove", "restock", "close", "open", "priceChange"
        itemId: v.optional(v.id("items")),
        stock: v.optional(v.number()),
        priceModifier: v.optional(v.number()),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const shop = await ctx.db.get(args.shopId);
        if (!shop) return { success: false, message: "Shop not found" };

        // Only allow AI updates for AI-managed shops
        if (!shop.aiManaged) {
            return { success: false, message: "Shop is not AI-managed" };
        }

        switch (args.action) {
            case "close":
                await ctx.db.patch(args.shopId, { isOpen: false, lastAiUpdate: Date.now() });
                break;

            case "open":
                await ctx.db.patch(args.shopId, { isOpen: true, lastAiUpdate: Date.now() });
                break;

            case "add":
                if (args.itemId) {
                    const existingIndex = shop.inventory.findIndex((i) => i.itemId === args.itemId);
                    if (existingIndex === -1) {
                        await ctx.db.patch(args.shopId, {
                            inventory: [
                                ...shop.inventory,
                                { itemId: args.itemId, stock: args.stock ?? -1 },
                            ],
                            lastAiUpdate: Date.now(),
                        });
                    }
                }
                break;

            case "remove":
                if (args.itemId) {
                    const newInventory = shop.inventory.filter((i) => i.itemId !== args.itemId);
                    await ctx.db.patch(args.shopId, {
                        inventory: newInventory,
                        lastAiUpdate: Date.now(),
                    });
                }
                break;

            case "restock":
                // Restock all items based on their restockRate
                const restockedInventory = shop.inventory.map((item) => ({
                    ...item,
                    stock: item.stock === -1 ? -1 : (item.stock + (item.restockRate || 1)),
                }));
                await ctx.db.patch(args.shopId, {
                    inventory: restockedInventory,
                    lastAiUpdate: Date.now(),
                });
                break;

            case "priceChange":
                if (args.priceModifier) {
                    await ctx.db.patch(args.shopId, {
                        basePriceModifier: args.priceModifier,
                        lastAiUpdate: Date.now(),
                    });
                }
                break;
        }

        return { success: true, action: args.action, reason: args.reason };
    },
});

// Clean up expired buyback items
export const cleanupExpiredBuybacks = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const shops = await ctx.db
            .query("shops")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const now = Date.now();
        let cleanedCount = 0;

        for (const shop of shops) {
            if (!shop.buybackInventory || shop.buybackInventory.length === 0) continue;

            const validBuybacks = shop.buybackInventory.filter(
                (bb) => !bb.expiresAt || bb.expiresAt > now
            );

            if (validBuybacks.length !== shop.buybackInventory.length) {
                await ctx.db.patch(shop._id, { buybackInventory: validBuybacks });
                cleanedCount += shop.buybackInventory.length - validBuybacks.length;
            }
        }

        return { success: true, cleanedCount };
    },
});
