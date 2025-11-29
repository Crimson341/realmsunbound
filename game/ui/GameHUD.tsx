'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Coins, Zap } from 'lucide-react';

interface GameHUDProps {
  locationName: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  gold: number;
  level: number;
  showControls?: boolean;
}

export function GameHUD({
  locationName,
  hp,
  maxHp,
  energy,
  maxEnergy,
  gold,
  level,
  showControls = true,
}: GameHUDProps) {
  const hpPercent = (hp / maxHp) * 100;
  const energyPercent = (energy / maxEnergy) * 100;
  const isDanger = hpPercent < 25;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Top Left - Location */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-genshin-dark/90 backdrop-blur-md border border-genshin-gold/30 rounded-lg px-4 py-2 shadow-lg"
        >
          <div className="flex items-center gap-2 text-genshin-gold">
            <MapPin size={16} />
            <span className="font-serif font-bold text-sm">{locationName}</span>
          </div>
        </motion.div>
      </div>

      {/* Top Right - Stats */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-genshin-dark/90 backdrop-blur-md border border-genshin-gold/30 rounded-lg p-3 shadow-lg space-y-2 min-w-[160px]"
        >
          {/* Level */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400 uppercase tracking-wide">Level</span>
            <span className="text-genshin-gold font-bold">{level}</span>
          </div>

          {/* HP Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-stone-400">
                <Heart size={12} className={isDanger ? 'text-red-400' : 'text-green-400'} />
                <span>HP</span>
              </div>
              <span className={`font-bold ${isDanger ? 'text-red-400' : 'text-green-400'}`}>
                {hp}/{maxHp}
              </span>
            </div>
            <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${isDanger ? 'bg-red-500' : 'bg-green-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Energy Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-stone-400">
                <Zap size={12} className="text-blue-400" />
                <span>Energy</span>
              </div>
              <span className="text-blue-400 font-bold">
                {energy}/{maxEnergy}
              </span>
            </div>
            <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${energyPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Gold */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
            <div className="flex items-center gap-1 text-stone-400">
              <Coins size={12} className="text-amber-400" />
              <span>Gold</span>
            </div>
            <span className="text-amber-400 font-bold">{gold}</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Center - Controls Help */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-genshin-dark/80 backdrop-blur-md border border-white/10 rounded-lg px-4 py-2 shadow-lg"
          >
            <div className="flex items-center gap-4 text-xs text-stone-400">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-300">WASD</kbd>
                <span>Move</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-300">E</kbd>
                <span>Interact</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-300">I</kbd>
                <span>Inventory</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-300">ESC</kbd>
                <span>Menu</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default GameHUD;
