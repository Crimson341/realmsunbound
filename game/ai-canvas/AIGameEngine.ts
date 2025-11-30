import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js';
import {
  AIGameEvent,
  RoomData,
  RoomEntity,
  RoomObject,
  Position,
  TILE_COLORS,
  ENTITY_COLORS,
  OBJECT_COLORS,
  TERRAIN,
  OBJECTS,
  isLightSource,
  getLightRadius,
  getLightColor,
} from './types';

export interface HoverInfo {
  type: 'entity' | 'object' | 'tile';
  id: string;
  name: string;
  description?: string;
  hostile?: boolean;
  hp?: number;
  maxHp?: number;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
}

export interface AIGameEngineConfig {
  width: number;
  height: number;
  tileSize: number;
  editMode?: boolean; // When true, disables player movement on click (for map editor)
  onTileClick?: (x: number, y: number) => void;
  onEntityClick?: (entityId: string, entity: RoomEntity) => void;
  onObjectClick?: (objectId: string, object: RoomObject) => void;
  onHover?: (info: HoverInfo | null) => void;
  onPlayerMoveComplete?: (x: number, y: number) => void;
}

interface RenderedEntity {
  data: RoomEntity;
  sprite: Container;
  targetX: number;
  targetY: number;
  moving: boolean;
  path: Position[];
  pathIndex: number;
  speed: number;
  eyeOffset: number; // For eye animation
  blinkTimer: number;
  isBlinking: boolean;
}

interface RenderedObject {
  data: RoomObject;
  sprite: Container;
  glowPhase: number; // For animated glow
}

interface DamageNumber {
  text: Text;
  startY: number;
  life: number;
}

// Seeded random for consistent procedural textures
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export class AIGameEngine {
  private app: Application;
  private config: AIGameEngineConfig;

  // Containers (rendering layers)
  private worldContainer: Container;
  private tileLayer: Container;
  private objectLayer: Container;
  private entityLayer: Container;
  private effectLayer: Container;
  private fogLayer: Container;
  private uiLayer: Container;

  // State
  private currentRoom: RoomData | null = null;
  private tileGraphics: Container[][] = [];
  private entities: Map<string, RenderedEntity> = new Map();
  private objects: Map<string, RenderedObject> = new Map();
  private playerPosition: Position = { x: 0, y: 0 };
  private exploredTiles: Set<string> = new Set();
  private visibleTiles: Set<string> = new Set();
  private tileLightLevels: Map<string, number> = new Map(); // 0.0 (dark) to 1.0 (bright)
  private lightSources: Array<{ x: number; y: number; radius: number; color: number }> = [];

  // Animation
  private damageNumbers: DamageNumber[] = [];
  private animTime: number = 0;
  private isInitialized = false;
  private isDestroyed = false;

  constructor(config: AIGameEngineConfig) {
    this.config = config;
    this.app = new Application();

    // Create layer containers
    this.worldContainer = new Container();
    this.tileLayer = new Container();
    this.objectLayer = new Container();
    this.entityLayer = new Container();
    this.effectLayer = new Container();
    this.fogLayer = new Container();
    this.uiLayer = new Container();
  }

  async init(container: HTMLElement): Promise<void> {
    if (this.isDestroyed) return;

    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      backgroundColor: 0x0a0a0f,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.isDestroyed) {
      this.app.destroy(true);
      return;
    }

    container.appendChild(this.app.canvas);

    // Setup layer hierarchy
    this.worldContainer.addChild(this.tileLayer);
    this.worldContainer.addChild(this.objectLayer);
    this.worldContainer.addChild(this.entityLayer);
    this.worldContainer.addChild(this.effectLayer);
    this.worldContainer.addChild(this.fogLayer);
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiLayer);

    // Setup click and hover handling
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', this.handleClick.bind(this));
    this.app.stage.on('pointermove', this.handleHover.bind(this));

    // Start game loop
    this.app.ticker.add(this.update.bind(this));

    this.isInitialized = true;
  }

  private handleClick(event: { global: { x: number; y: number } }): void {
    const worldPos = this.worldContainer.toLocal(event.global);
    const tileX = Math.floor(worldPos.x / this.config.tileSize);
    const tileY = Math.floor(worldPos.y / this.config.tileSize);

    console.log('[AIGameEngine] handleClick:', {
      screenPos: event.global,
      worldPos,
      tileX,
      tileY,
      editMode: this.config.editMode,
      hasRoom: !!this.currentRoom,
      roomSize: this.currentRoom ? { w: this.currentRoom.width, h: this.currentRoom.height } : null
    });

    // In edit mode, only report clicks - don't do any game logic
    if (this.config.editMode) {
      if (this.currentRoom && tileX >= 0 && tileX < this.currentRoom.width && tileY >= 0 && tileY < this.currentRoom.height) {
        console.log('[AIGameEngine] Calling onTileClick for edit mode');
        this.config.onTileClick?.(tileX, tileY);
      } else {
        console.log('[AIGameEngine] Click outside room bounds or no room loaded');
      }
      return;
    }

    // Check if clicked on entity
    for (const [id, entity] of this.entities) {
      if (entity.data.x === tileX && entity.data.y === tileY) {
        this.config.onEntityClick?.(id, entity.data);
        return;
      }
    }

    // Check if clicked on object
    for (const [id, obj] of this.objects) {
      if (obj.data.x === tileX && obj.data.y === tileY && obj.data.interactable) {
        this.config.onObjectClick?.(id, obj.data);
        return;
      }
    }

    // Clicked on tile - move player there locally (no AI needed)
    if (this.currentRoom && tileX >= 0 && tileX < this.currentRoom.width && tileY >= 0 && tileY < this.currentRoom.height) {
      // Check if tile is walkable
      const tileId = this.currentRoom.tiles[tileY]?.[tileX] ?? 0;
      if (this.isWalkableTile(tileId)) {
        this.movePlayerTo(tileX, tileY);
      }
      this.config.onTileClick?.(tileX, tileY);
    }
  }

  private handleHover(event: { global: { x: number; y: number } }): void {
    const worldPos = this.worldContainer.toLocal(event.global);
    const tileX = Math.floor(worldPos.x / this.config.tileSize);
    const tileY = Math.floor(worldPos.y / this.config.tileSize);

    // Check if hovering over entity
    for (const [id, entity] of this.entities) {
      if (entity.data.x === tileX && entity.data.y === tileY) {
        this.config.onHover?.({
          type: 'entity',
          id,
          name: entity.data.name,
          hostile: entity.data.hostile,
          hp: entity.data.hp,
          maxHp: entity.data.maxHp,
          x: tileX,
          y: tileY,
          screenX: event.global.x,
          screenY: event.global.y,
        });
        return;
      }
    }

    // Check if hovering over object
    for (const [id, obj] of this.objects) {
      if (obj.data.x === tileX && obj.data.y === tileY) {
        this.config.onHover?.({
          type: 'object',
          id,
          name: obj.data.label || id.replace(/_/g, ' '),
          x: tileX,
          y: tileY,
          screenX: event.global.x,
          screenY: event.global.y,
        });
        return;
      }
    }

    // Not hovering over anything
    this.config.onHover?.(null);
  }

  // Simple A* pathfinding
  private findPath(startX: number, startY: number, endX: number, endY: number): Position[] {
    if (!this.currentRoom) return [];

    const width = this.currentRoom.width;
    const height = this.currentRoom.height;

    // Check if end is valid
    const endTile = this.currentRoom.tiles[endY]?.[endX] ?? 0;
    if (!this.isWalkableTile(endTile)) return [];

    interface Node {
      x: number;
      y: number;
      g: number;
      h: number;
      f: number;
      parent: Node | null;
    }

    const openSet: Node[] = [];
    const closedSet = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;

    const heuristic = (x1: number, y1: number, x2: number, y2: number) =>
      Math.abs(x1 - x2) + Math.abs(y1 - y2);

    const startNode: Node = {
      x: startX,
      y: startY,
      g: 0,
      h: heuristic(startX, startY, endX, endY),
      f: heuristic(startX, startY, endX, endY),
      parent: null,
    };

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Get node with lowest f
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.x === endX && current.y === endY) {
        // Reconstruct path
        const path: Position[] = [];
        let node: Node | null = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path.slice(1); // Remove start position
      }

      closedSet.add(key(current.x, current.y));

      // Check neighbors (4-directional)
      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) continue;
        if (closedSet.has(key(neighbor.x, neighbor.y))) continue;

        const tileId = this.currentRoom.tiles[neighbor.y]?.[neighbor.x] ?? 0;
        if (!this.isWalkableTile(tileId)) continue;

        // Check for entities blocking (except player)
        let blocked = false;
        for (const entity of this.entities.values()) {
          if (entity.data.id !== 'player' && entity.data.x === neighbor.x && entity.data.y === neighbor.y) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        const g = current.g + 1;
        const h = heuristic(neighbor.x, neighbor.y, endX, endY);
        const f = g + h;

        const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = f;
            existing.parent = current;
          }
        } else {
          openSet.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h,
            f,
            parent: current,
          });
        }
      }
    }

    return []; // No path found
  }

  private isWalkableTile(tileId: number): boolean {
    // Floors, doors, bridges, paths are walkable
    const walkable = [
      TERRAIN.FLOOR_STONE, TERRAIN.FLOOR_WOOD, TERRAIN.FLOOR_DIRT,
      TERRAIN.FLOOR_GRASS, TERRAIN.FLOOR_SAND, TERRAIN.FLOOR_COBBLE,
      TERRAIN.DOOR_OPEN, TERRAIN.DOOR_CLOSED, TERRAIN.GATE_OPEN,
      TERRAIN.STAIRS_DOWN, TERRAIN.STAIRS_UP, TERRAIN.BRIDGE,
      44, // PATH
    ];
    return walkable.includes(tileId);
  }

  // Move player to a tile (local movement, no AI)
  public movePlayerTo(targetX: number, targetY: number): void {
    const player = this.entities.get('player');
    if (!player) return;

    const path = this.findPath(player.data.x, player.data.y, targetX, targetY);
    if (path.length > 0) {
      player.path = path;
      player.pathIndex = 0;
      player.targetX = path[0].x;
      player.targetY = path[0].y;
      player.moving = true;
      player.speed = 8; // Normal speed
    }
  }

  private update(ticker: Ticker): void {
    if (!this.isInitialized) return;

    const dt = ticker.deltaMS;
    this.animTime += dt;

    // Update entity movements and animations
    for (const entity of this.entities.values()) {
      if (entity.moving && entity.path.length > 0) {
        this.updateEntityMovement(entity, dt);
      }
      this.updateEntityAnimation(entity, dt);
    }

    // Update object animations (glowing lights, etc.)
    for (const obj of this.objects.values()) {
      this.updateObjectAnimation(obj, dt);
    }

    // Update damage numbers
    this.updateDamageNumbers(dt);

    // Center camera on player
    this.centerCamera();
  }

  private updateEntityMovement(entity: RenderedEntity, dt: number): void {
    const speed = entity.speed * dt * 0.01;
    const targetPixelX = entity.targetX * this.config.tileSize + this.config.tileSize / 2;
    const targetPixelY = entity.targetY * this.config.tileSize + this.config.tileSize / 2;

    const dx = targetPixelX - entity.sprite.x;
    const dy = targetPixelY - entity.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < speed) {
      entity.sprite.x = targetPixelX;
      entity.sprite.y = targetPixelY;
      entity.data.x = entity.targetX;
      entity.data.y = entity.targetY;
      entity.pathIndex++;

      if (entity.pathIndex < entity.path.length) {
        entity.targetX = entity.path[entity.pathIndex].x;
        entity.targetY = entity.path[entity.pathIndex].y;
      } else {
        entity.moving = false;
        entity.path = [];
        entity.pathIndex = 0;

        if (entity.data.id === 'player') {
          this.playerPosition = { x: entity.data.x, y: entity.data.y };
          this.updateVisibility();
        }
      }
    } else {
      entity.sprite.x += (dx / dist) * speed;
      entity.sprite.y += (dy / dist) * speed;
    }
  }

  private updateEntityAnimation(entity: RenderedEntity, dt: number): void {
    // Blink timer
    entity.blinkTimer -= dt;
    if (entity.blinkTimer <= 0) {
      if (entity.isBlinking) {
        entity.isBlinking = false;
        entity.blinkTimer = 2000 + Math.random() * 3000; // Next blink in 2-5 seconds
      } else {
        entity.isBlinking = true;
        entity.blinkTimer = 100 + Math.random() * 100; // Blink for 100-200ms
      }
      this.updateEntityEyes(entity);
    }

    // Subtle idle bobbing
    entity.eyeOffset = Math.sin(this.animTime * 0.003 + entity.data.x * 0.5) * 0.5;
  }

  private updateEntityEyes(entity: RenderedEntity): void {
    // Find eye graphics in the sprite and update visibility
    const eyes = entity.sprite.getChildByLabel('eyes') as Graphics;
    if (eyes) {
      eyes.visible = !entity.isBlinking;
    }
  }

  private updateObjectAnimation(obj: RenderedObject, dt: number): void {
    if (isLightSource(obj.data.type)) {
      obj.glowPhase += dt * 0.005;
      const glow = obj.sprite.getChildByLabel('glow') as Graphics;
      if (glow) {
        const pulse = 0.7 + Math.sin(obj.glowPhase) * 0.3;
        glow.alpha = pulse * 0.4;
      }
    }
  }

  private updateDamageNumbers(dt: number): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dmg = this.damageNumbers[i];
      dmg.life -= dt;
      dmg.text.y = dmg.startY - (1 - dmg.life / 1000) * 30;
      dmg.text.alpha = Math.max(0, dmg.life / 1000);

      if (dmg.life <= 0) {
        this.effectLayer.removeChild(dmg.text);
        dmg.text.destroy();
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  private centerCamera(): void {
    const player = this.entities.get('player');
    if (!player) return;

    const targetX = this.config.width / 2 - player.sprite.x;
    const targetY = this.config.height / 2 - player.sprite.y;

    this.worldContainer.x += (targetX - this.worldContainer.x) * 0.08;
    this.worldContainer.y += (targetY - this.worldContainer.y) * 0.08;
  }

  // ============================================
  // PUBLIC API - Process AI Events
  // ============================================

  processEvent(event: AIGameEvent): void {
    switch (event.type) {
      case 'generateRoom':
        this.loadRoom(event.generateRoom);
        break;
      case 'moveEntity':
        this.moveEntity(
          event.moveEntity.entityId,
          event.moveEntity.path,
          event.moveEntity.speed
        );
        break;
      case 'updateTile':
        this.updateTile(
          event.updateTile.x,
          event.updateTile.y,
          event.updateTile.newTile
        );
        break;
      case 'spawnEntity':
        this.spawnEntity(event.spawnEntity);
        break;
      case 'removeEntity':
        this.removeEntity(event.removeEntity.entityId, event.removeEntity.animation);
        break;
      case 'interactObject':
        this.interactObject(event.interactObject.objectId, event.interactObject.action);
        break;
      case 'combatEffect':
        this.showCombatEffect(event.combatEffect);
        break;
      case 'cameraEffect':
        this.playCameraEffect(event.cameraEffect);
        break;
    }
  }

  // ============================================
  // ROOM LOADING
  // ============================================

  loadRoom(room: RoomData): void {
    this.currentRoom = room;
    this.clearRoom();

    // Render tiles with textures
    this.tileGraphics = [];
    for (let y = 0; y < room.height; y++) {
      this.tileGraphics[y] = [];
      for (let x = 0; x < room.width; x++) {
        const tileId = room.tiles[y]?.[x] ?? TERRAIN.VOID;
        const tile = this.renderTile(x, y, tileId);
        this.tileGraphics[y][x] = tile;
        this.tileLayer.addChild(tile);
      }
    }

    // Render objects
    for (const obj of room.objects) {
      this.renderObject(obj);
    }

    // Render entities
    for (const entity of room.entities) {
      this.renderEntity(entity);
    }

    // Spawn player
    const spawn = room.playerSpawn || { x: 1, y: 1 };
    this.spawnPlayer(spawn.x, spawn.y);

    // Initial visibility
    this.updateVisibility();
    this.renderFog();
  }

  private clearRoom(): void {
    this.tileLayer.removeChildren();
    this.tileGraphics = [];

    for (const obj of this.objects.values()) {
      this.objectLayer.removeChild(obj.sprite);
      obj.sprite.destroy();
    }
    this.objects.clear();

    for (const entity of this.entities.values()) {
      this.entityLayer.removeChild(entity.sprite);
      entity.sprite.destroy();
    }
    this.entities.clear();

    this.effectLayer.removeChildren();
    this.damageNumbers = [];
    this.fogLayer.removeChildren();
  }

  // ============================================
  // TILE RENDERING WITH TEXTURES
  // ============================================

  private renderTile(x: number, y: number, tileId: number): Container {
    const container = new Container();
    const size = this.config.tileSize;
    const baseColor = TILE_COLORS[tileId] ?? 0x000000;
    const random = seededRandom(x * 1000 + y);

    const g = new Graphics();

    // Base tile fill
    g.rect(0, 0, size, size);
    g.fill(baseColor);

    // Add texture based on tile type
    if (tileId >= TERRAIN.FLOOR_STONE && tileId <= TERRAIN.FLOOR_COBBLE) {
      this.addFloorTexture(g, size, tileId, random);
    } else if (tileId >= TERRAIN.WALL_STONE && tileId <= TERRAIN.WALL_WOOD) {
      this.addWallTexture(g, size, tileId, random);
    } else if (tileId === TERRAIN.WATER_SHALLOW || tileId === TERRAIN.WATER_DEEP) {
      this.addWaterTexture(g, size, tileId, random);
    } else if (tileId === TERRAIN.LAVA) {
      this.addLavaTexture(g, size, random);
    } else if (tileId >= TERRAIN.DOOR_CLOSED && tileId <= TERRAIN.GATE_OPEN) {
      this.addDoorTexture(g, size, tileId);
    } else if (tileId === TERRAIN.STAIRS_DOWN || tileId === TERRAIN.STAIRS_UP) {
      this.addStairsTexture(g, size, tileId);
    }

    // Grid lines (subtle)
    g.rect(0, 0, size, size);
    g.stroke({ width: 1, color: 0x000000, alpha: 0.15 });

    container.addChild(g);
    container.x = x * size;
    container.y = y * size;
    return container;
  }

  private addFloorTexture(g: Graphics, size: number, tileId: number, random: () => number): void {
    // Random cracks and dots
    const numDetails = 3 + Math.floor(random() * 4);
    for (let i = 0; i < numDetails; i++) {
      const px = random() * (size - 6) + 3;
      const py = random() * (size - 6) + 3;
      const r = 1 + random() * 1.5;

      if (random() > 0.5) {
        // Dot
        g.circle(px, py, r);
        g.fill({ color: 0x000000, alpha: 0.1 + random() * 0.15 });
      } else {
        // Small crack line
        const angle = random() * Math.PI * 2;
        const len = 3 + random() * 5;
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len);
        g.stroke({ width: 1, color: 0x000000, alpha: 0.1 });
      }
    }

    // Cobblestone pattern for cobble floors
    if (tileId === TERRAIN.FLOOR_COBBLE) {
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const ox = col * (size / 2) + 2;
          const oy = row * (size / 2) + 2;
          const w = size / 2 - 4;
          const h = size / 2 - 4;
          g.roundRect(ox, oy, w, h, 3);
          g.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
        }
      }
    }

    // Grass blades for grass floors
    if (tileId === TERRAIN.FLOOR_GRASS) {
      for (let i = 0; i < 5; i++) {
        const bx = random() * size;
        const by = random() * size;
        g.moveTo(bx, by);
        g.lineTo(bx + (random() - 0.5) * 4, by - 4 - random() * 4);
        g.stroke({ width: 1, color: 0x2a5a2a, alpha: 0.4 });
      }
    }
  }

  private addWallTexture(g: Graphics, size: number, tileId: number, random: () => number): void {
    // Brick pattern
    const brickHeight = size / 3;
    for (let row = 0; row < 3; row++) {
      const offset = row % 2 === 0 ? 0 : size / 4;
      for (let col = -1; col < 3; col++) {
        const bx = offset + col * (size / 2);
        const by = row * brickHeight;
        g.rect(bx + 1, by + 1, size / 2 - 2, brickHeight - 2);
        g.stroke({ width: 1, color: 0x000000, alpha: 0.25 });
      }
    }

    // Top highlight
    g.moveTo(0, 1);
    g.lineTo(size, 1);
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.08 });

    // Bottom shadow
    g.moveTo(0, size - 1);
    g.lineTo(size, size - 1);
    g.stroke({ width: 2, color: 0x000000, alpha: 0.3 });

    // Random cracks
    if (random() > 0.7) {
      const cx = random() * size;
      const cy = random() * size;
      g.moveTo(cx, cy);
      g.lineTo(cx + (random() - 0.5) * 8, cy + random() * 8);
      g.stroke({ width: 1, color: 0x000000, alpha: 0.3 });
    }
  }

  private addWaterTexture(g: Graphics, size: number, tileId: number, random: () => number): void {
    // Wave lines
    for (let i = 0; i < 3; i++) {
      const y = 8 + i * 10 + random() * 5;
      g.moveTo(0, y);
      for (let x = 0; x <= size; x += 4) {
        const wave = Math.sin(x * 0.3 + i) * 2;
        g.lineTo(x, y + wave);
      }
      g.stroke({ width: 1, color: tileId === TERRAIN.WATER_DEEP ? 0x0a2a5a : 0x5a9ad9, alpha: 0.3 });
    }

    // Sparkle highlights
    for (let i = 0; i < 2; i++) {
      const sx = random() * size;
      const sy = random() * size;
      g.circle(sx, sy, 1);
      g.fill({ color: 0xffffff, alpha: 0.3 });
    }
  }

  private addLavaTexture(g: Graphics, size: number, random: () => number): void {
    // Bubbles
    for (let i = 0; i < 3; i++) {
      const bx = random() * (size - 8) + 4;
      const by = random() * (size - 8) + 4;
      const br = 2 + random() * 3;
      g.circle(bx, by, br);
      g.fill({ color: 0xff6600, alpha: 0.6 });
      g.circle(bx - br * 0.3, by - br * 0.3, br * 0.3);
      g.fill({ color: 0xffff00, alpha: 0.5 });
    }

    // Cracks with glow
    for (let i = 0; i < 2; i++) {
      const cx = random() * size;
      const cy = random() * size;
      g.moveTo(cx, cy);
      g.lineTo(cx + (random() - 0.5) * 15, cy + (random() - 0.5) * 15);
      g.stroke({ width: 2, color: 0xffff00, alpha: 0.4 });
    }
  }

  private addDoorTexture(g: Graphics, size: number, tileId: number): void {
    const isOpen = tileId === TERRAIN.DOOR_OPEN || tileId === TERRAIN.GATE_OPEN;
    const isLocked = tileId === TERRAIN.DOOR_LOCKED;
    const isGate = tileId === TERRAIN.GATE_CLOSED || tileId === TERRAIN.GATE_OPEN;

    if (isGate) {
      // Gate bars
      if (!isOpen) {
        for (let i = 0; i < 4; i++) {
          const bx = 6 + i * 7;
          g.rect(bx, 2, 2, size - 4);
          g.fill(0x555555);
        }
        // Cross bar
        g.rect(2, size / 2 - 2, size - 4, 4);
        g.fill(0x444444);
      }
    } else {
      // Wooden door
      if (!isOpen) {
        g.rect(size * 0.2, 2, size * 0.6, size - 4);
        g.fill(0x5c3a21);

        // Door panels
        g.rect(size * 0.25, 5, size * 0.5, size / 3 - 4);
        g.stroke({ width: 2, color: 0x3a2510 });
        g.rect(size * 0.25, size / 2 + 2, size * 0.5, size / 3 - 4);
        g.stroke({ width: 2, color: 0x3a2510 });

        // Handle
        g.circle(size * 0.65, size / 2, 3);
        g.fill(isLocked ? 0xcc8833 : 0x888888);

        // Lock keyhole
        if (isLocked) {
          g.circle(size * 0.65, size / 2 + 8, 2);
          g.fill(0x222222);
        }
      }
    }
  }

  private addStairsTexture(g: Graphics, size: number, tileId: number): void {
    const isDown = tileId === TERRAIN.STAIRS_DOWN;
    const steps = 4;

    for (let i = 0; i < steps; i++) {
      const stepY = isDown ? i * (size / steps) : (steps - 1 - i) * (size / steps);
      const brightness = isDown ? 0.8 - i * 0.15 : 0.5 + i * 0.15;
      const stepColor = Math.floor(brightness * 90) * 0x010101 + 0x303040;

      g.rect(2, stepY, size - 4, size / steps - 1);
      g.fill(stepColor);

      // Step edge highlight
      g.moveTo(2, stepY);
      g.lineTo(size - 2, stepY);
      g.stroke({ width: 1, color: 0xffffff, alpha: 0.1 });
    }

    // Arrow indicator
    const arrowY = isDown ? size - 8 : 8;
    const arrowDir = isDown ? 1 : -1;
    g.moveTo(size / 2, arrowY);
    g.lineTo(size / 2 - 5, arrowY - 5 * arrowDir);
    g.lineTo(size / 2 + 5, arrowY - 5 * arrowDir);
    g.closePath();
    g.fill({ color: 0xffffff, alpha: 0.3 });
  }

  // ============================================
  // OBJECT RENDERING
  // ============================================

  private renderObject(obj: RoomObject): void {
    const container = new Container();
    const size = this.config.tileSize;
    const color = OBJECT_COLORS[obj.type] ?? 0xffffff;

    const g = new Graphics();

    if (obj.type >= OBJECTS.CHEST_CLOSED && obj.type <= OBJECTS.SACK) {
      this.renderContainerObject(g, size, obj, color);
    } else if (obj.type >= OBJECTS.TABLE && obj.type <= OBJECTS.THRONE) {
      this.renderFurnitureObject(g, size, obj.type, color);
    } else if (obj.type >= OBJECTS.TORCH_WALL && obj.type <= OBJECTS.CRYSTAL_GLOW) {
      this.renderLightSource(container, g, size, obj.type, color);
    } else if (obj.type >= OBJECTS.ALTAR && obj.type <= OBJECTS.STATUE) {
      this.renderInteractable(g, size, obj.type, color);
    } else if (obj.type >= OBJECTS.GOLD_PILE && obj.type <= OBJECTS.ARMOR_STAND) {
      this.renderLoot(g, size, obj.type, color);
    } else if (obj.type >= OBJECTS.TRAP_SPIKE && obj.type <= OBJECTS.TRAP_PIT) {
      this.renderTrap(g, size, obj.type);
    } else {
      // Generic object
      g.circle(size / 2, size / 2, size / 3);
      g.fill(color);
    }

    container.addChild(g);
    container.x = obj.x * size;
    container.y = obj.y * size;
    container.eventMode = obj.interactable ? 'static' : 'none';
    container.cursor = obj.interactable ? 'pointer' : 'default';

    this.objectLayer.addChild(container);
    this.objects.set(obj.id, { data: obj, sprite: container, glowPhase: Math.random() * Math.PI * 2 });
  }

  private renderContainerObject(g: Graphics, size: number, obj: RoomObject, color: number): void {
    const isOpen = obj.state === 'open';
    const isLocked = obj.state === 'locked' || obj.type === OBJECTS.CHEST_LOCKED;

    // Chest body
    g.roundRect(4, size * 0.4, size - 8, size * 0.5, 3);
    g.fill(color);
    g.roundRect(4, size * 0.4, size - 8, size * 0.5, 3);
    g.stroke({ width: 2, color: 0x000000, alpha: 0.4 });

    // Lid
    if (!isOpen) {
      g.roundRect(3, size * 0.25, size - 6, size * 0.2, 2);
      g.fill(color);
      g.stroke({ width: 1, color: 0x000000, alpha: 0.3 });

      // Lock
      g.circle(size / 2, size * 0.55, 4);
      g.fill(isLocked ? 0xddaa00 : 0x666666);

      // Keyhole
      if (isLocked) {
        g.circle(size / 2, size * 0.55, 1.5);
        g.fill(0x222222);
      }
    } else {
      // Open lid (tilted back)
      g.rect(3, size * 0.1, size - 6, size * 0.15);
      g.fill({ color: color, alpha: 0.8 });
    }

    // Metal bands
    g.rect(size * 0.2, size * 0.42, 2, size * 0.45);
    g.fill(0x444444);
    g.rect(size * 0.8 - 2, size * 0.42, 2, size * 0.45);
    g.fill(0x444444);

    // Highlight
    g.moveTo(6, size * 0.42);
    g.lineTo(size - 6, size * 0.42);
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.2 });
  }

  private renderFurnitureObject(g: Graphics, size: number, type: number, color: number): void {
    switch (type) {
      case OBJECTS.TABLE:
        // Table top
        g.rect(2, size * 0.35, size - 4, size * 0.1);
        g.fill(color);
        // Legs
        g.rect(4, size * 0.45, 3, size * 0.45);
        g.rect(size - 7, size * 0.45, 3, size * 0.45);
        g.fill(color * 0.8);
        break;
      case OBJECTS.CHAIR:
        // Seat
        g.rect(size * 0.2, size * 0.5, size * 0.6, size * 0.1);
        g.fill(color);
        // Back
        g.rect(size * 0.2, size * 0.2, size * 0.1, size * 0.35);
        g.fill(color);
        // Legs
        g.rect(size * 0.25, size * 0.6, 3, size * 0.35);
        g.rect(size * 0.7, size * 0.6, 3, size * 0.35);
        g.fill(color * 0.7);
        break;
      case OBJECTS.BED:
        // Frame
        g.rect(2, size * 0.3, size - 4, size * 0.6);
        g.fill(0x5a3a2a);
        // Mattress
        g.rect(4, size * 0.35, size - 8, size * 0.5);
        g.fill(0x8b4040);
        // Pillow
        g.roundRect(5, size * 0.38, size * 0.3, size * 0.2, 3);
        g.fill(0xccccaa);
        break;
      default:
        g.circle(size / 2, size / 2, size / 3);
        g.fill(color);
    }
  }

  private renderLightSource(container: Container, g: Graphics, size: number, type: number, color: number): void {
    const glowColor = getLightColor(type);
    const radius = getLightRadius(type) * (size / 4);

    // Glow effect (separate graphic for animation)
    const glow = new Graphics();
    glow.circle(size / 2, size / 2, radius);
    glow.fill({ color: glowColor, alpha: 0.3 });
    glow.circle(size / 2, size / 2, radius * 0.6);
    glow.fill({ color: glowColor, alpha: 0.2 });
    glow.label = 'glow';
    container.addChild(glow);

    // Light source itself
    if (type === OBJECTS.TORCH_WALL || type === OBJECTS.TORCH_GROUND) {
      // Handle
      g.rect(size / 2 - 2, size * 0.4, 4, size * 0.5);
      g.fill(0x5a3a2a);
      // Flame
      g.moveTo(size / 2, size * 0.15);
      g.lineTo(size / 2 - 5, size * 0.4);
      g.lineTo(size / 2 + 5, size * 0.4);
      g.closePath();
      g.fill(0xff6622);
      g.moveTo(size / 2, size * 0.22);
      g.lineTo(size / 2 - 3, size * 0.38);
      g.lineTo(size / 2 + 3, size * 0.38);
      g.closePath();
      g.fill(0xffcc00);
    } else if (type === OBJECTS.CAMPFIRE) {
      // Logs
      g.rect(size * 0.2, size * 0.7, size * 0.6, 4);
      g.fill(0x4a2a1a);
      g.rect(size * 0.25, size * 0.65, size * 0.5, 4);
      g.fill(0x3a1a0a);
      // Flames
      for (let i = 0; i < 3; i++) {
        const fx = size * 0.3 + i * size * 0.2;
        g.moveTo(fx, size * 0.25);
        g.lineTo(fx - 4, size * 0.6);
        g.lineTo(fx + 4, size * 0.6);
        g.closePath();
        g.fill(0xff5500);
      }
    } else {
      // Generic light
      g.circle(size / 2, size / 2, 6);
      g.fill(color);
    }
  }

  private renderInteractable(g: Graphics, size: number, type: number, color: number): void {
    if (type === OBJECTS.ALTAR) {
      // Base
      g.rect(size * 0.15, size * 0.6, size * 0.7, size * 0.35);
      g.fill(0x555566);
      // Top
      g.rect(size * 0.1, size * 0.5, size * 0.8, size * 0.15);
      g.fill(0x666677);
      // Candles
      g.rect(size * 0.2, size * 0.35, 3, size * 0.15);
      g.rect(size * 0.77, size * 0.35, 3, size * 0.15);
      g.fill(0xcccc99);
      // Flames
      g.circle(size * 0.215, size * 0.32, 2);
      g.circle(size * 0.785, size * 0.32, 2);
      g.fill(0xff9933);
    } else if (type === OBJECTS.FOUNTAIN) {
      // Basin
      g.circle(size / 2, size / 2, size * 0.4);
      g.fill(0x556688);
      g.circle(size / 2, size / 2, size * 0.3);
      g.fill(0x4488cc);
      // Center spout
      g.circle(size / 2, size / 2, 4);
      g.fill(0x667788);
    } else if (type === OBJECTS.LEVER) {
      // Base
      g.rect(size * 0.35, size * 0.7, size * 0.3, size * 0.25);
      g.fill(0x444444);
      // Lever arm
      g.rect(size * 0.45, size * 0.3, 4, size * 0.45);
      g.fill(0x666666);
      // Handle
      g.circle(size / 2, size * 0.3, 4);
      g.fill(0x888888);
    } else {
      g.circle(size / 2, size / 2, size / 3);
      g.fill(color);
    }
  }

  private renderLoot(g: Graphics, size: number, type: number, color: number): void {
    if (type === OBJECTS.GOLD_PILE) {
      // Coins
      for (let i = 0; i < 6; i++) {
        const cx = size * 0.3 + (i % 3) * size * 0.2;
        const cy = size * 0.5 + Math.floor(i / 3) * size * 0.15;
        g.circle(cx, cy, 4);
        g.fill(0xffd700);
        g.circle(cx, cy, 4);
        g.stroke({ width: 1, color: 0xaa8800 });
      }
    } else if (type === OBJECTS.POTION) {
      // Bottle
      g.roundRect(size * 0.35, size * 0.4, size * 0.3, size * 0.5, 3);
      g.fill(0xff4444);
      // Neck
      g.rect(size * 0.42, size * 0.3, size * 0.16, size * 0.15);
      g.fill(0x666666);
      // Cork
      g.rect(size * 0.44, size * 0.22, size * 0.12, size * 0.1);
      g.fill(0x8b5a2b);
      // Liquid shine
      g.circle(size * 0.42, size * 0.55, 2);
      g.fill({ color: 0xffffff, alpha: 0.4 });
    } else {
      g.circle(size / 2, size / 2, size / 4);
      g.fill(color);
    }
  }

  private renderTrap(g: Graphics, size: number, type: number): void {
    if (type === OBJECTS.TRAP_SPIKE) {
      // Floor with holes
      g.rect(0, 0, size, size);
      g.fill(0x3a3a4a);
      // Spike holes
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const hx = 6 + i * 10;
          const hy = 6 + j * 10;
          g.circle(hx, hy, 3);
          g.fill(0x1a1a2a);
        }
      }
    } else if (type === OBJECTS.TRAP_FIRE) {
      g.rect(0, 0, size, size);
      g.fill(0x3a2a2a);
      // Vent grate
      for (let i = 0; i < 4; i++) {
        g.rect(4 + i * 7, 4, 4, size - 8);
        g.fill(0x222222);
      }
    }
  }

  // ============================================
  // ENTITY RENDERING (Circles with eyes!)
  // ============================================

  private renderEntity(entity: RoomEntity): void {
    const container = new Container();
    const size = this.config.tileSize;
    // Use custom color if provided, otherwise fall back to type-based color
    const color = entity.color
      ? parseInt(entity.color.replace('#', ''), 16)
      : (ENTITY_COLORS[entity.type] ?? 0xffffff);
    const radius = size * 0.4;

    // Shadow
    const shadow = new Graphics();
    shadow.ellipse(0, radius * 0.7, radius * 0.8, radius * 0.3);
    shadow.fill({ color: 0x000000, alpha: 0.3 });
    container.addChild(shadow);

    // Body (circle)
    const body = new Graphics();
    body.circle(0, 0, radius);
    body.fill(color);

    // Body outline
    body.circle(0, 0, radius);
    body.stroke({
      width: 3,
      color: entity.hostile ? 0xff3333 : 0x000000,
      alpha: entity.hostile ? 0.8 : 0.4
    });

    // Body highlight (top arc)
    body.arc(0, 0, radius * 0.8, Math.PI * 1.2, Math.PI * 1.8);
    body.stroke({ width: 2, color: 0xffffff, alpha: 0.2 });

    container.addChild(body);

    // Eyes container
    const eyes = new Graphics();
    eyes.label = 'eyes';

    // Eye whites
    const eyeOffsetX = radius * 0.3;
    const eyeOffsetY = -radius * 0.1;
    const eyeRadius = radius * 0.25;

    eyes.circle(-eyeOffsetX, eyeOffsetY, eyeRadius);
    eyes.circle(eyeOffsetX, eyeOffsetY, eyeRadius);
    eyes.fill(0xffffff);

    // Pupils (looking forward by default)
    const pupilRadius = eyeRadius * 0.5;
    eyes.circle(-eyeOffsetX, eyeOffsetY, pupilRadius);
    eyes.circle(eyeOffsetX, eyeOffsetY, pupilRadius);
    eyes.fill(0x000000);

    // Eye shine
    eyes.circle(-eyeOffsetX - 1, eyeOffsetY - 1, pupilRadius * 0.3);
    eyes.circle(eyeOffsetX - 1, eyeOffsetY - 1, pupilRadius * 0.3);
    eyes.fill({ color: 0xffffff, alpha: 0.8 });

    container.addChild(eyes);

    // HP bar for hostiles
    if (entity.hostile && entity.hp !== undefined && entity.maxHp !== undefined) {
      const hpBar = new Graphics();
      const barWidth = size * 0.8;
      const hpPercent = entity.hp / entity.maxHp;

      // Background
      hpBar.roundRect(-barWidth / 2, -radius - 10, barWidth, 6, 2);
      hpBar.fill(0x333333);

      // HP fill
      hpBar.roundRect(-barWidth / 2 + 1, -radius - 9, (barWidth - 2) * hpPercent, 4, 1);
      hpBar.fill(hpPercent > 0.3 ? 0x44ff44 : 0xff4444);

      container.addChild(hpBar);
    }

    // Name label for non-hostile entities
    if (!entity.hostile && entity.name) {
      const nameText = new Text({
        text: entity.name,
        style: new TextStyle({
          fontSize: 10,
          fill: 0xffffff,
          fontWeight: 'bold',
          stroke: { color: 0x000000, width: 2 },
        }),
      });
      nameText.anchor.set(0.5, 0);
      nameText.y = radius + 5;
      container.addChild(nameText);
    }

    container.x = entity.x * size + size / 2;
    container.y = entity.y * size + size / 2;
    container.eventMode = 'static';
    container.cursor = 'pointer';

    this.entityLayer.addChild(container);
    this.entities.set(entity.id, {
      data: entity,
      sprite: container,
      targetX: entity.x,
      targetY: entity.y,
      moving: false,
      path: [],
      pathIndex: 0,
      speed: 6,
      eyeOffset: 0,
      blinkTimer: 2000 + Math.random() * 3000,
      isBlinking: false,
    });
  }

  private spawnPlayer(x: number, y: number): void {
    const playerEntity: RoomEntity = {
      id: 'player',
      type: 100,
      x,
      y,
      name: 'Player',
      hostile: false,
    };

    this.renderEntity(playerEntity);
    this.playerPosition = { x, y };
  }

  // ============================================
  // ENTITY MOVEMENT
  // ============================================

  moveEntity(entityId: string, path: Position[], speed: 'slow' | 'normal' | 'fast'): void {
    const entity = this.entities.get(entityId);
    if (!entity || path.length === 0) return;

    const speedMultiplier = speed === 'slow' ? 3 : speed === 'fast' ? 9 : 6;

    entity.path = path;
    entity.pathIndex = 0;
    entity.targetX = path[0].x;
    entity.targetY = path[0].y;
    entity.moving = true;
    entity.speed = speedMultiplier;
  }

  // ============================================
  // TILE UPDATES
  // ============================================

  updateTile(x: number, y: number, newTileId: number): void {
    if (!this.currentRoom) return;
    if (x < 0 || x >= this.currentRoom.width || y < 0 || y >= this.currentRoom.height) return;

    this.currentRoom.tiles[y][x] = newTileId;

    const oldTile = this.tileGraphics[y]?.[x];
    if (oldTile) {
      this.tileLayer.removeChild(oldTile);
      oldTile.destroy();
    }

    const newTile = this.renderTile(x, y, newTileId);
    this.tileGraphics[y][x] = newTile;
    this.tileLayer.addChild(newTile);
  }

  // ============================================
  // ENTITY SPAWN/REMOVE
  // ============================================

  spawnEntity(data: { id: string; type: number; x: number; y: number; name: string; hostile: boolean; animation?: string }): void {
    if (this.entities.has(data.id)) return;

    const entity: RoomEntity = {
      id: data.id,
      type: data.type,
      x: data.x,
      y: data.y,
      name: data.name,
      hostile: data.hostile,
    };

    this.renderEntity(entity);

    // Spawn animation
    const renderedEntity = this.entities.get(data.id);
    if (renderedEntity && data.animation) {
      renderedEntity.sprite.alpha = 0;
      renderedEntity.sprite.scale.set(0.5);
      const fadeIn = () => {
        renderedEntity.sprite.alpha += 0.1;
        renderedEntity.sprite.scale.set(renderedEntity.sprite.scale.x + 0.05);
        if (renderedEntity.sprite.alpha < 1) {
          requestAnimationFrame(fadeIn);
        } else {
          renderedEntity.sprite.alpha = 1;
          renderedEntity.sprite.scale.set(1);
        }
      };
      fadeIn();
    }

    this.currentRoom?.entities.push(entity);
  }

  removeEntity(entityId: string, animation: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    const fadeOut = () => {
      entity.sprite.alpha -= 0.1;
      if (animation === 'explode') {
        entity.sprite.scale.set(entity.sprite.scale.x * 1.1);
      }
      if (entity.sprite.alpha <= 0) {
        this.entityLayer.removeChild(entity.sprite);
        entity.sprite.destroy();
        this.entities.delete(entityId);
      } else {
        requestAnimationFrame(fadeOut);
      }
    };
    fadeOut();

    if (this.currentRoom) {
      this.currentRoom.entities = this.currentRoom.entities.filter(e => e.id !== entityId);
    }
  }

  // ============================================
  // OBJECT INTERACTION
  // ============================================

  interactObject(objectId: string, action: string): void {
    const obj = this.objects.get(objectId);
    if (!obj) return;

    if (action === 'open' && (obj.data.type === OBJECTS.CHEST_CLOSED || obj.data.type === OBJECTS.CHEST_LOCKED)) {
      obj.data.type = OBJECTS.CHEST_OPEN;
      obj.data.state = 'open';

      this.objectLayer.removeChild(obj.sprite);
      obj.sprite.destroy();
      this.renderObject(obj.data);
    }
  }

  // ============================================
  // COMBAT EFFECTS
  // ============================================

  showCombatEffect(data: { attackerId: string; targetId: string; effectType: string; damage?: number; isCritical?: boolean; miss?: boolean }): void {
    const target = this.entities.get(data.targetId);
    if (!target) return;

    // Shake target
    const originalX = target.sprite.x;
    const shakeIntensity = data.isCritical ? 12 : 6;
    let shakeCount = 0;
    const shake = () => {
      shakeCount++;
      target.sprite.x = originalX + (Math.random() - 0.5) * shakeIntensity;
      if (shakeCount < 12) {
        requestAnimationFrame(shake);
      } else {
        target.sprite.x = originalX;
      }
    };
    shake();

    // Flash red on hit
    if (!data.miss && target.sprite.children.length > 1) {
      const body = target.sprite.children[1] as Graphics;
      if (body) {
        body.tint = 0xff6666;
        setTimeout(() => { body.tint = 0xffffff; }, 150);
      }
    }

    // Show damage number
    if (data.damage !== undefined || data.miss) {
      const style = new TextStyle({
        fontSize: data.isCritical ? 24 : 16,
        fontWeight: 'bold',
        fill: data.miss ? 0xaaaaaa : (data.isCritical ? 0xffff00 : 0xff4444),
        stroke: { color: 0x000000, width: 4 },
      });

      const text = new Text({
        text: data.miss ? 'MISS' : (data.isCritical ? `CRIT! -${data.damage}` : `-${data.damage}`),
        style,
      });
      text.anchor.set(0.5);
      text.x = target.sprite.x;
      text.y = target.sprite.y - this.config.tileSize / 2;

      this.effectLayer.addChild(text);
      this.damageNumbers.push({
        text,
        startY: text.y,
        life: 1200,
      });
    }

    // Update HP
    if (data.damage && target.data.hp !== undefined) {
      target.data.hp = Math.max(0, target.data.hp - data.damage);
    }
  }

  // ============================================
  // CAMERA EFFECTS
  // ============================================

  playCameraEffect(data: { effectType: string; intensity: string; color?: string }): void {
    if (data.effectType === 'shake') {
      const intensity = data.intensity === 'heavy' ? 20 : data.intensity === 'medium' ? 10 : 5;
      let count = 0;
      const originalX = this.worldContainer.x;
      const originalY = this.worldContainer.y;

      const shake = () => {
        count++;
        const decay = 1 - count / 25;
        this.worldContainer.x = originalX + (Math.random() - 0.5) * intensity * decay;
        this.worldContainer.y = originalY + (Math.random() - 0.5) * intensity * decay;

        if (count < 25) {
          requestAnimationFrame(shake);
        } else {
          this.worldContainer.x = originalX;
          this.worldContainer.y = originalY;
        }
      };
      shake();
    }

    if (data.effectType === 'flash') {
      const flash = new Graphics();
      const colorHex = data.color ? parseInt(data.color.replace('#', ''), 16) : 0xffffff;
      flash.rect(0, 0, this.config.width, this.config.height);
      flash.fill({ color: colorHex, alpha: 0.6 });
      this.uiLayer.addChild(flash);

      let alpha = 0.6;
      const fade = () => {
        alpha -= 0.04;
        flash.alpha = alpha;
        if (alpha > 0) {
          requestAnimationFrame(fade);
        } else {
          this.uiLayer.removeChild(flash);
          flash.destroy();
        }
      };
      fade();
    }
  }

  // ============================================
  // VISIBILITY / FOG OF WAR WITH DYNAMIC LIGHTING
  // ============================================

  /**
   * Collect all light sources from objects in the room
   */
  private collectLightSources(): void {
    this.lightSources = [];

    if (!this.currentRoom) return;

    // Add light sources from objects
    for (const obj of this.currentRoom.objects) {
      if (isLightSource(obj.type)) {
        this.lightSources.push({
          x: obj.x,
          y: obj.y,
          radius: getLightRadius(obj.type),
          color: getLightColor(obj.type),
        });
      }
    }

    // Player carries a small light (larger in dark rooms)
    const playerLightRadius = this.currentRoom.lighting === 'dark' ? 3 :
                              this.currentRoom.lighting === 'dim' ? 2 : 1;
    this.lightSources.push({
      x: this.playerPosition.x,
      y: this.playerPosition.y,
      radius: playerLightRadius,
      color: 0xffffcc, // Warm white
    });
  }

  /**
   * Calculate light level for a specific tile (0.0 = dark, 1.0 = bright)
   */
  private calculateTileLightLevel(tileX: number, tileY: number): number {
    if (!this.currentRoom) return 0;

    // Base ambient light from room lighting setting
    let ambientLight = this.currentRoom.lighting === 'bright' ? 0.7 :
                       this.currentRoom.lighting === 'dim' ? 0.25 : 0.05;

    let maxLight = ambientLight;

    // Add light from each light source
    for (const light of this.lightSources) {
      const dx = tileX - light.x;
      const dy = tileY - light.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= light.radius) {
        // Light falloff: brighter at center, dimmer at edge
        const falloff = 1 - (distance / light.radius);
        const lightIntensity = falloff * falloff; // Quadratic falloff for softer edges
        maxLight = Math.max(maxLight, lightIntensity);
      }
    }

    return Math.min(1, maxLight);
  }

  private updateVisibility(): void {
    if (!this.currentRoom) return;

    // Collect all light sources (including player's light that moves with them)
    this.collectLightSources();

    this.visibleTiles.clear();
    this.tileLightLevels.clear();

    // Calculate view radius based on room lighting + light sources
    const baseViewRadius = this.currentRoom.lighting === 'bright' ? 15 :
                           this.currentRoom.lighting === 'dim' ? 10 : 6;

    // Calculate light levels for all tiles within potential view
    for (let y = 0; y < this.currentRoom.height; y++) {
      for (let x = 0; x < this.currentRoom.width; x++) {
        const dx = x - this.playerPosition.x;
        const dy = y - this.playerPosition.y;
        const distFromPlayer = Math.sqrt(dx * dx + dy * dy);

        // Only process tiles within maximum view distance
        if (distFromPlayer <= baseViewRadius) {
          const key = `${x},${y}`;
          const lightLevel = this.calculateTileLightLevel(x, y);
          this.tileLightLevels.set(key, lightLevel);

          // Tile is visible if it has enough light and is close enough to player
          // (simulating that you need to be somewhat close to see even lit areas)
          if (lightLevel > 0.1 && distFromPlayer <= baseViewRadius) {
            this.visibleTiles.add(key);
            this.exploredTiles.add(key);
          }
        }
      }
    }

    this.renderFog();
  }

  private renderFog(): void {
    if (!this.currentRoom) return;

    this.fogLayer.removeChildren();

    for (let y = 0; y < this.currentRoom.height; y++) {
      for (let x = 0; x < this.currentRoom.width; x++) {
        const key = `${x},${y}`;
        const isVisible = this.visibleTiles.has(key);
        const isExplored = this.exploredTiles.has(key);
        const lightLevel = this.tileLightLevels.get(key) || 0;

        // Always add a fog overlay, but with varying alpha based on light
        const fog = new Graphics();
        fog.rect(0, 0, this.config.tileSize, this.config.tileSize);

        let alpha: number;
        let color = 0x0a0a15;

        if (!isVisible && !isExplored) {
          // Completely unexplored - full darkness
          alpha = 0.95;
        } else if (!isVisible && isExplored) {
          // Explored but not currently visible - dim memory
          alpha = 0.7;
        } else {
          // Currently visible - darkness based on inverse of light level
          // More light = less darkness overlay
          alpha = Math.max(0, 0.6 - (lightLevel * 0.6));

          // Add subtle color tint near light sources
          if (lightLevel > 0.5) {
            // Near a bright light source - slightly warmer tint
            color = 0x1a1510;
          }
        }

        if (alpha > 0.01) {
          fog.fill({ color, alpha });
          fog.x = x * this.config.tileSize;
          fog.y = y * this.config.tileSize;
          this.fogLayer.addChild(fog);
        }
      }
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy(): void {
    this.isDestroyed = true;
    if (this.isInitialized && this.app.stage) {
      this.app.destroy(true);
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  get room(): RoomData | null {
    return this.currentRoom;
  }

  get player(): Position {
    return this.playerPosition;
  }

  getEntity(id: string): RoomEntity | undefined {
    return this.entities.get(id)?.data;
  }

  setEditMode(editMode: boolean): void {
    this.config.editMode = editMode;
  }

  setOnTileClick(callback: ((x: number, y: number) => void) | undefined): void {
    this.config.onTileClick = callback;
  }
}
