"use client";

import { useState, useCallback } from "react";
import { X, Map, Navigation, Store, Loader2, MapPin, Users, Skull } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export interface WorldMapLocation {
  _id: Id<"locations">;
  name: string;
  type: string;
  description: string;
  neighbors: Id<"locations">[];
  hasShops?: boolean;
  shopCount?: number;
  npcCount?: number;
  monsterCount?: number;
}

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: Id<"campaigns">;
  locations: WorldMapLocation[];
  currentLocationId: Id<"locations"> | null;
  onTravelRequest: (destination: WorldMapLocation) => void;
}

// Color mapping
const typeColors: Record<string, string> = {
  town: "#10b981",
  city: "#3b82f6",
  village: "#22c55e",
  capital: "#f59e0b",
  castle: "#8b5cf6",
  fortress: "#64748b",
  forest: "#16a34a",
  mountain: "#78716c",
  dungeon: "#ef4444",
  cave: "#71717a",
  ruins: "#f97316",
  temple: "#eab308",
  swamp: "#84cc16",
  desert: "#fbbf24",
  coast: "#06b6d4",
  lake: "#0ea5e9",
  default: "#94a3b8",
};

function getTypeColor(type: string): string {
  return typeColors[type.toLowerCase()] || typeColors.default;
}

export function WorldMapModal({
  isOpen,
  onClose,
  locations,
  currentLocationId,
  onTravelRequest,
}: WorldMapModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<WorldMapLocation | null>(null);
  const [isTraveling, setIsTraveling] = useState(false);

  const currentLocation = locations.find((l) => l._id === currentLocationId);

  const isSelectedReachable = selectedLocation
    ? currentLocation?.neighbors.includes(selectedLocation._id) ?? false
    : false;
  const isSelectedCurrent = selectedLocation?._id === currentLocationId;

  const handleLocationSelect = useCallback((location: WorldMapLocation) => {
    setSelectedLocation(location);
  }, []);

  const handleTravel = async () => {
    if (!selectedLocation || isSelectedCurrent || !isSelectedReachable) return;

    setIsTraveling(true);
    try {
      await onTravelRequest(selectedLocation);
      setSelectedLocation(null);
      onClose();
    } finally {
      setIsTraveling(false);
    }
  };

  if (!isOpen) return null;

  // Sort locations: current first, then reachable, then others
  const sortedLocations = [...locations].sort((a, b) => {
    if (a._id === currentLocationId) return -1;
    if (b._id === currentLocationId) return 1;
    const aReachable = currentLocation?.neighbors.includes(a._id) ?? false;
    const bReachable = currentLocation?.neighbors.includes(b._id) ?? false;
    if (aReachable && !bReachable) return -1;
    if (!aReachable && bReachable) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[95vw] h-[90vh] max-w-4xl bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex">
        {/* Location List */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              <Map className="w-5 h-5 text-slate-500" />
              <div>
                <h2 className="text-sm font-medium text-slate-300">World Map</h2>
                {currentLocation && (
                  <p className="text-xs text-slate-500">
                    You are at <span className="text-emerald-400">{currentLocation.name}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Location List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sortedLocations.map((location) => {
              const isCurrent = location._id === currentLocationId;
              const isReachable = currentLocation?.neighbors.includes(location._id) ?? false;
              const isSelected = selectedLocation?._id === location._id;

              return (
                <button
                  key={location._id}
                  onClick={() => handleLocationSelect(location)}
                  className={`
                    w-full p-4 rounded-xl border text-left transition-all
                    ${isSelected
                      ? "bg-slate-800 border-slate-600"
                      : isCurrent
                        ? "bg-emerald-950/30 border-emerald-800/50 hover:bg-emerald-950/50"
                        : isReachable
                          ? "bg-slate-900/50 border-slate-700/50 hover:bg-slate-800/50"
                          : "bg-slate-900/30 border-slate-800/30 hover:bg-slate-900/50 opacity-60"
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: getTypeColor(location.type) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white truncate">{location.name}</h3>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded">
                            HERE
                          </span>
                        )}
                        {!isCurrent && isReachable && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded">
                            NEARBY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 capitalize">{location.type}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{location.description}</p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-2">
                        {location.hasShops && location.shopCount && location.shopCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400">
                            <Store className="w-3 h-3" />
                            {location.shopCount}
                          </span>
                        )}
                        {location.npcCount && location.npcCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-400">
                            <Users className="w-3 h-3" />
                            {location.npcCount}
                          </span>
                        )}
                        {location.monsterCount && location.monsterCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-red-400">
                            <Skull className="w-3 h-3" />
                            {location.monsterCount}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isCurrent && isReachable && (
                      <Navigation className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        <div
          className={`
            w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col
            transition-all duration-200
            ${selectedLocation ? "translate-x-0" : "translate-x-full w-0 border-0 overflow-hidden"}
          `}
        >
          {selectedLocation && (
            <>
              {/* Location Header */}
              <div className="p-4 border-b border-slate-800/50">
                <div className="flex items-start gap-3">
                  <div
                    className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
                    style={{ backgroundColor: getTypeColor(selectedLocation.type) }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{selectedLocation.name}</h3>
                    <p className="text-xs text-slate-500 capitalize">{selectedLocation.type}</p>
                  </div>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="p-1 hover:bg-slate-800 rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="flex-1 p-4 overflow-y-auto">
                <p className="text-sm text-slate-400 leading-relaxed">
                  {selectedLocation.description}
                </p>

                {/* Connected Locations */}
                {selectedLocation.neighbors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                      Connected To
                    </h4>
                    <div className="space-y-1">
                      {selectedLocation.neighbors.map((neighborId) => {
                        const neighbor = locations.find((l) => l._id === neighborId);
                        if (!neighbor) return null;
                        return (
                          <button
                            key={neighborId}
                            onClick={() => handleLocationSelect(neighbor)}
                            className="w-full text-left px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          >
                            {neighbor.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="mt-4 space-y-2">
                  {selectedLocation.hasShops && selectedLocation.shopCount && selectedLocation.shopCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <Store className="w-3.5 h-3.5" />
                      <span>
                        {selectedLocation.shopCount} {selectedLocation.shopCount === 1 ? "shop" : "shops"} here
                      </span>
                    </div>
                  )}
                  {selectedLocation.npcCount && selectedLocation.npcCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-blue-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {selectedLocation.npcCount} {selectedLocation.npcCount === 1 ? "NPC" : "NPCs"} here
                      </span>
                    </div>
                  )}
                  {selectedLocation.monsterCount && selectedLocation.monsterCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <Skull className="w-3.5 h-3.5" />
                      <span>
                        {selectedLocation.monsterCount} {selectedLocation.monsterCount === 1 ? "monster" : "monsters"} nearby
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  {isSelectedCurrent ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>You are here</span>
                    </div>
                  ) : isSelectedReachable ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Connected - you can travel here</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Not directly connected</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="p-4 border-t border-slate-800/50">
                {isSelectedCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-slate-800 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed"
                  >
                    Already Here
                  </button>
                ) : isSelectedReachable ? (
                  <button
                    onClick={handleTravel}
                    disabled={isTraveling}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isTraveling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Traveling...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        Travel Here
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 bg-slate-800 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed"
                  >
                    Too Far - Find a Path
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
