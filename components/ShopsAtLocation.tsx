"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AnimatePresence } from "framer-motion";
import {
  Store,
  Sword,
  FlaskConical,
  Shield,
  Scroll,
  Gem,
  Package,
  Lock,
} from "lucide-react";
import { ShopModal } from "./ShopModal";

// Shop type icons
const SHOP_TYPE_ICONS: Record<string, React.ReactNode> = {
  blacksmith: <Sword className="w-4 h-4" />,
  potion: <FlaskConical className="w-4 h-4" />,
  general: <Store className="w-4 h-4" />,
  magic: <Scroll className="w-4 h-4" />,
  armor: <Shield className="w-4 h-4" />,
  jeweler: <Gem className="w-4 h-4" />,
  tailor: <Package className="w-4 h-4" />,
  provisioner: <Package className="w-4 h-4" />,
};

// Shop type colors
const SHOP_TYPE_COLORS: Record<string, string> = {
  blacksmith: "amber",
  potion: "emerald",
  general: "blue",
  magic: "purple",
  armor: "slate",
  jeweler: "pink",
  tailor: "cyan",
  provisioner: "orange",
};

interface Shop {
  id: Id<"shops">;
  name: string;
  description: string;
  type: string;
  itemCount: number;
  isOpen: boolean;
  shopkeeper: {
    id: Id<"npcs">;
    name: string;
    role: string;
  } | null;
}

interface ShopsAtLocationProps {
  campaignId: Id<"campaigns">;
  locationId: Id<"locations"> | null;
  playerId: string;
  playerGold: number;
  onTransactionComplete?: () => void;
}

export function ShopsAtLocation({
  campaignId,
  locationId,
  playerId,
  playerGold,
  onTransactionComplete,
}: ShopsAtLocationProps) {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  const shops = useQuery(
    api.shops.getShopsAtLocation,
    locationId ? { campaignId, locationId } : "skip"
  );

  if (!shops || shops.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
          <Store className="w-3 h-3" />
          Shops
        </h3>
        {shops.map((shop) => {
          const color = SHOP_TYPE_COLORS[shop.type] || "amber";
          const Icon = SHOP_TYPE_ICONS[shop.type] || <Store className="w-4 h-4" />;

          return (
            <button
              key={shop.id}
              onClick={() => shop.isOpen && setSelectedShop(shop)}
              disabled={!shop.isOpen}
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left ${
                shop.isOpen
                  ? `bg-${color}-900/10 hover:bg-${color}-900/20 border border-${color}-800/30`
                  : "bg-neutral-900/50 border border-neutral-800/30 opacity-60 cursor-not-allowed"
              }`}
              style={{
                backgroundColor: shop.isOpen ? `var(--${color}-900-10, rgba(120, 53, 15, 0.1))` : undefined,
              }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  shop.isOpen
                    ? `bg-${color}-900/30 text-${color}-400`
                    : "bg-neutral-800 text-neutral-500"
                }`}
                style={{
                  backgroundColor: shop.isOpen ? `rgba(180, 83, 9, 0.3)` : undefined,
                  color: shop.isOpen ? `rgb(251, 191, 36)` : undefined,
                }}
              >
                {shop.isOpen ? Icon : <Lock className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${
                    shop.isOpen ? "text-amber-300" : "text-neutral-500"
                  }`}
                >
                  {shop.name}
                </div>
                <div className="text-xs text-neutral-500">
                  {shop.shopkeeper ? shop.shopkeeper.name : shop.type}
                </div>
              </div>
              <div className="text-xs text-neutral-400">
                {shop.isOpen ? `${shop.itemCount} items` : "Closed"}
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedShop && (
          <ShopModal
            isOpen={true}
            onClose={() => setSelectedShop(null)}
            campaignId={campaignId}
            shopId={selectedShop.id}
            playerId={playerId}
            playerGold={playerGold}
            onTransactionComplete={() => {
              onTransactionComplete?.();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
