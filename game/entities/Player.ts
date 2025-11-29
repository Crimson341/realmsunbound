import { Graphics } from 'pixi.js';
import { Entity, Facing } from './Entity';
import { InputManager } from '../engine/InputManager';
import { TileMap } from '../engine/TileMap';

export class Player extends Entity {
  private color: number = 0x4ade80; // Green
  private moveCooldown: number = 0;

  constructor(tileSize: number) {
    super(tileSize);
    this.moveSpeed = 6; // Slightly faster than NPCs
    this.createSprite();
  }

  protected createSprite(): void {
    this.sprite.clear();

    // Body (rectangle for placeholder)
    this.sprite.roundRect(2, 6, this.tileSize - 4, this.tileSize - 8, 4);
    this.sprite.fill(this.color);

    // Head (smaller circle on top)
    this.sprite.circle(this.tileSize / 2, 8, 6);
    this.sprite.fill(this.color);

    // Direction indicator (small triangle based on facing)
    this.drawFacingIndicator();
  }

  private drawFacingIndicator(): void {
    const size = 6;
    const cx = this.tileSize / 2;
    const cy = this.tileSize / 2;

    this.sprite.beginPath();

    switch (this.facing) {
      case 'up':
        this.sprite.moveTo(cx, cy - 10);
        this.sprite.lineTo(cx - size / 2, cy - 10 + size);
        this.sprite.lineTo(cx + size / 2, cy - 10 + size);
        break;
      case 'down':
        this.sprite.moveTo(cx, cy + 14);
        this.sprite.lineTo(cx - size / 2, cy + 14 - size);
        this.sprite.lineTo(cx + size / 2, cy + 14 - size);
        break;
      case 'left':
        this.sprite.moveTo(cx - 12, cy + 4);
        this.sprite.lineTo(cx - 12 + size, cy + 4 - size / 2);
        this.sprite.lineTo(cx - 12 + size, cy + 4 + size / 2);
        break;
      case 'right':
        this.sprite.moveTo(cx + 12, cy + 4);
        this.sprite.lineTo(cx + 12 - size, cy + 4 - size / 2);
        this.sprite.lineTo(cx + 12 - size, cy + 4 + size / 2);
        break;
    }

    this.sprite.closePath();
    this.sprite.fill(0xffffff);
  }

  update(deltaTime: number, input: InputManager, tilemap: TileMap): void {
    // Update movement animation
    this.updateMovement(deltaTime);

    // Movement cooldown
    if (this.moveCooldown > 0) {
      this.moveCooldown -= deltaTime;
    }

    // Check for new movement input
    if (!this.isMoving && this.moveCooldown <= 0) {
      const dir = input.getDirection();

      if (dir.x !== 0 || dir.y !== 0) {
        const targetX = this.gridX + dir.x;
        const targetY = this.gridY + dir.y;

        // Update facing even if we can't move
        if (dir.x > 0) this.facing = 'right';
        else if (dir.x < 0) this.facing = 'left';
        else if (dir.y > 0) this.facing = 'down';
        else if (dir.y < 0) this.facing = 'up';

        // Check if we can move to target
        if (tilemap.isWalkable(targetX, targetY)) {
          this.startMove(targetX, targetY);
        } else {
          // Small cooldown even when blocked to prevent rapid direction changes
          this.moveCooldown = 50;
        }

        // Redraw sprite with new facing direction
        this.createSprite();
      }
    }
  }

  // Set player color (for customization)
  setColor(color: number): void {
    this.color = color;
    this.createSprite();
  }

  // Check if player is currently moving
  get isCurrentlyMoving(): boolean {
    return this.isMoving;
  }
}
