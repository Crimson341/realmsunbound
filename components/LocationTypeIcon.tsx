/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import {
  Home,
  Building2,
  Skull,
  Trees,
  Castle,
  Mountain,
  Waves,
  Tent,
  Church,
  Landmark,
  Warehouse,
  Store,
  Swords,
  MapPin,
  type LucideIcon,
} from "lucide-react";

// Location type to icon and color mapping
const locationTypeConfig: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  // Settlements
  town: { icon: Home, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  city: { icon: Building2, color: "text-blue-400", bgColor: "bg-blue-500/20" },
  village: { icon: Home, color: "text-green-400", bgColor: "bg-green-500/20" },
  capital: { icon: Landmark, color: "text-amber-400", bgColor: "bg-amber-500/20" },

  // Fortifications
  castle: { icon: Castle, color: "text-purple-400", bgColor: "bg-purple-500/20" },
  fortress: { icon: Castle, color: "text-slate-400", bgColor: "bg-slate-500/20" },
  stronghold: { icon: Castle, color: "text-red-400", bgColor: "bg-red-500/20" },

  // Natural
  forest: { icon: Trees, color: "text-green-500", bgColor: "bg-green-500/20" },
  mountain: { icon: Mountain, color: "text-stone-400", bgColor: "bg-stone-500/20" },
  lake: { icon: Waves, color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  swamp: { icon: Waves, color: "text-lime-600", bgColor: "bg-lime-600/20" },
  desert: { icon: Mountain, color: "text-yellow-500", bgColor: "bg-yellow-500/20" },
  plains: { icon: MapPin, color: "text-emerald-300", bgColor: "bg-emerald-300/20" },
  coast: { icon: Waves, color: "text-blue-300", bgColor: "bg-blue-300/20" },

  // Dangerous
  dungeon: { icon: Skull, color: "text-red-500", bgColor: "bg-red-500/20" },
  cave: { icon: Mountain, color: "text-zinc-400", bgColor: "bg-zinc-500/20" },
  ruins: { icon: Landmark, color: "text-orange-400", bgColor: "bg-orange-500/20" },
  graveyard: { icon: Skull, color: "text-gray-400", bgColor: "bg-gray-500/20" },
  crypt: { icon: Skull, color: "text-violet-400", bgColor: "bg-violet-500/20" },

  // Buildings
  temple: { icon: Church, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  church: { icon: Church, color: "text-white", bgColor: "bg-white/20" },
  tavern: { icon: Store, color: "text-amber-500", bgColor: "bg-amber-500/20" },
  shop: { icon: Store, color: "text-teal-400", bgColor: "bg-teal-500/20" },
  warehouse: { icon: Warehouse, color: "text-gray-400", bgColor: "bg-gray-500/20" },
  arena: { icon: Swords, color: "text-red-400", bgColor: "bg-red-500/20" },

  // Camps
  camp: { icon: Tent, color: "text-orange-400", bgColor: "bg-orange-500/20" },
  outpost: { icon: Tent, color: "text-amber-400", bgColor: "bg-amber-500/20" },

  // Default
  default: { icon: MapPin, color: "text-gray-400", bgColor: "bg-gray-500/20" },
};

interface LocationTypeIconProps {
  type: string;
  size?: "sm" | "md" | "lg";
  showBackground?: boolean;
  customIcon?: string; // Reserved for future custom icon support
  className?: string;
}

export function LocationTypeIcon({
  type,
  size = "md",
  showBackground = false,
  customIcon: _customIcon,
  className = "",
}: LocationTypeIconProps) {
  // Normalize type to lowercase for matching
  const normalizedType = type.toLowerCase().trim();

  // Find matching config or use default
  const config = locationTypeConfig[normalizedType] || locationTypeConfig.default;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const bgSizeClasses = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };

  const Icon = config.icon;

  if (showBackground) {
    return (
      <div className={`rounded-full ${config.bgColor} ${bgSizeClasses[size]} ${className}`}>
        <Icon className={`${sizeClasses[size]} ${config.color}`} />
      </div>
    );
  }

  return <Icon className={`${sizeClasses[size]} ${config.color} ${className}`} />;
}

// Export the config for use in other components
export function getLocationTypeConfig(type: string) {
  const normalizedType = type.toLowerCase().trim();
  return locationTypeConfig[normalizedType] || locationTypeConfig.default;
}

// Get all available location types
export function getAvailableLocationTypes() {
  return Object.keys(locationTypeConfig).filter((key) => key !== "default");
}
