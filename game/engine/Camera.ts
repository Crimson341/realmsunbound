import { Container } from 'pixi.js';

export class Camera {
  private x: number = 0;
  private y: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private viewportWidth: number;
  private viewportHeight: number;

  // World bounds
  private minX: number = 0;
  private minY: number = 0;
  private maxX: number = Infinity;
  private maxY: number = Infinity;

  // Smoothing
  private smoothing: number = 0.15; // Lower = smoother but slower

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  }

  follow(targetX: number, targetY: number): void {
    // Calculate target camera position (center on target)
    this.targetX = targetX - this.viewportWidth / 2;
    this.targetY = targetY - this.viewportHeight / 2;

    // Clamp to bounds
    this.targetX = Math.max(this.minX, Math.min(this.targetX, this.maxX - this.viewportWidth));
    this.targetY = Math.max(this.minY, Math.min(this.targetY, this.maxY - this.viewportHeight));

    // Smooth interpolation
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
  }

  apply(container: Container): void {
    // Move the world container in the opposite direction of the camera
    container.x = -Math.round(this.x);
    container.y = -Math.round(this.y);
  }

  // Set camera position immediately (no smoothing)
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  // Center camera on a position immediately
  centerOn(x: number, y: number): void {
    this.setPosition(x - this.viewportWidth / 2, y - this.viewportHeight / 2);
  }

  // Get current camera position
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  // Get viewport dimensions
  getViewport(): { width: number; height: number } {
    return { width: this.viewportWidth, height: this.viewportHeight };
  }

  // Check if a world position is visible
  isVisible(worldX: number, worldY: number, padding: number = 0): boolean {
    return (
      worldX >= this.x - padding &&
      worldX <= this.x + this.viewportWidth + padding &&
      worldY >= this.y - padding &&
      worldY <= this.y + this.viewportHeight + padding
    );
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  // Set smoothing factor (0-1, lower = smoother)
  setSmoothing(value: number): void {
    this.smoothing = Math.max(0.01, Math.min(1, value));
  }

  // Shake effect (for damage, etc.)
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;

  shake(intensity: number): void {
    this.shakeIntensity = intensity;
  }

  applyShake(container: Container): void {
    if (this.shakeIntensity > 0.1) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      container.x += offsetX;
      container.y += offsetY;
      this.shakeIntensity *= this.shakeDecay;
    }
  }
}
