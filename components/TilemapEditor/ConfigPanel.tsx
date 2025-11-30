'use client';

import React, { useState } from 'react';
import { PlacedEntity, PlacedObject, EntityBehavior, LootItem } from '@/game/procedural/types';
import { ChevronDown, ChevronRight, User, Box, Store, Package, Footprints, Ban, Hand, ScrollText, Plus, Trash2, Percent, Sword, Palette } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';

interface ShopOption {
  _id: Id<"shops">;
  name: string;
  type: string;
}

interface QuestOption {
  _id: Id<"quests">;
  title: string;
  status: string;
}

interface ConfigPanelProps {
  entities: PlacedEntity[];
  objects: PlacedObject[];
  shops: ShopOption[];
  quests: QuestOption[];
  onUpdateEntity: (id: string, updates: Partial<PlacedEntity>) => void;
  onUpdateObject: (id: string, updates: Partial<PlacedObject>) => void;
}

const BEHAVIOR_OPTIONS: { value: EntityBehavior; label: string }[] = [
  { value: 'stationary', label: 'Stationary' },
  { value: 'wander', label: 'Wander' },
  { value: 'patrol', label: 'Patrol' },
];

// Loot Table Editor Component
function LootTableEditor({
  lootTable,
  onChange,
}: {
  lootTable: LootItem[];
  onChange: (loot: LootItem[]) => void;
}) {
  const addItem = () => {
    onChange([...lootTable, { name: '', spawnChance: 100, quantity: 1 }]);
  };

  const updateItem = (index: number, updates: Partial<LootItem>) => {
    const newLoot = [...lootTable];
    newLoot[index] = { ...newLoot[index], ...updates };
    onChange(newLoot);
  };

  const removeItem = (index: number) => {
    onChange(lootTable.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {lootTable.map((item, index) => (
        <div key={index} className="bg-zinc-700/50 rounded p-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(index, { name: e.target.value })}
              placeholder="Item name..."
              className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-[10px] text-white placeholder:text-zinc-500"
            />
            <button
              onClick={() => removeItem(index)}
              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-zinc-500 block">Chance</label>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={item.spawnChance}
                  onChange={(e) => updateItem(index, { spawnChance: parseInt(e.target.value) })}
                  className="flex-1 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-zinc-400 w-8 text-right">{item.spawnChance}%</span>
              </div>
            </div>
            <div className="w-16">
              <label className="text-[9px] text-zinc-500 block">Qty</label>
              <input
                type="number"
                min={1}
                max={99}
                value={item.quantity || 1}
                onChange={(e) => updateItem(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-[10px] text-white text-center"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-[10px] text-zinc-300 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add Item
      </button>
    </div>
  );
}

export function ConfigPanel({
  entities,
  objects,
  shops,
  quests,
  onUpdateEntity,
  onUpdateObject,
}: ConfigPanelProps) {
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const [entitySection, setEntitySection] = useState(true);
  const [objectSection, setObjectSection] = useState(true);

  const toggleEntity = (id: string) => {
    setExpandedEntities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleObject = (id: string) => {
    setExpandedObjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4 h-full overflow-y-auto pb-4">
      {/* Entities Section */}
      <div>
        <button
          onClick={() => setEntitySection(!entitySection)}
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-300 hover:text-white"
        >
          {entitySection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <User className="w-4 h-4 text-amber-500" />
          Entities ({entities.length})
        </button>

        {entitySection && (
          <div className="mt-2 space-y-1">
            {entities.length === 0 ? (
              <p className="text-xs text-zinc-600 italic pl-6">No entities placed</p>
            ) : (
              entities.map(entity => (
                <div key={entity.id} className="bg-zinc-800/50 rounded overflow-hidden">
                  {/* Entity Header */}
                  <button
                    onClick={() => toggleEntity(entity.id)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-zinc-700/50"
                  >
                    {expandedEntities.has(entity.id) ? (
                      <ChevronDown className="w-3 h-3 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                    )}
                    <span className="text-xs text-white flex-1 truncate">{entity.name}</span>
                    <div className="flex gap-1 items-center">
                      {entity.color && (
                        <div
                          className="w-3 h-3 rounded-full border border-zinc-500"
                          style={{ backgroundColor: entity.color }}
                        />
                      )}
                      {entity.questId && (
                        <ScrollText className="w-3 h-3 text-purple-400" />
                      )}
                      {entity.lootTable && entity.lootTable.length > 0 && (
                        <Package className="w-3 h-3 text-yellow-400" />
                      )}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      entity.hostile ? 'bg-red-600/30 text-red-400' : 'bg-green-600/30 text-green-400'
                    }`}>
                      {entity.hostile ? 'Hostile' : 'Friendly'}
                    </span>
                  </button>

                  {/* Entity Config */}
                  {expandedEntities.has(entity.id) && (
                    <div className="px-3 py-2 border-t border-zinc-700 space-y-3">
                      {/* Position */}
                      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                        <span>Position: ({entity.x}, {entity.y})</span>
                        <span>HP: {entity.hp}/{entity.maxHp}</span>
                      </div>

                      {/* Behavior */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">Behavior</label>
                        <div className="flex gap-1">
                          {BEHAVIOR_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => onUpdateEntity(entity.id, { behavior: opt.value })}
                              className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                                (entity.behavior || 'stationary') === opt.value
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Wander Radius */}
                      {entity.behavior === 'wander' && (
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1">Wander Radius</label>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={entity.wanderRadius || 3}
                            onChange={(e) => onUpdateEntity(entity.id, { wanderRadius: parseInt(e.target.value) })}
                            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="text-[10px] text-zinc-500 text-right">{entity.wanderRadius || 3} tiles</div>
                        </div>
                      )}

                      {/* Hostile Toggle */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">Hostile</label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onUpdateEntity(entity.id, { hostile: false })}
                            className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                              !entity.hostile
                                ? 'bg-green-600 text-white'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                            }`}
                          >
                            Friendly
                          </button>
                          <button
                            onClick={() => onUpdateEntity(entity.id, { hostile: true })}
                            className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                              entity.hostile
                                ? 'bg-red-600 text-white'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                            }`}
                          >
                            Hostile
                          </button>
                        </div>
                      </div>

                      {/* Circle Color */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                          <Palette className="w-3 h-3" /> Circle Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={entity.color || '#55aaff'}
                            onChange={(e) => onUpdateEntity(entity.id, { color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent border border-zinc-600"
                          />
                          <span className="text-[10px] text-zinc-400 flex-1">
                            {entity.color || 'Default'}
                          </span>
                          {entity.color && (
                            <button
                              onClick={() => onUpdateEntity(entity.id, { color: undefined })}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quest Assignment */}
                      {quests.length > 0 && (
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                            <ScrollText className="w-3 h-3" /> Attached Quest
                          </label>
                          <select
                            value={entity.questId || ''}
                            onChange={(e) => onUpdateEntity(entity.id, {
                              questId: e.target.value ? e.target.value as Id<"quests"> : undefined
                            })}
                            className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-[10px] text-white"
                          >
                            <option value="">No quest</option>
                            {quests.map(quest => (
                              <option key={quest._id} value={quest._id}>
                                {quest.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Loot Table (for monsters) */}
                      {entity.hostile && (
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                            <Sword className="w-3 h-3" /> Drop Loot
                          </label>
                          <LootTableEditor
                            lootTable={entity.lootTable || []}
                            onChange={(loot) => onUpdateEntity(entity.id, {
                              lootTable: loot.length > 0 ? loot : undefined
                            })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Objects Section */}
      <div className="pt-3 border-t border-zinc-800">
        <button
          onClick={() => setObjectSection(!objectSection)}
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-300 hover:text-white"
        >
          {objectSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Box className="w-4 h-4 text-blue-500" />
          Objects ({objects.length})
        </button>

        {objectSection && (
          <div className="mt-2 space-y-1">
            {objects.length === 0 ? (
              <p className="text-xs text-zinc-600 italic pl-6">No objects placed</p>
            ) : (
              objects.map(obj => (
                <div key={obj.id} className="bg-zinc-800/50 rounded overflow-hidden">
                  {/* Object Header */}
                  <button
                    onClick={() => toggleObject(obj.id)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-zinc-700/50"
                  >
                    {expandedObjects.has(obj.id) ? (
                      <ChevronDown className="w-3 h-3 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                    )}
                    <span className="text-xs text-white flex-1 truncate">
                      {obj.label || `Object ${obj.id.slice(-6)}`}
                    </span>
                    <div className="flex gap-1">
                      {obj.interactable && (
                        <Hand className="w-3 h-3 text-amber-500" />
                      )}
                      {obj.collidable && (
                        <Ban className="w-3 h-3 text-red-500" />
                      )}
                      {obj.shopId && (
                        <Store className="w-3 h-3 text-green-500" />
                      )}
                      {obj.questId && (
                        <ScrollText className="w-3 h-3 text-purple-400" />
                      )}
                      {obj.lootTable && obj.lootTable.length > 0 && (
                        <Package className="w-3 h-3 text-yellow-400" />
                      )}
                    </div>
                  </button>

                  {/* Object Config */}
                  {expandedObjects.has(obj.id) && (
                    <div className="px-3 py-2 border-t border-zinc-700 space-y-3">
                      {/* Position */}
                      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                        <span>Position: ({obj.x}, {obj.y})</span>
                        {obj.state && <span>State: {obj.state}</span>}
                      </div>

                      {/* Interactable */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                          <Hand className="w-3 h-3" /> Interactable
                        </label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onUpdateObject(obj.id, { interactable: false })}
                            className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                              !obj.interactable
                                ? 'bg-zinc-600 text-white'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                            }`}
                          >
                            No
                          </button>
                          <button
                            onClick={() => onUpdateObject(obj.id, { interactable: true })}
                            className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                              obj.interactable
                                ? 'bg-amber-600 text-white'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                            }`}
                          >
                            Yes
                          </button>
                        </div>
                      </div>

                      {/* Collision */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                          <Footprints className="w-3 h-3" /> Blocks Movement
                        </label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onUpdateObject(obj.id, { collidable: false })}
                            className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                              !obj.collidable
                                ? 'bg-green-600 text-white'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                            }`}
                          >
                            Passable
                          </button>
                          <button
                            onClick={() => onUpdateObject(obj.id, { collidable: true })}
                            className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                              obj.collidable
                                ? 'bg-red-600 text-white'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                            }`}
                          >
                            Solid
                          </button>
                        </div>
                      </div>

                      {/* Shop Assignment */}
                      {obj.interactable && shops.length > 0 && (
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                            <Store className="w-3 h-3" /> Link to Shop
                          </label>
                          <select
                            value={obj.shopId || ''}
                            onChange={(e) => onUpdateObject(obj.id, {
                              shopId: e.target.value ? e.target.value as Id<"shops"> : undefined
                            })}
                            className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-[10px] text-white"
                          >
                            <option value="">No shop</option>
                            {shops.map(shop => (
                              <option key={shop._id} value={shop._id}>
                                {shop.name} ({shop.type})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quest Assignment */}
                      {quests.length > 0 && (
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                            <ScrollText className="w-3 h-3" /> Attached Quest
                          </label>
                          <select
                            value={obj.questId || ''}
                            onChange={(e) => onUpdateObject(obj.id, {
                              questId: e.target.value ? e.target.value as Id<"quests"> : undefined
                            })}
                            className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-[10px] text-white"
                          >
                            <option value="">No quest</option>
                            {quests.map(quest => (
                              <option key={quest._id} value={quest._id}>
                                {quest.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Loot Table (for containers) */}
                      {obj.interactable && !obj.shopId && (
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Container Loot
                          </label>
                          <LootTableEditor
                            lootTable={obj.lootTable || []}
                            onChange={(loot) => onUpdateObject(obj.id, {
                              lootTable: loot.length > 0 ? loot : undefined
                            })}
                          />
                          <p className="text-[9px] text-zinc-600 mt-1">Each item rolls once when container is opened</p>
                        </div>
                      )}

                      {/* Label */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">Display Label</label>
                        <input
                          type="text"
                          value={obj.label || ''}
                          onChange={(e) => onUpdateObject(obj.id, { label: e.target.value || undefined })}
                          placeholder="Optional label..."
                          className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-[10px] text-white placeholder:text-zinc-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigPanel;
