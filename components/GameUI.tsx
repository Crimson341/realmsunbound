'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Eye, Footprints, MessageCircle,
    Swords, Shield, Zap, Wind,
    HelpCircle, HandCoins, Skull,
    Tent, Backpack, Map, Scroll,
    Sparkles, Trophy, Heart, Star
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type GameContext = 'explore' | 'combat' | 'social' | 'rest';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ScreenEffectType = 'damage' | 'heal' | 'critical' | 'levelup';

export interface CombatState {
    enemyName: string;
    enemyHP: number;
    enemyMaxHP: number;
    isPlayerTurn: boolean;
}

export interface SkillCheckData {
    skill: string;
    roll: number;
    modifier: number;
    target: number;
    success: boolean;
    attribute?: string;
    isCritical?: boolean;
    degree?: 'critical_success' | 'success' | 'failure' | 'critical_failure';
}

export interface RewardData {
    item: string;
    rarity: Rarity;
    xp?: number;
}

export interface GameEvent {
    type: 'combat' | 'exploration' | 'social' | 'skillCheck' | 'reward';
    combat?: CombatState;
    skillCheck?: SkillCheckData;
    reward?: RewardData;
}

// ============================================
// QUICK ACTION BAR
// ============================================

interface QuickActionBarProps {
    onAction: (action: string) => void;
    isLoading: boolean;
    context: GameContext;
}

const actionSets = {
    explore: [
        { icon: Search, label: 'Search', action: 'I search the area carefully for anything of interest' },
        { icon: Eye, label: 'Observe', action: 'I carefully observe my surroundings, looking for details' },
        { icon: Footprints, label: 'Move On', action: 'I continue forward on my journey' },
        { icon: MessageCircle, label: 'Call Out', action: 'I call out to see if anyone is nearby' },
    ],
    combat: [
        { icon: Swords, label: 'Attack', action: 'I attack the enemy with my weapon!' },
        { icon: Shield, label: 'Defend', action: 'I take a defensive stance, ready to block' },
        { icon: Zap, label: 'Spell', action: 'I cast my most powerful spell at the enemy!' },
        { icon: Wind, label: 'Flee', action: 'I attempt to disengage and flee from combat!' },
    ],
    social: [
        { icon: MessageCircle, label: 'Greet', action: 'I greet them with a friendly smile' },
        { icon: HelpCircle, label: 'Ask', action: 'I ask them what they know about this place' },
        { icon: HandCoins, label: 'Trade', action: 'I ask if they have anything interesting to trade' },
        { icon: Skull, label: 'Threaten', action: 'I threaten them with a menacing glare' },
    ],
    rest: [
        { icon: Tent, label: 'Rest', action: 'I set up camp and rest to recover my strength' },
        { icon: Backpack, label: 'Inventory', action: 'I check my belongings and organize my pack' },
        { icon: Map, label: 'Map', action: 'I consult my map to plan my next destination' },
        { icon: Scroll, label: 'Journal', action: 'I review my quest journal for any missed details' },
    ],
};

export const QuickActionBar: React.FC<QuickActionBarProps> = ({ onAction, isLoading, context }) => {
    const actions = actionSets[context];

    return (
        <div className="flex gap-2 mb-4 justify-center flex-wrap">
            {actions.map((action, i) => (
                <motion.button
                    key={`${context}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onAction(action.action)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#1f2235]/80 border border-genshin-gold/20 rounded-lg text-xs font-medium text-stone-300 hover:bg-genshin-gold/10 hover:border-genshin-gold/40 hover:text-genshin-gold transition-all group disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                >
                    <action.icon size={14} className="group-hover:scale-110 transition-transform" />
                    {action.label}
                </motion.button>
            ))}
        </div>
    );
};

// ============================================
// DICE ROLL OVERLAY
// ============================================

// Attribute abbreviations
const ATTRIBUTE_ABBR: Record<string, string> = {
    strength: 'STR',
    dexterity: 'DEX',
    constitution: 'CON',
    intelligence: 'INT',
    wisdom: 'WIS',
    charisma: 'CHA',
};

// Attribute colors
const ATTRIBUTE_COLORS: Record<string, string> = {
    strength: 'from-red-500 to-red-700',
    dexterity: 'from-green-500 to-green-700',
    constitution: 'from-orange-500 to-orange-700',
    intelligence: 'from-blue-500 to-blue-700',
    wisdom: 'from-purple-500 to-purple-700',
    charisma: 'from-pink-500 to-pink-700',
};

interface DiceRollOverlayProps {
    data: SkillCheckData;
    onComplete: () => void;
}

export const DiceRollOverlay: React.FC<DiceRollOverlayProps> = ({ data, onComplete }) => {
    const [phase, setPhase] = useState<'rolling' | 'result'>('rolling');
    const [displayRoll, setDisplayRoll] = useState(1);
    const { roll, modifier, target, success, skill, attribute, degree } = data;

    // Animate the rolling numbers
    useEffect(() => {
        if (phase === 'rolling') {
            const interval = setInterval(() => {
                setDisplayRoll(Math.floor(Math.random() * 20) + 1);
            }, 50);
            return () => clearInterval(interval);
        }
    }, [phase]);

    useEffect(() => {
        const resultTimer = setTimeout(() => setPhase('result'), 1500);
        const completeTimer = setTimeout(onComplete, 4000);

        return () => {
            clearTimeout(resultTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    // Determine if it's a nat 20 or nat 1
    const isNat20 = roll === 20;
    const isNat1 = roll === 1;
    const isCriticalSuccess = degree === 'critical_success' || isNat20;
    const isCriticalFailure = degree === 'critical_failure' || isNat1;

    // Get dice gradient based on roll or attribute
    const getDiceGradient = () => {
        if (phase === 'result') {
            if (isNat20) return 'from-yellow-400 via-amber-500 to-yellow-600';
            if (isNat1) return 'from-red-600 via-red-700 to-red-900';
            if (attribute && ATTRIBUTE_COLORS[attribute.toLowerCase()]) {
                return ATTRIBUTE_COLORS[attribute.toLowerCase()];
            }
        }
        return 'from-genshin-gold via-amber-500 to-orange-600';
    };

    // Get result text and styling
    const getResultDisplay = () => {
        if (isCriticalSuccess || isNat20) {
            return {
                text: isNat20 ? 'NATURAL 20!' : 'CRITICAL SUCCESS!',
                color: 'text-yellow-400',
                icon: '20',
            };
        }
        if (isCriticalFailure || isNat1) {
            return {
                text: isNat1 ? 'NATURAL 1!' : 'CRITICAL FAILURE!',
                color: 'text-red-500',
                icon: '1',
            };
        }
        if (success) {
            return {
                text: 'SUCCESS',
                color: 'text-green-400',
                icon: null,
            };
        }
        return {
            text: 'FAILED',
            color: 'text-red-400',
            icon: null,
        };
    };

    const resultDisplay = getResultDisplay();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center"
        >
            {/* Particle effects for crits */}
            {phase === 'result' && (isNat20 || isCriticalSuccess) && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(30)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                            initial={{
                                x: '50vw',
                                y: '50vh',
                                scale: 0,
                                opacity: 0,
                            }}
                            animate={{
                                x: `${Math.random() * 100}vw`,
                                y: `${Math.random() * 100}vh`,
                                scale: [0, 1.5, 0],
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                duration: 1.5,
                                delay: i * 0.05,
                                ease: "easeOut",
                            }}
                            style={{
                                boxShadow: '0 0 15px rgba(250, 204, 21, 0.8)',
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="text-center">
                {/* Skill Name with Attribute */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <p className="text-stone-400 uppercase tracking-widest text-sm font-bold">
                        {skill} Check
                    </p>
                    {attribute && (
                        <p className="text-xs text-stone-600 mt-1">
                            ({ATTRIBUTE_ABBR[attribute.toLowerCase()] || attribute.toUpperCase()})
                        </p>
                    )}
                </motion.div>

                {/* D20 Die */}
                <div className="perspective-1000 mb-8 relative">
                    {/* Glow effect for crits */}
                    {phase === 'result' && (isNat20 || isNat1) && (
                        <motion.div
                            className={`absolute inset-0 blur-2xl ${isNat20 ? 'bg-yellow-500' : 'bg-red-600'}`}
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.5, 0.8, 0.5],
                            }}
                            transition={{ duration: 1, repeat: Infinity }}
                            style={{ borderRadius: '50%' }}
                        />
                    )}

                    <motion.div
                        className={`w-32 h-32 bg-gradient-to-br ${getDiceGradient()} rounded-2xl flex items-center justify-center text-5xl font-bold text-genshin-dark mx-auto shadow-2xl relative overflow-hidden`}
                        animate={phase === 'rolling' ? {
                            rotateX: [0, 360, 720, 1080, 1440],
                            rotateY: [0, 180, 360, 540, 720],
                            scale: [1, 1.1, 1, 1.1, 1],
                        } : {
                            rotateX: 0,
                            rotateY: 0,
                            scale: isNat20 || isNat1 ? [1, 1.2, 1.1] : [1, 1.15, 1],
                        }}
                        transition={phase === 'rolling' ? {
                            duration: 1.5,
                            ease: "easeOut"
                        } : {
                            duration: 0.5,
                            type: "spring",
                        }}
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* D20 shape hint */}
                        <div className="absolute inset-2 border-2 border-white/20 rounded-xl" />

                        {/* Shine effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent"
                            animate={phase === 'result' && isNat20 ? {
                                x: ['-100%', '100%'],
                            } : {}}
                            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
                        />

                        {/* Number */}
                        <span className={`relative z-10 drop-shadow-lg ${isNat20 ? 'text-white' : isNat1 ? 'text-white' : ''}`}>
                            {phase === 'result' ? roll : displayRoll}
                        </span>
                    </motion.div>

                    {/* D20 label */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-stone-600 text-xs mt-2 uppercase tracking-widest"
                    >
                        d20
                    </motion.p>
                </div>

                {/* Result */}
                <AnimatePresence>
                    {phase === 'result' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            {/* Roll breakdown */}
                            <div className="flex items-center justify-center gap-2 text-2xl text-white mb-3 font-mono">
                                <motion.span
                                    className={`${isNat20 ? 'text-yellow-400' : isNat1 ? 'text-red-500' : 'text-stone-300'}`}
                                    animate={isNat20 || isNat1 ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                >
                                    {roll}
                                </motion.span>
                                <span className="text-stone-500">+</span>
                                <span className="text-blue-400">{modifier}</span>
                                <span className="text-stone-500">=</span>
                                <span className={`font-bold text-3xl ${success ? 'text-green-400' : 'text-red-400'}`}>
                                    {roll + modifier}
                                </span>
                            </div>

                            {/* DC Target */}
                            <p className="text-stone-500 mb-6 text-sm">
                                vs DC <span className="text-stone-300 font-bold">{target}</span>
                                <span className="text-stone-600 ml-2">
                                    ({roll + modifier >= target ? '+' : ''}{roll + modifier - target})
                                </span>
                            </p>

                            {/* Result Banner */}
                            <motion.div
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
                                className={`text-4xl font-bold uppercase tracking-widest ${resultDisplay.color}`}
                            >
                                {isCriticalSuccess || isNat20 ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <motion.span
                                            animate={{ rotate: [0, 10, -10, 0] }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                        >
                                            <Star className="fill-current text-yellow-400" size={32} />
                                        </motion.span>
                                        {resultDisplay.text}
                                        <motion.span
                                            animate={{ rotate: [0, -10, 10, 0] }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                        >
                                            <Star className="fill-current text-yellow-400" size={32} />
                                        </motion.span>
                                    </span>
                                ) : isCriticalFailure || isNat1 ? (
                                    <motion.span
                                        animate={{
                                            x: [0, -5, 5, -5, 5, 0],
                                        }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        {resultDisplay.text}
                                    </motion.span>
                                ) : success ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <Star className="fill-current" size={28} />
                                        {resultDisplay.text}
                                        <Star className="fill-current" size={28} />
                                    </span>
                                ) : (
                                    <span>{resultDisplay.text}</span>
                                )}
                            </motion.div>

                            {/* Modifier breakdown */}
                            {modifier !== 0 && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-stone-600 text-xs mt-4"
                                >
                                    {attribute && (
                                        <span className="text-stone-500">
                                            {ATTRIBUTE_ABBR[attribute.toLowerCase()] || attribute.toUpperCase()} modifier: {modifier >= 0 ? '+' : ''}{modifier}
                                        </span>
                                    )}
                                </motion.p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// ============================================
// REWARD TOAST
// ============================================

interface RewardToastProps {
    item: string;
    rarity: Rarity;
    xp?: number;
    onComplete: () => void;
}

const rarityConfig = {
    common: { gradient: 'from-gray-400 to-gray-600', glow: 'rgba(156, 163, 175, 0.5)' },
    uncommon: { gradient: 'from-green-400 to-green-600', glow: 'rgba(34, 197, 94, 0.5)' },
    rare: { gradient: 'from-blue-400 to-blue-600', glow: 'rgba(59, 130, 246, 0.5)' },
    epic: { gradient: 'from-purple-400 to-purple-600', glow: 'rgba(168, 85, 247, 0.5)' },
    legendary: { gradient: 'from-amber-400 to-orange-500', glow: 'rgba(245, 158, 11, 0.6)' },
};

export const RewardToast: React.FC<RewardToastProps> = ({ item, rarity, xp, onComplete }) => {
    const config = rarityConfig[rarity];

    useEffect(() => {
        const timer = setTimeout(onComplete, 4000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ x: 120, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 120, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed top-24 right-6 z-50"
        >
            <div
                className={`relative bg-gradient-to-r ${config.gradient} p-[2px] rounded-xl overflow-hidden`}
                style={{ boxShadow: `0 0 30px ${config.glow}` }}
            >
                {/* Shimmer for legendary */}
                {rarity === 'legendary' && (
                    <div className="absolute inset-0 animate-shimmer" />
                )}

                <div className="bg-genshin-dark px-5 py-4 rounded-xl flex items-center gap-4 relative">
                    {/* Icon */}
                    <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", delay: 0.1 }}
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
                    >
                        <Sparkles className="text-white" size={26} />
                    </motion.div>

                    {/* Content */}
                    <div>
                        <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                            Item Acquired
                        </p>
                        <p className="text-white font-bold text-lg leading-tight">{item}</p>
                        {xp && (
                            <p className="text-genshin-gold text-xs font-bold mt-0.5">
                                +{xp} XP
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// XP BAR
// ============================================

interface XPBarProps {
    currentXP: number;
    maxXP: number;
    level: number;
    compact?: boolean;
}

export const XPBar: React.FC<XPBarProps> = ({ currentXP, maxXP, level, compact = false }) => {
    const percentage = Math.min((currentXP / maxXP) * 100, 100);

    if (compact) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <Trophy size={14} className="text-genshin-gold" />
                    <span className="text-xs font-bold text-genshin-gold">Lv.{level}</span>
                </div>
                <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden min-w-[60px]">
                    <motion.div
                        className="h-full bg-gradient-to-r from-genshin-gold to-amber-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-genshin-dark/80 rounded-lg p-4 border border-genshin-gold/10 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-genshin-gold" />
                    <span className="text-xs text-stone-400 uppercase tracking-wide font-bold">
                        Level {level}
                    </span>
                </div>
                <span className="text-xs text-genshin-gold font-bold">
                    {currentXP} / {maxXP} XP
                </span>
            </div>
            <div className="h-2.5 bg-stone-800 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-genshin-gold via-amber-400 to-yellow-400 relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
            </div>
        </div>
    );
};

// ============================================
// LEVEL UP OVERLAY
// ============================================

interface LevelUpOverlayProps {
    newLevel: number;
    onComplete: () => void;
}

export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({ newLevel, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 3500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
        >
            {/* Background particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-genshin-gold rounded-full"
                        initial={{
                            x: '50vw',
                            y: '50vh',
                            scale: 0,
                            opacity: 0,
                        }}
                        animate={{
                            x: `${Math.random() * 100}vw`,
                            y: `${Math.random() * 100}vh`,
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 2,
                            delay: i * 0.1,
                            ease: "easeOut",
                        }}
                        style={{
                            boxShadow: '0 0 10px rgba(212, 175, 55, 0.8)',
                        }}
                    />
                ))}
            </div>

            {/* Main content */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
                className="text-center relative z-10"
            >
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-8xl mb-6"
                >
                    ⬆️
                </motion.div>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl md:text-6xl font-serif font-bold text-genshin-gold mb-4 text-shadow-gold"
                >
                    LEVEL UP!
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-3xl text-white font-bold"
                >
                    Level {newLevel}
                </motion.p>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// COMBAT HUD
// ============================================

interface CombatHUDProps {
    playerName: string;
    playerHP: number;
    playerMaxHP: number;
    enemyName: string;
    enemyHP: number;
    enemyMaxHP: number;
    isPlayerTurn: boolean;
}

export const CombatHUD: React.FC<CombatHUDProps> = ({
    playerName,
    playerHP,
    playerMaxHP,
    enemyName,
    enemyHP,
    enemyMaxHP,
    isPlayerTurn,
}) => {
    const playerPercent = (playerHP / playerMaxHP) * 100;
    const enemyPercent = (enemyHP / enemyMaxHP) * 100;
    const playerDanger = playerPercent < 25;

    return (
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4"
        >
            <div className="bg-genshin-dark/95 backdrop-blur-md border border-red-500/30 rounded-2xl p-5 shadow-2xl">
                {/* Combat Title */}
                <div className="text-center mb-4">
                    <span className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <Swords size={14} />
                        Combat
                        <Swords size={14} />
                    </span>
                </div>

                <div className="flex justify-between items-center gap-6">
                    {/* Player Side */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <motion.div
                                animate={isPlayerTurn ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ duration: 0.5, repeat: isPlayerTurn ? Infinity : 0 }}
                                className={`w-3 h-3 rounded-full ${
                                    isPlayerTurn ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-stone-600'
                                }`}
                            />
                            <span className="text-white font-bold text-sm">{playerName}</span>
                            {isPlayerTurn && (
                                <span className="text-[10px] text-green-400 uppercase tracking-wider font-bold">
                                    Your Turn
                                </span>
                            )}
                        </div>
                        <div className="h-4 bg-stone-800 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full ${
                                    playerDanger
                                        ? 'bg-gradient-to-r from-red-600 to-red-400 animate-hp-danger'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-400'
                                }`}
                                animate={{ width: `${playerPercent}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <Heart size={12} className={playerDanger ? 'text-red-400' : 'text-green-400'} />
                            <p className="text-xs text-stone-400">
                                {playerHP} / {playerMaxHP}
                            </p>
                        </div>
                    </div>

                    {/* VS Divider */}
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-2xl font-bold text-red-500"
                    >
                        ⚔️
                    </motion.div>

                    {/* Enemy Side */}
                    <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 mb-2 justify-end">
                            <span className="text-red-400 font-bold text-sm">{enemyName}</span>
                            <motion.div
                                animate={!isPlayerTurn ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ duration: 0.5, repeat: !isPlayerTurn ? Infinity : 0 }}
                                className={`w-3 h-3 rounded-full ${
                                    !isPlayerTurn ? 'bg-red-400 shadow-lg shadow-red-400/50' : 'bg-stone-600'
                                }`}
                            />
                        </div>
                        <div className="h-4 bg-stone-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                animate={{ width: `${enemyPercent}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                            <p className="text-xs text-stone-400">
                                {enemyHP} / {enemyMaxHP}
                            </p>
                            <Heart size={12} className="text-red-400" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// SCREEN EFFECT
// ============================================

interface ScreenEffectProps {
    type: ScreenEffectType;
    onComplete: () => void;
}

export const ScreenEffect: React.FC<ScreenEffectProps> = ({ type, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const effectClasses = {
        damage: 'screen-flash-damage',
        heal: 'screen-flash-heal',
        critical: 'screen-flash-critical animate-shake-heavy',
        levelup: 'screen-flash-levelup',
    };

    return (
        <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed inset-0 pointer-events-none z-40 ${effectClasses[type]}`}
        />
    );
};

// ============================================
// REWARDS QUEUE MANAGER
// ============================================

interface RewardsQueueProps {
    rewards: Array<RewardData & { id: string }>;
    onRewardComplete: (id: string) => void;
}

export const RewardsQueue: React.FC<RewardsQueueProps> = ({ rewards, onRewardComplete }) => {
    return (
        <AnimatePresence>
            {rewards.slice(0, 3).map((reward, index) => (
                <motion.div
                    key={reward.id}
                    initial={{ y: index * 80 }}
                    animate={{ y: index * 90 }}
                    exit={{ x: 100, opacity: 0 }}
                    transition={{ type: "spring" }}
                    style={{ position: 'fixed', top: 96 + index * 90, right: 24, zIndex: 50 - index }}
                >
                    <RewardToast
                        item={reward.item}
                        rarity={reward.rarity}
                        xp={reward.xp}
                        onComplete={() => onRewardComplete(reward.id)}
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    );
};





