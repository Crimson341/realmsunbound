'use client';

import React from 'react';
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  MousePointer2,
  MapPin,
  Move,
} from 'lucide-react';

export type Tool = 'paint' | 'erase' | 'fill' | 'select' | 'spawn' | 'move';

interface ToolBarProps {
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
}

const TOOLS: { id: Tool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
  { id: 'paint', icon: <Paintbrush className="w-4 h-4" />, label: 'Paint', shortcut: 'P' },
  { id: 'fill', icon: <PaintBucket className="w-4 h-4" />, label: 'Fill', shortcut: 'F' },
  { id: 'erase', icon: <Eraser className="w-4 h-4" />, label: 'Erase', shortcut: 'E' },
  { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select', shortcut: 'V' },
  { id: 'spawn', icon: <MapPin className="w-4 h-4" />, label: 'Set Spawn', shortcut: 'S' },
];

export function ToolBar({ activeTool, onSelectTool }: ToolBarProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        Tools
      </h3>
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`
              p-2 rounded transition-all flex items-center gap-2
              ${activeTool === tool.id
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }
            `}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-600">
        {activeTool === 'paint' && 'Click or drag to paint tiles/place items'}
        {activeTool === 'fill' && 'Click to fill connected area with selected tile'}
        {activeTool === 'erase' && 'Click or drag to erase tiles'}
        {activeTool === 'select' && 'Click to select placed items'}
        {activeTool === 'spawn' && 'Click to set player spawn point'}
      </p>
    </div>
  );
}

export default ToolBar;
