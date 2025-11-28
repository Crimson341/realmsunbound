"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Sword,
  Shield,
  Sparkles,
  Heart,
  Zap,
  X,
  ChevronRight,
  Star,
} from "lucide-react";

// Rarity colors
const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
  mythic: "#ef4444",
};

const RARITY_GLOW: Record<string, string> = {
  common: "shadow-gray-500/20",
  uncommon: "shadow-green-500/30",
  rare: "shadow-blue-500/40",
  epic: "shadow-purple-500/50",
  legendary: "shadow-amber-500/60",
  mythic: "shadow-red-500/70",
};

// Item type icons
function getItemIcon(type: string) {
  switch (type.toLowerCase()) {
    case "weapon":
      return <Sword className="w-4 h-4" />;
    case "armor":
      return <Shield className="w-4 h-4" />;
    case "consumable":
    case "potion":
      return <Heart className="w-4 h-4" />;
    case "spell":
    case "scroll":
      return <Sparkles className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
}

interface InventoryItem {
  inventoryId: Id<"playerInventory">;
  itemId: Id<"items">;
  quantity: number;
  equippedSlot?: string;
  name: string;
  type: string;
  rarity: string;
  description?: string;
  effects: string;
  textColor?: string;
  usable: boolean;
  consumable: boolean;
  useEffect: {
    type: string;
    amount?: number;
    stat?: string;
    duration?: number;
  } | null;
}

interface InventoryPanelProps {
  campaignId: Id<"campaigns">;
  playerId: string;
  onUseItem?: (item: InventoryItem, result: { message: string; hpChange?: number }) => void;
  compact?: boolean;
}

export function InventoryPanel({
  campaignId,
  playerId,
  onUseItem,
  compact = false,
}: InventoryPanelProps) {
  const inventory = useQuery(api.inventory.getPlayerInventory, {
    campaignId,
    playerId,
  });
  
  const itemMutation = useMutation(api.inventory.useItem);
  const equipItemMutation = useMutation(api.inventory.equipItem);
  const unequipItemMutation = useMutation(api.inventory.unequipItem);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    item: InventoryItem;
    x: number;
    y: number;
  } | null>(null);
  const [usingItem, setUsingItem] = useState<Id<"items"> | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, item: InventoryItem) => {
    e.preventDefault();
    setContextMenu({
      item,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleUseItem = async (item: InventoryItem) => {
    if (!item.usable) return;
    
    setUsingItem(item.itemId);
    setContextMenu(null);

    try {
      const result = await itemMutation({
        campaignId,
        playerId,
        itemId: item.itemId,
      });

      if (result.success && onUseItem) {
        onUseItem(item, {
          message: result.message,
          hpChange: result.hpChange,
        });
      }
    } catch (error) {
      console.error("Failed to use item:", error);
    } finally {
      setUsingItem(null);
    }
  };

  const handleEquipItem = async (item: InventoryItem) => {
    const slot = item.type.toLowerCase() === "weapon" ? "weapon" 
      : item.type.toLowerCase() === "armor" ? "armor" 
      : "accessory";

    await equipItemMutation({
      campaignId,
      playerId,
      itemId: item.itemId,
      slot,
    });
    setContextMenu(null);
  };

  const handleUnequipItem = async (item: InventoryItem) => {
    if (!item.equippedSlot) return;
    await unequipItemMutation({
      campaignId,
      playerId,
      slot: item.equippedSlot,
    });
    setContextMenu(null);
  };

  const getRarityColor = (rarity: string, textColor?: string) => {
    if (textColor) return textColor;
    return RARITY_COLORS[rarity.toLowerCase()] || RARITY_COLORS.common;
  };

  if (!inventory) {
    return (
      <div className="p-4 text-center text-neutral-500">
        <Package className="w-8 h-8 mx-auto mb-2 animate-pulse" />
        Loading inventory...
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-500">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Your inventory is empty</p>
      </div>
    );
  }

  // Group items by type
  const groupedItems = inventory.reduce((acc, item) => {
    const type = item.type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  return (
    <div className={`relative ${compact ? "space-y-2" : "space-y-4"}`}>
      {/* Item Grid */}
      {compact ? (
        // Compact grid view
        <div className="grid grid-cols-4 gap-1">
          {inventory.slice(0, 8).map((item) => (
            <motion.button
              key={item.inventoryId}
              className={`
                relative aspect-square rounded-lg p-1.5
                bg-neutral-800/50 border border-neutral-700/50
                hover:border-opacity-100 transition-all cursor-pointer
                ${RARITY_GLOW[item.rarity.toLowerCase()] || ""}
              `}
              style={{
                borderColor: getRarityColor(item.rarity, item.textColor),
              }}
              onClick={() => setSelectedItem(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: getRarityColor(item.rarity, item.textColor) }}
              >
                {getItemIcon(item.type)}
              </div>
              {item.quantity > 1 && (
                <span className="absolute bottom-0 right-0 text-[10px] bg-black/80 px-1 rounded">
                  {item.quantity}
                </span>
              )}
              {item.equippedSlot && (
                <span className="absolute top-0 right-0 text-[8px] bg-amber-500/80 px-1 rounded-bl text-black font-bold">
                  E
                </span>
              )}
            </motion.button>
          ))}
        </div>
      ) : (
        // Full view with categories
        Object.entries(groupedItems).map(([type, items]) => (
          <div key={type}>
            <h4 className="text-xs uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-2">
              {getItemIcon(type)}
              {type}
              <span className="text-neutral-600">({items.length})</span>
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {items.map((item) => (
                <motion.button
                  key={item.inventoryId}
                  className={`
                    relative aspect-square rounded-lg p-2
                    bg-neutral-800/50 border-2
                    hover:bg-neutral-700/50 transition-all cursor-pointer
                    ${usingItem === item.itemId ? "animate-pulse" : ""}
                    ${RARITY_GLOW[item.rarity.toLowerCase()] || ""}
                  `}
                  style={{
                    borderColor: getRarityColor(item.rarity, item.textColor),
                  }}
                  onClick={() => setSelectedItem(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-1"
                    style={{ color: getRarityColor(item.rarity, item.textColor) }}
                  >
                    {getItemIcon(item.type)}
                    <span className="text-[10px] truncate w-full text-center text-neutral-300">
                      {item.name}
                    </span>
                  </div>
                  
                  {/* Quantity badge */}
                  {item.quantity > 1 && (
                    <span className="absolute bottom-1 right-1 text-xs bg-black/80 px-1.5 rounded-full">
                      ×{item.quantity}
                    </span>
                  )}
                  
                  {/* Equipped badge */}
                  {item.equippedSlot && (
                    <span className="absolute top-1 right-1 text-[10px] bg-amber-500 px-1 py-0.5 rounded text-black font-bold">
                      {item.equippedSlot.charAt(0).toUpperCase()}
                    </span>
                  )}
                  
                  {/* Usable indicator */}
                  {item.usable && (
                    <span className="absolute top-1 left-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 py-1 min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <div
              className="px-3 py-2 border-b border-neutral-700"
              style={{ color: getRarityColor(contextMenu.item.rarity, contextMenu.item.textColor) }}
            >
              <div className="font-semibold flex items-center gap-2">
                {getItemIcon(contextMenu.item.type)}
                {contextMenu.item.name}
              </div>
              <div className="text-xs text-neutral-400 capitalize">
                {contextMenu.item.rarity} {contextMenu.item.type}
              </div>
            </div>

            {contextMenu.item.usable && (
              <button
                className="w-full px-3 py-2 text-left hover:bg-neutral-800 flex items-center gap-2 text-green-400"
                onClick={() => handleUseItem(contextMenu.item)}
              >
                <Zap className="w-4 h-4" />
                Quick Use
              </button>
            )}

            {!contextMenu.item.equippedSlot &&
              (contextMenu.item.type.toLowerCase() === "weapon" ||
                contextMenu.item.type.toLowerCase() === "armor") && (
                <button
                  className="w-full px-3 py-2 text-left hover:bg-neutral-800 flex items-center gap-2 text-blue-400"
                  onClick={() => handleEquipItem(contextMenu.item)}
                >
                  <Shield className="w-4 h-4" />
                  Equip
                </button>
              )}

            {contextMenu.item.equippedSlot && (
              <button
                className="w-full px-3 py-2 text-left hover:bg-neutral-800 flex items-center gap-2 text-amber-400"
                onClick={() => handleUnequipItem(contextMenu.item)}
              >
                <X className="w-4 h-4" />
                Unequip
              </button>
            )}

            <button
              className="w-full px-3 py-2 text-left hover:bg-neutral-800 flex items-center gap-2 text-neutral-300"
              onClick={() => {
                setSelectedItem(contextMenu.item);
                setContextMenu(null);
              }}
            >
              <ChevronRight className="w-4 h-4" />
              View Details
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border-2 rounded-xl max-w-md w-full p-6 relative"
              style={{
                borderColor: getRarityColor(selectedItem.rarity, selectedItem.textColor),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                onClick={() => setSelectedItem(null)}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Item header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center bg-neutral-800"
                  style={{
                    color: getRarityColor(selectedItem.rarity, selectedItem.textColor),
                    boxShadow: `0 0 20px ${getRarityColor(selectedItem.rarity, selectedItem.textColor)}40`,
                  }}
                >
                  {getItemIcon(selectedItem.type)}
                </div>
                <div className="flex-1">
                  <h3
                    className="text-xl font-bold"
                    style={{ color: getRarityColor(selectedItem.rarity, selectedItem.textColor) }}
                  >
                    {selectedItem.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <span className="capitalize">{selectedItem.rarity}</span>
                    <span>•</span>
                    <span>{selectedItem.type}</span>
                    {selectedItem.quantity > 1 && (
                      <>
                        <span>•</span>
                        <span>×{selectedItem.quantity}</span>
                      </>
                    )}
                  </div>
                  {selectedItem.equippedSlot && (
                    <span className="inline-block mt-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                      Equipped: {selectedItem.equippedSlot}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <p className="text-neutral-300 text-sm mb-4 italic">
                  &quot;{selectedItem.description}&quot;
                </p>
              )}

              {/* Effects */}
              <div className="bg-neutral-800/50 rounded-lg p-3 mb-4">
                <h4 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  Effects
                </h4>
                <p className="text-neutral-200 text-sm">{selectedItem.effects}</p>
              </div>

              {/* Use Effect */}
              {selectedItem.useEffect && (
                <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 mb-4">
                  <h4 className="text-xs uppercase tracking-wider text-green-400 mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Usable
                    {selectedItem.consumable && (
                      <span className="text-neutral-500 normal-case ml-1">
                        (consumed on use)
                      </span>
                    )}
                  </h4>
                  <p className="text-neutral-200 text-sm">
                    {selectedItem.useEffect.type === "heal" &&
                      `Restores ${selectedItem.useEffect.amount} HP`}
                    {selectedItem.useEffect.type === "buff" &&
                      `+${selectedItem.useEffect.amount} ${selectedItem.useEffect.stat} for ${selectedItem.useEffect.duration}s`}
                    {selectedItem.useEffect.type === "restore_mana" &&
                      `Restores ${selectedItem.useEffect.amount} mana`}
                    {selectedItem.useEffect.type === "cure" && "Cures ailments"}
                    {selectedItem.useEffect.type === "reveal" && "Reveals hidden secrets"}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {selectedItem.usable && (
                  <button
                    className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-500 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    onClick={() => {
                      handleUseItem(selectedItem);
                      setSelectedItem(null);
                    }}
                    disabled={usingItem === selectedItem.itemId}
                  >
                    {usingItem === selectedItem.itemId ? (
                      <>
                        <Star className="w-4 h-4 animate-spin" />
                        Using...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Use Item
                      </>
                    )}
                  </button>
                )}

                {!selectedItem.equippedSlot &&
                  (selectedItem.type.toLowerCase() === "weapon" ||
                    selectedItem.type.toLowerCase() === "armor") && (
                    <button
                      className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                      onClick={() => {
                        handleEquipItem(selectedItem);
                        setSelectedItem(null);
                      }}
                    >
                      <Shield className="w-4 h-4" />
                      Equip
                    </button>
                  )}

                {selectedItem.equippedSlot && (
                  <button
                    className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    onClick={() => {
                      handleUnequipItem(selectedItem);
                      setSelectedItem(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                    Unequip
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Standalone item tooltip component
export function ItemTooltip({
  item,
  children,
}: {
  item: {
    name: string;
    type: string;
    rarity: string;
    effects: string;
    textColor?: string;
    usable?: boolean;
  };
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
    setShow(true);
  };

  const rarityColor =
    item.textColor || RARITY_COLORS[item.rarity.toLowerCase()] || RARITY_COLORS.common;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="fixed z-50 bg-neutral-900 border rounded-lg p-3 shadow-xl pointer-events-none"
            style={{
              left: position.x + 10,
              top: position.y + 10,
              borderColor: rarityColor,
              minWidth: 200,
            }}
          >
            <div className="font-semibold" style={{ color: rarityColor }}>
              {item.name}
            </div>
            <div className="text-xs text-neutral-400 capitalize mb-2">
              {item.rarity} {item.type}
            </div>
            <div className="text-sm text-neutral-300">{item.effects}</div>
            {item.usable && (
              <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Right-click to use
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}






