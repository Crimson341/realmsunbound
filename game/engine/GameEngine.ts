import { Application, Container, Graphics, Ticker } from 'pixi.js';
import { TileMap } from './TileMap';
import { Camera } from './Camera';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';

export interface GameEngineConfig {
  width: number;
  height: number;
  tileSize: number;
  onInteract?: (npc: NPC) => void;
  onCombatTrigger?: (enemy: NPC) => void;
  onTransition?: (toLocationId: string, spawnPoint: { x: number; y: number }) => void;
}

export class GameEngine {
  private app: Application;
  private worldContainer: Container;
  private tileMap: TileMap;
  private camera: Camera;
  private input: InputManager;
  private player: Player;
  private npcs: NPC[] = [];
  private config: GameEngineConfig;

  private isInitialized = false;
  private isDestroyed = false;
  private isPaused = false;
  private lastTime = 0;

  constructor(config: GameEngineConfig) {
    this.config = config;
    this.app = new Application();
    this.worldContainer = new Container();
    this.tileMap = new TileMap(config.tileSize);
    this.camera = new Camera(config.width, config.height);
    this.input = new InputManager();
    this.player = new Player(config.tileSize);
  }

  async init(container: HTMLElement): Promise<void> {
    // Check if already destroyed (React StrictMode double-invoke)
    if (this.isDestroyed) return;

    // Initialize PixiJS application
    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      backgroundColor: 0x1a1a2e,
      antialias: false, // Pixel art should be crisp
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Check again after async (might have been destroyed during init)
    if (this.isDestroyed) {
      this.app.destroy(true);
      return;
    }

    // Append canvas to container
    container.appendChild(this.app.canvas);

    // Setup world container
    this.app.stage.addChild(this.worldContainer);

    // Add tilemap to world
    this.worldContainer.addChild(this.tileMap.container);

    // Add player to world
    this.worldContainer.addChild(this.player.sprite);

    // Initialize input handling
    this.input.init();

    // Start game loop
    this.app.ticker.add(this.update.bind(this));

    this.isInitialized = true;
  }

  private update(ticker: Ticker): void {
    if (!this.isInitialized || this.isPaused) return;

    const deltaTime = ticker.deltaMS;

    // Update player
    this.player.update(deltaTime, this.input, this.tileMap);

    // Update NPCs
    for (const npc of this.npcs) {
      npc.update(deltaTime, this.tileMap);
    }

    // Update camera to follow player
    this.camera.follow(this.player.pixelX, this.player.pixelY);
    this.camera.apply(this.worldContainer);

    // Check for interactions (E or Space pressed)
    if (this.input.isInteractPressed()) {
      this.checkInteraction();
    }

    // Check for combat triggers (hostile NPC collision)
    this.checkCombatTriggers();

    // Check for location transitions
    this.checkTransitions();
  }

  private checkInteraction(): void {
    const interactRange = 1; // 1 tile range
    for (const npc of this.npcs) {
      const dx = Math.abs(npc.gridX - this.player.gridX);
      const dy = Math.abs(npc.gridY - this.player.gridY);

      if (dx <= interactRange && dy <= interactRange && !npc.isHostile) {
        this.config.onInteract?.(npc);
        break;
      }
    }
  }

  private checkCombatTriggers(): void {
    for (const npc of this.npcs) {
      if (!npc.isHostile || npc.isDead) continue;

      // Check if player walked onto hostile NPC tile
      if (npc.gridX === this.player.gridX && npc.gridY === this.player.gridY) {
        this.config.onCombatTrigger?.(npc);
        break;
      }
    }
  }

  private checkTransitions(): void {
    const transitions = this.tileMap.getTransitions();
    for (const transition of transitions) {
      if (this.player.gridX === transition.x && this.player.gridY === transition.y) {
        this.config.onTransition?.(transition.toLocationId, transition.spawnPoint);
        break;
      }
    }
  }

  // Public API

  loadLocation(
    tilemapData: number[][],
    collisionMask: number[][],
    transitions: Array<{ x: number; y: number; toLocationId: string; spawnPoint: { x: number; y: number } }>
  ): void {
    this.tileMap.load(tilemapData, collisionMask, transitions);
    this.camera.setBounds(
      0, 0,
      tilemapData[0].length * this.config.tileSize,
      tilemapData.length * this.config.tileSize
    );
  }

  spawnPlayer(gridX: number, gridY: number): void {
    this.player.setPosition(gridX, gridY);
  }

  spawnNPC(npcData: {
    id: string;
    name: string;
    gridX: number;
    gridY: number;
    color: number;
    isHostile: boolean;
    role: string;
  }): NPC {
    const npc = new NPC(
      this.config.tileSize,
      npcData.id,
      npcData.name,
      npcData.color,
      npcData.isHostile,
      npcData.role
    );
    npc.setPosition(npcData.gridX, npcData.gridY);
    this.npcs.push(npc);
    this.worldContainer.addChild(npc.sprite);
    return npc;
  }

  clearNPCs(): void {
    for (const npc of this.npcs) {
      this.worldContainer.removeChild(npc.sprite);
    }
    this.npcs = [];
  }

  removeNPC(npcId: string): void {
    const index = this.npcs.findIndex(n => n.id === npcId);
    if (index !== -1) {
      this.worldContainer.removeChild(this.npcs[index].sprite);
      this.npcs.splice(index, 1);
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.input.destroy();

    // Only destroy app if it was fully initialized
    if (this.isInitialized && this.app.stage) {
      this.app.destroy(true);
    }
  }

  // Getters
  get playerPosition(): { gridX: number; gridY: number } {
    return { gridX: this.player.gridX, gridY: this.player.gridY };
  }

  get playerFacing(): 'up' | 'down' | 'left' | 'right' {
    return this.player.facing;
  }

  getNPCs(): NPC[] {
    return this.npcs;
  }
}
