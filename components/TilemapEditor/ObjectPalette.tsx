'use client';

import React from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { OBJECTS } from '@/game/ai-canvas/types';
import { getObjectIcon } from './ObjectIcons';

interface ShopOption {
  _id: Id<"shops">;
  name: string;
  type: string;
}

interface ObjectPaletteProps {
  shops: ShopOption[];
  selectedObject: number;
  onSelectObject: (objectType: number) => void;
}

// Organize objects by category
const OBJECT_CATEGORIES = {
  'Containers': [
    { id: OBJECTS.CHEST_CLOSED, name: 'Chest (Closed)' },
    { id: OBJECTS.CHEST_OPEN, name: 'Chest (Open)' },
    { id: OBJECTS.CHEST_LOCKED, name: 'Chest (Locked)' },
    { id: OBJECTS.BARREL, name: 'Barrel' },
    { id: OBJECTS.CRATE, name: 'Crate' },
    { id: OBJECTS.URN, name: 'Urn' },
    { id: OBJECTS.SACK, name: 'Sack' },
  ],
  'Furniture': [
    { id: OBJECTS.TABLE, name: 'Table' },
    { id: OBJECTS.CHAIR, name: 'Chair' },
    { id: OBJECTS.BED, name: 'Bed' },
    { id: OBJECTS.BOOKSHELF, name: 'Bookshelf' },
    { id: OBJECTS.THRONE, name: 'Throne' },
  ],
  'Light Sources': [
    { id: OBJECTS.TORCH_WALL, name: 'Wall Torch' },
    { id: OBJECTS.TORCH_GROUND, name: 'Ground Torch' },
    { id: OBJECTS.CAMPFIRE, name: 'Campfire' },
    { id: OBJECTS.BRAZIER, name: 'Brazier' },
    { id: OBJECTS.LANTERN, name: 'Lantern' },
    { id: OBJECTS.CRYSTAL_GLOW, name: 'Crystal' },
  ],
  'Interactables': [
    { id: OBJECTS.ALTAR, name: 'Altar' },
    { id: OBJECTS.FOUNTAIN, name: 'Fountain' },
    { id: OBJECTS.LEVER, name: 'Lever' },
    { id: OBJECTS.PRESSURE_PLATE, name: 'Pressure Plate' },
    { id: OBJECTS.STATUE, name: 'Statue' },
  ],
  'Loot': [
    { id: OBJECTS.GOLD_PILE, name: 'Gold Pile' },
    { id: OBJECTS.GEM, name: 'Gem' },
    { id: OBJECTS.POTION, name: 'Potion' },
    { id: OBJECTS.SCROLL, name: 'Scroll' },
    { id: OBJECTS.WEAPON_RACK, name: 'Weapon Rack' },
    { id: OBJECTS.ARMOR_STAND, name: 'Armor Stand' },
  ],
  'Traps': [
    { id: OBJECTS.TRAP_SPIKE, name: 'Spike Trap' },
    { id: OBJECTS.TRAP_ARROW, name: 'Arrow Trap' },
    { id: OBJECTS.TRAP_FIRE, name: 'Fire Trap' },
    { id: OBJECTS.TRAP_PIT, name: 'Pit Trap' },
  ],
};

export function ObjectPalette({
  shops,
  selectedObject,
  onSelectObject,
}: ObjectPaletteProps) {
  return (
    <div className="space-y-4">
      {Object.entries(OBJECT_CATEGORIES).map(([category, objects]) => (
        <div key={category}>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            {category}
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {objects.map((obj) => {
              const IconComponent = getObjectIcon(obj.id);

              return (
                <button
                  key={obj.id}
                  onClick={() => onSelectObject(obj.id)}
                  className={`
                    p-2 rounded border transition-all text-left flex items-center gap-2
                    ${selectedObject === obj.id
                      ? 'bg-amber-600/20 border-amber-500'
                      : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
                    }
                  `}
                  title={obj.name}
                >
                  {IconComponent ? (
                    <IconComponent size={20} />
                  ) : (
                    <div className="w-5 h-5 bg-zinc-600 rounded" />
                  )}
                  <span className="text-xs text-zinc-300 truncate">
                    {obj.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Shops Section */}
      {shops.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Shop Counters
          </h3>
          <p className="text-xs text-zinc-600 mb-2">
            Place a Bookshelf object, then link it to a shop in the properties panel.
          </p>
          <div className="space-y-1">
            {shops.map((shop) => (
              <div
                key={shop._id}
                className="p-2 bg-zinc-800 rounded border border-zinc-700 text-sm"
              >
                <div className="font-medium text-zinc-300 truncate">{shop.name}</div>
                <div className="text-xs text-zinc-500">{shop.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="pt-2 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">
          Select an object type, then click on the map to place it.
        </p>
      </div>
    </div>
  );
}

export default ObjectPalette;
