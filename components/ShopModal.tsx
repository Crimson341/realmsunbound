"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Coins,
  Package,
  Store,
  ShoppingCart,
  ArrowLeftRight,
  RotateCcw,
  Sword,
  Shield,
  FlaskConical,
  Scroll,
  Gem,
  Box,
  Clock,
  ChevronRight,
  Minus,
  Plus,
  Tag,
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

// Category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  weapon: <Sword className="w-4 h-4" />,
  armor: <Shield className="w-4 h-4" />,
  potion: <FlaskConical className="w-4 h-4" />,
  consumable: <FlaskConical className="w-4 h-4" />,
  scroll: <Scroll className="w-4 h-4" />,
  accessory: <Gem className="w-4 h-4" />,
  material: <Box className="w-4 h-4" />,
  all: <Package className="w-4 h-4" />,
};

// Shop type icons
const SHOP_TYPE_ICONS: Record<string, React.ReactNode> = {
  blacksmith: <Sword className="w-6 h-6" />,
  potion: <FlaskConical className="w-6 h-6" />,
  general: <Store className="w-6 h-6" />,
  magic: <Scroll className="w-6 h-6" />,
  armor: <Shield className="w-6 h-6" />,
  jeweler: <Gem className="w-6 h-6" />,
};

type TabType = "buy" | "sell" | "buyback";

interface ShopItem {
  itemId: Id<"items">;
  name: string;
  type: string;
  category: string;
  rarity: string;
  description?: string;
  effects?: string;
  textColor?: string;
  stock: number;
  price: number;
  inStock: boolean;
}

interface BuybackItem {
  index: number;
  itemId: Id<"items">;
  name: string;
  type: string;
  rarity: string;
  textColor?: string;
  buybackPrice: number;
  expiresAt?: number;
  timeRemaining?: number;
}

interface PlayerInventoryItem {
  itemId: Id<"items">;
  name: string;
  type: string;
  rarity: string;
  description?: string;
  effects?: string;
  textColor?: string;
  quantity: number;
}

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: Id<"campaigns">;
  shopId: Id<"shops">;
  playerId: string;
  playerGold: number;
  onTransactionComplete?: () => void;
}

export function ShopModal({
  isOpen,
  onClose,
  campaignId,
  shopId,
  playerId,
  playerGold,
  onTransactionComplete,
}: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("buy");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [selectedSellItem, setSelectedSellItem] = useState<PlayerInventoryItem | null>(null);
  const [selectedBuybackItem, setSelectedBuybackItem] = useState<BuybackItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Queries
  const shopDetails = useQuery(api.shops.getShopDetails, { shopId, playerId });
  const playerInventory = useQuery(api.inventory.getPlayerInventory, { campaignId, playerId });

  // Mutations
  const buyFromShop = useMutation(api.shops.buyFromShop);
  const sellToShop = useMutation(api.shops.sellToShop);
  const buybackFromShop = useMutation(api.shops.buybackFromShop);

  // Get unique categories from shop inventory
  const categories = useMemo(() => {
    if (!shopDetails?.inventoryWithDetails) return ["all"];
    const cats = new Set<string>(["all"]);
    shopDetails.inventoryWithDetails.forEach((item) => {
      if (item?.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [shopDetails?.inventoryWithDetails]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (!shopDetails?.inventoryWithDetails) return [];
    if (selectedCategory === "all") return shopDetails.inventoryWithDetails.filter(Boolean);
    return shopDetails.inventoryWithDetails.filter(
      (item) => item?.category === selectedCategory
    );
  }, [shopDetails?.inventoryWithDetails, selectedCategory]);

  // Handle buy
  const handleBuy = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    setMessage(null);

    try {
      const result = await buyFromShop({
        campaignId,
        shopId,
        playerId,
        itemId: selectedItem.itemId,
        quantity,
      });

      if (result.success) {
        setMessage({ text: result.message, type: "success" });
        setSelectedItem(null);
        setQuantity(1);
        onTransactionComplete?.();
      } else {
        setMessage({ text: result.message, type: "error" });
      }
    } catch (error) {
      console.error("Buy failed:", error);
      setMessage({ text: "Transaction failed", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle sell
  const handleSell = async () => {
    if (!selectedSellItem) return;
    setIsProcessing(true);
    setMessage(null);

    try {
      const result = await sellToShop({
        campaignId,
        shopId,
        playerId,
        itemId: selectedSellItem.itemId,
        quantity,
      });

      if (result.success) {
        setMessage({ text: result.message, type: "success" });
        setSelectedSellItem(null);
        setQuantity(1);
        onTransactionComplete?.();
      } else {
        setMessage({ text: result.message, type: "error" });
      }
    } catch (error) {
      console.error("Sell failed:", error);
      setMessage({ text: "Transaction failed", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle buyback
  const handleBuyback = async () => {
    if (!selectedBuybackItem) return;
    setIsProcessing(true);
    setMessage(null);

    try {
      const result = await buybackFromShop({
        shopId,
        playerId,
        buybackIndex: selectedBuybackItem.index,
      });

      if (result.success) {
        setMessage({ text: result.message, type: "success" });
        setSelectedBuybackItem(null);
        onTransactionComplete?.();
      } else {
        setMessage({ text: result.message, type: "error" });
      }
    } catch (error) {
      console.error("Buyback failed:", error);
      setMessage({ text: "Transaction failed", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Format time remaining for buyback
  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
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
        className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-400">
              {SHOP_TYPE_ICONS[shopDetails?.type || "general"] || <Store className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{shopDetails?.name || "Shop"}</h2>
              <p className="text-sm text-neutral-400">
                {shopDetails?.shopkeeper?.name
                  ? `Run by ${shopDetails.shopkeeper.name}`
                  : shopDetails?.type || "General Store"}
              </p>
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

        {/* Tabs */}
        <div className="px-6 py-2 border-b border-neutral-800 flex gap-2">
          <button
            onClick={() => {
              setActiveTab("buy");
              setSelectedItem(null);
              setSelectedSellItem(null);
              setSelectedBuybackItem(null);
              setQuantity(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === "buy"
                ? "bg-green-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Buy
          </button>
          <button
            onClick={() => {
              setActiveTab("sell");
              setSelectedItem(null);
              setSelectedSellItem(null);
              setSelectedBuybackItem(null);
              setQuantity(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === "sell"
                ? "bg-blue-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Sell
          </button>
          <button
            onClick={() => {
              setActiveTab("buyback");
              setSelectedItem(null);
              setSelectedSellItem(null);
              setSelectedBuybackItem(null);
              setQuantity(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === "buyback"
                ? "bg-purple-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Buyback
            {shopDetails?.buybackItems && shopDetails.buybackItems.length > 0 && (
              <span className="text-xs bg-purple-500 px-1.5 rounded-full">
                {shopDetails.buybackItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`px-6 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-900/20 text-green-400"
                  : "bg-red-900/20 text-red-400"
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Filter (Buy tab only) */}
        {activeTab === "buy" && categories.length > 1 && (
          <div className="px-6 py-2 flex gap-2 overflow-x-auto border-b border-neutral-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-amber-600 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                }`}
              >
                {CATEGORY_ICONS[cat] || <Tag className="w-3 h-3" />}
                <span className="capitalize">{cat}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* BUY TAB */}
          {activeTab === "buy" && (
            <>
              {!shopDetails ? (
                <div className="text-center py-8 text-neutral-500">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No items available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => item && (
                    <button
                      key={item.itemId}
                      onClick={() => {
                        setSelectedItem(item as ShopItem);
                        setQuantity(1);
                      }}
                      disabled={!item.inStock}
                      className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 text-left ${
                        selectedItem?.itemId === item.itemId
                          ? "bg-neutral-700 border-neutral-500"
                          : item.inStock
                          ? "bg-neutral-800/50 border-neutral-700/50 hover:border-neutral-600"
                          : "bg-neutral-800/30 border-neutral-700/30 opacity-50 cursor-not-allowed"
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
                        {CATEGORY_ICONS[item.category] || (
                          <Package
                            className="w-5 h-5"
                            style={{
                              color:
                                item.textColor ||
                                RARITY_COLORS[item.rarity.toLowerCase()] ||
                                RARITY_COLORS.common,
                            }}
                          />
                        )}
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
                      <div className="text-right">
                        <div
                          className={`flex items-center gap-1 font-semibold ${
                            playerGold >= item.price ? "text-amber-400" : "text-red-400"
                          }`}
                        >
                          <Coins className="w-4 h-4" />
                          {item.price}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {item.stock === -1 ? "Unlimited" : `${item.stock} left`}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* SELL TAB */}
          {activeTab === "sell" && (
            <>
              {!playerInventory ? (
                <div className="text-center py-8 text-neutral-500">Loading...</div>
              ) : playerInventory.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Your inventory is empty</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {playerInventory.map((item) => {
                    if (!item) return null;
                    // Calculate sell price (50% of base)
                    const basePrices: Record<string, number> = {
                      common: 10,
                      uncommon: 25,
                      rare: 75,
                      epic: 200,
                      legendary: 500,
                      mythic: 1000,
                    };
                    const sellPrice = Math.floor(
                      (basePrices[item.rarity?.toLowerCase() || "common"] || 10) *
                        (shopDetails?.basePriceModifier || 1) *
                        0.5
                    );

                    return (
                      <button
                        key={item.itemId}
                        onClick={() => {
                          setSelectedSellItem({
                            itemId: item.itemId,
                            name: item.name || "Unknown Item",
                            type: item.type || "item",
                            rarity: item.rarity || "common",
                            description: item.description,
                            effects: item.effects,
                            textColor: item.textColor,
                            quantity: item.quantity,
                          });
                          setQuantity(1);
                        }}
                        className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 text-left ${
                          selectedSellItem?.itemId === item.itemId
                            ? "bg-neutral-700 border-neutral-500"
                            : "bg-neutral-800/50 border-neutral-700/50 hover:border-neutral-600"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${
                              item.textColor ||
                              RARITY_COLORS[(item.rarity || "common").toLowerCase()] ||
                              RARITY_COLORS.common
                            }20`,
                          }}
                        >
                          <Package
                            className="w-5 h-5"
                            style={{
                              color:
                                item.textColor ||
                                RARITY_COLORS[(item.rarity || "common").toLowerCase()] ||
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
                                RARITY_COLORS[(item.rarity || "common").toLowerCase()] ||
                                RARITY_COLORS.common,
                            }}
                          >
                            {item.name}
                          </div>
                          <div className="text-xs text-neutral-500 capitalize truncate">
                            {item.rarity} {item.type} x{item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-blue-400">
                          <Coins className="w-4 h-4" />
                          {sellPrice}
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* BUYBACK TAB */}
          {activeTab === "buyback" && (
            <>
              {!shopDetails?.buybackItems || shopDetails.buybackItems.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No items to buy back</p>
                  <p className="text-xs mt-1">Items you sell will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shopDetails.buybackItems.map((item) => (
                    <button
                      key={item.index}
                      onClick={() => setSelectedBuybackItem(item)}
                      className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 text-left ${
                        selectedBuybackItem?.index === item.index
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
                      {item.timeRemaining && (
                        <div className="flex items-center gap-1 text-xs text-orange-400">
                          <Clock className="w-3 h-3" />
                          {formatTimeRemaining(item.timeRemaining)}
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-1 font-semibold ${
                          playerGold >= item.buybackPrice ? "text-purple-400" : "text-red-400"
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        {item.buybackPrice}
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Panel */}
        <AnimatePresence>
          {/* Buy Panel */}
          {activeTab === "buy" && selectedItem && (
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
                    <p className="text-sm text-neutral-400 mt-1">{selectedItem.effects}</p>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              {selectedItem.stock !== 1 && (
                <div className="flex items-center justify-between mb-4 p-3 bg-neutral-900 rounded-lg">
                  <span className="text-sm text-neutral-400">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{quantity}</span>
                    <button
                      onClick={() =>
                        setQuantity(
                          Math.min(
                            selectedItem.stock === -1 ? 99 : selectedItem.stock,
                            quantity + 1
                          )
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Coins className="w-4 h-4" />
                    {selectedItem.price * quantity}
                  </div>
                </div>
              )}

              <button
                onClick={handleBuy}
                disabled={isProcessing || playerGold < selectedItem.price * quantity}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  playerGold >= selectedItem.price * quantity
                    ? "bg-green-600 hover:bg-green-500 disabled:bg-green-800"
                    : "bg-neutral-700 cursor-not-allowed text-neutral-500"
                }`}
              >
                {isProcessing ? (
                  "Processing..."
                ) : playerGold >= selectedItem.price * quantity ? (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Buy for {selectedItem.price * quantity} gold
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

          {/* Sell Panel */}
          {activeTab === "sell" && selectedSellItem && (
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
                      selectedSellItem.textColor ||
                      RARITY_COLORS[selectedSellItem.rarity.toLowerCase()] ||
                      RARITY_COLORS.common
                    }20`,
                  }}
                >
                  <Package
                    className="w-7 h-7"
                    style={{
                      color:
                        selectedSellItem.textColor ||
                        RARITY_COLORS[selectedSellItem.rarity.toLowerCase()] ||
                        RARITY_COLORS.common,
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h4
                    className="font-bold text-lg"
                    style={{
                      color:
                        selectedSellItem.textColor ||
                        RARITY_COLORS[selectedSellItem.rarity.toLowerCase()] ||
                        RARITY_COLORS.common,
                    }}
                  >
                    {selectedSellItem.name}
                  </h4>
                  <p className="text-xs text-neutral-400 capitalize">
                    {selectedSellItem.rarity} {selectedSellItem.type} (You have{" "}
                    {selectedSellItem.quantity})
                  </p>
                </div>
              </div>

              {/* Quantity Selector */}
              {selectedSellItem.quantity > 1 && (
                <div className="flex items-center justify-between mb-4 p-3 bg-neutral-900 rounded-lg">
                  <span className="text-sm text-neutral-400">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{quantity}</span>
                    <button
                      onClick={() =>
                        setQuantity(Math.min(selectedSellItem.quantity, quantity + 1))
                      }
                      className="w-8 h-8 rounded-lg bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleSell}
                disabled={isProcessing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {isProcessing ? (
                  "Processing..."
                ) : (
                  <>
                    <ArrowLeftRight className="w-5 h-5" />
                    Sell {quantity > 1 ? `${quantity}x ` : ""}for{" "}
                    {Math.floor(
                      ((RARITY_COLORS[selectedSellItem.rarity.toLowerCase()]
                        ? {
                            common: 10,
                            uncommon: 25,
                            rare: 75,
                            epic: 200,
                            legendary: 500,
                            mythic: 1000,
                          }[selectedSellItem.rarity.toLowerCase()] || 10
                        : 10) *
                        (shopDetails?.basePriceModifier || 1) *
                        0.5) *
                        quantity
                    )}{" "}
                    gold
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Buyback Panel */}
          {activeTab === "buyback" && selectedBuybackItem && (
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
                      selectedBuybackItem.textColor ||
                      RARITY_COLORS[selectedBuybackItem.rarity.toLowerCase()] ||
                      RARITY_COLORS.common
                    }20`,
                  }}
                >
                  <Package
                    className="w-7 h-7"
                    style={{
                      color:
                        selectedBuybackItem.textColor ||
                        RARITY_COLORS[selectedBuybackItem.rarity.toLowerCase()] ||
                        RARITY_COLORS.common,
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h4
                    className="font-bold text-lg"
                    style={{
                      color:
                        selectedBuybackItem.textColor ||
                        RARITY_COLORS[selectedBuybackItem.rarity.toLowerCase()] ||
                        RARITY_COLORS.common,
                    }}
                  >
                    {selectedBuybackItem.name}
                  </h4>
                  <p className="text-xs text-neutral-400 capitalize">
                    {selectedBuybackItem.rarity} {selectedBuybackItem.type}
                  </p>
                  {selectedBuybackItem.timeRemaining && (
                    <p className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires in {formatTimeRemaining(selectedBuybackItem.timeRemaining)}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleBuyback}
                disabled={isProcessing || playerGold < selectedBuybackItem.buybackPrice}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  playerGold >= selectedBuybackItem.buybackPrice
                    ? "bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800"
                    : "bg-neutral-700 cursor-not-allowed text-neutral-500"
                }`}
              >
                {isProcessing ? (
                  "Processing..."
                ) : playerGold >= selectedBuybackItem.buybackPrice ? (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    Buy back for {selectedBuybackItem.buybackPrice} gold
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
