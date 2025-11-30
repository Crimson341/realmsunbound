import { Container, Sprite, Texture, Rectangle, Assets } from 'pixi.js';
import {
  EntitySpriteData,
  SpriteSheetConfig,
  SpriteAnimation,
  AnimationState,
  FacingDirection,
} from './types';

/**
 * Manages an animated sprite entity
 */
export interface AnimatedSpriteInstance {
  container: Container;
  sprite: Sprite;
  config: SpriteSheetConfig;
  textures: Map<string, Texture[]>; // animation name -> frame textures
  currentAnimation: AnimationState;
  currentFrame: number;
  frameTime: number;
  elapsedTime: number;
  isPlaying: boolean;
  facing: FacingDirection;
  onAnimationComplete?: () => void;
}

/**
 * SpriteManager handles loading, caching, and animating sprite sheets
 */
export class SpriteManager {
  private textureCache: Map<string, Texture> = new Map();
  private spriteInstances: Map<string, AnimatedSpriteInstance> = new Map();
  private loadingPromises: Map<string, Promise<Texture>> = new Map();

  /**
   * Load a sprite sheet texture (with caching)
   */
  async loadTexture(url: string): Promise<Texture> {
    // Check cache first
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const loadPromise = Assets.load(url).then((texture: Texture) => {
      this.textureCache.set(url, texture);
      this.loadingPromises.delete(url);
      return texture;
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Create frame textures for all animations in a sprite sheet
   */
  private createAnimationTextures(
    baseTexture: Texture,
    config: SpriteSheetConfig
  ): Map<string, Texture[]> {
    const animationTextures = new Map<string, Texture[]>();

    for (const anim of config.animations) {
      const frames: Texture[] = [];

      for (let i = 0; i < anim.frameCount; i++) {
        const frameX = (anim.startFrame + i) * config.frameWidth;
        const frameY = anim.row * config.frameHeight;

        // Create a texture from the specific frame rectangle
        const frameTexture = new Texture({
          source: baseTexture.source,
          frame: new Rectangle(frameX, frameY, config.frameWidth, config.frameHeight),
        });

        frames.push(frameTexture);
      }

      animationTextures.set(anim.name, frames);
    }

    return animationTextures;
  }

  /**
   * Create an animated sprite instance for an entity
   */
  async createSprite(
    entityId: string,
    spriteData: EntitySpriteData,
    initialFacing: FacingDirection = 'down'
  ): Promise<AnimatedSpriteInstance> {
    const { spriteSheetUrl, config, tintColor } = spriteData;

    // Load the base texture
    const baseTexture = await this.loadTexture(spriteSheetUrl);

    // Create frame textures for all animations
    const textures = this.createAnimationTextures(baseTexture, config);

    // Create the sprite container
    const container = new Container();

    // Get the default animation frames
    const defaultFrames = textures.get(config.defaultAnimation);
    if (!defaultFrames || defaultFrames.length === 0) {
      throw new Error(`No frames found for default animation: ${config.defaultAnimation}`);
    }

    // Create the sprite with the first frame
    const sprite = new Sprite(defaultFrames[0]);

    // Set anchor point
    sprite.anchor.set(config.anchorX ?? 0.5, config.anchorY ?? 0.5);

    // Apply scale
    if (config.scale) {
      sprite.scale.set(config.scale);
    }

    // Apply tint color if specified
    if (tintColor) {
      sprite.tint = parseInt(tintColor.replace('#', ''), 16);
    }

    container.addChild(sprite);

    // Get the default animation definition
    const defaultAnimDef = config.animations.find(a => a.name === config.defaultAnimation);
    const frameTime = defaultAnimDef ? 1000 / defaultAnimDef.fps : 100;

    // Create the instance
    const instance: AnimatedSpriteInstance = {
      container,
      sprite,
      config,
      textures,
      currentAnimation: config.defaultAnimation,
      currentFrame: 0,
      frameTime,
      elapsedTime: 0,
      isPlaying: true,
      facing: initialFacing,
    };

    this.spriteInstances.set(entityId, instance);
    return instance;
  }

  /**
   * Get animation name based on state and facing direction
   */
  getDirectionalAnimation(
    baseState: 'walk' | 'attack' | 'idle',
    facing: FacingDirection
  ): AnimationState {
    if (baseState === 'idle') return 'idle';
    return `${baseState}_${facing}` as AnimationState;
  }

  /**
   * Play an animation on a sprite instance
   */
  playAnimation(
    entityId: string,
    animation: AnimationState,
    onComplete?: () => void
  ): boolean {
    const instance = this.spriteInstances.get(entityId);
    if (!instance) return false;

    const frames = instance.textures.get(animation);
    if (!frames || frames.length === 0) {
      // Try falling back to idle if animation doesn't exist
      const idleFrames = instance.textures.get('idle');
      if (idleFrames && idleFrames.length > 0) {
        instance.currentAnimation = 'idle';
        instance.currentFrame = 0;
        instance.sprite.texture = idleFrames[0];
        return true;
      }
      return false;
    }

    // Get animation definition for timing
    const animDef = instance.config.animations.find(a => a.name === animation);
    if (animDef) {
      instance.frameTime = 1000 / animDef.fps;
    }

    instance.currentAnimation = animation;
    instance.currentFrame = 0;
    instance.elapsedTime = 0;
    instance.isPlaying = true;
    instance.onAnimationComplete = onComplete;
    instance.sprite.texture = frames[0];

    return true;
  }

  /**
   * Play walking animation based on facing direction
   */
  playWalkAnimation(entityId: string, facing: FacingDirection): boolean {
    const instance = this.spriteInstances.get(entityId);
    if (!instance) return false;

    instance.facing = facing;
    const walkAnim = this.getDirectionalAnimation('walk', facing);
    return this.playAnimation(entityId, walkAnim);
  }

  /**
   * Play idle animation
   */
  playIdleAnimation(entityId: string): boolean {
    return this.playAnimation(entityId, 'idle');
  }

  /**
   * Stop animation on a sprite
   */
  stopAnimation(entityId: string): void {
    const instance = this.spriteInstances.get(entityId);
    if (instance) {
      instance.isPlaying = false;
    }
  }

  /**
   * Update all sprite animations (call this in your game loop)
   */
  update(deltaMs: number): void {
    for (const instance of this.spriteInstances.values()) {
      if (!instance.isPlaying) continue;

      instance.elapsedTime += deltaMs;

      if (instance.elapsedTime >= instance.frameTime) {
        instance.elapsedTime -= instance.frameTime;

        const frames = instance.textures.get(instance.currentAnimation);
        if (!frames || frames.length === 0) continue;

        const animDef = instance.config.animations.find(
          a => a.name === instance.currentAnimation
        );

        instance.currentFrame++;

        // Check if animation completed
        if (instance.currentFrame >= frames.length) {
          if (animDef?.loop) {
            instance.currentFrame = 0;
          } else {
            instance.currentFrame = frames.length - 1;
            instance.isPlaying = false;
            if (instance.onAnimationComplete) {
              instance.onAnimationComplete();
              instance.onAnimationComplete = undefined;
            }
          }
        }

        // Update sprite texture
        instance.sprite.texture = frames[instance.currentFrame];
      }
    }
  }

  /**
   * Get a sprite instance by entity ID
   */
  getInstance(entityId: string): AnimatedSpriteInstance | undefined {
    return this.spriteInstances.get(entityId);
  }

  /**
   * Remove a sprite instance
   */
  removeSprite(entityId: string): void {
    const instance = this.spriteInstances.get(entityId);
    if (instance) {
      instance.container.destroy({ children: true });
      this.spriteInstances.delete(entityId);
    }
  }

  /**
   * Clear all sprites and cached textures
   */
  destroy(): void {
    for (const instance of this.spriteInstances.values()) {
      instance.container.destroy({ children: true });
    }
    this.spriteInstances.clear();

    for (const texture of this.textureCache.values()) {
      texture.destroy();
    }
    this.textureCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get facing direction based on movement delta
   */
  static getFacingFromDelta(dx: number, dy: number): FacingDirection {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }
}
