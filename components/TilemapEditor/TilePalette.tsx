'use client';

import React from 'react';
import { TERRAIN, TILE_COLORS } from '@/game/ai-canvas/types';

interface TilePaletteProps {
  selectedTile: number;
  onSelectTile: (tileId: number) => void;
}

// Organize tiles by category
const TILE_CATEGORIES = {
  'Floors': [
    { id: TERRAIN.FLOOR_STONE, name: 'Stone Floor' },
    { id: TERRAIN.FLOOR_WOOD, name: 'Wood Floor' },
    { id: TERRAIN.FLOOR_DIRT, name: 'Dirt' },
    { id: TERRAIN.FLOOR_GRASS, name: 'Grass' },
    { id: TERRAIN.FLOOR_SAND, name: 'Sand' },
    { id: TERRAIN.FLOOR_COBBLE, name: 'Cobblestone' },
  ],
  'Walls': [
    { id: TERRAIN.WALL_STONE, name: 'Stone Wall' },
    { id: TERRAIN.WALL_BRICK, name: 'Brick Wall' },
    { id: TERRAIN.WALL_CAVE, name: 'Cave Wall' },
    { id: TERRAIN.WALL_WOOD, name: 'Wood Wall' },
  ],
  'Doors & Gates': [
    { id: TERRAIN.DOOR_CLOSED, name: 'Closed Door' },
    { id: TERRAIN.DOOR_OPEN, name: 'Open Door' },
    { id: TERRAIN.DOOR_LOCKED, name: 'Locked Door' },
    { id: TERRAIN.GATE_CLOSED, name: 'Closed Gate' },
    { id: TERRAIN.GATE_OPEN, name: 'Open Gate' },
  ],
  'Water & Hazards': [
    { id: TERRAIN.WATER_SHALLOW, name: 'Shallow Water' },
    { id: TERRAIN.WATER_DEEP, name: 'Deep Water' },
    { id: TERRAIN.LAVA, name: 'Lava' },
    { id: TERRAIN.ICE, name: 'Ice' },
    { id: TERRAIN.PIT, name: 'Pit' },
  ],
  'Special': [
    { id: TERRAIN.STAIRS_DOWN, name: 'Stairs Down' },
    { id: TERRAIN.STAIRS_UP, name: 'Stairs Up' },
    { id: TERRAIN.BRIDGE, name: 'Bridge' },
    { id: TERRAIN.VOID, name: 'Void/Empty' },
  ],
};

export function TilePalette({ selectedTile, onSelectTile }: TilePaletteProps) {
  return (
    <div className="space-y-4">
      {Object.entries(TILE_CATEGORIES).map(([category, tiles]) => (
        <div key={category}>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            {category}
          </h3>
          <div className="grid grid-cols-4 gap-1">
            {tiles.map((tile) => {
              const color = TILE_COLORS[tile.id] || 0x000000;
              const hexColor = `#${color.toString(16).padStart(6, '0')}`;

              return (
                <button
                  key={tile.id}
                  onClick={() => onSelectTile(tile.id)}
                  className={`
                    aspect-square rounded border-2 transition-all
                    ${selectedTile === tile.id
                      ? 'border-amber-500 ring-2 ring-amber-500/50'
                      : 'border-zinc-700 hover:border-zinc-500'
                    }
                  `}
                  style={{ backgroundColor: hexColor }}
                  title={tile.name}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TilePalette;
