import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Item effect types and their handlers
type ItemEffect = {
    type: "heal" | "damage" | "buff" | "debuff" | "teleport" | "summon" | "reveal" | "restore_mana" | "cure";
    amount?: number;
    stat?: string;
    duration?: number; // in seconds
    target?: string;
    locationId?: string;
};

// Parse item effect from JSON string
function parseItemEffect(effectJson: string | undefined): ItemEffect | null {
    if (!effectJson) return null;
    try {
        return JSON.parse(effectJson) as ItemEffect;
    } catch {
        return null;
    }
}

// --- PLAYER INVENTORY MANAGEMENT ---

// Add item to player's inventory
export const addToInventory = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        itemId: v.id("items"),
        quantity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const quantity = args.quantity ?? 1;
        
        // Check if player already has this item
        const existing = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        const existingItem = existing.find((inv) => inv.itemId === args.itemId);
        
        if (existingItem) {
            // Stack the items
            await ctx.db.patch(existingItem._id, {
                quantity: existingItem.quantity + quantity,
            });
            return { success: true, inventoryId: existingItem._id };
        } else {
            // Add new inventory entry
            const inventoryId = await ctx.db.insert("playerInventory", {
                campaignId: args.campaignId,
                playerId: args.playerId,
                itemId: args.itemId,
                quantity,
                acquiredAt: Date.now(),
            });
            return { success: true, inventoryId };
        }
    },
});

// Remove item from player's inventory
export const removeFromInventory = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        itemId: v.id("items"),
        quantity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const quantity = args.quantity ?? 1;
        
        const inventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        const inventoryItem = inventory.find((inv) => inv.itemId === args.itemId);
        
        if (!inventoryItem) {
            return { success: false, message: "Item not found in inventory." };
        }
        
        if (inventoryItem.quantity <= quantity) {
            // Remove entirely
            await ctx.db.delete(inventoryItem._id);
        } else {
            // Reduce quantity
            await ctx.db.patch(inventoryItem._id, {
                quantity: inventoryItem.quantity - quantity,
            });
        }
        
        return { success: true };
    },
});

// Get player's full inventory with item details
export const getPlayerInventory = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const inventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        // Get full item details for each inventory slot
        const itemsWithDetails = await Promise.all(
            inventory.map(async (inv) => {
                const item = await ctx.db.get(inv.itemId);
                if (!item) return null;
                
                const effect = parseItemEffect(item.useEffect);
                
                return {
                    inventoryId: inv._id,
                    itemId: inv.itemId,
                    quantity: inv.quantity,
                    equippedSlot: inv.equippedSlot,
                    acquiredAt: inv.acquiredAt,
                    // Item details
                    name: item.name,
                    type: item.type,
                    rarity: item.rarity,
                    description: item.description,
                    effects: item.effects,
                    textColor: item.textColor,
                    // Usability
                    usable: item.usable ?? false,
                    consumable: item.consumable ?? false,
                    useEffect: effect,
                };
            })
        );
        
        return itemsWithDetails.filter((item): item is NonNullable<typeof item> => item !== null);
    },
});

// --- ITEM USAGE ---

// Use an item from inventory
export const useItem = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        itemId: v.id("items"),
    },
    handler: async (ctx, args) => {
        // Get the item
        const item = await ctx.db.get(args.itemId);
        if (!item) {
            return { success: false, message: "Item not found." };
        }
        
        if (!item.usable) {
            return { success: false, message: `${item.name} cannot be used directly.` };
        }
        
        // Check if player has the item
        const inventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        const inventoryItem = inventory.find((inv) => inv.itemId === args.itemId);
        if (!inventoryItem || inventoryItem.quantity < 1) {
            return { success: false, message: `You don't have any ${item.name}.` };
        }
        
        // Parse the effect
        const effect = parseItemEffect(item.useEffect);
        if (!effect) {
            return { success: false, message: `${item.name} has no usable effect.` };
        }
        
        // Get player game state
        const playerStates = await ctx.db
            .query("playerGameState")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        let result: { success: boolean; message: string; effect?: ItemEffect; hpChange?: number; newHp?: number };
        
        // Apply the effect based on type
        switch (effect.type) {
            case "heal": {
                if (playerStates.length > 0) {
                    const playerState = playerStates[0];
                    const healAmount = effect.amount || 0;
                    const newHp = Math.min(playerState.hp + healAmount, playerState.maxHp);
                    const actualHeal = newHp - playerState.hp;
                    
                    await ctx.db.patch(playerState._id, { hp: newHp });
                    
                    result = {
                        success: true,
                        message: `You used ${item.name} and restored ${actualHeal} HP.`,
                        effect,
                        hpChange: actualHeal,
                        newHp,
                    };
                } else {
                    result = {
                        success: true,
                        message: `You used ${item.name} and feel restored.`,
                        effect,
                        hpChange: effect.amount || 0,
                    };
                }
                break;
            }
            
            case "restore_mana": {
                // Mana restoration (would need mana tracking in playerGameState)
                result = {
                    success: true,
                    message: `You used ${item.name} and restored ${effect.amount || 0} mana.`,
                    effect,
                };
                break;
            }
            
            case "buff": {
                // Add buff to player state
                if (playerStates.length > 0) {
                    const playerState = playerStates[0];
                    let currentBuffs: Array<{ stat: string | undefined; amount: number | undefined; endsAt: number; source: string }> = [];
                    if (playerState.activeBuffs) {
                        try {
                            currentBuffs = JSON.parse(playerState.activeBuffs);
                        } catch {
                            console.error("Failed to parse activeBuffs in useItem");
                        }
                    }
                    currentBuffs.push({
                        stat: effect.stat,
                        amount: effect.amount,
                        endsAt: Date.now() + (effect.duration || 60) * 1000,
                        source: item.name,
                    });
                    
                    await ctx.db.patch(playerState._id, {
                        activeBuffs: JSON.stringify(currentBuffs),
                    });
                }
                
                result = {
                    success: true,
                    message: `You used ${item.name}. ${effect.stat} increased by ${effect.amount} for ${effect.duration || 60} seconds.`,
                    effect,
                };
                break;
            }
            
            case "cure": {
                // Remove debuffs/conditions
                result = {
                    success: true,
                    message: `You used ${item.name} and cured your ailments.`,
                    effect,
                };
                break;
            }
            
            case "reveal": {
                // Reveal hidden things (map, enemies, etc.)
                result = {
                    success: true,
                    message: `You used ${item.name}. Hidden secrets are revealed to you.`,
                    effect,
                };
                break;
            }
            
            default: {
                result = {
                    success: true,
                    message: `You used ${item.name}.`,
                    effect,
                };
            }
        }
        
        // Consume the item if it's consumable
        if (item.consumable) {
            if (inventoryItem.quantity <= 1) {
                await ctx.db.delete(inventoryItem._id);
            } else {
                await ctx.db.patch(inventoryItem._id, {
                    quantity: inventoryItem.quantity - 1,
                });
            }
        }
        
        return result;
    },
});

// Get what an item does (for tooltips)
export const getItemEffect = query({
    args: { itemId: v.id("items") },
    handler: async (ctx, args) => {
        const item = await ctx.db.get(args.itemId);
        if (!item) return null;
        
        const effect = parseItemEffect(item.useEffect);
        
        return {
            name: item.name,
            type: item.type,
            rarity: item.rarity,
            description: item.description,
            effects: item.effects,
            usable: item.usable ?? false,
            consumable: item.consumable ?? false,
            useEffect: effect,
            effectDescription: effect ? getEffectDescription(effect, item.name) : null,
        };
    },
});

// Helper to generate human-readable effect description
function getEffectDescription(effect: ItemEffect, itemName: string): string {
    switch (effect.type) {
        case "heal":
            return `Restores ${effect.amount || 0} HP`;
        case "restore_mana":
            return `Restores ${effect.amount || 0} mana`;
        case "buff":
            return `+${effect.amount || 0} ${effect.stat || "stat"} for ${effect.duration || 60}s`;
        case "debuff":
            return `${effect.target || "Enemy"}: -${effect.amount || 0} ${effect.stat || "stat"} for ${effect.duration || 60}s`;
        case "damage":
            return `Deals ${effect.amount || 0} damage`;
        case "cure":
            return `Cures status effects`;
        case "reveal":
            return `Reveals hidden objects`;
        case "teleport":
            return `Teleports to a location`;
        case "summon":
            return `Summons an ally`;
        default:
            return `Use ${itemName}`;
    }
}

// --- EQUIPMENT ---

// Valid equipment slots
const VALID_EQUIPMENT_SLOTS = ["weapon", "armor", "accessory", "helmet", "boots", "ring", "amulet"] as const;
type EquipmentSlot = typeof VALID_EQUIPMENT_SLOTS[number];

// Equip an item
export const equipItem = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        itemId: v.id("items"),
        slot: v.string(), // "weapon", "armor", "accessory", etc.
    },
    handler: async (ctx, args) => {
        // Validate slot
        if (!VALID_EQUIPMENT_SLOTS.includes(args.slot as EquipmentSlot)) {
            return { success: false, message: `Invalid equipment slot: ${args.slot}` };
        }

        const inventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        const inventoryItem = inventory.find((inv) => inv.itemId === args.itemId);
        if (!inventoryItem) {
            return { success: false, message: "Item not in inventory." };
        }
        
        // Unequip any item currently in that slot
        const currentlyEquipped = inventory.find((inv) => inv.equippedSlot === args.slot);
        if (currentlyEquipped) {
            await ctx.db.patch(currentlyEquipped._id, { equippedSlot: undefined });
        }
        
        // Equip the new item
        await ctx.db.patch(inventoryItem._id, { equippedSlot: args.slot });
        
        const item = await ctx.db.get(args.itemId);
        return {
            success: true,
            message: `Equipped ${item?.name || "item"} in ${args.slot} slot.`,
        };
    },
});

// Unequip an item
export const unequipItem = mutation({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
        slot: v.string(),
    },
    handler: async (ctx, args) => {
        const inventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        const equippedItem = inventory.find((inv) => inv.equippedSlot === args.slot);
        if (!equippedItem) {
            return { success: false, message: "No item equipped in that slot." };
        }
        
        await ctx.db.patch(equippedItem._id, { equippedSlot: undefined });
        
        const item = await ctx.db.get(equippedItem.itemId);
        return {
            success: true,
            message: `Unequipped ${item?.name || "item"}.`,
        };
    },
});

// Get equipped items
export const getEquippedItems = query({
    args: {
        campaignId: v.id("campaigns"),
        playerId: v.string(),
    },
    handler: async (ctx, args) => {
        const inventory = await ctx.db
            .query("playerInventory")
            .withIndex("by_campaign_and_player", (q) => 
                q.eq("campaignId", args.campaignId).eq("playerId", args.playerId)
            )
            .collect();
        
        const equipped = inventory.filter((inv) => inv.equippedSlot);
        
        const equippedWithDetails = await Promise.all(
            equipped.map(async (inv) => {
                const item = await ctx.db.get(inv.itemId);
                return {
                    slot: inv.equippedSlot,
                    item: item ? {
                        id: item._id,
                        name: item.name,
                        type: item.type,
                        rarity: item.rarity,
                        effects: item.effects,
                        textColor: item.textColor,
                    } : null,
                };
            })
        );
        
        // Convert to slot-keyed object
        const slots: Record<string, typeof equippedWithDetails[0]["item"]> = {};
        for (const eq of equippedWithDetails) {
            if (eq.slot && eq.item) {
                slots[eq.slot] = eq.item;
            }
        }
        
        return slots;
    },
});








