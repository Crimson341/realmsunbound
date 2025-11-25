"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Coins,
  Package,
  ShoppingBag,
  ArrowRightLeft,
  Skull,
  Sparkles,
  ChevronRight,
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

interface LootableNPC {
  id: Id<"npcs">;
  name: string;
  role: string;
  itemCount: number;
  gold: number;
}

interface TradingNPC {
  id: Id<"npcs">;
  name: string;
  role: string;
  attitude: string;
  itemCount: number;
  priceModifier: number;
}

interface LootItem {
  id: Id<"items">;
  name: string;
  type: string;
  rarity: string;
  textColor?: string;
  description?: string;
}

// === LOOT BODY MODAL ===
interface LootBodyModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: Id<"campaigns">;
  playerId: string;
  npc: LootableNPC;
  onLootComplete?: (items: LootItem[], gold: number) => void;
}

export function LootBodyModal({
  isOpen,
  onClose,
  campaignId,
  playerId,
  npc,
  onLootComplete,
}: LootBodyModalProps) {
  const [isLooting, setIsLooting] = useState(false);
  const [lootResult, setLootResult] = useState<{
    items: LootItem[];
    gold: number;
    message: string;
  } | null>(null);

  const lootNPCBody = useMutation(api.npcs.lootNPCBody);

  const handleLoot = async () => {
    setIsLooting(true);
    try {
      const result = await lootNPCBody({
        campaignId,
        playerId,
        npcId: npc.id,
      });

      if (result.success) {
        setLootResult({
          items: result.items as LootItem[],
          gold: result.gold,
          message: result.message,
        });
        onLootComplete?.(result.items as LootItem[], result.gold);
      } else {
        setLootResult({
          items: [],
          gold: 0,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Failed to loot:", error);
    } finally {
      setIsLooting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
              <Skull className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{npc.name}&apos;s Body</h2>
              <p className="text-sm text-neutral-400">{npc.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loot Preview or Results */}
        {!lootResult ? (
          <>
            <div className="bg-neutral-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-neutral-300 mb-3">
                You stand over the fallen {npc.role.toLowerCase()}. Their belongings
                await...
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-neutral-400">
                  <Package className="w-4 h-4" />
                  <span>{npc.itemCount} item(s)</span>
                </div>
                {npc.gold > 0 && (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Coins className="w-4 h-4" />
                    <span>{npc.gold} gold</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleLoot}
              disabled={isLooting}
              className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isLooting ? (
                <>
                  <Search className="w-5 h-5 animate-pulse" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search Body
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-300 mb-4">{lootResult.message}</p>

            {/* Looted Items */}
            {lootResult.items.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="text-xs uppercase tracking-wider text-neutral-500">
                  Items Found
                </h3>
                {lootResult.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border-l-2"
                    style={{
                      borderColor:
                        item.textColor ||
                        RARITY_COLORS[item.rarity.toLowerCase()] ||
                        RARITY_COLORS.common,
                    }}
                  >
                    <Package
                      className="w-5 h-5"
                      style={{
                        color:
                          item.textColor ||
                          RARITY_COLORS[item.rarity.toLowerCase()] ||
                          RARITY_COLORS.common,
                      }}
                    />
                    <div className="flex-1">
                      <div
                        className="font-medium"
                        style={{
                          color:
                            item.textColor ||
                            RARITY_COLORS[item.rarity.toLowerCase()] ||
                            RARITY_COLORS.common,
                        }}
                      >
                        {item.name}
                      </div>
                      <div className="text-xs text-neutral-500 capitalize">
                        {item.rarity} {item.type}
                      </div>
                    </div>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Gold Found */}
            {lootResult.gold > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg mb-4"
              >
                <Coins className="w-6 h-6 text-amber-400" />
                <span className="text-amber-300 font-semibold">
                  +{lootResult.gold} Gold
                </span>
              </motion.div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-semibold transition-colors"
            >
              Done
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// === TRADE MODAL ===
interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: Id<"campaigns">;
  playerId: string;
  npc: TradingNPC;
  playerGold: number;
  onTradeComplete?: () => void;
}

interface TradeItem {
  id: Id<"items">;
  name: string;
  type: string;
  rarity: string;
  description?: string;
  effects?: string;
  textColor?: string;
  price: number;
}

export function TradeModal({
  isOpen,
  onClose,
  campaignId,
  playerId,
  npc,
  playerGold,
  onTradeComplete,
}: TradeModalProps) {
  const [selectedItem, setSelectedItem] = useState<TradeItem | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tradeInventory = useQuery(api.npcs.getNPCTradeInventory, { npcId: npc.id });
  const buyFromNPC = useMutation(api.npcs.buyFromNPC);

  const handleBuy = async (item: TradeItem) => {
    setIsBuying(true);
    setMessage(null);
    try {
      const result = await buyFromNPC({
        campaignId,
        playerId,
        npcId: npc.id,
        itemId: item.id,
      });

      setMessage(result.message);
      if (result.success) {
        setSelectedItem(null);
        onTradeComplete?.();
      }
    } catch (error) {
      console.error("Failed to buy:", error);
      setMessage("Transaction failed.");
    } finally {
      setIsBuying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Trade with {npc.name}</h2>
              <p className="text-sm text-neutral-400">{npc.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Gold */}
        <div className="px-6 py-3 bg-neutral-800/30 border-b border-neutral-800 flex items-center justify-between">
          <span className="text-sm text-neutral-400">Your Gold</span>
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Coins className="w-4 h-4" />
            {playerGold}
          </div>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`px-6 py-3 text-sm ${
                message.includes("Purchased") || message.includes("Sold")
                  ? "bg-green-900/20 text-green-400"
                  : "bg-red-900/20 text-red-400"
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items for Sale */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
            Items for Sale
          </h3>

          {!tradeInventory ? (
            <div className="text-center py-8 text-neutral-500">Loading...</div>
          ) : tradeInventory.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nothing available for sale</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tradeInventory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item as TradeItem)}
                  className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 text-left ${
                    selectedItem?.id === item.id
                      ? "bg-neutral-700 border-neutral-500"
                      : "bg-neutral-800/50 border-neutral-700/50 hover:border-neutral-600"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${
                        item.textColor ||
                        RARITY_COLORS[item.rarity.toLowerCase()] ||
                        RARITY_COLORS.common
                      }20`,
                    }}
                  >
                    <Package
                      className="w-5 h-5"
                      style={{
                        color:
                          item.textColor ||
                          RARITY_COLORS[item.rarity.toLowerCase()] ||
                          RARITY_COLORS.common,
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium truncate"
                      style={{
                        color:
                          item.textColor ||
                          RARITY_COLORS[item.rarity.toLowerCase()] ||
                          RARITY_COLORS.common,
                      }}
                    >
                      {item.name}
                    </div>
                    <div className="text-xs text-neutral-500 capitalize truncate">
                      {item.rarity} {item.type}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 font-semibold ${
                      playerGold >= item.price ? "text-amber-400" : "text-red-400"
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    {item.price}
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Item Detail */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-6 border-t border-neutral-800 bg-neutral-800/30"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${
                      selectedItem.textColor ||
                      RARITY_COLORS[selectedItem.rarity.toLowerCase()] ||
                      RARITY_COLORS.common
                    }20`,
                    boxShadow: `0 0 20px ${
                      selectedItem.textColor ||
                      RARITY_COLORS[selectedItem.rarity.toLowerCase()] ||
                      RARITY_COLORS.common
                    }30`,
                  }}
                >
                  <Package
                    className="w-7 h-7"
                    style={{
                      color:
                        selectedItem.textColor ||
                        RARITY_COLORS[selectedItem.rarity.toLowerCase()] ||
                        RARITY_COLORS.common,
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h4
                    className="font-bold text-lg"
                    style={{
                      color:
                        selectedItem.textColor ||
                        RARITY_COLORS[selectedItem.rarity.toLowerCase()] ||
                        RARITY_COLORS.common,
                    }}
                  >
                    {selectedItem.name}
                  </h4>
                  <p className="text-xs text-neutral-400 capitalize">
                    {selectedItem.rarity} {selectedItem.type}
                  </p>
                  {selectedItem.description && (
                    <p className="text-sm text-neutral-300 mt-2 italic">
                      &quot;{selectedItem.description}&quot;
                    </p>
                  )}
                  {selectedItem.effects && (
                    <p className="text-sm text-neutral-400 mt-1">
                      {selectedItem.effects}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleBuy(selectedItem)}
                disabled={isBuying || playerGold < selectedItem.price}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  playerGold >= selectedItem.price
                    ? "bg-green-600 hover:bg-green-500 disabled:bg-green-800"
                    : "bg-neutral-700 cursor-not-allowed text-neutral-500"
                }`}
              >
                {isBuying ? (
                  <>
                    <ArrowRightLeft className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : playerGold >= selectedItem.price ? (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    Buy for {selectedItem.price} gold
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5" />
                    Not enough gold
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// === LOOTABLE BODIES LIST (for sidebar) ===
interface LootableBodiesListProps {
  campaignId: Id<"campaigns">;
  locationId: Id<"locations"> | null;
  playerId: string;
  onLootComplete?: (items: LootItem[], gold: number) => void;
}

export function LootableBodiesList({
  campaignId,
  locationId,
  playerId,
  onLootComplete,
}: LootableBodiesListProps) {
  const [selectedNpc, setSelectedNpc] = useState<LootableNPC | null>(null);

  const lootableNpcs = useQuery(
    api.npcs.getLootableNPCsAtLocation,
    locationId ? { campaignId, locationId } : "skip"
  );

  if (!lootableNpcs || lootableNpcs.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
          <Skull className="w-3 h-3" />
          Bodies to Search
        </h3>
        {lootableNpcs.map((npc) => (
          <button
            key={npc.id}
            onClick={() => setSelectedNpc(npc)}
            className="w-full p-3 bg-red-900/10 hover:bg-red-900/20 border border-red-800/30 rounded-lg flex items-center gap-3 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center">
              <Skull className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-300">{npc.name}</div>
              <div className="text-xs text-neutral-500">{npc.role}</div>
            </div>
            <div className="text-xs text-neutral-400">
              {npc.itemCount > 0 && `${npc.itemCount} items`}
              {npc.itemCount > 0 && npc.gold > 0 && " • "}
              {npc.gold > 0 && `${npc.gold}g`}
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedNpc && (
          <LootBodyModal
            isOpen={true}
            onClose={() => setSelectedNpc(null)}
            campaignId={campaignId}
            playerId={playerId}
            npc={selectedNpc}
            onLootComplete={(items, gold) => {
              onLootComplete?.(items, gold);
              setSelectedNpc(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// === TRADING NPCS LIST (for sidebar) ===
interface TradingNPCsListProps {
  campaignId: Id<"campaigns">;
  locationId: Id<"locations"> | null;
  playerId: string;
  playerGold: number;
  onTradeComplete?: () => void;
}

export function TradingNPCsList({
  campaignId,
  locationId,
  playerId,
  playerGold,
  onTradeComplete,
}: TradingNPCsListProps) {
  const [selectedNpc, setSelectedNpc] = useState<TradingNPC | null>(null);

  const tradingNpcs = useQuery(
    api.npcs.getTradingNPCsAtLocation,
    locationId ? { campaignId, locationId } : "skip"
  );

  if (!tradingNpcs || tradingNpcs.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-green-400 flex items-center gap-2">
          <ShoppingBag className="w-3 h-3" />
          Merchants
        </h3>
        {tradingNpcs.map((npc) => (
          <button
            key={npc.id}
            onClick={() => setSelectedNpc(npc)}
            className="w-full p-3 bg-green-900/10 hover:bg-green-900/20 border border-green-800/30 rounded-lg flex items-center gap-3 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-green-300">{npc.name}</div>
              <div className="text-xs text-neutral-500">{npc.role}</div>
            </div>
            <div className="text-xs text-neutral-400">{npc.itemCount} items</div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedNpc && (
          <TradeModal
            isOpen={true}
            onClose={() => setSelectedNpc(null)}
            campaignId={campaignId}
            playerId={playerId}
            npc={selectedNpc}
            playerGold={playerGold}
            onTradeComplete={() => {
              onTradeComplete?.();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

