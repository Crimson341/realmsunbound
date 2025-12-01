'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { TERRAIN, ENTITIES, OBJECTS } from '@/game/ai-canvas/types';
import { PlacedEntity, PlacedObject, Transition, AlternateSpawn } from '@/game/procedural/types';
import { TilePalette } from './TilePalette';
import { EntityPalette } from './EntityPalette';
import { ObjectPalette } from './ObjectPalette';
import { ConfigPanel } from './ConfigPanel';
import { ConditionsPalette } from './ConditionsPalette';
import { ToolBar, Tool } from './ToolBar';
import { PropertiesPanel } from './PropertiesPanel';
import { Save, Undo, Redo, Play, Pencil } from 'lucide-react';
import { AIGameCanvas, AIGameCanvasHandle } from '@/game/ai-canvas/AIGameCanvas';
import { RoomData, RoomEntity, RoomObject, LightingLevel, AmbienceType } from '@/game/ai-canvas/types';

// ============================================
// TYPES
// ============================================

export interface TilemapEditorProps {
  locationId: Id<"locations">;
  campaignId: Id<"campaigns">;
  locationName: string;
  locationType: string;
  // Existing template data (if editing)
  initialWidth?: number;
  initialHeight?: number;
  initialTiles?: number[][];
  initialEntities?: PlacedEntity[];
  initialObjects?: PlacedObject[];
  initialTransitions?: Transition[];
  initialSpawnX?: number;
  initialSpawnY?: number;
  initialAlternateSpawns?: AlternateSpawn[];
  initialLighting?: string;
  initialAmbience?: string;
  // Campaign data for palettes
  npcs: NPCOption[];
  monsters: MonsterOption[];
  shops: ShopOption[];
  quests: QuestOption[];
  neighborLocations: NeighborLocationOption[];
  // Conditions data
  items?: ItemOption[];
  abilities?: AbilityOption[];
  factions?: FactionOption[];
  conditions?: ConditionOption[];
  // Callbacks
  onSave: (data: TilemapSaveData) => Promise<void>;
  onClose?: () => void;
  // Condition callbacks
  onCreateCondition?: (condition: {
    name: string;
    description?: string;
    trigger: string;
    triggerContext?: string;
    rules: string;
    thenActions: string;
    elseActions?: string;
    priority?: number;
  }) => Promise<void>;
  onUpdateCondition?: (id: Id<"conditions">, updates: Partial<ConditionOption>) => Promise<void>;
  onDeleteCondition?: (id: Id<"conditions">) => Promise<void>;
  onToggleCondition?: (id: Id<"conditions">) => Promise<void>;
}

export interface NPCOption {
  _id: Id<"npcs">;
  name: string;
  role: string;
  isHostile?: boolean;
  health?: number;
  maxHealth?: number;
}

export interface MonsterOption {
  _id: Id<"monsters">;
  name: string;
  health: number;
  damage: number;
}

export interface ShopOption {
  _id: Id<"shops">;
  name: string;
  type: string;
}

export interface NeighborLocationOption {
  _id: Id<"locations">;
  name: string;
}

export interface QuestOption {
  _id: Id<"quests">;
  title: string;
  status: string;
}

export interface ItemOption {
  _id: Id<"items">;
  name: string;
}

export interface AbilityOption {
  _id: Id<"spells">;
  name: string;
}

export interface FactionOption {
  _id: Id<"factions">;
  name: string;
}

export interface ConditionOption {
  _id: Id<"conditions">;
  name: string;
  description?: string;
  trigger: string;
  triggerContext?: string;
  rules: string;
  thenActions: string;
  elseActions?: string;
  priority: number;
  isActive: boolean;
}

export interface TilemapSaveData {
  width: number;
  height: number;
  tiles: number[][];
  collisionMask: number[][];
  playerSpawnX: number;
  playerSpawnY: number;
  alternateSpawns: AlternateSpawn[];
  placedEntities: PlacedEntity[];
  placedObjects: PlacedObject[];
  transitions: Transition[];
  lighting: string;
  ambience: string;
}

type PaletteTab = 'tiles' | 'entities' | 'objects' | 'transitions' | 'conditions' | 'config';

interface HistoryState {
  tiles: number[][];
  entities: PlacedEntity[];
  objects: PlacedObject[];
  transitions: Transition[];
  spawnX: number;
  spawnY: number;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_WIDTH = 25;
const DEFAULT_HEIGHT = 20;

// ============================================
// MAIN COMPONENT
// ============================================

export function TilemapEditor({
  locationId,
  campaignId,
  locationName,
  locationType,
  initialWidth = DEFAULT_WIDTH,
  initialHeight = DEFAULT_HEIGHT,
  initialTiles,
  initialEntities = [],
  initialObjects = [],
  initialTransitions = [],
  initialSpawnX = Math.floor(DEFAULT_WIDTH / 2),
  initialSpawnY = Math.floor(DEFAULT_HEIGHT / 2),
  initialAlternateSpawns = [],
  initialLighting = 'dim',
  initialAmbience = 'dungeon',
  npcs,
  monsters,
  shops,
  quests,
  neighborLocations,
  items = [],
  abilities = [],
  factions = [],
  conditions = [],
  onSave,
  onClose,
  onCreateCondition,
  onUpdateCondition,
  onDeleteCondition,
  onToggleCondition,
}: TilemapEditorProps) {
  // ============================================
  // STATE
  // ============================================

  // Map dimensions
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  // Tile data
  const [tiles, setTiles] = useState<number[][]>(() => {
    if (initialTiles) return initialTiles;
    // Generate default floor tiles
    return Array(initialHeight).fill(null).map(() =>
      Array(initialWidth).fill(TERRAIN.FLOOR_STONE)
    );
  });

  // Placed content
  const [entities, setEntities] = useState<PlacedEntity[]>(initialEntities);
  const [objects, setObjects] = useState<PlacedObject[]>(initialObjects);
  const [transitions, setTransitions] = useState<Transition[]>(initialTransitions);

  // Spawn points
  const [spawnX, setSpawnX] = useState(initialSpawnX);
  const [spawnY, setSpawnY] = useState(initialSpawnY);
  const [alternateSpawns, setAlternateSpawns] = useState<AlternateSpawn[]>(initialAlternateSpawns);

  // Visual settings
  const [lighting, setLighting] = useState(initialLighting);
  const [ambience, setAmbience] = useState(initialAmbience);

  // Editor state
  const [activeTool, setActiveTool] = useState<Tool>('paint');
  const [activeTab, setActiveTab] = useState<PaletteTab>('tiles');
  const [selectedTile, setSelectedTile] = useState<number>(TERRAIN.FLOOR_STONE);
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'npc' | 'monster'; id: string } | null>(null);
  const [selectedObject, setSelectedObject] = useState<number>(OBJECTS.CHEST_CLOSED);
  const [selectedTransitionTo, setSelectedTransitionTo] = useState<Id<"locations"> | null>(null);

  // Selection
  const [selectedItem, setSelectedItem] = useState<{
    type: 'entity' | 'object' | 'transition' | 'spawn';
    id: string;
  } | null>(null);

  // Mode: edit vs play
  const [isPlayMode, setIsPlayMode] = useState(false);

  // Canvas ref
  const gameCanvasRef = useRef<AIGameCanvasHandle>(null);

  // Undo/Redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Track if we need to reload the canvas
  const [needsReload, setNeedsReload] = useState(0);

  // ============================================
  // ROOM DATA CONVERSION
  // ============================================

  const getRoomData = useCallback((): RoomData => {
    // Convert placed entities to RoomEntity format
    const roomEntities: RoomEntity[] = entities.map(entity => ({
      id: entity.id,
      type: entity.entityType,
      x: entity.x,
      y: entity.y,
      name: entity.name,
      hostile: entity.hostile,
      hp: entity.hp,
      maxHp: entity.maxHp,
      color: entity.color,
    }));

    // Convert placed objects to RoomObject format
    const roomObjects: RoomObject[] = objects.map(obj => ({
      id: obj.id,
      type: obj.objectType,
      x: obj.x,
      y: obj.y,
      interactable: obj.interactable,
      state: obj.state,
    }));

    // Add transition doors as objects with exit info
    transitions.forEach(tr => {
      roomObjects.push({
        id: tr.id,
        type: TERRAIN.DOOR_OPEN,
        x: tr.x,
        y: tr.y,
        interactable: true,
        label: `To ${tr.toLocationName}`,
        exit: { toLocation: tr.toLocationName },
      });
    });

    return {
      width,
      height,
      tiles,
      entities: roomEntities,
      objects: roomObjects,
      lighting: lighting as LightingLevel,
      ambience: ambience as AmbienceType,
      playerSpawn: { x: spawnX, y: spawnY },
    };
  }, [width, height, tiles, entities, objects, transitions, lighting, ambience, spawnX, spawnY]);

  // ============================================
  // LOAD ROOM INTO CANVAS
  // ============================================

  useEffect(() => {
    // Small delay to ensure canvas is mounted
    const timer = setTimeout(() => {
      const roomData = getRoomData();
      gameCanvasRef.current?.loadRoom(roomData);
    }, 100);

    return () => clearTimeout(timer);
  }, [needsReload]); // Only reload when needsReload changes

  // Trigger reload when data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setNeedsReload(prev => prev + 1);
    }, 50);
    return () => clearTimeout(timer);
  }, [tiles, entities, objects, transitions, spawnX, spawnY, lighting, ambience, width, height]);

  // ============================================
  // HISTORY MANAGEMENT
  // ============================================

  const saveToHistory = useCallback(() => {
    const currentState: HistoryState = {
      tiles: tiles.map(row => [...row]),
      entities: [...entities],
      objects: [...objects],
      transitions: [...transitions],
      spawnX,
      spawnY,
    };

    // Remove future states if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);

    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [tiles, entities, objects, transitions, spawnX, spawnY, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setTiles(prevState.tiles);
      setEntities(prevState.entities);
      setObjects(prevState.objects);
      setTransitions(prevState.transitions);
      setSpawnX(prevState.spawnX);
      setSpawnY(prevState.spawnY);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTiles(nextState.tiles);
      setEntities(nextState.entities);
      setObjects(nextState.objects);
      setTransitions(nextState.transitions);
      setSpawnX(nextState.spawnX);
      setSpawnY(nextState.spawnY);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // ============================================
  // TILE OPERATIONS
  // ============================================

  const setTile = useCallback((x: number, y: number, tileId: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;

    setTiles(prev => {
      const newTiles = prev.map(row => [...row]);
      newTiles[y][x] = tileId;
      return newTiles;
    });
  }, [width, height]);

  const fillTiles = useCallback((startX: number, startY: number, tileId: number) => {
    const targetTile = tiles[startY]?.[startX];
    if (targetTile === undefined || targetTile === tileId) return;

    const newTiles = tiles.map(row => [...row]);
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (newTiles[y][x] !== targetTile) continue;

      visited.add(key);
      newTiles[y][x] = tileId;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    setTiles(newTiles);
    saveToHistory();
  }, [tiles, width, height, saveToHistory]);

  // ============================================
  // ENTITY/OBJECT OPERATIONS
  // ============================================

  const addEntity = useCallback((x: number, y: number) => {
    if (!selectedEntity) return;

    const id = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let newEntity: PlacedEntity;

    if (selectedEntity.type === 'npc') {
      const npc = npcs.find(n => n._id === selectedEntity.id);
      if (!npc) return;

      newEntity = {
        id,
        npcId: npc._id,
        entityType: roleToEntityType(npc.role),
        x,
        y,
        name: npc.name,
        hostile: npc.isHostile || false,
        hp: npc.health || 20,
        maxHp: npc.maxHealth || 20,
      };
    } else {
      const monster = monsters.find(m => m._id === selectedEntity.id);
      if (!monster) return;

      newEntity = {
        id,
        monsterId: monster._id,
        entityType: ENTITIES.GOBLIN, // Default monster sprite
        x,
        y,
        name: monster.name,
        hostile: true,
        hp: monster.health,
        maxHp: monster.health,
      };
    }

    setEntities(prev => [...prev, newEntity]);
    saveToHistory();
  }, [selectedEntity, npcs, monsters, saveToHistory]);

  const addObject = useCallback((x: number, y: number) => {
    const id = `object_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newObject: PlacedObject = {
      id,
      objectType: selectedObject,
      x,
      y,
      interactable: isInteractableObject(selectedObject),
      state: getDefaultObjectState(selectedObject),
    };

    setObjects(prev => [...prev, newObject]);
    saveToHistory();
  }, [selectedObject, saveToHistory]);

  const addTransition = useCallback((x: number, y: number) => {
    if (!selectedTransitionTo) return;

    const targetLocation = neighborLocations.find(l => l._id === selectedTransitionTo);
    if (!targetLocation) return;

    const id = `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTransition: Transition = {
      id,
      x,
      y,
      toLocationId: selectedTransitionTo,
      toLocationName: targetLocation.name,
      objectType: TERRAIN.DOOR_OPEN,
    };

    setTransitions(prev => [...prev, newTransition]);
    saveToHistory();
  }, [selectedTransitionTo, neighborLocations, saveToHistory]);

  const removeSelectedItem = useCallback(() => {
    if (!selectedItem) return;

    if (selectedItem.type === 'entity') {
      setEntities(prev => prev.filter(e => e.id !== selectedItem.id));
    } else if (selectedItem.type === 'object') {
      setObjects(prev => prev.filter(o => o.id !== selectedItem.id));
    } else if (selectedItem.type === 'transition') {
      setTransitions(prev => prev.filter(t => t.id !== selectedItem.id));
    }

    setSelectedItem(null);
    saveToHistory();
  }, [selectedItem, saveToHistory]);

  const updateEntity = useCallback((id: string, updates: Partial<PlacedEntity>) => {
    setEntities(prev => prev.map(entity =>
      entity.id === id ? { ...entity, ...updates } : entity
    ));
    saveToHistory();
  }, [saveToHistory]);

  const updateObject = useCallback((id: string, updates: Partial<PlacedObject>) => {
    setObjects(prev => prev.map(obj =>
      obj.id === id ? { ...obj, ...updates } : obj
    ));
    saveToHistory();
  }, [saveToHistory]);

  // ============================================
  // CLICK HANDLING (EDIT MODE)
  // ============================================

  const handleTileClick = useCallback((x: number, y: number) => {
    // In play mode, let the game handle clicks (player movement)
    if (isPlayMode) return;

    // Edit mode: handle based on active tool and tab
    switch (activeTool) {
      case 'paint':
        if (activeTab === 'tiles') {
          setTile(x, y, selectedTile);
          saveToHistory();
        } else if (activeTab === 'entities') {
          addEntity(x, y);
        } else if (activeTab === 'objects') {
          addObject(x, y);
        } else if (activeTab === 'transitions') {
          addTransition(x, y);
        }
        break;

      case 'fill':
        if (activeTab === 'tiles') {
          fillTiles(x, y, selectedTile);
        }
        break;

      case 'erase':
        if (activeTab === 'tiles') {
          setTile(x, y, TERRAIN.VOID);
          saveToHistory();
        } else {
          // Remove entity/object at this position
          const entityAtPos = entities.find(e => e.x === x && e.y === y);
          const objectAtPos = objects.find(o => o.x === x && o.y === y);
          const transitionAtPos = transitions.find(t => t.x === x && t.y === y);

          if (entityAtPos) {
            setEntities(prev => prev.filter(e => e.id !== entityAtPos.id));
            saveToHistory();
          } else if (objectAtPos) {
            setObjects(prev => prev.filter(o => o.id !== objectAtPos.id));
            saveToHistory();
          } else if (transitionAtPos) {
            setTransitions(prev => prev.filter(t => t.id !== transitionAtPos.id));
            saveToHistory();
          }
        }
        break;

      case 'select':
        // Select entity/object/transition at position
        const clickedEntity = entities.find(e => e.x === x && e.y === y);
        const clickedObject = objects.find(o => o.x === x && o.y === y);
        const clickedTransition = transitions.find(t => t.x === x && t.y === y);

        if (clickedEntity) {
          setSelectedItem({ type: 'entity', id: clickedEntity.id });
        } else if (clickedObject) {
          setSelectedItem({ type: 'object', id: clickedObject.id });
        } else if (clickedTransition) {
          setSelectedItem({ type: 'transition', id: clickedTransition.id });
        } else if (x === spawnX && y === spawnY) {
          setSelectedItem({ type: 'spawn', id: 'player' });
        } else {
          setSelectedItem(null);
        }
        break;

      case 'spawn':
        setSpawnX(x);
        setSpawnY(y);
        saveToHistory();
        break;
    }
  }, [
    isPlayMode, activeTool, activeTab,
    selectedTile, selectedEntity, selectedObject, selectedTransitionTo,
    entities, objects, transitions, spawnX, spawnY,
    setTile, fillTiles, addEntity, addObject, addTransition, saveToHistory
  ]);

  // ============================================
  // SAVE
  // ============================================

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    // Generate collision mask
    const collisionMask = tiles.map(row =>
      row.map(tile => isWalkableTile(tile) ? 0 : 1)
    );

    const saveData: TilemapSaveData = {
      width,
      height,
      tiles,
      collisionMask,
      playerSpawnX: spawnX,
      playerSpawnY: spawnY,
      alternateSpawns,
      placedEntities: entities,
      placedObjects: objects,
      transitions,
      lighting,
      ambience,
    };

    try {
      await onSave(saveData);
    } finally {
      setIsSaving(false);
    }
  }, [width, height, tiles, spawnX, spawnY, alternateSpawns, entities, objects, transitions, lighting, ambience, onSave]);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle movement in play mode
      if (isPlayMode) {
        if (e.key === 'Escape') {
          setIsPlayMode(false);
          return;
        }

        let dx = 0;
        let dy = 0;

        switch (e.key) {
          case 'w':
          case 'W':
          case 'ArrowUp':
            dy = -1;
            break;
          case 's':
          case 'S':
          case 'ArrowDown':
            dy = 1;
            break;
          case 'a':
          case 'A':
          case 'ArrowLeft':
            dx = -1;
            break;
          case 'd':
          case 'D':
          case 'ArrowRight':
            dx = 1;
            break;
        }

        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          gameCanvasRef.current?.movePlayer(dx, dy);
        }
        return;
      }

      // Edit mode shortcuts
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItem) {
          removeSelectedItem();
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, removeSelectedItem, undo, redo, handleSave, isPlayMode]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">
            Layout Editor: {locationName}
          </h2>
          <span className="text-sm text-zinc-400">({locationType})</span>

          {/* Mode indicator */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isPlayMode
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50'
              : 'bg-amber-600/20 text-amber-400 border border-amber-600/50'
          }`}>
            {isPlayMode ? 'Play Mode' : 'Edit Mode'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0 || isPlayMode}
            className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1 || isPlayMode}
            className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4 text-zinc-400" />
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-2" />

          {/* Mode toggle buttons */}
          <button
            onClick={() => setIsPlayMode(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors ${
              !isPlayMode
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title="Edit Mode"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setIsPlayMode(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors ${
              isPlayMode
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title="Play Mode (WASD to move, ESC to exit)"
          >
            <Play className="w-4 h-4" />
            Play
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-2" />

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded font-medium text-white"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Layout'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded font-medium text-white"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Palettes (only in edit mode) */}
        {!isPlayMode && (
          <div className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
            {/* Palette Tabs */}
            <div className="flex border-b border-zinc-800 overflow-x-auto scrollbar-hide">
              {(['tiles', 'entities', 'objects', 'transitions', 'conditions', 'config'] as PaletteTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs font-medium capitalize whitespace-nowrap shrink-0 ${
                    activeTab === tab
                      ? 'bg-zinc-800 text-amber-500 border-b-2 border-amber-500'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Palette Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {activeTab === 'tiles' && (
                <TilePalette
                  selectedTile={selectedTile}
                  onSelectTile={setSelectedTile}
                />
              )}
              {activeTab === 'entities' && (
                <EntityPalette
                  npcs={npcs}
                  monsters={monsters}
                  selectedEntity={selectedEntity}
                  onSelectEntity={setSelectedEntity}
                />
              )}
              {activeTab === 'objects' && (
                <ObjectPalette
                  shops={shops}
                  selectedObject={selectedObject}
                  onSelectObject={setSelectedObject}
                />
              )}
              {activeTab === 'transitions' && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 mb-2">
                    Select a destination, then click on the map to place an exit
                  </p>
                  {neighborLocations.length === 0 ? (
                    <p className="text-sm text-zinc-500 italic">
                      No neighboring locations defined. Add neighbors in the Realm tab first.
                    </p>
                  ) : (
                    neighborLocations.map((loc) => (
                      <button
                        key={loc._id}
                        onClick={() => setSelectedTransitionTo(loc._id)}
                        className={`w-full p-2 text-left text-sm rounded ${
                          selectedTransitionTo === loc._id
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))
                  )}
                </div>
              )}
              {activeTab === 'conditions' && onCreateCondition && onDeleteCondition && onToggleCondition && (
                <ConditionsPalette
                  locationId={locationId}
                  conditions={conditions}
                  items={items}
                  quests={quests}
                  npcs={npcs}
                  abilities={abilities}
                  locations={neighborLocations}
                  factions={factions}
                  onCreate={onCreateCondition}
                  onUpdate={onUpdateCondition || (async () => {})}
                  onDelete={onDeleteCondition}
                  onToggle={onToggleCondition}
                />
              )}
              {activeTab === 'conditions' && !onCreateCondition && (
                <div className="text-sm text-zinc-500 italic text-center py-4">
                  Conditions not available. Save the layout first.
                </div>
              )}
              {activeTab === 'config' && (
                <ConfigPanel
                  entities={entities}
                  objects={objects}
                  shops={shops}
                  quests={quests}
                  onUpdateEntity={updateEntity}
                  onUpdateObject={updateObject}
                />
              )}
            </div>

            {/* Tool Bar */}
            <div className="border-t border-zinc-800 p-2">
              <ToolBar
                activeTool={activeTool}
                onSelectTool={setActiveTool}
              />
            </div>
          </div>
        )}

        {/* Canvas Area - Always shows game canvas */}
        <div className="flex-1 relative overflow-hidden bg-zinc-950 flex items-center justify-center">
          <AIGameCanvas
            ref={gameCanvasRef}
            width={Math.min(width * 32, isPlayMode ? window.innerWidth - 100 : window.innerWidth - 320 - 264)}
            height={Math.min(height * 32, window.innerHeight - 120)}
            tileSize={32}
            editMode={!isPlayMode}
            onTileClick={handleTileClick}
            className="border border-zinc-700 rounded-lg shadow-2xl"
          />

          {/* Play mode overlay info */}
          {isPlayMode && (
            <div className="absolute bottom-4 left-4 bg-zinc-800/90 px-4 py-2 rounded-lg">
              <div className="text-sm text-zinc-300">
                <span className="text-emerald-400 font-medium">Play Mode</span>
                <span className="mx-2 text-zinc-600">|</span>
                Use <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-xs mx-1">WASD</kbd> to move
                <span className="mx-2 text-zinc-600">|</span>
                Press <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-xs mx-1">ESC</kbd> to exit
              </div>
            </div>
          )}

          {/* Edit mode overlay info */}
          {!isPlayMode && (
            <div className="absolute bottom-4 left-4 bg-zinc-800/90 px-4 py-2 rounded-lg">
              <div className="text-sm text-zinc-300">
                <span className="text-amber-400 font-medium">Edit Mode</span>
                <span className="mx-2 text-zinc-600">|</span>
                Click to place
                <span className="mx-2 text-zinc-600">|</span>
                Tool: <span className="text-amber-400 capitalize">{activeTool}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Properties (only in edit mode) */}
        {!isPlayMode && (
          <div className="w-64 border-l border-zinc-800 bg-zinc-900 p-4 overflow-y-auto">
            <PropertiesPanel
              selectedItem={selectedItem}
              entities={entities}
              objects={objects}
              transitions={transitions}
              spawnX={spawnX}
              spawnY={spawnY}
              lighting={lighting}
              ambience={ambience}
              conditions={conditions.map(c => ({
                _id: c._id,
                name: c.name,
                trigger: c.trigger,
                isActive: c.isActive,
              }))}
              onUpdateLighting={setLighting}
              onUpdateAmbience={setAmbience}
              onUpdateEntity={updateEntity}
              onUpdateObject={updateObject}
              onDelete={removeSelectedItem}
            />

            {/* Map Size Controls */}
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Map Size</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500">Width</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => {
                      const newWidth = Math.max(10, Math.min(100, parseInt(e.target.value) || 10));
                      setWidth(newWidth);
                      setTiles(prev => prev.map(row => {
                        if (row.length < newWidth) {
                          return [...row, ...Array(newWidth - row.length).fill(TERRAIN.FLOOR_STONE)];
                        }
                        return row.slice(0, newWidth);
                      }));
                    }}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                    min={10}
                    max={100}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Height</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => {
                      const newHeight = Math.max(10, Math.min(100, parseInt(e.target.value) || 10));
                      setHeight(newHeight);
                      setTiles(prev => {
                        if (prev.length < newHeight) {
                          return [
                            ...prev,
                            ...Array(newHeight - prev.length).fill(null).map(() =>
                              Array(width).fill(TERRAIN.FLOOR_STONE)
                            ),
                          ];
                        }
                        return prev.slice(0, newHeight);
                      });
                    }}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                    min={10}
                    max={100}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function roleToEntityType(role: string): number {
  const roleMap: Record<string, number> = {
    'merchant': ENTITIES.MERCHANT,
    'guard': ENTITIES.GUARD,
    'priest': ENTITIES.PRIEST,
    'noble': ENTITIES.NOBLE,
    'villager': ENTITIES.VILLAGER,
  };
  return roleMap[role.toLowerCase()] || ENTITIES.VILLAGER;
}

function isInteractableObject(objectType: number): boolean {
  const interactable: number[] = [
    OBJECTS.CHEST_CLOSED, OBJECTS.CHEST_LOCKED, OBJECTS.BARREL,
    OBJECTS.CRATE, OBJECTS.URN, OBJECTS.SACK,
    OBJECTS.ALTAR, OBJECTS.FOUNTAIN, OBJECTS.LEVER,
  ];
  return interactable.includes(objectType);
}

function getDefaultObjectState(objectType: number): 'open' | 'closed' | 'locked' | 'active' | 'inactive' | undefined {
  if (objectType === OBJECTS.CHEST_CLOSED || objectType === OBJECTS.BARREL || objectType === OBJECTS.CRATE) {
    return 'closed';
  }
  if (objectType === OBJECTS.CHEST_LOCKED) {
    return 'locked';
  }
  if (objectType === OBJECTS.LEVER || objectType === OBJECTS.PRESSURE_PLATE) {
    return 'inactive';
  }
  return undefined;
}

function isWalkableTile(tileId: number): boolean {
  const walkable: number[] = [
    TERRAIN.FLOOR_STONE, TERRAIN.FLOOR_WOOD, TERRAIN.FLOOR_DIRT,
    TERRAIN.FLOOR_GRASS, TERRAIN.FLOOR_SAND, TERRAIN.FLOOR_COBBLE,
    TERRAIN.DOOR_OPEN, TERRAIN.GATE_OPEN, TERRAIN.STAIRS_DOWN,
    TERRAIN.STAIRS_UP, TERRAIN.BRIDGE, TERRAIN.WATER_SHALLOW,
  ];
  return walkable.includes(tileId);
}

export default TilemapEditor;
