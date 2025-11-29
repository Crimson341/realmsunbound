export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
  attack: boolean;
  cancel: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private interactPressed = false;
  private attackPressed = false;
  private cancelPressed = false;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
  }

  init(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Prevent default for game keys
    const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'Escape'];
    if (gameKeys.includes(e.code)) {
      e.preventDefault();
    }

    this.keys.add(e.code);

    // Track single-press actions (only trigger once per press)
    if ((e.code === 'Space' || e.code === 'KeyE') && !this.interactPressed) {
      this.interactPressed = true;
    }
    if (e.code === 'KeyF' && !this.attackPressed) {
      this.attackPressed = true;
    }
    if (e.code === 'Escape' && !this.cancelPressed) {
      this.cancelPressed = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  // Get movement direction (-1, 0, or 1 for each axis)
  getDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // Horizontal
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    // Vertical
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;

    // Prioritize one axis if both are pressed (no diagonal for grid movement)
    if (x !== 0 && y !== 0) {
      // Prioritize horizontal movement
      y = 0;
    }

    return { x, y };
  }

  // Check if interact key was pressed (consumes the press)
  isInteractPressed(): boolean {
    if (this.interactPressed) {
      this.interactPressed = false;
      return true;
    }
    return false;
  }

  // Check if attack key was pressed (consumes the press)
  isAttackPressed(): boolean {
    if (this.attackPressed) {
      this.attackPressed = false;
      return true;
    }
    return false;
  }

  // Check if cancel key was pressed (consumes the press)
  isCancelPressed(): boolean {
    if (this.cancelPressed) {
      this.cancelPressed = false;
      return true;
    }
    return false;
  }

  // Check if any key is currently held
  isKeyHeld(code: string): boolean {
    return this.keys.has(code);
  }

  // Get current input state (for UI/debugging)
  getState(): InputState {
    return {
      up: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      down: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      left: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      right: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      interact: this.keys.has('Space') || this.keys.has('KeyE'),
      attack: this.keys.has('KeyF'),
      cancel: this.keys.has('Escape'),
    };
  }

  // Clear all input state (useful when pausing)
  clear(): void {
    this.keys.clear();
    this.interactPressed = false;
    this.attackPressed = false;
    this.cancelPressed = false;
  }
}
