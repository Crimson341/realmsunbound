import { GameEngine } from '../engine/GameEngine';
import { generateDefaultMap } from '../engine/TileMap';
import { NPC } from '../entities/NPC';

// NPC role colors
const ROLE_COLORS: Record<string, number> = {
  merchant: 0xfbbf24,
  guard: 0x64748b,
  villager: 0xa78bfa,
  enemy: 0xef4444,
  quest: 0x60a5fa,
  healer: 0x4ade80,
  trainer: 0xf97316,
};

export interface LocationData {
  _id: string;
  name: string;
  type: string;
  description: string;
  tilemapData?: string;
  tilemapWidth?: number;
  tilemapHeight?: number;
  collisionMask?: string;
  spawnPoints?: string;
  transitions?: string;
}

export interface NPCData {
  _id: string;
  name: string;
  description: string;
  role?: string;
  isHostile?: boolean;
  isDead?: boolean;
  gridX?: number;
  gridY?: number;
  spriteColor?: string;
  movementPattern?: string;
}

export class WorldManager {
  private engine: GameEngine;
  private currentLocationId: string | null = null;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  async loadLocation(
    location: LocationData,
    npcs: NPCData[],
    playerSpawn?: { x: number; y: number }
  ): Promise<void> {
    // Clear existing NPCs
    this.engine.clearNPCs();

    // Parse or generate tilemap data
    let tilemapData: number[][];
    let collisionMask: number[][];
    let transitions: Array<{
      x: number;
      y: number;
      toLocationId: string;
      spawnPoint: { x: number; y: number };
    }> = [];

    if (location.tilemapData) {
      try {
        tilemapData = JSON.parse(location.tilemapData);
        collisionMask = JSON.parse(location.collisionMask || '[]');
        transitions = JSON.parse(location.transitions || '[]');
      } catch {
        // Fallback to default map if parsing fails
        const defaultMap = generateDefaultMap(
          location.tilemapWidth || 20,
          location.tilemapHeight || 15
        );
        tilemapData = defaultMap.tilemapData;
        collisionMask = defaultMap.collisionMask;
      }
    } else {
      // Generate default map based on location type
      const size = this.getMapSizeForType(location.type);
      const defaultMap = generateDefaultMap(size.width, size.height);
      tilemapData = defaultMap.tilemapData;
      collisionMask = defaultMap.collisionMask;
    }

    // Load tilemap into engine
    this.engine.loadLocation(tilemapData, collisionMask, transitions);

    // Determine player spawn point
    let spawn: { x: number; y: number };
    if (playerSpawn) {
      spawn = playerSpawn;
    } else {
      try {
        const spawnPoints = JSON.parse(location.spawnPoints || '{}');
        spawn = spawnPoints.player || { x: 2, y: 2 };
      } catch {
        spawn = { x: 2, y: 2 };
      }
    }

    // Spawn player
    this.engine.spawnPlayer(spawn.x, spawn.y);

    // Spawn NPCs
    this.spawnNPCs(npcs, tilemapData[0].length, tilemapData.length);

    this.currentLocationId = location._id;
  }

  private spawnNPCs(npcs: NPCData[], mapWidth: number, mapHeight: number): void {
    const usedPositions = new Set<string>();

    for (const npc of npcs) {
      if (npc.isDead) continue;

      // Determine position
      let gridX = npc.gridX;
      let gridY = npc.gridY;

      // If no position, find a random valid one
      if (gridX === undefined || gridY === undefined) {
        const pos = this.findRandomPosition(mapWidth, mapHeight, usedPositions);
        gridX = pos.x;
        gridY = pos.y;
      }

      usedPositions.add(`${gridX},${gridY}`);

      // Determine color
      let color: number | null = null;
      if (npc.spriteColor) {
        color = parseInt(npc.spriteColor.replace('#', ''), 16);
      } else if (npc.role) {
        color = ROLE_COLORS[npc.role.toLowerCase()] || null;
      }

      // Determine if hostile
      const isHostile = npc.isHostile || npc.role?.toLowerCase() === 'enemy';

      // Spawn NPC
      this.engine.spawnNPC({
        id: npc._id,
        name: npc.name,
        gridX,
        gridY,
        color: color || 0x94a3b8,
        isHostile: isHostile || false,
        role: npc.role || 'villager',
      });
    }
  }

  private findRandomPosition(
    mapWidth: number,
    mapHeight: number,
    usedPositions: Set<string>
  ): { x: number; y: number } {
    // Try to find a position away from spawn
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = 3 + Math.floor(Math.random() * (mapWidth - 6));
      const y = 3 + Math.floor(Math.random() * (mapHeight - 6));
      const key = `${x},${y}`;

      if (!usedPositions.has(key)) {
        return { x, y };
      }
    }

    // Fallback
    return { x: 5, y: 5 };
  }

  private getMapSizeForType(type: string): { width: number; height: number } {
    switch (type?.toLowerCase()) {
      case 'city':
      case 'town':
        return { width: 30, height: 25 };
      case 'dungeon':
      case 'cave':
        return { width: 25, height: 20 };
      case 'village':
        return { width: 20, height: 15 };
      case 'forest':
      case 'wilderness':
        return { width: 35, height: 30 };
      default:
        return { width: 20, height: 15 };
    }
  }

  getCurrentLocationId(): string | null {
    return this.currentLocationId;
  }
}
