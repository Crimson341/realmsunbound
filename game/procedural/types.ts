import { Id } from "@/convex/_generated/dataModel";
import { LightingLevel, AmbienceType } from "../ai-canvas/types";

// ============================================
// LOCATION TEMPLATE TYPES (Creator-authored)
// ============================================

// Entity behavior types
export type EntityBehavior = 'stationary' | 'wander' | 'patrol';

// Loot item with spawn chance (for containers and monster drops)
export interface LootItem {
  itemId?: Id<"items">;                 // Reference to campaign item (if from item library)
  name: string;                         // Display name
  spawnChance: number;                  // 0-100 percentage chance to spawn
  quantity?: number;                    // How many to spawn (default: 1)
  quantityMin?: number;                 // Random quantity range min
  quantityMax?: number;                 // Random quantity range max
}

// Entity placed on the map by creator in Forge editor
export interface PlacedEntity {
  id: string;                           // Unique ID (e.g., "guard_1", "shop_npc_2")
  npcId?: Id<"npcs">;                   // Reference to campaign NPC
  monsterId?: Id<"monsters">;           // Reference to campaign monster
  entityType: number;                   // ENTITIES constant from types.ts
  x: number;                            // Grid position X
  y: number;                            // Grid position Y
  name: string;                         // Display name
  hostile: boolean;                     // Is this entity hostile?
  hp?: number;                          // Starting HP
  maxHp?: number;                       // Maximum HP
  behavior?: EntityBehavior;            // How the entity moves: stationary, wander, or patrol
  patrolPath?: Position[];              // Patrol waypoints (only used if behavior is 'patrol')
  wanderRadius?: number;                // How far entity can wander from spawn (only if 'wander')
  facing?: 'up' | 'down' | 'left' | 'right';  // Initial facing direction
  questId?: Id<"quests">;               // Quest this entity gives or is related to
  lootTable?: LootItem[];               // Items dropped when killed (for monsters)
  color?: string;                       // Custom hex color for circle (e.g., "#ff5500")
  conditionIds?: Id<"conditions">[];    // Conditions attached to this entity (trigger on interact, etc.)
}

// Object placed on the map by creator in Forge editor
export interface PlacedObject {
  id: string;                           // Unique ID (e.g., "chest_1", "torch_5")
  objectType: number;                   // OBJECTS constant from types.ts
  x: number;                            // Grid position X
  y: number;                            // Grid position Y
  interactable: boolean;                // Can player interact with this?
  collidable?: boolean;                 // Does this block movement? (default: false)
  state?: 'open' | 'closed' | 'locked' | 'active' | 'inactive';
  contents?: string[];                  // Legacy: simple item names (deprecated)
  lootTable?: LootItem[];               // Items with spawn chances for containers
  shopId?: Id<"shops">;                 // Links to shop if this is a shop counter
  label?: string;                       // Display name for tooltips
  questId?: Id<"quests">;               // Quest this object is related to (e.g., quest item in chest)
  conditionIds?: Id<"conditions">[];    // Conditions attached to this object (trigger on interact, etc.)
}

// Transition to another location (exit points)
export interface Transition {
  id: string;                           // Unique ID
  x: number;                            // Grid position X
  y: number;                            // Grid position Y
  toLocationId: Id<"locations">;        // Destination location
  toLocationName: string;               // Display name (e.g., "Dark Forest")
  spawnPointId?: string;                // Which spawn point in destination to use
  objectType: number;                   // Visual representation (door, path, stairs)
}

// Alternate spawn point based on where player came from
export interface AlternateSpawn {
  fromLocationId: Id<"locations">;      // When coming from this location...
  x: number;                            // ...spawn at this X
  y: number;                            // ...spawn at this Y
}

// The full location template as stored in database
export interface LocationTemplate {
  _id: Id<"locationTemplates">;
  locationId: Id<"locations">;
  campaignId: Id<"campaigns">;

  // Core Template Data
  width: number;
  height: number;
  tiles: number[][];                    // Parsed from JSON string
  collisionMask: number[][];            // Parsed from JSON string

  // Spawn Points
  playerSpawnX: number;
  playerSpawnY: number;
  alternateSpawns?: AlternateSpawn[];   // Parsed from JSON string

  // Placed Content
  placedEntities: PlacedEntity[];       // Parsed from JSON string
  placedObjects: PlacedObject[];        // Parsed from JSON string
  transitions: Transition[];            // Parsed from JSON string

  // Visual Settings
  lighting?: LightingLevel;
  ambience?: AmbienceType;

  // Metadata
  version: number;
  createdAt: number;
  updatedAt?: number;
}

// Raw template from database (JSON strings not yet parsed)
export interface LocationTemplateRaw {
  _id: Id<"locationTemplates">;
  locationId: Id<"locations">;
  campaignId: Id<"campaigns">;
  width: number;
  height: number;
  tiles: string;
  collisionMask: string;
  playerSpawnX: number;
  playerSpawnY: number;
  alternateSpawns?: string;
  placedEntities: string;
  placedObjects: string;
  transitions: string;
  lighting?: string;
  ambience?: string;
  version: number;
  createdAt: number;
  updatedAt?: number;
}

// ============================================
// GENERATED MAP TYPES (Per-player instances)
// ============================================

// Dynamic state for an entity (changes during gameplay)
export interface EntityState {
  hp?: number;                          // Current HP (may differ from template)
  x?: number;                           // Current position X (if moved)
  y?: number;                           // Current position Y (if moved)
  dead?: boolean;                       // Has been killed?
  diedAt?: number;                      // Timestamp of death
}

// Dynamic state for an object (changes during gameplay)
export interface ObjectState {
  opened?: boolean;                     // Has been opened (chests)
  destroyed?: boolean;                  // Has been destroyed
  openedAt?: number;                    // When it was opened
  state?: 'open' | 'closed' | 'locked' | 'active' | 'inactive';
}

// The generated map instance for a player
export interface GeneratedMap {
  _id: Id<"generatedMaps">;
  campaignId: Id<"campaigns">;
  playerId: string;
  locationId: Id<"locations">;
  templateId?: Id<"locationTemplates">;
  templateVersion?: number;

  // Map data
  width: number;
  height: number;
  tiles: number[][];                    // Parsed from JSON string

  // Dynamic State
  entityStates: Record<string, EntityState>;   // Parsed from JSON string
  objectStates: Record<string, ObjectState>;   // Parsed from JSON string
  exploredTiles: Set<string>;                  // Parsed from JSON array to Set

  // Tracking
  firstVisitAt: number;
  lastVisitAt: number;
  visitCount: number;
}

// Raw generated map from database (JSON strings not yet parsed)
export interface GeneratedMapRaw {
  _id: Id<"generatedMaps">;
  campaignId: Id<"campaigns">;
  playerId: string;
  locationId: Id<"locations">;
  templateId?: Id<"locationTemplates">;
  templateVersion?: number;
  width: number;
  height: number;
  tiles: string;
  entityStates: string;
  objectStates: string;
  exploredTiles: string;
  firstVisitAt: number;
  lastVisitAt: number;
  visitCount: number;
}

// ============================================
// HELPER TYPES
// ============================================

export interface Position {
  x: number;
  y: number;
}

// Options for map generation
export interface MapGeneratorOptions {
  campaignId: Id<"campaigns">;
  playerId: string;
}

// Result of generating or loading a map
export interface MapLoadResult {
  isNewMap: boolean;                    // Was this freshly generated?
  hasTemplate: boolean;                 // Was a template used?
  templateVersion?: number;             // Version of template used
}

// ============================================
// PARSING HELPERS
// ============================================

// Parse raw template from database to typed template
export function parseLocationTemplate(raw: LocationTemplateRaw): LocationTemplate {
  return {
    ...raw,
    tiles: JSON.parse(raw.tiles) as number[][],
    collisionMask: JSON.parse(raw.collisionMask) as number[][],
    alternateSpawns: raw.alternateSpawns
      ? JSON.parse(raw.alternateSpawns) as AlternateSpawn[]
      : undefined,
    placedEntities: JSON.parse(raw.placedEntities) as PlacedEntity[],
    placedObjects: JSON.parse(raw.placedObjects) as PlacedObject[],
    transitions: JSON.parse(raw.transitions) as Transition[],
    lighting: raw.lighting as LightingLevel | undefined,
    ambience: raw.ambience as AmbienceType | undefined,
  };
}

// Parse raw generated map from database to typed map
export function parseGeneratedMap(raw: GeneratedMapRaw): GeneratedMap {
  return {
    ...raw,
    tiles: JSON.parse(raw.tiles) as number[][],
    entityStates: JSON.parse(raw.entityStates) as Record<string, EntityState>,
    objectStates: JSON.parse(raw.objectStates) as Record<string, ObjectState>,
    exploredTiles: new Set(JSON.parse(raw.exploredTiles) as string[]),
  };
}

// Serialize template for database storage
export function serializeTemplateForDb(template: Omit<LocationTemplate, '_id' | 'createdAt' | 'updatedAt' | 'version'>): {
  tiles: string;
  collisionMask: string;
  alternateSpawns?: string;
  placedEntities: string;
  placedObjects: string;
  transitions: string;
} {
  return {
    tiles: JSON.stringify(template.tiles),
    collisionMask: JSON.stringify(template.collisionMask),
    alternateSpawns: template.alternateSpawns
      ? JSON.stringify(template.alternateSpawns)
      : undefined,
    placedEntities: JSON.stringify(template.placedEntities),
    placedObjects: JSON.stringify(template.placedObjects),
    transitions: JSON.stringify(template.transitions),
  };
}
