"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export interface MapNodeData {
  label: string;
  type: string;
  shopCount: number;
  hasShops: boolean;
  isCurrent: boolean;
  isReachable: boolean;
  isSelected?: boolean;
}

// Color mapping for location types
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

function MapNodeComponent({ data, selected }: NodeProps<MapNodeData>) {
  const { label, type, isCurrent, isSelected } = data;
  const color = getTypeColor(type);
  const isHighlighted = selected || isSelected;

  return (
    <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
      {/* Invisible handles for edge connections */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />

      {/* The dot */}
      <div className="relative">
        {/* Pulse for current location */}
        {isCurrent && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: color, opacity: 0.4, transform: 'scale(2)' }}
          />
        )}

        {/* Selection ring */}
        {isHighlighted && !isCurrent && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px solid ${color}`,
              transform: 'scale(2)',
              opacity: 0.6
            }}
          />
        )}

        {/* Main dot */}
        <div
          className={`
            relative z-10 w-4 h-4 rounded-full transition-transform duration-150
            group-hover:scale-125
            ${isCurrent ? 'w-5 h-5' : ''}
          `}
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Label */}
      <span
        className={`
          text-[11px] font-medium text-center max-w-[80px] leading-tight
          transition-colors duration-150
          ${isCurrent ? 'text-white' : isHighlighted ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}
        `}
      >
        {label}
      </span>
    </div>
  );
}

export const MapNode = memo(MapNodeComponent);
