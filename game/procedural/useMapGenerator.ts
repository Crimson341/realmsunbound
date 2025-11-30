'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { RoomData, RoomEntity, RoomObject, TERRAIN, ENTITIES, OBJECTS, LightingLevel, AmbienceType } from '../ai-canvas/types';
import {
  LocationTemplateRaw,
  GeneratedMapRaw,
  PlacedEntity,
  PlacedObject,
  Transition,
  EntityState,
  ObjectState,
  parseLocationTemplate,
  parseGeneratedMap,
} from './types';

interface UseMapGeneratorOptions {
  campaignId: Id<"campaigns">;
  playerId: string;
}

interface UseMapGeneratorReturn {
  generateMap: (locationId: Id<"locations">, fromLocationId?: Id<"locations">) => Promise<RoomData>;
  updateEntityState: (locationId: Id<"locations">, entityId: string, state: Partial<EntityState>) => Promise<void>;
  updateObjectState: (locationId: Id<"locations">, objectId: string, state: Partial<ObjectState>) => Promise<void>;
  updateExploredTiles: (locationId: Id<"locations">, tiles: string[]) => Promise<void>;
}

/**
 * React hook for map generation using creator templates.
 * Replaces AI-based map generation with template-based generation.
 */
export function useMapGenerator({ campaignId, playerId }: UseMapGeneratorOptions): UseMapGeneratorReturn {
  // Mutations
  const getOrCreateMap = useMutation(api.mapGenerator.getOrCreateGeneratedMap);
  const updateEntity = useMutation(api.mapGenerator.updateEntityState);
  const updateObject = useMutation(api.mapGenerator.updateObjectState);
  const updateTiles = useMutation(api.mapGenerator.updateExploredTiles);

  /**
   * Generate or load a map for a location.
   * Uses template if available, otherwise generates a fallback procedural map.
   */
  const generateMap = useCallback(async (
    locationId: Id<"locations">,
    fromLocationId?: Id<"locations">
  ): Promise<RoomData> => {
    try {
      // Try to get or create the generated map
      const mapResult = await getOrCreateMap({
        campaignId,
        playerId,
        locationId,
        // If no existing map, these will be used for a new map
        width: 20,
        height: 15,
        tiles: JSON.stringify(generateBasicTiles(20, 15)),
      });

      if (!mapResult) {
        // Return fallback room
        return generateFallbackRoom();
      }

      // Parse the generated map
      const tiles = JSON.parse(mapResult.tiles) as number[][];
      const entityStates = JSON.parse(mapResult.entityStates) as Record<string, EntityState>;
      const objectStates = JSON.parse(mapResult.objectStates) as Record<string, ObjectState>;

      // For now, return basic room data
      // In full implementation, this would fetch the template and apply dynamic state
      return {
        width: mapResult.width,
        height: mapResult.height,
        tiles,
        entities: [],
        objects: [],
        lighting: 'dim',
        ambience: 'dungeon',
        playerSpawn: { x: Math.floor(mapResult.width / 2), y: Math.floor(mapResult.height / 2) },
      };
    } catch (error) {
      console.error('[MapGenerator] Error generating map:', error);
      return generateFallbackRoom();
    }
  }, [campaignId, playerId, getOrCreateMap]);

  /**
   * Update entity state (when enemy is killed, etc.)
   */
  const updateEntityState = useCallback(async (
    locationId: Id<"locations">,
    entityId: string,
    state: Partial<EntityState>
  ) => {
    try {
      await updateEntity({
        campaignId,
        playerId,
        locationId,
        entityId,
        state: {
          hp: state.hp,
          x: state.x,
          y: state.y,
          dead: state.dead,
          diedAt: state.diedAt,
        },
      });
    } catch (error) {
      console.error('[MapGenerator] Error updating entity state:', error);
    }
  }, [campaignId, playerId, updateEntity]);

  /**
   * Update object state (when chest is opened, etc.)
   */
  const updateObjectState = useCallback(async (
    locationId: Id<"locations">,
    objectId: string,
    state: Partial<ObjectState>
  ) => {
    try {
      await updateObject({
        campaignId,
        playerId,
        locationId,
        objectId,
        state: {
          opened: state.opened,
          destroyed: state.destroyed,
          openedAt: state.openedAt,
          state: state.state,
        },
      });
    } catch (error) {
      console.error('[MapGenerator] Error updating object state:', error);
    }
  }, [campaignId, playerId, updateObject]);

  /**
   * Update explored tiles (fog of war)
   */
  const updateExploredTiles = useCallback(async (
    locationId: Id<"locations">,
    tiles: string[]
  ) => {
    try {
      await updateTiles({
        campaignId,
        playerId,
        locationId,
        newTiles: tiles,
      });
    } catch (error) {
      console.error('[MapGenerator] Error updating explored tiles:', error);
    }
  }, [campaignId, playerId, updateTiles]);

  return {
    generateMap,
    updateEntityState,
    updateObjectState,
    updateExploredTiles,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateFallbackRoom(): RoomData {
  const width = 20;
  const height = 15;

  return {
    width,
    height,
    tiles: generateBasicTiles(width, height),
    entities: [],
    objects: [
      {
        id: 'torch_1',
        type: OBJECTS.TORCH_WALL,
        x: 5,
        y: 2,
        interactable: false,
      },
      {
        id: 'torch_2',
        type: OBJECTS.TORCH_WALL,
        x: 14,
        y: 2,
        interactable: false,
      },
    ],
    lighting: 'dim',
    ambience: 'dungeon',
    playerSpawn: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
  };
}

function generateBasicTiles(width: number, height: number): number[][] {
  const tiles: number[][] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      // Border walls
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tiles[y][x] = TERRAIN.WALL_STONE;
      } else {
        // Random floor variation
        const r = Math.random();
        if (r < 0.1) {
          tiles[y][x] = TERRAIN.WALL_STONE; // Random obstacles
        } else if (r < 0.3) {
          tiles[y][x] = TERRAIN.FLOOR_GRASS;
        } else {
          tiles[y][x] = TERRAIN.FLOOR_STONE;
        }
      }
    }
  }

  // Clear spawn area in center
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (tiles[cy + dy] && tiles[cy + dy][cx + dx] !== undefined) {
        tiles[cy + dy][cx + dx] = TERRAIN.FLOOR_STONE;
      }
    }
  }

  return tiles;
}

export default useMapGenerator;
