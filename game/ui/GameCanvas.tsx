'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameEngineConfig } from '../engine/GameEngine';
import { NPC } from '../entities/NPC';

interface GameCanvasProps {
  width?: number;
  height?: number;
  tileSize?: number;
  onEngineReady?: (engine: GameEngine) => void;
  onInteract?: (npc: NPC) => void;
  onCombatTrigger?: (enemy: NPC) => void;
  onTransition?: (toLocationId: string, spawnPoint: { x: number; y: number }) => void;
}

export function GameCanvas({
  width = 1280,
  height = 720,
  tileSize = 32,
  onEngineReady,
  onInteract,
  onCombatTrigger,
  onTransition,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    const config: GameEngineConfig = {
      width,
      height,
      tileSize,
      onInteract,
      onCombatTrigger,
      onTransition,
    };

    const engine = new GameEngine(config);
    engineRef.current = engine;

    engine.init(containerRef.current).then(() => {
      // Only call callback if still mounted
      if (isMounted) {
        onEngineReady?.(engine);
      }
    }).catch(err => {
      console.error('GameEngine init error:', err);
    });

    return () => {
      isMounted = false;
      engine.destroy();
      engineRef.current = null;
    };
  }, [width, height, tileSize]);

  // Update callbacks when they change
  useEffect(() => {
    // Note: In a more complete implementation, we'd want to update
    // the engine's callbacks when these props change
  }, [onInteract, onCombatTrigger, onTransition]);

  return (
    <div
      ref={containerRef}
      className="relative bg-[#1a1a2e] rounded-lg overflow-hidden shadow-2xl"
      style={{ width, height }}
    />
  );
}

export default GameCanvas;
