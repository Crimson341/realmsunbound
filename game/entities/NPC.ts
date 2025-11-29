import { Graphics, Text, TextStyle } from 'pixi.js';
import { Entity } from './Entity';
import { TileMap } from '../engine/TileMap';

// Role-based colors for NPCs
const NPC_COLORS: Record<string, number> = {
  merchant: 0xfbbf24,   // Amber/gold
  guard: 0x64748b,      // Gray
  villager: 0xa78bfa,   // Purple
  enemy: 0xef4444,      // Red
  quest: 0x60a5fa,      // Blue
  healer: 0x4ade80,     // Green
  trainer: 0xf97316,    // Orange
  default: 0x94a3b8,    // Light gray
};

export type MovementPattern = 'static' | 'wander' | 'patrol';

export class NPC extends Entity {
  public readonly id: string;
  public readonly name: string;
  public readonly isHostile: boolean;
  public readonly role: string;
  public isDead: boolean = false;

  private color: number;
  private nameLabel: Text;
  private movementPattern: MovementPattern = 'static';
  private wanderTimer: number = 0;
  private wanderInterval: number = 3000; // ms between wander moves
  private patrolPath: Array<{ x: number; y: number }> = [];
  private patrolIndex: number = 0;

  constructor(
    tileSize: number,
    id: string,
    name: string,
    color: number | null,
    isHostile: boolean,
    role: string
  ) {
    super(tileSize);
    this.id = id;
    this.name = name;
    this.isHostile = isHostile;
    this.role = role;
    this.color = color ?? NPC_COLORS[role] ?? NPC_COLORS.default;
    this.moveSpeed = 3; // Slower than player

    // Create name label
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 2 },
    });
    this.nameLabel = new Text({ text: name, style });
    this.nameLabel.anchor.set(0.5, 1);

    this.createSprite();
  }

  protected createSprite(): void {
    this.sprite.clear();

    // Body (rectangle)
    this.sprite.roundRect(4, 8, this.tileSize - 8, this.tileSize - 10, 3);
    this.sprite.fill(this.color);

    // Head (circle)
    this.sprite.circle(this.tileSize / 2, 10, 5);
    this.sprite.fill(this.color);

    // Hostile indicator (red outline)
    if (this.isHostile) {
      this.sprite.roundRect(2, 6, this.tileSize - 4, this.tileSize - 8, 4);
      this.sprite.stroke({ width: 2, color: 0xff0000 });
    }

    // Dead indicator
    if (this.isDead) {
      // X marks
      this.sprite.moveTo(this.tileSize / 2 - 8, this.tileSize / 2 - 8);
      this.sprite.lineTo(this.tileSize / 2 + 8, this.tileSize / 2 + 8);
      this.sprite.stroke({ width: 3, color: 0xff0000 });
      this.sprite.moveTo(this.tileSize / 2 + 8, this.tileSize / 2 - 8);
      this.sprite.lineTo(this.tileSize / 2 - 8, this.tileSize / 2 + 8);
      this.sprite.stroke({ width: 3, color: 0xff0000 });
    }

    // Add name label above sprite
    this.nameLabel.y = -4;
    this.nameLabel.x = this.tileSize / 2;
    this.sprite.addChild(this.nameLabel);
  }

  update(deltaTime: number, tilemap: TileMap): void {
    // Update movement animation
    this.updateMovement(deltaTime);

    // Don't process AI if dead or moving
    if (this.isDead || this.isMoving) return;

    // Process movement patterns
    switch (this.movementPattern) {
      case 'wander':
        this.updateWander(deltaTime, tilemap);
        break;
      case 'patrol':
        this.updatePatrol(tilemap);
        break;
    }
  }

  private updateWander(deltaTime: number, tilemap: TileMap): void {
    this.wanderTimer += deltaTime;

    if (this.wanderTimer >= this.wanderInterval) {
      this.wanderTimer = 0;

      // Random direction
      const directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const targetX = this.gridX + dir.x;
      const targetY = this.gridY + dir.y;

      if (tilemap.isWalkable(targetX, targetY)) {
        this.startMove(targetX, targetY);
      }
    }
  }

  private updatePatrol(tilemap: TileMap): void {
    if (this.patrolPath.length === 0) return;

    const target = this.patrolPath[this.patrolIndex];

    // Check if at target
    if (this.gridX === target.x && this.gridY === target.y) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
      return;
    }

    // Move towards target
    const dx = Math.sign(target.x - this.gridX);
    const dy = Math.sign(target.y - this.gridY);

    // Prioritize X movement
    if (dx !== 0 && tilemap.isWalkable(this.gridX + dx, this.gridY)) {
      this.startMove(this.gridX + dx, this.gridY);
    } else if (dy !== 0 && tilemap.isWalkable(this.gridX, this.gridY + dy)) {
      this.startMove(this.gridX, this.gridY + dy);
    }
  }

  // Set movement behavior
  setMovementPattern(pattern: MovementPattern, patrolPath?: Array<{ x: number; y: number }>): void {
    this.movementPattern = pattern;
    if (patrolPath) {
      this.patrolPath = patrolPath;
      this.patrolIndex = 0;
    }
  }

  // Mark NPC as dead
  kill(): void {
    this.isDead = true;
    this.createSprite(); // Redraw with dead indicator
  }

  // Check if player can interact with this NPC
  canInteract(playerGridX: number, playerGridY: number): boolean {
    if (this.isDead || this.isHostile) return false;
    const dx = Math.abs(this.gridX - playerGridX);
    const dy = Math.abs(this.gridY - playerGridY);
    return dx <= 1 && dy <= 1;
  }

  // Get NPC display info
  getDisplayInfo(): { name: string; role: string; isHostile: boolean } {
    return {
      name: this.name,
      role: this.role,
      isHostile: this.isHostile,
    };
  }
}
