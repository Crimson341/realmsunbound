"use client";

import { useState } from "react";
import { X, Navigation, ArrowRight, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface LocationData {
  _id: Id<"locations">;
  name: string;
  type: string;
  description: string;
  shopCount?: number;
  hasShops?: boolean;
}

interface TravelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  from: LocationData | null;
  destination: LocationData | null;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

// Color mapping for location types (same as MapNode)
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

export function TravelConfirmModal({
  isOpen,
  onClose,
  from,
  destination,
  onConfirm,
  isLoading = false,
}: TravelConfirmModalProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen || !destination || !from) return null;

  const loading = isLoading || confirming;
  const destColor = getTypeColor(destination.type);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-medium text-slate-300">Travel</h2>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Travel Route */}
          <div className="flex items-center justify-center gap-4 mb-5">
            {/* From */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full opacity-50"
                style={{ backgroundColor: getTypeColor(from.type) }}
              />
              <span className="text-xs text-slate-500">{from.name}</span>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-4 h-4 text-slate-600" />

            {/* To */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-slate-950"
                style={{ backgroundColor: destColor, ['--tw-ring-color' as string]: destColor }}
              />
              <span className="text-xs text-slate-300 font-medium">{destination.name}</span>
            </div>
          </div>

          {/* Destination Description */}
          <div className="bg-slate-900/50 rounded-lg p-3 mb-5 border border-slate-800/50">
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
              {destination.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-400 rounded-lg transition-colors text-xs font-medium border border-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Traveling...
                </>
              ) : (
                <>
                  <Navigation className="w-3 h-3" />
                  Go
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
