'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AIGameEngine, AIGameEngineConfig, HoverInfo } from './AIGameEngine';
import { AIGameEvent, RoomData, RoomEntity, RoomObject } from './types';

export interface AIGameCanvasProps {
  width?: number;
  height?: number;
  tileSize?: number;
  zoom?: number; // Default zoom level (2.0 for Pokemon-style)
  className?: string;
  editMode?: boolean; // When true, disables player movement on click (for map editor)
  onTileClick?: (x: number, y: number) => void;
  onEntityClick?: (entityId: string, entity: RoomEntity, screenPos?: { x: number; y: number }) => void;
  onObjectClick?: (objectId: string, object: RoomObject, screenPos?: { x: number; y: number }) => void;
  onHover?: (info: HoverInfo | null) => void;
  onReady?: () => void;
}

export interface AIGameCanvasHandle {
  processEvent: (event: AIGameEvent) => void;
  loadRoom: (room: RoomData) => void;
  getPlayerPosition: () => { x: number; y: number } | null;
  getCurrentRoom: () => RoomData | null;
  getEntity: (entityId: string) => RoomEntity | undefined;
  loadDemoRoom: () => void;
  movePlayer: (dx: number, dy: number) => void;
  setPlayerPosition: (x: number, y: number) => void;
  // Zoom controls
  setZoom: (level: number, animate?: boolean) => void;
  getZoom: () => number;
  getDefaultZoom: () => number;
  // Battle controls
  enterBattleMode: (config: {
    enemies: Array<{ entityId: string; name: string; hp: number; maxHp: number; ac: number; damage: number; gridX: number; gridY: number }>;
    followers?: Array<{ entityId: string; name: string; hp: number; maxHp: number; ac: number; damage: number }>;
    playerMovementRange?: number;
    playerAttackRange?: number;
  }) => void;
  exitBattleMode: (outcome: 'victory' | 'defeat' | 'fled') => void;
  getBattleState: () => import('./types').BattleState | null;
  showBattleMovementRange: () => void;
  showBattleAttackRange: () => void;
  handleBattleClick: (gridX: number, gridY: number) => { action: 'move' | 'attack' | 'invalid'; targetId?: string; toX?: number; toY?: number } | null;
  battleMoveEntity: (entityId: string, toX: number, toY: number) => Promise<void>;
  endBattleTurn: () => void;
  setOnBattleStateChange: (callback: (state: import('./types').BattleState | null) => void) => void;
}

export const AIGameCanvas = forwardRef<AIGameCanvasHandle, AIGameCanvasProps>(
  (
    {
      width = 640,
      height = 480,
      tileSize = 32,
      zoom = 2.0, // Pokemon-style zoom
      className = '',
      editMode = false,
      onTileClick,
      onEntityClick,
      onObjectClick,
      onHover,
      onReady,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<AIGameEngine | null>(null);
    const isInitializedRef = useRef(false);

    // Initialize engine
    useEffect(() => {
      if (!containerRef.current || isInitializedRef.current) return;
      isInitializedRef.current = true;

      console.log('[AIGameCanvas] Initializing engine with dimensions:', width, height, tileSize);

      const config: AIGameEngineConfig = {
        width,
        height,
        tileSize,
        zoom,
        editMode,
        onTileClick,
        onEntityClick,
        onObjectClick,
        onHover,
      };

      const engine = new AIGameEngine(config);
      engineRef.current = engine;

      engine.init(containerRef.current).then(() => {
        console.log('[AIGameCanvas] Engine initialized successfully');
        onReady?.();
      }).catch((err) => {
        console.error('[AIGameCanvas] Engine init failed:', err);
      });

      return () => {
        console.log('[AIGameCanvas] Destroying engine');
        engine.destroy();
        engineRef.current = null;
        isInitializedRef.current = false;
      };
    }, [width, height, tileSize]);

    // Update editMode when it changes
    useEffect(() => {
      engineRef.current?.setEditMode(editMode);
    }, [editMode]);

    // Update callbacks when they change (prevents stale closures)
    useEffect(() => {
      engineRef.current?.setOnTileClick(onTileClick);
    }, [onTileClick]);

    useEffect(() => {
      engineRef.current?.setOnEntityClick(onEntityClick);
    }, [onEntityClick]);

    useEffect(() => {
      engineRef.current?.setOnObjectClick(onObjectClick);
    }, [onObjectClick]);

    useEffect(() => {
      engineRef.current?.setOnHover(onHover);
    }, [onHover]);

    // Expose imperative methods
    useImperativeHandle(
      ref,
      () => ({
        processEvent: (event: AIGameEvent) => {
          console.log('[AIGameCanvas] Processing event:', event.type);
          engineRef.current?.processEvent(event);
        },
        loadRoom: (room: RoomData) => {
          console.log('[AIGameCanvas] Loading room:', room.width, 'x', room.height);
          engineRef.current?.loadRoom(room);
        },
        getPlayerPosition: () => {
          return engineRef.current?.player ?? null;
        },
        getCurrentRoom: () => {
          return engineRef.current?.room ?? null;
        },
        getEntity: (entityId: string) => {
          return engineRef.current?.room?.entities.find(e => e.id === entityId);
        },
        loadDemoRoom: () => {
          console.log('[AIGameCanvas] Loading demo room');
          const demoRoom: RoomData = {
            width: 12,
            height: 10,
            tiles: [
              [10,10,10,10,10,10,10,10,10,10,10,10],
              [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,10],
              [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,10],
              [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,10],
              [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,10],
              [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,10],
              [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,10],
              [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,10],
              [10, 1, 1, 1, 1,31, 1, 1, 1, 1, 1,10],
              [10,10,10,10,10,10,10,10,10,10,10,10],
            ],
            entities: [
              { id: 'goblin_1', type: 110, x: 8, y: 4, name: 'Sneaky Goblin', hostile: true, hp: 15, maxHp: 15 }
            ],
            objects: [
              { id: 'chest_1', type: 200, x: 6, y: 2, interactable: true, state: 'closed' as const },
              { id: 'torch_1', type: 220, x: 2, y: 2, interactable: false },
              { id: 'torch_2', type: 220, x: 9, y: 2, interactable: false },
            ],
            lighting: 'dim',
            ambience: 'dungeon',
            playerSpawn: { x: 5, y: 8 }
          };
          engineRef.current?.loadRoom(demoRoom);
        },
        movePlayer: (dx: number, dy: number) => {
          const pos = engineRef.current?.player;
          if (pos) {
            const newX = pos.x + dx;
            const newY = pos.y + dy;
            engineRef.current?.movePlayerTo(newX, newY);
          }
        },
        setPlayerPosition: (x: number, y: number) => {
          engineRef.current?.movePlayerTo(x, y);
        },
        // Zoom controls
        setZoom: (level: number, animate: boolean = true) => {
          engineRef.current?.setZoom(level, animate);
        },
        getZoom: () => {
          return engineRef.current?.getZoom() ?? 2.0;
        },
        getDefaultZoom: () => {
          return engineRef.current?.getDefaultZoom() ?? 2.0;
        },
        // Battle controls
        enterBattleMode: (config) => {
          engineRef.current?.enterBattleMode(config);
        },
        exitBattleMode: (outcome) => {
          engineRef.current?.exitBattleMode(outcome);
        },
        getBattleState: () => {
          return engineRef.current?.getBattleState() ?? null;
        },
        showBattleMovementRange: () => {
          engineRef.current?.showBattleMovementRange();
        },
        showBattleAttackRange: () => {
          engineRef.current?.showBattleAttackRange();
        },
        handleBattleClick: (gridX, gridY) => {
          return engineRef.current?.handleBattleClick(gridX, gridY) ?? null;
        },
        battleMoveEntity: async (entityId, toX, toY) => {
          await engineRef.current?.battleMoveEntity(entityId, toX, toY);
        },
        endBattleTurn: () => {
          engineRef.current?.endBattleTurn();
        },
        setOnBattleStateChange: (callback) => {
          engineRef.current?.setOnBattleStateChange(callback);
        },
      }),
      []
    );

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{
          width,
          height,
          backgroundColor: '#0a0a0f',
        }}
      />
    );
  }
);

AIGameCanvas.displayName = 'AIGameCanvas';

// ============================================
// AI EVENT PARSER
// ============================================

/**
 * Parses AI response text to extract game events
 * Events are embedded in XML-like tags: <gameEvent>...</gameEvent> or <mapEvents>...</mapEvents>
 */
export function parseAIGameEvents(text: string): AIGameEvent[] {
  const events: AIGameEvent[] = [];

  // Match single gameEvent blocks (legacy format)
  const singleEventRegex = /<gameEvent>([\s\S]*?)<\/gameEvent>/g;
  let match;

  while ((match = singleEventRegex.exec(text)) !== null) {
    try {
      const eventJson = match[1].trim();
      const event = JSON.parse(eventJson) as AIGameEvent;
      events.push(event);
    } catch (e) {
      console.warn('Failed to parse game event:', e);
    }
  }

  // Match mapEvents blocks (array format)
  const mapEventsRegex = /<mapEvents>([\s\S]*?)<\/mapEvents>/g;

  while ((match = mapEventsRegex.exec(text)) !== null) {
    try {
      const eventsJson = match[1].trim();
      const parsedEvents = JSON.parse(eventsJson) as AIGameEvent[];
      if (Array.isArray(parsedEvents)) {
        events.push(...parsedEvents);
      }
    } catch (e) {
      console.warn('Failed to parse map events:', e);
    }
  }

  return events;
}

/**
 * Parses individual event types from AI response
 */
export function parseRoomGeneration(text: string): RoomData | null {
  const roomRegex = /<generateRoom>([\s\S]*?)<\/generateRoom>/;
  const match = roomRegex.exec(text);

  if (match) {
    try {
      return JSON.parse(match[1].trim()) as RoomData;
    } catch (e) {
      console.warn('Failed to parse room data:', e);
    }
  }

  return null;
}

export function parseMoveEntity(text: string): { entityId: string; path: { x: number; y: number }[]; speed: 'slow' | 'normal' | 'fast' } | null {
  const moveRegex = /<moveEntity>([\s\S]*?)<\/moveEntity>/;
  const match = moveRegex.exec(text);

  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.warn('Failed to parse move entity:', e);
    }
  }

  return null;
}

export function parseSpawnEntity(text: string): { id: string; type: number; x: number; y: number; name: string; hostile: boolean } | null {
  const spawnRegex = /<spawnEntity>([\s\S]*?)<\/spawnEntity>/;
  const match = spawnRegex.exec(text);

  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.warn('Failed to parse spawn entity:', e);
    }
  }

  return null;
}

export function parseCombatEffect(text: string): { attackerId: string; targetId: string; effectType: string; damage?: number; isCritical?: boolean; miss?: boolean } | null {
  const combatRegex = /<combatEffect>([\s\S]*?)<\/combatEffect>/;
  const match = combatRegex.exec(text);

  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.warn('Failed to parse combat effect:', e);
    }
  }

  return null;
}

// ============================================
// STREAMING EVENT PROCESSOR
// ============================================

const MAX_PROCESSED_EVENTS = 1000;

/**
 * Creates a streaming processor that handles AI events as they arrive
 */
export function createEventProcessor(
  canvasRef: React.RefObject<AIGameCanvasHandle | null>,
  options?: {
    onRoomGenerated?: (room: RoomData) => void;
    onEntityMoved?: (entityId: string) => void;
    onCombat?: (attackerId: string, targetId: string, damage: number) => void;
  }
) {
  let buffer = '';
  let processedEvents = new Set<string>();
  let processedCount = 0;

  const pruneProcessedEvents = () => {
    if (processedEvents.size > MAX_PROCESSED_EVENTS) {
      // Keep only the most recent half when we exceed the limit
      const entries = Array.from(processedEvents);
      processedEvents = new Set(entries.slice(entries.length / 2));
    }
  };

  return {
    /**
     * Process incoming text chunk from streaming AI response
     */
    processChunk: (chunk: string) => {
      buffer += chunk;

      // Try to extract complete events
      const events = parseAIGameEvents(buffer);

      for (const event of events) {
        // Create a unique key for this event to avoid processing duplicates
        const eventKey = JSON.stringify(event);
        if (processedEvents.has(eventKey)) continue;
        processedEvents.add(eventKey);
        processedCount++;

        // Prune if we've accumulated too many events
        if (processedCount % 100 === 0) {
          pruneProcessedEvents();
        }

        // Process the event
        canvasRef.current?.processEvent(event);

        // Trigger callbacks
        if (event.type === 'generateRoom' && options?.onRoomGenerated) {
          options.onRoomGenerated(event.generateRoom);
        }
        if (event.type === 'moveEntity' && options?.onEntityMoved) {
          options.onEntityMoved(event.moveEntity.entityId);
        }
        if (event.type === 'combatEffect' && options?.onCombat) {
          options.onCombat(
            event.combatEffect.attackerId,
            event.combatEffect.targetId,
            event.combatEffect.damage ?? 0
          );
        }
      }
    },

    /**
     * Reset the processor for a new message
     */
    reset: () => {
      buffer = '';
      processedEvents.clear();
      processedCount = 0;
    },

    /**
     * Get the current buffer (for debugging)
     */
    getBuffer: () => buffer,
  };
}

export default AIGameCanvas;
