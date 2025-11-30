'use client';

import React from 'react';
import { PlacedEntity, PlacedObject, Transition, EntityBehavior } from '@/game/procedural/types';
import { Trash2, Sun, Moon, Cloud } from 'lucide-react';
import { AmbienceType, LightingLevel } from '@/game/ai-canvas/types';

interface PropertiesPanelProps {
  selectedItem: {
    type: 'entity' | 'object' | 'transition' | 'spawn';
    id: string;
  } | null;
  entities: PlacedEntity[];
  objects: PlacedObject[];
  transitions: Transition[];
  spawnX: number;
  spawnY: number;
  lighting: string;
  ambience: string;
  onUpdateLighting: (lighting: string) => void;
  onUpdateAmbience: (ambience: string) => void;
  onUpdateEntity: (id: string, updates: Partial<PlacedEntity>) => void;
  onUpdateObject: (id: string, updates: Partial<PlacedObject>) => void;
  onDelete: () => void;
}

const LIGHTING_OPTIONS: { value: LightingLevel; label: string; icon: React.ReactNode }[] = [
  { value: 'bright', label: 'Bright', icon: <Sun className="w-4 h-4" /> },
  { value: 'dim', label: 'Dim', icon: <Cloud className="w-4 h-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
];

const AMBIENCE_OPTIONS: AmbienceType[] = [
  'dungeon', 'cave', 'crypt', 'forest', 'castle', 'swamp',
  'town', 'village', 'city', 'inn', 'tavern', 'temple',
  'mine', 'sewer', 'ruins', 'tower', 'camp', 'road',
  'desert', 'frozen', 'water', 'coast', 'plains',
  'library', 'guild', 'bridge',
];

const BEHAVIOR_OPTIONS: { value: EntityBehavior; label: string; description: string }[] = [
  { value: 'stationary', label: 'Stationary', description: 'Stays in place' },
  { value: 'wander', label: 'Wander', description: 'Moves randomly nearby' },
  { value: 'patrol', label: 'Patrol', description: 'Follows set path' },
];

export function PropertiesPanel({
  selectedItem,
  entities,
  objects,
  transitions,
  spawnX,
  spawnY,
  lighting,
  ambience,
  onUpdateLighting,
  onUpdateAmbience,
  onUpdateEntity,
  onUpdateObject,
  onDelete,
}: PropertiesPanelProps) {
  // Find selected item data
  const selectedEntity = selectedItem?.type === 'entity'
    ? entities.find(e => e.id === selectedItem.id)
    : null;
  const selectedObject = selectedItem?.type === 'object'
    ? objects.find(o => o.id === selectedItem.id)
    : null;
  const selectedTransition = selectedItem?.type === 'transition'
    ? transitions.find(t => t.id === selectedItem.id)
    : null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-300">Properties</h3>

      {/* Selected Item Properties */}
      {selectedItem ? (
        <div className="space-y-3">
          {/* Entity Properties */}
          {selectedEntity && (
            <>
              <div>
                <label className="text-xs text-zinc-500">Type</label>
                <div className="text-sm text-zinc-300">Entity</div>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Name</label>
                <div className="text-sm text-white font-medium">{selectedEntity.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500">Position X</label>
                  <div className="text-sm text-zinc-300">{selectedEntity.x}</div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Position Y</label>
                  <div className="text-sm text-zinc-300">{selectedEntity.y}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500">HP</label>
                  <div className="text-sm text-zinc-300">{selectedEntity.hp || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Hostile</label>
                  <div className={`text-sm ${selectedEntity.hostile ? 'text-red-400' : 'text-green-400'}`}>
                    {selectedEntity.hostile ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              {/* Behavior */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Behavior</label>
                <div className="flex flex-col gap-1">
                  {BEHAVIOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onUpdateEntity(selectedEntity.id, { behavior: opt.value })}
                      className={`
                        text-left px-2 py-1.5 rounded text-xs transition-colors
                        ${(selectedEntity.behavior || 'stationary') === opt.value
                          ? 'bg-amber-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }
                      `}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-[10px] opacity-70">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wander Radius (only if wander) */}
              {selectedEntity.behavior === 'wander' && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Wander Radius</label>
                  <input
                    type="number"
                    value={selectedEntity.wanderRadius || 3}
                    onChange={(e) => onUpdateEntity(selectedEntity.id, {
                      wanderRadius: Math.max(1, parseInt(e.target.value) || 3)
                    })}
                    min={1}
                    max={10}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">Tiles from spawn point</p>
                </div>
              )}

              {/* Patrol info (only if patrol) */}
              {selectedEntity.behavior === 'patrol' && (
                <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                  <p className="text-xs text-zinc-400">
                    Patrol path: {selectedEntity.patrolPath?.length || 0} waypoints
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    (Waypoint editor coming soon)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Object Properties */}
          {selectedObject && (
            <>
              <div>
                <label className="text-xs text-zinc-500">Type</label>
                <div className="text-sm text-zinc-300">Object</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500">Position X</label>
                  <div className="text-sm text-zinc-300">{selectedObject.x}</div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Position Y</label>
                  <div className="text-sm text-zinc-300">{selectedObject.y}</div>
                </div>
              </div>

              {/* Collidable Toggle */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Blocks Movement</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => onUpdateObject(selectedObject.id, { collidable: false })}
                    className={`
                      flex-1 px-2 py-1.5 rounded text-xs transition-colors
                      ${!selectedObject.collidable
                        ? 'bg-green-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }
                    `}
                  >
                    Passable
                  </button>
                  <button
                    onClick={() => onUpdateObject(selectedObject.id, { collidable: true })}
                    className={`
                      flex-1 px-2 py-1.5 rounded text-xs transition-colors
                      ${selectedObject.collidable
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }
                    `}
                  >
                    Solid
                  </button>
                </div>
              </div>

              {/* Interactable Toggle */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Interactable</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => onUpdateObject(selectedObject.id, { interactable: false })}
                    className={`
                      flex-1 px-2 py-1.5 rounded text-xs transition-colors
                      ${!selectedObject.interactable
                        ? 'bg-zinc-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }
                    `}
                  >
                    No
                  </button>
                  <button
                    onClick={() => onUpdateObject(selectedObject.id, { interactable: true })}
                    className={`
                      flex-1 px-2 py-1.5 rounded text-xs transition-colors
                      ${selectedObject.interactable
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }
                    `}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {selectedObject.state && (
                <div>
                  <label className="text-xs text-zinc-500">State</label>
                  <div className="text-sm text-zinc-300 capitalize">{selectedObject.state}</div>
                </div>
              )}
              {selectedObject.label && (
                <div>
                  <label className="text-xs text-zinc-500">Label</label>
                  <div className="text-sm text-zinc-300">{selectedObject.label}</div>
                </div>
              )}
            </>
          )}

          {/* Transition Properties */}
          {selectedTransition && (
            <>
              <div>
                <label className="text-xs text-zinc-500">Type</label>
                <div className="text-sm text-zinc-300">Transition</div>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Destination</label>
                <div className="text-sm text-white font-medium">{selectedTransition.toLocationName}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500">Position X</label>
                  <div className="text-sm text-zinc-300">{selectedTransition.x}</div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Position Y</label>
                  <div className="text-sm text-zinc-300">{selectedTransition.y}</div>
                </div>
              </div>
            </>
          )}

          {/* Spawn Point Properties */}
          {selectedItem.type === 'spawn' && (
            <>
              <div>
                <label className="text-xs text-zinc-500">Type</label>
                <div className="text-sm text-zinc-300">Player Spawn Point</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500">Position X</label>
                  <div className="text-sm text-zinc-300">{spawnX}</div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Position Y</label>
                  <div className="text-sm text-zinc-300">{spawnY}</div>
                </div>
              </div>
            </>
          )}

          {/* Delete Button (not for spawn) */}
          {selectedItem.type !== 'spawn' && (
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded text-red-400 text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-600 italic">
          Select an item on the map to view its properties
        </p>
      )}

      {/* Global Map Properties */}
      <div className="pt-4 border-t border-zinc-800 space-y-3">
        <h4 className="text-sm font-medium text-zinc-400">Map Settings</h4>

        {/* Lighting */}
        <div>
          <label className="text-xs text-zinc-500 block mb-2">Lighting</label>
          <div className="flex gap-1">
            {LIGHTING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdateLighting(opt.value)}
                className={`
                  flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs transition-colors
                  ${lighting === opt.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }
                `}
                title={opt.label}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Ambience */}
        <div>
          <label className="text-xs text-zinc-500 block mb-2">Ambience</label>
          <select
            value={ambience}
            onChange={(e) => onUpdateAmbience(e.target.value)}
            className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            {AMBIENCE_OPTIONS.map((amb) => (
              <option key={amb} value={amb}>
                {amb.charAt(0).toUpperCase() + amb.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default PropertiesPanel;
