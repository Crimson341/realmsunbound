// ============================================
// TILE & SPRITE ID CONSTANTS
// ============================================

// Terrain tiles (0-99)
export const TERRAIN = {
  VOID: 0,
  FLOOR_STONE: 1,
  FLOOR_WOOD: 2,
  FLOOR_DIRT: 3,
  FLOOR_GRASS: 4,
  FLOOR_SAND: 5,
  FLOOR_COBBLE: 6,
  WALL_STONE: 10,
  WALL_BRICK: 11,
  WALL_CAVE: 12,
  WALL_WOOD: 13,
  WATER_SHALLOW: 20,
  WATER_DEEP: 21,
  LAVA: 22,
  ICE: 23,
  DOOR_CLOSED: 30,
  DOOR_OPEN: 31,
  DOOR_LOCKED: 32,
  GATE_CLOSED: 33,
  GATE_OPEN: 34,
  STAIRS_DOWN: 40,
  STAIRS_UP: 41,
  PIT: 42,
  BRIDGE: 43,
} as const;

// Entity sprites (100-199)
export const ENTITIES = {
  // Player classes
  PLAYER_WARRIOR: 100,
  PLAYER_MAGE: 101,
  PLAYER_ROGUE: 102,
  PLAYER_RANGER: 103,
  PLAYER_CLERIC: 104,
  // Goblins
  GOBLIN: 110,
  GOBLIN_ARCHER: 111,
  GOBLIN_SHAMAN: 112,
  // Orcs
  ORC: 115,
  ORC_BERSERKER: 116,
  ORC_CHIEF: 117,
  // Undead
  SKELETON: 120,
  SKELETON_WARRIOR: 121,
  SKELETON_MAGE: 122,
  ZOMBIE: 125,
  ZOMBIE_HULK: 126,
  GHOST: 127,
  // Beasts
  RAT: 130,
  GIANT_RAT: 131,
  SPIDER: 132,
  GIANT_SPIDER: 133,
  BAT: 134,
  WOLF: 135,
  // NPCs
  VILLAGER: 140,
  MERCHANT: 141,
  GUARD: 142,
  PRIEST: 143,
  NOBLE: 144,
  // Bosses
  BOSS_DEMON: 150,
  BOSS_DRAGON: 151,
  BOSS_LICH: 152,
  BOSS_TROLL: 153,
} as const;

// Objects (200-299)
export const OBJECTS = {
  // Containers
  CHEST_CLOSED: 200,
  CHEST_OPEN: 201,
  CHEST_LOCKED: 202,
  BARREL: 203,
  CRATE: 204,
  URN: 205,
  SACK: 206,
  // Furniture
  TABLE: 210,
  CHAIR: 211,
  BED: 212,
  BOOKSHELF: 213,
  THRONE: 214,
  // Light sources
  TORCH_WALL: 220,
  TORCH_GROUND: 221,
  CAMPFIRE: 222,
  BRAZIER: 223,
  LANTERN: 224,
  CRYSTAL_GLOW: 225,
  // Interactables
  ALTAR: 230,
  FOUNTAIN: 231,
  LEVER: 232,
  PRESSURE_PLATE: 233,
  STATUE: 234,
  // Loot
  GOLD_PILE: 240,
  GEM: 241,
  POTION: 242,
  SCROLL: 243,
  WEAPON_RACK: 244,
  ARMOR_STAND: 245,
  // Traps
  TRAP_SPIKE: 250,
  TRAP_ARROW: 251,
  TRAP_FIRE: 252,
  TRAP_PIT: 253,
} as const;

// ============================================
// TILE COLOR MAPPING (for procedural rendering)
// ============================================

export const TILE_COLORS: Record<number, number> = {
  // Terrain
  [TERRAIN.VOID]: 0x000000,
  [TERRAIN.FLOOR_STONE]: 0x4a4a5a,
  [TERRAIN.FLOOR_WOOD]: 0x8b5a2b,
  [TERRAIN.FLOOR_DIRT]: 0x5c4033,
  [TERRAIN.FLOOR_GRASS]: 0x3d6b3d,
  [TERRAIN.FLOOR_SAND]: 0xc2b280,
  [TERRAIN.FLOOR_COBBLE]: 0x606060,
  [TERRAIN.WALL_STONE]: 0x2d2d3a,
  [TERRAIN.WALL_BRICK]: 0x6b4423,
  [TERRAIN.WALL_CAVE]: 0x3d3d4a,
  [TERRAIN.WALL_WOOD]: 0x654321,
  [TERRAIN.WATER_SHALLOW]: 0x4a90d9,
  [TERRAIN.WATER_DEEP]: 0x1e4d7b,
  [TERRAIN.LAVA]: 0xff4500,
  [TERRAIN.ICE]: 0xadd8e6,
  [TERRAIN.DOOR_CLOSED]: 0x8b4513,
  [TERRAIN.DOOR_OPEN]: 0x654321,
  [TERRAIN.DOOR_LOCKED]: 0x5c3a21,
  [TERRAIN.GATE_CLOSED]: 0x4a4a4a,
  [TERRAIN.GATE_OPEN]: 0x3a3a3a,
  [TERRAIN.STAIRS_DOWN]: 0x3a3a4a,
  [TERRAIN.STAIRS_UP]: 0x5a5a6a,
  [TERRAIN.PIT]: 0x1a1a1a,
  [TERRAIN.BRIDGE]: 0x8b5a2b,
};

export const ENTITY_COLORS: Record<number, number> = {
  // Players - cyan tones
  [ENTITIES.PLAYER_WARRIOR]: 0x55ffff,
  [ENTITIES.PLAYER_MAGE]: 0x9955ff,
  [ENTITIES.PLAYER_ROGUE]: 0x55ff55,
  [ENTITIES.PLAYER_RANGER]: 0x55aa55,
  [ENTITIES.PLAYER_CLERIC]: 0xffff55,
  // Goblins - green tones
  [ENTITIES.GOBLIN]: 0x55aa55,
  [ENTITIES.GOBLIN_ARCHER]: 0x44aa44,
  [ENTITIES.GOBLIN_SHAMAN]: 0x66bb66,
  // Orcs - brown/red tones
  [ENTITIES.ORC]: 0x886644,
  [ENTITIES.ORC_BERSERKER]: 0xaa5544,
  [ENTITIES.ORC_CHIEF]: 0xbb6655,
  // Undead - gray/white tones
  [ENTITIES.SKELETON]: 0xcccccc,
  [ENTITIES.SKELETON_WARRIOR]: 0xaaaaaa,
  [ENTITIES.SKELETON_MAGE]: 0xddddff,
  [ENTITIES.ZOMBIE]: 0x668866,
  [ENTITIES.ZOMBIE_HULK]: 0x557755,
  [ENTITIES.GHOST]: 0xaaccff,
  // Beasts
  [ENTITIES.RAT]: 0x886666,
  [ENTITIES.GIANT_RAT]: 0x775555,
  [ENTITIES.SPIDER]: 0x333333,
  [ENTITIES.GIANT_SPIDER]: 0x222222,
  [ENTITIES.BAT]: 0x554444,
  [ENTITIES.WOLF]: 0x777777,
  // NPCs - friendly colors
  [ENTITIES.VILLAGER]: 0xffaa77,
  [ENTITIES.MERCHANT]: 0xffdd55,
  [ENTITIES.GUARD]: 0x5577ff,
  [ENTITIES.PRIEST]: 0xffffaa,
  [ENTITIES.NOBLE]: 0xaa55aa,
  // Bosses - ominous colors
  [ENTITIES.BOSS_DEMON]: 0xff3333,
  [ENTITIES.BOSS_DRAGON]: 0xff5500,
  [ENTITIES.BOSS_LICH]: 0x9933ff,
  [ENTITIES.BOSS_TROLL]: 0x557755,
};

export const OBJECT_COLORS: Record<number, number> = {
  [OBJECTS.CHEST_CLOSED]: 0xc9a227,
  [OBJECTS.CHEST_OPEN]: 0xa08020,
  [OBJECTS.CHEST_LOCKED]: 0x8b7020,
  [OBJECTS.BARREL]: 0x8b4513,
  [OBJECTS.CRATE]: 0x9b5523,
  [OBJECTS.URN]: 0xaaaaaa,
  [OBJECTS.SACK]: 0xb8860b,
  [OBJECTS.TABLE]: 0x8b5a2b,
  [OBJECTS.CHAIR]: 0x7b4a1b,
  [OBJECTS.BED]: 0x8b0000,
  [OBJECTS.BOOKSHELF]: 0x654321,
  [OBJECTS.THRONE]: 0xffd700,
  [OBJECTS.TORCH_WALL]: 0xff9933,
  [OBJECTS.TORCH_GROUND]: 0xff8822,
  [OBJECTS.CAMPFIRE]: 0xff6600,
  [OBJECTS.BRAZIER]: 0xff7744,
  [OBJECTS.LANTERN]: 0xffcc00,
  [OBJECTS.CRYSTAL_GLOW]: 0x66ccff,
  [OBJECTS.ALTAR]: 0x888899,
  [OBJECTS.FOUNTAIN]: 0x5599ff,
  [OBJECTS.LEVER]: 0x666666,
  [OBJECTS.PRESSURE_PLATE]: 0x555555,
  [OBJECTS.STATUE]: 0x999999,
  [OBJECTS.GOLD_PILE]: 0xffd700,
  [OBJECTS.GEM]: 0xff55ff,
  [OBJECTS.POTION]: 0xff5555,
  [OBJECTS.SCROLL]: 0xffffcc,
  [OBJECTS.WEAPON_RACK]: 0x666677,
  [OBJECTS.ARMOR_STAND]: 0x777788,
  [OBJECTS.TRAP_SPIKE]: 0x444444,
  [OBJECTS.TRAP_ARROW]: 0x555555,
  [OBJECTS.TRAP_FIRE]: 0xff4400,
  [OBJECTS.TRAP_PIT]: 0x222222,
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Position {
  x: number;
  y: number;
}

export interface RoomEntity {
  id: string;
  type: number;
  x: number;
  y: number;
  name: string;
  hostile: boolean;
  hp?: number;
  maxHp?: number;
  color?: string; // Custom hex color for the entity circle (e.g., "#ff5500")
}

export interface RoomObject {
  id: string;
  type: number;
  x: number;
  y: number;
  interactable: boolean;
  contents?: string[];
  state?: 'open' | 'closed' | 'locked' | 'active' | 'inactive';
  label?: string; // Display name for tooltips (e.g., "To Dark Forest")
  exit?: { toLocation: string }; // If this object is an exit to another location
}

export type LightingLevel = 'dark' | 'dim' | 'bright';
export type AmbienceType =
  | 'dungeon' | 'cave' | 'crypt' | 'forest' | 'castle' | 'swamp'  // Original
  | 'town' | 'village' | 'city' | 'inn' | 'tavern' | 'temple'      // Civilization
  | 'mine' | 'sewer' | 'ruins' | 'tower' | 'camp' | 'road'         // Special locations
  | 'desert' | 'frozen' | 'water' | 'coast' | 'plains'             // Environments
  | 'library' | 'guild' | 'bridge';                                 // Buildings

export interface RoomData {
  width: number;
  height: number;
  tiles: number[][];
  entities: RoomEntity[];
  objects: RoomObject[];
  lighting: LightingLevel;
  ambience: AmbienceType;
  playerSpawn?: Position;
}

// ============================================
// AI EVENT TYPES
// ============================================

export interface GenerateRoomEvent {
  type: 'generateRoom';
  generateRoom: RoomData;
}

export interface MoveEntityEvent {
  type: 'moveEntity';
  moveEntity: {
    entityId: string;
    path: Position[];
    speed: 'slow' | 'normal' | 'fast';
    facing?: 'up' | 'down' | 'left' | 'right';
  };
}

export interface UpdateTileEvent {
  type: 'updateTile';
  updateTile: {
    x: number;
    y: number;
    oldTile: number;
    newTile: number;
    animation: 'instant' | 'fade' | 'crumble' | 'grow';
  };
}

export interface SpawnEntityEvent {
  type: 'spawnEntity';
  spawnEntity: {
    id: string;
    type: number;
    x: number;
    y: number;
    name: string;
    hostile: boolean;
    animation: 'fadeIn' | 'dropIn' | 'emerge';
  };
}

export interface RemoveEntityEvent {
  type: 'removeEntity';
  removeEntity: {
    entityId: string;
    animation: 'fadeOut' | 'explode' | 'dissolve' | 'flee';
  };
}

export interface InteractObjectEvent {
  type: 'interactObject';
  interactObject: {
    objectId: string;
    action: 'open' | 'close' | 'destroy' | 'activate';
    result?: {
      items?: string[];
      gold?: number;
      trap?: boolean;
    };
  };
}

export interface CombatEffectEvent {
  type: 'combatEffect';
  combatEffect: {
    attackerId: string;
    targetId: string;
    effectType: 'slash' | 'stab' | 'magic' | 'arrow' | 'heal';
    damage?: number;
    isCritical?: boolean;
    miss?: boolean;
  };
}

export interface CameraEffectEvent {
  type: 'cameraEffect';
  cameraEffect: {
    effectType: 'shake' | 'flash' | 'zoom' | 'pan';
    intensity: 'light' | 'medium' | 'heavy';
    color?: string;
    target?: Position;
  };
}

// Location transition event (for moving between locations)
export interface TransitionLocationEvent {
  type: 'transitionLocation';
  transitionLocation: {
    toLocation: string;
    direction?: 'north' | 'south' | 'east' | 'west';
  };
}

export type AIGameEvent =
  | GenerateRoomEvent
  | MoveEntityEvent
  | UpdateTileEvent
  | SpawnEntityEvent
  | RemoveEntityEvent
  | InteractObjectEvent
  | CombatEffectEvent
  | CameraEffectEvent
  | TransitionLocationEvent;

// ============================================
// ENGINE STATE
// ============================================

export interface GameState {
  currentRoom: RoomData | null;
  playerPosition: Position;
  entities: Map<string, RoomEntity & { pixelX: number; pixelY: number }>;
  objects: Map<string, RoomObject>;
  exploredTiles: Set<string>; // "x,y" format
  visibleTiles: Set<string>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isWalkable(tileId: number): boolean {
  const walkable: number[] = [
    TERRAIN.FLOOR_STONE,
    TERRAIN.FLOOR_WOOD,
    TERRAIN.FLOOR_DIRT,
    TERRAIN.FLOOR_GRASS,
    TERRAIN.FLOOR_SAND,
    TERRAIN.FLOOR_COBBLE,
    TERRAIN.DOOR_OPEN,
    TERRAIN.GATE_OPEN,
    TERRAIN.STAIRS_DOWN,
    TERRAIN.STAIRS_UP,
    TERRAIN.BRIDGE,
    TERRAIN.WATER_SHALLOW,
  ];
  return walkable.includes(tileId);
}

export function isLightSource(objectType: number): boolean {
  const lightSources: number[] = [
    OBJECTS.TORCH_WALL,
    OBJECTS.TORCH_GROUND,
    OBJECTS.CAMPFIRE,
    OBJECTS.BRAZIER,
    OBJECTS.LANTERN,
    OBJECTS.CRYSTAL_GLOW,
  ];
  return lightSources.includes(objectType);
}

export function getLightRadius(objectType: number): number {
  switch (objectType) {
    case OBJECTS.TORCH_WALL:
    case OBJECTS.TORCH_GROUND:
      return 4;
    case OBJECTS.CAMPFIRE:
    case OBJECTS.BRAZIER:
      return 5;
    case OBJECTS.LANTERN:
      return 3;
    case OBJECTS.CRYSTAL_GLOW:
      return 6;
    default:
      return 0;
  }
}

export function getLightColor(objectType: number): number {
  switch (objectType) {
    case OBJECTS.TORCH_WALL:
    case OBJECTS.TORCH_GROUND:
    case OBJECTS.CAMPFIRE:
    case OBJECTS.BRAZIER:
      return 0xff9933; // Warm orange
    case OBJECTS.LANTERN:
      return 0xffcc66; // Yellow
    case OBJECTS.CRYSTAL_GLOW:
      return 0x66ccff; // Cool blue
    default:
      return 0xffffff;
  }
}
