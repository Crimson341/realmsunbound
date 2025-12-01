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

// ============================================
// SPRITE & ANIMATION DEFINITIONS
// ============================================

/** Animation states that sprites can have */
export type AnimationState =
  | 'idle'
  | 'walk_down' | 'walk_up' | 'walk_left' | 'walk_right'
  | 'attack_down' | 'attack_up' | 'attack_left' | 'attack_right'
  | 'hurt'
  | 'death'
  | 'cast'
  | 'custom';

/** Direction an entity is facing */
export type FacingDirection = 'up' | 'down' | 'left' | 'right';

/** Definition for a single animation within a sprite sheet */
export interface SpriteAnimation {
  /** Name of the animation (e.g., 'idle', 'walk_down') */
  name: AnimationState;
  /** Starting row in the sprite sheet (0-indexed) */
  row: number;
  /** Starting column in the sprite sheet (0-indexed) */
  startFrame: number;
  /** Number of frames in this animation */
  frameCount: number;
  /** Frames per second for this animation */
  fps: number;
  /** Whether this animation loops */
  loop: boolean;
}

/** Sprite sheet configuration */
export interface SpriteSheetConfig {
  /** Width of each frame in pixels */
  frameWidth: number;
  /** Height of each frame in pixels */
  frameHeight: number;
  /** Total columns in the sprite sheet */
  columns: number;
  /** Total rows in the sprite sheet */
  rows: number;
  /** Animations defined in this sprite sheet */
  animations: SpriteAnimation[];
  /** Default animation to play when idle */
  defaultAnimation: AnimationState;
  /** Anchor point for the sprite (0-1 range, default 0.5, 0.5 = center) */
  anchorX?: number;
  anchorY?: number;
  /** Scale multiplier for rendering (default 1.0) */
  scale?: number;
}

/** Sprite data attached to an entity */
export interface EntitySpriteData {
  /** URL or storage ID for the sprite sheet image */
  spriteSheetUrl: string;
  /** Configuration for parsing the sprite sheet */
  config: SpriteSheetConfig;
  /** Optional tint color to apply to the sprite */
  tintColor?: string;
}

/** Preset sprite configurations for common formats */
export const SPRITE_PRESETS = {
  /** Standard RPG Maker VX/Ace format: 3 frames per direction, 4 directions */
  RPG_MAKER_VX: {
    frameWidth: 32,
    frameHeight: 32,
    columns: 3,
    rows: 4,
    animations: [
      { name: 'walk_down' as AnimationState, row: 0, startFrame: 0, frameCount: 3, fps: 8, loop: true },
      { name: 'walk_left' as AnimationState, row: 1, startFrame: 0, frameCount: 3, fps: 8, loop: true },
      { name: 'walk_right' as AnimationState, row: 2, startFrame: 0, frameCount: 3, fps: 8, loop: true },
      { name: 'walk_up' as AnimationState, row: 3, startFrame: 0, frameCount: 3, fps: 8, loop: true },
      { name: 'idle' as AnimationState, row: 0, startFrame: 1, frameCount: 1, fps: 1, loop: true },
    ],
    defaultAnimation: 'idle' as AnimationState,
  },
  /** LPC (Liberated Pixel Cup) format: 8 frames per direction, common in OpenGameArt */
  LPC_STANDARD: {
    frameWidth: 64,
    frameHeight: 64,
    columns: 9,
    rows: 4,
    animations: [
      { name: 'walk_up' as AnimationState, row: 0, startFrame: 1, frameCount: 8, fps: 10, loop: true },
      { name: 'walk_left' as AnimationState, row: 1, startFrame: 1, frameCount: 8, fps: 10, loop: true },
      { name: 'walk_down' as AnimationState, row: 2, startFrame: 1, frameCount: 8, fps: 10, loop: true },
      { name: 'walk_right' as AnimationState, row: 3, startFrame: 1, frameCount: 8, fps: 10, loop: true },
      { name: 'idle' as AnimationState, row: 2, startFrame: 0, frameCount: 1, fps: 1, loop: true },
    ],
    defaultAnimation: 'idle' as AnimationState,
  },
  /** Simple 4-direction with idle: 4 frames walk + 1 idle per direction */
  SIMPLE_4DIR: {
    frameWidth: 32,
    frameHeight: 32,
    columns: 4,
    rows: 4,
    animations: [
      { name: 'idle' as AnimationState, row: 0, startFrame: 0, frameCount: 1, fps: 1, loop: true },
      { name: 'walk_down' as AnimationState, row: 0, startFrame: 0, frameCount: 4, fps: 8, loop: true },
      { name: 'walk_up' as AnimationState, row: 1, startFrame: 0, frameCount: 4, fps: 8, loop: true },
      { name: 'walk_left' as AnimationState, row: 2, startFrame: 0, frameCount: 4, fps: 8, loop: true },
      { name: 'walk_right' as AnimationState, row: 3, startFrame: 0, frameCount: 4, fps: 8, loop: true },
    ],
    defaultAnimation: 'idle' as AnimationState,
  },
} as const;

export interface RoomEntity {
  id: string;
  type: number;
  x: number;
  y: number;
  name: string;
  hostile: boolean;
  hp?: number;
  maxHp?: number;
  ac?: number; // Armor class for combat
  color?: string; // Custom hex color for the entity circle (e.g., "#ff5500")
  sprite?: EntitySpriteData; // Custom sprite sheet with animations
  facing?: FacingDirection; // Direction entity is facing
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
  | TransitionLocationEvent
  | EnterBattleModeEvent
  | ExitBattleModeEvent
  | BattleMoveEvent
  | BattleAttackEvent;

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

// ============================================
// TACTICAL BATTLE SYSTEM TYPES
// ============================================

/** Entity participating in tactical combat */
export interface BattleEntity {
  entityId: string;
  name: string;
  gridX: number;
  gridY: number;
  isPlayerControlled: boolean; // Player or follower
  isFollower: boolean; // Is this a recruited follower
  movementRange: number;
  attackRange: number;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  damage: number;
  hasMovedThisTurn: boolean;
  hasActedThisTurn: boolean;
}

/** Tile highlight for movement/attack ranges */
export interface BattleHighlight {
  x: number;
  y: number;
  type: 'movement' | 'attack' | 'target' | 'ally';
}

/** Current state of tactical battle */
export interface BattleState {
  isActive: boolean;
  arenaCenter: Position;
  arenaSize: number; // 9x9 default
  entities: BattleEntity[];
  turnOrder: string[]; // Entity IDs in initiative order
  currentTurnIndex: number;
  selectedAction: 'none' | 'move' | 'attack' | 'ability';
  highlightedTiles: BattleHighlight[];
  combatLog: BattleCombatLogEntry[];
  outcome?: 'victory' | 'defeat' | 'fled';
}

/** Combat log entry for battle UI */
export interface BattleCombatLogEntry {
  id: string;
  timestamp: number;
  type: 'damage' | 'heal' | 'miss' | 'critical' | 'status' | 'move' | 'turn' | 'narration';
  text: string;
  actorId?: string;
  targetId?: string;
  value?: number;
}

/** Event to enter tactical battle mode */
export interface EnterBattleModeEvent {
  type: 'enterBattleMode';
  enterBattleMode: {
    enemies: Array<{
      entityId: string;
      name: string;
      hp: number;
      maxHp: number;
      ac: number;
      damage: number;
      gridX: number;
      gridY: number;
    }>;
    followers?: Array<{
      entityId: string;
      name: string;
      hp: number;
      maxHp: number;
      ac: number;
      damage: number;
    }>;
    playerMovementRange?: number;
    playerAttackRange?: number;
  };
}

/** Event to exit tactical battle mode */
export interface ExitBattleModeEvent {
  type: 'exitBattleMode';
  exitBattleMode: {
    outcome: 'victory' | 'defeat' | 'fled';
    xpGained?: number;
    goldGained?: number;
    itemsGained?: string[];
  };
}

/** Event for entity movement in battle */
export interface BattleMoveEvent {
  type: 'battleMove';
  battleMove: {
    entityId: string;
    toX: number;
    toY: number;
  };
}

/** Event for attack in battle */
export interface BattleAttackEvent {
  type: 'battleAttack';
  battleAttack: {
    attackerId: string;
    targetId: string;
    damage: number;
    hit: boolean;
    isCritical?: boolean;
    targetHpAfter: number;
  };
}
