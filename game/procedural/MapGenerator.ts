import { Id } from "@/convex/_generated/dataModel";
import { RoomData, RoomEntity, RoomObject, LightingLevel, AmbienceType, TERRAIN, OBJECTS, ENTITIES } from "../ai-canvas/types";
import {
  LocationTemplate,
  LocationTemplateRaw,
  GeneratedMap,
  GeneratedMapRaw,
  PlacedEntity,
  PlacedObject,
  Transition,
  EntityState,
  ObjectState,
  Position,
  parseLocationTemplate,
  parseGeneratedMap,
} from "./types";

// ============================================
// MAP GENERATOR CLASS
// ============================================

export class MapGenerator {
  private campaignId: Id<"campaigns">;
  private playerId: string;

  // Convex client functions (injected from React hook)
  private getTemplate: (locationId: Id<"locations">) => Promise<LocationTemplateRaw | null>;
  private getGeneratedMap: (locationId: Id<"locations">) => Promise<GeneratedMapRaw | null>;
  private saveGeneratedMap: (data: {
    locationId: Id<"locations">;
    width: number;
    height: number;
    tiles: string;
    templateId?: Id<"locationTemplates">;
    templateVersion?: number;
  }) => Promise<GeneratedMapRaw>;
  private getLocation: (locationId: Id<"locations">) => Promise<LocationData | null>;
  private getNPCsAtLocation: (locationId: Id<"locations">) => Promise<NPCData[]>;
  private getShopsAtLocation: (locationId: Id<"locations">) => Promise<ShopData[]>;

  constructor(
    campaignId: Id<"campaigns">,
    playerId: string,
    convexFunctions: {
      getTemplate: (locationId: Id<"locations">) => Promise<LocationTemplateRaw | null>;
      getGeneratedMap: (locationId: Id<"locations">) => Promise<GeneratedMapRaw | null>;
      saveGeneratedMap: (data: {
        locationId: Id<"locations">;
        width: number;
        height: number;
        tiles: string;
        templateId?: Id<"locationTemplates">;
        templateVersion?: number;
      }) => Promise<GeneratedMapRaw>;
      getLocation: (locationId: Id<"locations">) => Promise<LocationData | null>;
      getNPCsAtLocation: (locationId: Id<"locations">) => Promise<NPCData[]>;
      getShopsAtLocation: (locationId: Id<"locations">) => Promise<ShopData[]>;
    }
  ) {
    this.campaignId = campaignId;
    this.playerId = playerId;
    this.getTemplate = convexFunctions.getTemplate;
    this.getGeneratedMap = convexFunctions.getGeneratedMap;
    this.saveGeneratedMap = convexFunctions.saveGeneratedMap;
    this.getLocation = convexFunctions.getLocation;
    this.getNPCsAtLocation = convexFunctions.getNPCsAtLocation;
    this.getShopsAtLocation = convexFunctions.getShopsAtLocation;
  }

  // ============================================
  // MAIN GENERATION METHOD
  // ============================================

  /**
   * Generate or load a map for a location.
   * If a generated map exists for this player, load it.
   * Otherwise, generate from template or use fallback.
   */
  async generateMap(
    locationId: Id<"locations">,
    fromLocationId?: Id<"locations">
  ): Promise<RoomData> {
    // Check if map already exists for this player
    const existingMapRaw = await this.getGeneratedMap(locationId);

    if (existingMapRaw) {
      // Load existing map with dynamic state
      const existingMap = parseGeneratedMap(existingMapRaw);
      const templateRaw = existingMap.templateId
        ? await this.getTemplate(locationId)
        : null;
      const template = templateRaw ? parseLocationTemplate(templateRaw) : null;

      return this.generatedMapToRoomData(existingMap, template, fromLocationId);
    }

    // No existing map - generate new one
    const templateRaw = await this.getTemplate(locationId);

    if (templateRaw) {
      // Generate from template
      const template = parseLocationTemplate(templateRaw);
      return await this.generateFromTemplate(locationId, template, fromLocationId);
    }

    // No template - generate fallback procedural map
    return await this.generateFallbackMap(locationId, fromLocationId);
  }

  // ============================================
  // TEMPLATE-BASED GENERATION
  // ============================================

  private async generateFromTemplate(
    locationId: Id<"locations">,
    template: LocationTemplate,
    fromLocationId?: Id<"locations">
  ): Promise<RoomData> {
    // Save the generated map to database
    await this.saveGeneratedMap({
      locationId,
      width: template.width,
      height: template.height,
      tiles: JSON.stringify(template.tiles),
      templateId: template._id,
      templateVersion: template.version,
    });

    // Convert template to RoomData
    return this.templateToRoomData(template, undefined, fromLocationId);
  }

  /**
   * Convert a LocationTemplate to RoomData for the rendering engine.
   * Applies any dynamic state from a GeneratedMap if provided.
   */
  private templateToRoomData(
    template: LocationTemplate,
    dynamicState?: GeneratedMap,
    fromLocationId?: Id<"locations">
  ): RoomData {
    // Apply dynamic state to entities (filter out dead ones, update positions)
    const entities: RoomEntity[] = template.placedEntities
      .filter((pe) => {
        if (!dynamicState) return true;
        const state = dynamicState.entityStates[pe.id];
        return !state?.dead;
      })
      .map((pe) => {
        const state = dynamicState?.entityStates[pe.id];
        return {
          id: pe.id,
          type: pe.entityType,
          x: state?.x ?? pe.x,
          y: state?.y ?? pe.y,
          name: pe.name,
          hostile: pe.hostile,
          hp: state?.hp ?? pe.hp,
          maxHp: pe.maxHp,
        };
      });

    // Apply dynamic state to objects (handle opened/destroyed)
    const placedObjects: RoomObject[] = template.placedObjects
      .filter((po) => {
        const state = dynamicState?.objectStates[po.id];
        return !state?.destroyed;
      })
      .map((po): RoomObject => {
        const state = dynamicState?.objectStates[po.id];
        return {
          id: po.id,
          type: po.objectType,
          x: po.x,
          y: po.y,
          interactable: po.interactable,
          state: state?.opened ? 'open' : po.state,
          contents: state?.opened ? [] : po.contents,
          label: po.label,
        };
      });

    // Add transition objects (doors/signs to other locations)
    const transitionObjects: RoomObject[] = template.transitions.map((tr): RoomObject => ({
      id: tr.id,
      type: tr.objectType,
      x: tr.x,
      y: tr.y,
      interactable: true,
      label: `To ${tr.toLocationName}`,
      exit: { toLocation: tr.toLocationName },
    }));

    const objects: RoomObject[] = [...placedObjects, ...transitionObjects];

    // Select spawn point based on where player came from
    const spawn = this.selectSpawnPoint(template, fromLocationId);

    return {
      width: template.width,
      height: template.height,
      tiles: template.tiles,
      entities,
      objects,
      lighting: template.lighting || 'dim',
      ambience: template.ambience || 'dungeon',
      playerSpawn: spawn,
    };
  }

  /**
   * Convert a GeneratedMap back to RoomData, using template for static content.
   */
  private generatedMapToRoomData(
    generatedMap: GeneratedMap,
    template: LocationTemplate | null,
    fromLocationId?: Id<"locations">
  ): RoomData {
    if (template) {
      // Use template with dynamic state applied
      return this.templateToRoomData(template, generatedMap, fromLocationId);
    }

    // Fallback map without template - basic RoomData
    return {
      width: generatedMap.width,
      height: generatedMap.height,
      tiles: generatedMap.tiles,
      entities: [],
      objects: [],
      lighting: 'dim',
      ambience: 'dungeon',
      playerSpawn: { x: Math.floor(generatedMap.width / 2), y: Math.floor(generatedMap.height / 2) },
    };
  }

  // ============================================
  // SPAWN POINT SELECTION
  // ============================================

  private selectSpawnPoint(
    template: LocationTemplate,
    fromLocationId?: Id<"locations">
  ): Position {
    // Check if we have an alternate spawn for where player came from
    if (fromLocationId && template.alternateSpawns) {
      const alternateSpawn = template.alternateSpawns.find(
        (s) => s.fromLocationId === fromLocationId
      );
      if (alternateSpawn) {
        return { x: alternateSpawn.x, y: alternateSpawn.y };
      }
    }

    // Use default spawn point
    return { x: template.playerSpawnX, y: template.playerSpawnY };
  }

  // ============================================
  // FALLBACK PROCEDURAL GENERATION
  // ============================================

  /**
   * Generate a basic procedural map when no template exists.
   * Uses location type and metadata to influence generation.
   */
  private async generateFallbackMap(
    locationId: Id<"locations">,
    fromLocationId?: Id<"locations">
  ): Promise<RoomData> {
    const location = await this.getLocation(locationId);
    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    const npcs = await this.getNPCsAtLocation(locationId);
    const shops = await this.getShopsAtLocation(locationId);

    // Determine map parameters based on location type
    const { width, height, generator } = this.getGeneratorForLocationType(location.type);

    // Generate base tiles
    const { tiles, collisionMask } = generator(width, height, this.hashString(locationId));

    // Find spawn point (center of map, on a walkable tile)
    const spawn = this.findWalkablePosition(tiles, width, height);

    // Place NPCs on the map
    const entities: RoomEntity[] = npcs.map((npc, index) => {
      const position = this.findWalkablePosition(tiles, width, height, spawn);
      return {
        id: `npc_${npc._id}`,
        type: this.npcRoleToEntityType(npc.role),
        x: position.x,
        y: position.y,
        name: npc.name,
        hostile: npc.isHostile || false,
        hp: npc.health || 20,
        maxHp: npc.maxHealth || 20,
      };
    });

    // Place shops as interactable objects
    const objects: RoomObject[] = shops.map((shop, index) => {
      const position = this.findWalkablePosition(tiles, width, height, spawn);
      return {
        id: `shop_${shop._id}`,
        type: OBJECTS.BOOKSHELF, // Use bookshelf as generic shop counter
        x: position.x,
        y: position.y,
        interactable: true,
        label: shop.name,
      };
    });

    // Add some ambient objects based on location type
    const ambientObjects = this.generateAmbientObjects(location.type, tiles, width, height, spawn);
    objects.push(...ambientObjects);

    // Save the generated map
    await this.saveGeneratedMap({
      locationId,
      width,
      height,
      tiles: JSON.stringify(tiles),
    });

    return {
      width,
      height,
      tiles,
      entities,
      objects,
      lighting: this.getLightingForLocationType(location.type),
      ambience: this.getAmbienceForLocationType(location.type),
      playerSpawn: spawn,
    };
  }

  // ============================================
  // PROCEDURAL GENERATORS BY LOCATION TYPE
  // ============================================

  private getGeneratorForLocationType(locationType: string): {
    width: number;
    height: number;
    generator: (w: number, h: number, seed: number) => { tiles: number[][]; collisionMask: number[][] };
  } {
    const type = locationType.toLowerCase();

    if (type.includes('dungeon') || type.includes('cave') || type.includes('crypt')) {
      return { width: 25, height: 20, generator: this.generateDungeonTiles };
    }
    if (type.includes('forest') || type.includes('woods')) {
      return { width: 30, height: 25, generator: this.generateForestTiles };
    }
    if (type.includes('town') || type.includes('city') || type.includes('village')) {
      return { width: 35, height: 30, generator: this.generateTownTiles };
    }
    if (type.includes('castle') || type.includes('fortress')) {
      return { width: 30, height: 25, generator: this.generateCastleTiles };
    }

    // Default fallback
    return { width: 20, height: 15, generator: this.generateBasicTiles };
  }

  private generateBasicTiles = (width: number, height: number, seed: number): { tiles: number[][]; collisionMask: number[][] } => {
    const rng = this.seededRandom(seed);
    const tiles: number[][] = [];
    const collisionMask: number[][] = [];

    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      collisionMask[y] = [];
      for (let x = 0; x < width; x++) {
        // Border walls
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          tiles[y][x] = TERRAIN.WALL_STONE;
          collisionMask[y][x] = 1;
        } else {
          // Mix of floor types
          const r = rng();
          if (r < 0.1) {
            tiles[y][x] = TERRAIN.WALL_STONE; // Random obstacles
            collisionMask[y][x] = 1;
          } else if (r < 0.4) {
            tiles[y][x] = TERRAIN.FLOOR_GRASS;
            collisionMask[y][x] = 0;
          } else {
            tiles[y][x] = TERRAIN.FLOOR_STONE;
            collisionMask[y][x] = 0;
          }
        }
      }
    }

    // Clear spawn area
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (tiles[cy + dy] && tiles[cy + dy][cx + dx] !== undefined) {
          tiles[cy + dy][cx + dx] = TERRAIN.FLOOR_STONE;
          collisionMask[cy + dy][cx + dx] = 0;
        }
      }
    }

    return { tiles, collisionMask };
  };

  private generateDungeonTiles = (width: number, height: number, seed: number): { tiles: number[][]; collisionMask: number[][] } => {
    const rng = this.seededRandom(seed);
    const tiles: number[][] = [];
    const collisionMask: number[][] = [];

    // Fill with walls
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      collisionMask[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = TERRAIN.WALL_CAVE;
        collisionMask[y][x] = 1;
      }
    }

    // Carve out rooms using simple BSP-like approach
    const rooms: { x: number; y: number; w: number; h: number }[] = [];
    const numRooms = 4 + Math.floor(rng() * 4);

    for (let i = 0; i < numRooms; i++) {
      const roomW = 5 + Math.floor(rng() * 6);
      const roomH = 4 + Math.floor(rng() * 5);
      const roomX = 1 + Math.floor(rng() * (width - roomW - 2));
      const roomY = 1 + Math.floor(rng() * (height - roomH - 2));

      // Carve room
      for (let y = roomY; y < roomY + roomH; y++) {
        for (let x = roomX; x < roomX + roomW; x++) {
          tiles[y][x] = TERRAIN.FLOOR_STONE;
          collisionMask[y][x] = 0;
        }
      }

      // Connect to previous room
      if (rooms.length > 0) {
        const prev = rooms[rooms.length - 1];
        const prevCX = prev.x + Math.floor(prev.w / 2);
        const prevCY = prev.y + Math.floor(prev.h / 2);
        const currCX = roomX + Math.floor(roomW / 2);
        const currCY = roomY + Math.floor(roomH / 2);

        // Horizontal corridor
        for (let x = Math.min(prevCX, currCX); x <= Math.max(prevCX, currCX); x++) {
          tiles[prevCY][x] = TERRAIN.FLOOR_STONE;
          collisionMask[prevCY][x] = 0;
        }
        // Vertical corridor
        for (let y = Math.min(prevCY, currCY); y <= Math.max(prevCY, currCY); y++) {
          tiles[y][currCX] = TERRAIN.FLOOR_STONE;
          collisionMask[y][currCX] = 0;
        }
      }

      rooms.push({ x: roomX, y: roomY, w: roomW, h: roomH });
    }

    return { tiles, collisionMask };
  };

  private generateForestTiles = (width: number, height: number, seed: number): { tiles: number[][]; collisionMask: number[][] } => {
    const rng = this.seededRandom(seed);
    const tiles: number[][] = [];
    const collisionMask: number[][] = [];

    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      collisionMask[y] = [];
      for (let x = 0; x < width; x++) {
        const r = rng();
        if (r < 0.15) {
          // Trees (walls)
          tiles[y][x] = TERRAIN.WALL_WOOD;
          collisionMask[y][x] = 1;
        } else if (r < 0.25) {
          // Dirt path
          tiles[y][x] = TERRAIN.FLOOR_DIRT;
          collisionMask[y][x] = 0;
        } else {
          // Grass
          tiles[y][x] = TERRAIN.FLOOR_GRASS;
          collisionMask[y][x] = 0;
        }
      }
    }

    // Carve a path through the forest
    const pathY = Math.floor(height / 2);
    for (let x = 0; x < width; x++) {
      const wobble = Math.floor(Math.sin(x * 0.3) * 2);
      for (let dy = -1; dy <= 1; dy++) {
        const y = pathY + wobble + dy;
        if (y >= 0 && y < height) {
          tiles[y][x] = TERRAIN.FLOOR_DIRT;
          collisionMask[y][x] = 0;
        }
      }
    }

    return { tiles, collisionMask };
  };

  private generateTownTiles = (width: number, height: number, seed: number): { tiles: number[][]; collisionMask: number[][] } => {
    const rng = this.seededRandom(seed);
    const tiles: number[][] = [];
    const collisionMask: number[][] = [];

    // Fill with cobblestone
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      collisionMask[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = TERRAIN.FLOOR_COBBLE;
        collisionMask[y][x] = 0;
      }
    }

    // Add building footprints (walls)
    const numBuildings = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < numBuildings; i++) {
      const bw = 4 + Math.floor(rng() * 4);
      const bh = 4 + Math.floor(rng() * 4);
      const bx = 2 + Math.floor(rng() * (width - bw - 4));
      const by = 2 + Math.floor(rng() * (height - bh - 4));

      // Building walls
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          if (x === bx || x === bx + bw - 1 || y === by || y === by + bh - 1) {
            tiles[y][x] = TERRAIN.WALL_BRICK;
            collisionMask[y][x] = 1;
          } else {
            tiles[y][x] = TERRAIN.FLOOR_WOOD;
            collisionMask[y][x] = 0;
          }
        }
      }

      // Door
      const doorX = bx + 1 + Math.floor(rng() * (bw - 2));
      tiles[by + bh - 1][doorX] = TERRAIN.DOOR_OPEN;
      collisionMask[by + bh - 1][doorX] = 0;
    }

    // Main street
    const streetY = Math.floor(height / 2);
    for (let x = 0; x < width; x++) {
      tiles[streetY][x] = TERRAIN.FLOOR_COBBLE;
      collisionMask[streetY][x] = 0;
      tiles[streetY + 1][x] = TERRAIN.FLOOR_COBBLE;
      collisionMask[streetY + 1][x] = 0;
    }

    return { tiles, collisionMask };
  };

  private generateCastleTiles = (width: number, height: number, seed: number): { tiles: number[][]; collisionMask: number[][] } => {
    const rng = this.seededRandom(seed);
    const tiles: number[][] = [];
    const collisionMask: number[][] = [];

    // Fill with stone floor
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      collisionMask[y] = [];
      for (let x = 0; x < width; x++) {
        // Outer walls
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          tiles[y][x] = TERRAIN.WALL_BRICK;
          collisionMask[y][x] = 1;
        } else {
          tiles[y][x] = TERRAIN.FLOOR_STONE;
          collisionMask[y][x] = 0;
        }
      }
    }

    // Add pillars
    for (let y = 4; y < height - 4; y += 5) {
      for (let x = 4; x < width - 4; x += 5) {
        tiles[y][x] = TERRAIN.WALL_STONE;
        collisionMask[y][x] = 1;
      }
    }

    // Throne area at the top
    const throneY = 3;
    const throneX = Math.floor(width / 2);
    for (let dx = -2; dx <= 2; dx++) {
      tiles[throneY - 1][throneX + dx] = TERRAIN.WALL_BRICK;
      collisionMask[throneY - 1][throneX + dx] = 1;
    }

    return { tiles, collisionMask };
  };

  // ============================================
  // AMBIENT OBJECT GENERATION
  // ============================================

  private generateAmbientObjects(
    locationType: string,
    tiles: number[][],
    width: number,
    height: number,
    avoidPosition: Position
  ): RoomObject[] {
    const objects: RoomObject[] = [];
    const type = locationType.toLowerCase();

    // Add torches for dungeons/caves
    if (type.includes('dungeon') || type.includes('cave') || type.includes('castle')) {
      const numTorches = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numTorches; i++) {
        const pos = this.findWalkablePosition(tiles, width, height, avoidPosition);
        objects.push({
          id: `torch_${i}`,
          type: OBJECTS.TORCH_WALL,
          x: pos.x,
          y: pos.y,
          interactable: false,
        });
      }
    }

    // Add campfire for forests
    if (type.includes('forest')) {
      const pos = this.findWalkablePosition(tiles, width, height, avoidPosition);
      objects.push({
        id: 'campfire_1',
        type: OBJECTS.CAMPFIRE,
        x: pos.x,
        y: pos.y,
        interactable: false,
      });
    }

    // Add fountain for towns
    if (type.includes('town') || type.includes('city')) {
      const pos = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
      objects.push({
        id: 'fountain_1',
        type: OBJECTS.FOUNTAIN,
        x: pos.x,
        y: pos.y,
        interactable: true,
        label: 'Town Fountain',
      });
    }

    return objects;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private npcRoleToEntityType(role: string): number {
    const roleMap: Record<string, number> = {
      'merchant': ENTITIES.MERCHANT,
      'guard': ENTITIES.GUARD,
      'priest': ENTITIES.PRIEST,
      'noble': ENTITIES.NOBLE,
      'villager': ENTITIES.VILLAGER,
    };
    return roleMap[role.toLowerCase()] || ENTITIES.VILLAGER;
  }

  private getLightingForLocationType(locationType: string): LightingLevel {
    const type = locationType.toLowerCase();
    if (type.includes('dungeon') || type.includes('cave') || type.includes('crypt')) {
      return 'dark';
    }
    if (type.includes('forest') || type.includes('night')) {
      return 'dim';
    }
    return 'bright';
  }

  private getAmbienceForLocationType(locationType: string): AmbienceType {
    const type = locationType.toLowerCase();
    if (type.includes('dungeon')) return 'dungeon';
    if (type.includes('cave')) return 'cave';
    if (type.includes('crypt')) return 'crypt';
    if (type.includes('forest')) return 'forest';
    if (type.includes('castle')) return 'castle';
    if (type.includes('town')) return 'town';
    if (type.includes('village')) return 'village';
    if (type.includes('city')) return 'city';
    if (type.includes('temple')) return 'temple';
    if (type.includes('swamp')) return 'swamp';
    return 'dungeon';
  }

  private findWalkablePosition(
    tiles: number[][],
    width: number,
    height: number,
    avoidPosition?: Position,
    minDistance: number = 3
  ): Position {
    const isWalkable = (x: number, y: number): boolean => {
      const tile = tiles[y]?.[x];
      return tile === TERRAIN.FLOOR_STONE ||
             tile === TERRAIN.FLOOR_WOOD ||
             tile === TERRAIN.FLOOR_DIRT ||
             tile === TERRAIN.FLOOR_GRASS ||
             tile === TERRAIN.FLOOR_COBBLE;
    };

    // Try random positions
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = 2 + Math.floor(Math.random() * (width - 4));
      const y = 2 + Math.floor(Math.random() * (height - 4));

      if (isWalkable(x, y)) {
        if (!avoidPosition || this.distance(x, y, avoidPosition.x, avoidPosition.y) >= minDistance) {
          return { x, y };
        }
      }
    }

    // Fallback to center
    return { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }
}

// ============================================
// HELPER TYPES FOR CONVEX DATA
// ============================================

interface LocationData {
  _id: Id<"locations">;
  name: string;
  type: string;
  description: string;
}

interface NPCData {
  _id: Id<"npcs">;
  name: string;
  role: string;
  isHostile?: boolean;
  health?: number;
  maxHealth?: number;
}

interface ShopData {
  _id: Id<"shops">;
  name: string;
  type: string;
}
