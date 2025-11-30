'use client';

import React from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { User, Skull } from 'lucide-react';

interface NPCOption {
  _id: Id<"npcs">;
  name: string;
  role: string;
  isHostile?: boolean;
}

interface MonsterOption {
  _id: Id<"monsters">;
  name: string;
  health: number;
  damage: number;
}

interface EntityPaletteProps {
  npcs: NPCOption[];
  monsters: MonsterOption[];
  selectedEntity: { type: 'npc' | 'monster'; id: string } | null;
  onSelectEntity: (entity: { type: 'npc' | 'monster'; id: string } | null) => void;
}

export function EntityPalette({
  npcs,
  monsters,
  selectedEntity,
  onSelectEntity,
}: EntityPaletteProps) {
  return (
    <div className="space-y-4">
      {/* NPCs Section */}
      <div>
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <User className="w-3 h-3" />
          NPCs
        </h3>
        {npcs.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">
            No NPCs created yet. Add NPCs in the NPCs tab.
          </p>
        ) : (
          <div className="space-y-1">
            {npcs.map((npc) => (
              <button
                key={npc._id}
                onClick={() =>
                  onSelectEntity(
                    selectedEntity?.type === 'npc' && selectedEntity.id === npc._id
                      ? null
                      : { type: 'npc', id: npc._id }
                  )
                }
                className={`
                  w-full p-2 text-left rounded border transition-all text-sm
                  ${selectedEntity?.type === 'npc' && selectedEntity.id === npc._id
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750 hover:border-zinc-600'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{npc.name}</span>
                  {npc.isHostile && (
                    <span className="text-red-500 text-xs">Hostile</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 truncate">{npc.role}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Monsters Section */}
      <div>
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Skull className="w-3 h-3" />
          Monsters
        </h3>
        {monsters.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">
            No monsters created yet. Add monsters in the Monsters tab.
          </p>
        ) : (
          <div className="space-y-1">
            {monsters.map((monster) => (
              <button
                key={monster._id}
                onClick={() =>
                  onSelectEntity(
                    selectedEntity?.type === 'monster' && selectedEntity.id === monster._id
                      ? null
                      : { type: 'monster', id: monster._id }
                  )
                }
                className={`
                  w-full p-2 text-left rounded border transition-all text-sm
                  ${selectedEntity?.type === 'monster' && selectedEntity.id === monster._id
                    ? 'bg-red-600/20 border-red-500 text-red-200'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750 hover:border-zinc-600'
                  }
                `}
              >
                <div className="font-medium truncate">{monster.name}</div>
                <div className="text-xs text-zinc-500">
                  HP: {monster.health} | DMG: {monster.damage}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="pt-2 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">
          Select an NPC or monster, then click on the map to place it.
        </p>
      </div>
    </div>
  );
}

export default EntityPalette;
