import { Container, Graphics } from 'pixi.js';

// Tile type colors (placeholders)
const TILE_COLORS: Record<number, number> = {
  0: 0x2d2d3a,  // Empty/void - dark gray
  1: 0x4a3728,  // Floor - brown
  2: 0x1a1a2e,  // Wall - dark blue-gray
  3: 0x3b7d4e,  // Grass - green
  4: 0x4a90d9,  // Water - blue
  5: 0xc9a227,  // Sand - yellow
  6: 0x6b6b6b,  // Stone - gray
  7: 0x8b4513,  // Wood - saddle brown
  8: 0xffd700,  // Treasure/special - gold
  9: 0x9932cc,  // Magic/portal - purple
};

export interface Transition {
  x: number;
  y: number;
  toLocationId: string;
  spawnPoint: { x: number; y: number };
}

export class TileMap {
  public container: Container;
  private tiles: Graphics[][] = [];
  private collisionMask: number[][] = [];
  private transitions: Transition[] = [];
  private tileSize: number;
  private width: number = 0;
  private height: number = 0;

  constructor(tileSize: number) {
    this.tileSize = tileSize;
    this.container = new Container();
  }

  load(
    tilemapData: number[][],
    collisionMask: number[][],
    transitions: Transition[] = []
  ): void {
    // Clear existing tiles
    this.container.removeChildren();
    this.tiles = [];

    this.height = tilemapData.length;
    this.width = tilemapData[0]?.length || 0;
    this.collisionMask = collisionMask;
    this.transitions = transitions;

    // Create tiles
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        const tileType = tilemapData[y][x];
        const tile = this.createTile(x, y, tileType);
        this.tiles[y][x] = tile;
        this.container.addChild(tile);
      }
    }

    // Draw transition indicators
    for (const transition of transitions) {
      const indicator = this.createTransitionIndicator(transition.x, transition.y);
      this.container.addChild(indicator);
    }
  }

  private createTile(x: number, y: number, tileType: number): Graphics {
    const tile = new Graphics();
    const color = TILE_COLORS[tileType] || TILE_COLORS[0];

    // Draw tile with slight border for grid visibility
    tile.rect(0, 0, this.tileSize, this.tileSize).fill(color);
    tile.rect(0, 0, this.tileSize, this.tileSize).stroke({ width: 1, color: 0x000000, alpha: 0.1 });

    tile.x = x * this.tileSize;
    tile.y = y * this.tileSize;

    return tile;
  }

  private createTransitionIndicator(x: number, y: number): Graphics {
    const indicator = new Graphics();

    // Pulsing purple circle for transitions
    indicator.circle(this.tileSize / 2, this.tileSize / 2, this.tileSize / 3);
    indicator.fill({ color: 0x9932cc, alpha: 0.5 });

    indicator.x = x * this.tileSize;
    indicator.y = y * this.tileSize;

    return indicator;
  }

  isWalkable(gridX: number, gridY: number): boolean {
    // Out of bounds
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return false;
    }

    // Check collision mask (0 = walkable, 1 = blocked)
    const collision = this.collisionMask[gridY]?.[gridX];
    return collision === 0;
  }

  getTileAt(gridX: number, gridY: number): number {
    if (gridY < 0 || gridY >= this.height || gridX < 0 || gridX >= this.width) {
      return 0;
    }
    return this.tiles[gridY]?.[gridX] ? 1 : 0; // Simple existence check
  }

  getTransitions(): Transition[] {
    return this.transitions;
  }

  getTransitionAt(gridX: number, gridY: number): Transition | null {
    return this.transitions.find(t => t.x === gridX && t.y === gridY) || null;
  }

  // Get map dimensions in pixels
  getPixelWidth(): number {
    return this.width * this.tileSize;
  }

  getPixelHeight(): number {
    return this.height * this.tileSize;
  }

  // Get map dimensions in tiles
  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}

// Helper function to generate a default map
export function generateDefaultMap(width: number, height: number): {
  tilemapData: number[][];
  collisionMask: number[][];
} {
  const tilemapData: number[][] = [];
  const collisionMask: number[][] = [];

  for (let y = 0; y < height; y++) {
    tilemapData[y] = [];
    collisionMask[y] = [];
    for (let x = 0; x < width; x++) {
      // Border walls
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tilemapData[y][x] = 2; // Wall
        collisionMask[y][x] = 1; // Blocked
      } else {
        // Random floor tiles with occasional obstacles
        if (Math.random() < 0.1 && x > 3 && y > 3) {
          tilemapData[y][x] = 6; // Stone obstacle
          collisionMask[y][x] = 1; // Blocked
        } else {
          tilemapData[y][x] = Math.random() < 0.3 ? 3 : 1; // Grass or floor
          collisionMask[y][x] = 0; // Walkable
        }
      }
    }
  }

  // Ensure spawn area is clear
  for (let y = 1; y < 4; y++) {
    for (let x = 1; x < 4; x++) {
      tilemapData[y][x] = 1;
      collisionMask[y][x] = 0;
    }
  }

  return { tilemapData, collisionMask };
}
