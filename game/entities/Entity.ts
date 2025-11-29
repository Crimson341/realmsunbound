import { Graphics, Container } from 'pixi.js';

export type Facing = 'up' | 'down' | 'left' | 'right';

export abstract class Entity {
  public gridX: number = 0;
  public gridY: number = 0;
  public pixelX: number = 0;
  public pixelY: number = 0;
  public facing: Facing = 'down';
  public sprite: Graphics;

  protected tileSize: number;
  protected isMoving: boolean = false;
  protected moveProgress: number = 0;
  protected moveSpeed: number = 5; // Tiles per second
  protected startX: number = 0;
  protected startY: number = 0;
  protected targetGridX: number = 0;
  protected targetGridY: number = 0;

  constructor(tileSize: number) {
    this.tileSize = tileSize;
    this.sprite = new Graphics();
  }

  protected abstract createSprite(): void;

  setPosition(gridX: number, gridY: number): void {
    this.gridX = gridX;
    this.gridY = gridY;
    this.pixelX = gridX * this.tileSize + this.tileSize / 2;
    this.pixelY = gridY * this.tileSize + this.tileSize / 2;
    this.updateSpritePosition();
  }

  protected updateSpritePosition(): void {
    // Center sprite on tile
    this.sprite.x = this.pixelX - this.tileSize / 2;
    this.sprite.y = this.pixelY - this.tileSize / 2;
  }

  protected startMove(targetX: number, targetY: number): void {
    this.isMoving = true;
    this.moveProgress = 0;
    this.startX = this.pixelX;
    this.startY = this.pixelY;
    this.targetGridX = targetX;
    this.targetGridY = targetY;

    // Update facing direction
    if (targetX > this.gridX) this.facing = 'right';
    else if (targetX < this.gridX) this.facing = 'left';
    else if (targetY > this.gridY) this.facing = 'down';
    else if (targetY < this.gridY) this.facing = 'up';
  }

  protected updateMovement(deltaTime: number): void {
    if (!this.isMoving) return;

    // Progress movement (deltaTime is in ms)
    this.moveProgress += (deltaTime / 1000) * this.moveSpeed;

    if (this.moveProgress >= 1) {
      // Movement complete
      this.moveProgress = 1;
      this.isMoving = false;
      this.gridX = this.targetGridX;
      this.gridY = this.targetGridY;
    }

    // Calculate pixel position with easing
    const targetPixelX = this.targetGridX * this.tileSize + this.tileSize / 2;
    const targetPixelY = this.targetGridY * this.tileSize + this.tileSize / 2;

    // Smooth easing
    const eased = this.easeInOutQuad(this.moveProgress);
    this.pixelX = this.startX + (targetPixelX - this.startX) * eased;
    this.pixelY = this.startY + (targetPixelY - this.startY) * eased;

    this.updateSpritePosition();
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // Distance to another entity in tiles
  distanceTo(other: Entity): number {
    return Math.abs(this.gridX - other.gridX) + Math.abs(this.gridY - other.gridY);
  }

  // Check if adjacent to another entity
  isAdjacentTo(other: Entity): boolean {
    return this.distanceTo(other) === 1;
  }
}
