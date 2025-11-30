'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
// SHARED COMPONENTS - ARCANE EFFECTS
// ============================================

// Floating rune particles
const ArcaneParticles: React.FC<{ count?: number; color?: string }> = ({ count = 12, color = 'purple' }) => {
    const colors = {
        purple: 'bg-purple-500',
        cyan: 'bg-cyan-400',
        amber: 'bg-amber-400',
        red: 'bg-red-500',
        green: 'bg-emerald-400',
    };

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(count)].map((_, i) => (
                <motion.div
                    key={i}
                    className={`absolute w-1 h-1 ${colors[color as keyof typeof colors] || colors.purple} rounded-full`}
                    initial={{
                        x: Math.random() * 100 + '%',
                        y: '100%',
                        opacity: 0,
                        scale: 0,
                    }}
                    animate={{
                        y: '-20%',
                        opacity: [0, 0.8, 0],
                        scale: [0, 1.5, 0],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: 'easeOut',
                    }}
                    style={{
                        filter: 'blur(0.5px)',
                        boxShadow: `0 0 8px currentColor`,
                    }}
                />
            ))}
        </div>
    );
};

// Glowing border effect
const GlowingBorder: React.FC<{ color?: string; intensity?: 'low' | 'medium' | 'high' }> = ({
    color = 'purple',
    intensity = 'medium'
}) => {
    const glowSizes = {
        low: 'blur-sm',
        medium: 'blur-md',
        high: 'blur-xl',
    };

    const colors = {
        purple: 'from-purple-600 via-violet-500 to-purple-600',
        cyan: 'from-cyan-500 via-teal-400 to-cyan-500',
        amber: 'from-amber-500 via-orange-400 to-amber-500',
        red: 'from-red-600 via-rose-500 to-red-600',
        green: 'from-emerald-500 via-green-400 to-emerald-500',
    };

    return (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${colors[color as keyof typeof colors] || colors.purple} opacity-30 ${glowSizes[intensity]}`}
                animate={{
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
};

// Rune corner decorations
const RuneCorners: React.FC<{ color?: string }> = ({ color = 'purple' }) => {
    const textColor = {
        purple: 'text-purple-400/40',
        cyan: 'text-cyan-400/40',
        amber: 'text-amber-400/40',
        red: 'text-red-400/40',
    };

    return (
        <>
            <div className={`absolute top-2 left-2 ${textColor[color as keyof typeof textColor] || textColor.purple} text-lg font-serif`}>◈</div>
            <div className={`absolute top-2 right-2 ${textColor[color as keyof typeof textColor] || textColor.purple} text-lg font-serif`}>◈</div>
            <div className={`absolute bottom-2 left-2 ${textColor[color as keyof typeof textColor] || textColor.purple} text-lg font-serif`}>◈</div>
            <div className={`absolute bottom-2 right-2 ${textColor[color as keyof typeof textColor] || textColor.purple} text-lg font-serif`}>◈</div>
        </>
    );
};

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
        { icon: Search, label: 'Search', action: 'I search the area carefully for anything of interest', color: 'cyan' },
        { icon: Eye, label: 'Observe', action: 'I carefully observe my surroundings, looking for details', color: 'purple' },
        { icon: Footprints, label: 'Move On', action: 'I continue forward on my journey', color: 'amber' },
        { icon: MessageCircle, label: 'Call Out', action: 'I call out to see if anyone is nearby', color: 'green' },
    ],
    combat: [
        { icon: Swords, label: 'Attack', action: 'I attack the enemy with my weapon!', color: 'red' },
        { icon: Shield, label: 'Defend', action: 'I take a defensive stance, ready to block', color: 'cyan' },
        { icon: Zap, label: 'Spell', action: 'I cast my most powerful spell at the enemy!', color: 'purple' },
        { icon: Wind, label: 'Flee', action: 'I attempt to disengage and flee from combat!', color: 'amber' },
    ],
    social: [
        { icon: MessageCircle, label: 'Greet', action: 'I greet them with a friendly smile', color: 'green' },
        { icon: HelpCircle, label: 'Ask', action: 'I ask them what they know about this place', color: 'cyan' },
        { icon: HandCoins, label: 'Trade', action: 'I ask if they have anything interesting to trade', color: 'amber' },
        { icon: Skull, label: 'Threaten', action: 'I threaten them with a menacing glare', color: 'red' },
    ],
    rest: [
        { icon: Tent, label: 'Rest', action: 'I set up camp and rest to recover my strength', color: 'purple' },
        { icon: Backpack, label: 'Inventory', action: 'I check my belongings and organize my pack', color: 'amber' },
        { icon: Map, label: 'Map', action: 'I consult my map to plan my next destination', color: 'cyan' },
        { icon: Scroll, label: 'Journal', action: 'I review my quest journal for any missed details', color: 'green' },
    ],
};

const actionColors = {
    cyan: {
        bg: 'bg-gradient-to-br from-cyan-900/80 to-slate-900/90',
        border: 'border-cyan-500/30',
        hover: 'hover:border-cyan-400/60 hover:shadow-cyan-500/20',
        text: 'text-cyan-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]',
    },
    purple: {
        bg: 'bg-gradient-to-br from-purple-900/80 to-slate-900/90',
        border: 'border-purple-500/30',
        hover: 'hover:border-purple-400/60 hover:shadow-purple-500/20',
        text: 'text-purple-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    },
    amber: {
        bg: 'bg-gradient-to-br from-amber-900/80 to-slate-900/90',
        border: 'border-amber-500/30',
        hover: 'hover:border-amber-400/60 hover:shadow-amber-500/20',
        text: 'text-amber-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    },
    green: {
        bg: 'bg-gradient-to-br from-emerald-900/80 to-slate-900/90',
        border: 'border-emerald-500/30',
        hover: 'hover:border-emerald-400/60 hover:shadow-emerald-500/20',
        text: 'text-emerald-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]',
    },
    red: {
        bg: 'bg-gradient-to-br from-red-900/80 to-slate-900/90',
        border: 'border-red-500/30',
        hover: 'hover:border-red-400/60 hover:shadow-red-500/20',
        text: 'text-red-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    },
};

export const QuickActionBar: React.FC<QuickActionBarProps> = ({ onAction, isLoading, context }) => {
    const actions = actionSets[context];

    return (
        <div className="flex gap-3 mb-4 justify-center flex-wrap">
            {actions.map((action, i) => {
                const colors = actionColors[action.color as keyof typeof actionColors] || actionColors.purple;
                return (
                    <motion.button
                        key={`${context}-${i}`}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={() => onAction(action.action)}
                        disabled={isLoading}
                        className={`
                            group relative flex items-center gap-2.5 px-5 py-3
                            ${colors.bg} border ${colors.border} ${colors.hover}
                            rounded-xl text-sm font-medium ${colors.text}
                            transition-all duration-300 backdrop-blur-md
                            disabled:opacity-40 disabled:cursor-not-allowed
                            ${colors.glow}
                        `}
                    >
                        {/* Subtle inner glow */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/5 to-white/10 pointer-events-none" />

                        <action.icon size={16} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        <span className="relative z-10 tracking-wide">{action.label}</span>

                        {/* Hover shimmer effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.6 }}
                        />
                    </motion.button>
                );
            })}
        </div>
    );
};

// ============================================
// DICE ROLL OVERLAY
// ============================================

const ATTRIBUTE_ABBR: Record<string, string> = {
    strength: 'STR',
    dexterity: 'DEX',
    constitution: 'CON',
    intelligence: 'INT',
    wisdom: 'WIS',
    charisma: 'CHA',
};

const ATTRIBUTE_COLORS: Record<string, { gradient: string; glow: string; text: string }> = {
    strength: { gradient: 'from-red-500 via-rose-600 to-red-700', glow: 'shadow-red-500/50', text: 'text-red-400' },
    dexterity: { gradient: 'from-emerald-500 via-green-600 to-emerald-700', glow: 'shadow-emerald-500/50', text: 'text-emerald-400' },
    constitution: { gradient: 'from-orange-500 via-amber-600 to-orange-700', glow: 'shadow-orange-500/50', text: 'text-orange-400' },
    intelligence: { gradient: 'from-blue-500 via-indigo-600 to-blue-700', glow: 'shadow-blue-500/50', text: 'text-blue-400' },
    wisdom: { gradient: 'from-purple-500 via-violet-600 to-purple-700', glow: 'shadow-purple-500/50', text: 'text-purple-400' },
    charisma: { gradient: 'from-pink-500 via-rose-600 to-pink-700', glow: 'shadow-pink-500/50', text: 'text-pink-400' },
};

interface DiceRollOverlayProps {
    data: SkillCheckData;
    onComplete: () => void;
}

export const DiceRollOverlay: React.FC<DiceRollOverlayProps> = ({ data, onComplete }) => {
    const [phase, setPhase] = useState<'rolling' | 'result'>('rolling');
    const [displayRoll, setDisplayRoll] = useState(1);
    const { roll, modifier, target, success, skill, attribute, degree } = data;

    useEffect(() => {
        if (phase === 'rolling') {
            const interval = setInterval(() => {
                setDisplayRoll(Math.floor(Math.random() * 20) + 1);
            }, 50);
            return () => clearInterval(interval);
        }
    }, [phase]);

    useEffect(() => {
        const resultTimer = setTimeout(() => setPhase('result'), 1800);
        const completeTimer = setTimeout(onComplete, 4500);

        return () => {
            clearTimeout(resultTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    const isNat20 = roll === 20;
    const isNat1 = roll === 1;
    const isCriticalSuccess = degree === 'critical_success' || isNat20;
    const isCriticalFailure = degree === 'critical_failure' || isNat1;

    const getDiceStyle = () => {
        if (phase === 'result') {
            if (isNat20) return { gradient: 'from-yellow-400 via-amber-500 to-yellow-600', glow: 'shadow-yellow-400/60' };
            if (isNat1) return { gradient: 'from-red-600 via-red-700 to-red-900', glow: 'shadow-red-600/60' };
            if (attribute && ATTRIBUTE_COLORS[attribute.toLowerCase()]) {
                return ATTRIBUTE_COLORS[attribute.toLowerCase()];
            }
        }
        return { gradient: 'from-purple-500 via-violet-600 to-purple-700', glow: 'shadow-purple-500/40' };
    };

    const diceStyle = getDiceStyle();

    const getResultDisplay = () => {
        if (isCriticalSuccess || isNat20) {
            return { text: isNat20 ? 'NATURAL 20!' : 'CRITICAL SUCCESS!', color: 'text-yellow-400', isGlorious: true };
        }
        if (isCriticalFailure || isNat1) {
            return { text: isNat1 ? 'NATURAL 1!' : 'CRITICAL FAILURE!', color: 'text-red-500', isGlorious: false };
        }
        if (success) {
            return { text: 'SUCCESS', color: 'text-emerald-400', isGlorious: false };
        }
        return { text: 'FAILED', color: 'text-red-400', isGlorious: false };
    };

    const resultDisplay = getResultDisplay();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
        >
            {/* Mystic backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/50 to-slate-950" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)]" />

            {/* Arcane circle behind dice */}
            <motion.div
                className="absolute w-80 h-80 rounded-full border border-purple-500/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
                <div className="absolute inset-4 rounded-full border border-cyan-500/10" />
                <div className="absolute inset-8 rounded-full border border-purple-500/10" />
            </motion.div>

            {/* Critical success particles */}
            {phase === 'result' && (isNat20 || isCriticalSuccess) && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(40)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute"
                            initial={{
                                x: '50vw',
                                y: '50vh',
                                scale: 0,
                            }}
                            animate={{
                                x: `${Math.random() * 100}vw`,
                                y: `${Math.random() * 100}vh`,
                                scale: [0, 1, 0],
                            }}
                            transition={{
                                duration: 2,
                                delay: i * 0.04,
                                ease: 'easeOut',
                            }}
                        >
                            <Star className="text-yellow-400 fill-yellow-400" size={Math.random() * 16 + 8} />
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="relative text-center">
                {/* Skill Name */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <p className="text-slate-400 uppercase tracking-[0.3em] text-sm font-bold mb-1">
                        {skill} Check
                    </p>
                    {attribute && (
                        <p className={`text-xs ${ATTRIBUTE_COLORS[attribute.toLowerCase()]?.text || 'text-slate-500'} tracking-widest`}>
                            ({ATTRIBUTE_ABBR[attribute.toLowerCase()] || attribute.toUpperCase()})
                        </p>
                    )}
                </motion.div>

                {/* D20 Die */}
                <div className="relative mb-10">
                    {/* Glow effect */}
                    {phase === 'result' && (
                        <motion.div
                            className={`absolute inset-0 blur-3xl ${isNat20 ? 'bg-yellow-500' : isNat1 ? 'bg-red-600' : 'bg-purple-500'}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: [0.3, 0.6, 0.3],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            style={{ borderRadius: '50%' }}
                        />
                    )}

                    <motion.div
                        className={`
                            relative w-36 h-36 bg-gradient-to-br ${diceStyle.gradient}
                            rounded-2xl flex items-center justify-center
                            text-6xl font-bold text-white mx-auto
                            shadow-2xl ${diceStyle.glow}
                        `}
                        animate={phase === 'rolling' ? {
                            rotateX: [0, 360, 720, 1080, 1440],
                            rotateY: [0, 180, 360, 540, 720],
                            scale: [1, 1.1, 1, 1.1, 1],
                        } : {
                            rotateX: 0,
                            rotateY: 0,
                            scale: isNat20 || isNat1 ? [1, 1.25, 1.15] : [1, 1.1, 1],
                        }}
                        transition={phase === 'rolling' ? {
                            duration: 1.8,
                            ease: 'easeOut'
                        } : {
                            duration: 0.6,
                            type: 'spring',
                        }}
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* Inner border */}
                        <div className="absolute inset-2 border-2 border-white/20 rounded-xl" />

                        {/* Shine effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-2xl"
                            animate={phase === 'result' && isNat20 ? { x: ['-200%', '200%'] } : {}}
                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1.5 }}
                        />

                        <span className="relative z-10 drop-shadow-lg font-serif">
                            {phase === 'result' ? roll : displayRoll}
                        </span>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        className="text-slate-500 text-xs mt-3 uppercase tracking-[0.4em] font-serif"
                    >
                        d20
                    </motion.p>
                </div>

                {/* Result */}
                <AnimatePresence>
                    {phase === 'result' && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            {/* Roll breakdown */}
                            <div className="flex items-center justify-center gap-3 text-2xl mb-4 font-mono">
                                <motion.span
                                    className={`${isNat20 ? 'text-yellow-400' : isNat1 ? 'text-red-500' : 'text-slate-200'} font-bold`}
                                    animate={isNat20 || isNat1 ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                >
                                    {roll}
                                </motion.span>
                                <span className="text-slate-600">+</span>
                                <span className="text-cyan-400">{modifier}</span>
                                <span className="text-slate-600">=</span>
                                <span className={`font-bold text-3xl ${success ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {roll + modifier}
                                </span>
                            </div>

                            {/* DC Target */}
                            <p className="text-slate-500 mb-8 text-sm">
                                vs DC <span className="text-slate-300 font-bold">{target}</span>
                                <span className="text-slate-600 ml-2">
                                    ({roll + modifier >= target ? '+' : ''}{roll + modifier - target})
                                </span>
                            </p>

                            {/* Result Banner */}
                            <motion.div
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', delay: 0.25, bounce: 0.5 }}
                                className={`text-4xl md:text-5xl font-bold uppercase tracking-wider ${resultDisplay.color} font-serif`}
                            >
                                {resultDisplay.isGlorious ? (
                                    <span className="flex items-center justify-center gap-4">
                                        <motion.span
                                            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity }}
                                        >
                                            <Star className="fill-current text-yellow-400" size={36} />
                                        </motion.span>
                                        {resultDisplay.text}
                                        <motion.span
                                            animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity }}
                                        >
                                            <Star className="fill-current text-yellow-400" size={36} />
                                        </motion.span>
                                    </span>
                                ) : isCriticalFailure || isNat1 ? (
                                    <motion.span
                                        animate={{ x: [0, -8, 8, -8, 8, 0] }}
                                        transition={{ duration: 0.6 }}
                                    >
                                        {resultDisplay.text}
                                    </motion.span>
                                ) : success ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <Sparkles className="text-emerald-400" size={28} />
                                        {resultDisplay.text}
                                        <Sparkles className="text-emerald-400" size={28} />
                                    </span>
                                ) : (
                                    <span>{resultDisplay.text}</span>
                                )}
                            </motion.div>

                            {/* Modifier breakdown */}
                            {modifier !== 0 && attribute && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-slate-600 text-xs mt-6"
                                >
                                    <span className="text-slate-500">
                                        {ATTRIBUTE_ABBR[attribute.toLowerCase()] || attribute.toUpperCase()} modifier: {modifier >= 0 ? '+' : ''}{modifier}
                                    </span>
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
    common: {
        gradient: 'from-slate-400 via-slate-500 to-slate-600',
        glow: 'rgba(148, 163, 184, 0.4)',
        text: 'text-slate-300',
        border: 'border-slate-400/30',
    },
    uncommon: {
        gradient: 'from-emerald-400 via-green-500 to-emerald-600',
        glow: 'rgba(52, 211, 153, 0.5)',
        text: 'text-emerald-300',
        border: 'border-emerald-400/40',
    },
    rare: {
        gradient: 'from-blue-400 via-cyan-500 to-blue-600',
        glow: 'rgba(59, 130, 246, 0.5)',
        text: 'text-blue-300',
        border: 'border-blue-400/40',
    },
    epic: {
        gradient: 'from-purple-400 via-violet-500 to-purple-600',
        glow: 'rgba(168, 85, 247, 0.5)',
        text: 'text-purple-300',
        border: 'border-purple-400/40',
    },
    legendary: {
        gradient: 'from-amber-400 via-yellow-500 to-orange-500',
        glow: 'rgba(245, 158, 11, 0.6)',
        text: 'text-amber-300',
        border: 'border-amber-400/50',
    },
};

export const RewardToast: React.FC<RewardToastProps> = ({ item, rarity, xp, onComplete }) => {
    const config = rarityConfig[rarity];

    useEffect(() => {
        const timer = setTimeout(onComplete, 4500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ x: 150, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 150, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-24 right-6 z-50"
        >
            <div
                className={`relative bg-gradient-to-r ${config.gradient} p-[2px] rounded-2xl overflow-hidden`}
                style={{ boxShadow: `0 0 40px ${config.glow}, 0 0 80px ${config.glow}` }}
            >
                {/* Legendary shimmer */}
                {rarity === 'legendary' && (
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        animate={{ x: ['-200%', '200%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                    />
                )}

                <div className={`bg-slate-950/95 backdrop-blur-md px-6 py-5 rounded-2xl flex items-center gap-5 relative border ${config.border}`}>
                    {/* Particles for legendary */}
                    {rarity === 'legendary' && <ArcaneParticles count={8} color="amber" />}

                    {/* Icon */}
                    <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: 'spring', delay: 0.15, bounce: 0.5 }}
                        className={`w-16 h-16 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
                    >
                        <Sparkles className="text-white" size={28} />
                    </motion.div>

                    {/* Content */}
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-1">
                            Item Acquired
                        </p>
                        <p className={`${config.text} font-bold text-lg leading-tight font-serif`}>{item}</p>
                        {xp && (
                            <motion.p
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-amber-400 text-sm font-bold mt-1 flex items-center gap-1"
                            >
                                <Trophy size={14} />
                                +{xp} XP
                            </motion.p>
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
                    <Trophy size={14} className="text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 font-serif">Lv.{level}</span>
                </div>
                <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden min-w-[60px] border border-amber-500/20">
                    <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        />
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-slate-950/90 rounded-xl p-5 border border-amber-500/20 backdrop-blur-md overflow-hidden">
            <GlowingBorder color="amber" intensity="low" />

            <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Trophy size={18} className="text-amber-400" />
                        <span className="text-sm text-slate-300 uppercase tracking-widest font-bold font-serif">
                            Level {level}
                        </span>
                    </div>
                    <span className="text-sm text-amber-400 font-bold font-mono">
                        {currentXP} / {maxXP}
                    </span>
                </div>
                <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden border border-amber-500/20">
                    <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                        />
                    </motion.div>
                </div>
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
        const timer = setTimeout(onComplete, 4000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
        >
            {/* Epic backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-amber-950/30 to-slate-950" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.25)_0%,transparent_60%)]" />

            {/* Arcane circles */}
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full border border-amber-500/30"
                animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                transition={{ rotate: { duration: 30, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
            />
            <motion.div
                className="absolute w-[450px] h-[450px] rounded-full border border-yellow-500/20"
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            />

            {/* Burst particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute"
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
                            duration: 2.5,
                            delay: i * 0.08,
                            ease: 'easeOut',
                        }}
                    >
                        <Star className="text-amber-400 fill-amber-400" size={Math.random() * 20 + 10} />
                    </motion.div>
                ))}
            </div>

            {/* Main content */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
                className="text-center relative z-10"
            >
                {/* Level number with glow */}
                <motion.div
                    className="relative mb-6"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <div className="absolute inset-0 text-9xl font-serif font-bold text-amber-400 blur-2xl opacity-50">
                        {newLevel}
                    </div>
                    <div className="text-9xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 drop-shadow-2xl">
                        {newLevel}
                    </div>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-5xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 tracking-widest"
                    style={{ textShadow: '0 0 40px rgba(245, 158, 11, 0.5)' }}
                >
                    LEVEL UP!
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-slate-400 text-lg mt-4 tracking-widest uppercase"
                >
                    Your power grows stronger
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
            <div className="relative bg-slate-950/95 backdrop-blur-md border border-red-500/40 rounded-2xl p-6 shadow-2xl overflow-hidden">
                <GlowingBorder color="red" intensity="low" />
                <RuneCorners color="red" />

                {/* Combat Title */}
                <div className="text-center mb-5 relative z-10">
                    <motion.span
                        className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Swords size={14} />
                        <span className="font-serif">Combat Engaged</span>
                        <Swords size={14} />
                    </motion.span>
                </div>

                <div className="flex justify-between items-center gap-8 relative z-10">
                    {/* Player Side */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <motion.div
                                animate={isPlayerTurn ? { scale: [1, 1.3, 1], boxShadow: ['0 0 0px #4ade80', '0 0 20px #4ade80', '0 0 0px #4ade80'] } : {}}
                                transition={{ duration: 0.8, repeat: isPlayerTurn ? Infinity : 0 }}
                                className={`w-3 h-3 rounded-full ${
                                    isPlayerTurn ? 'bg-emerald-400' : 'bg-slate-600'
                                }`}
                            />
                            <span className="text-white font-bold text-sm font-serif">{playerName}</span>
                            {isPlayerTurn && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold"
                                >
                                    Your Turn
                                </motion.span>
                            )}
                        </div>
                        <div className="h-5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
                            <motion.div
                                className={`h-full relative ${
                                    playerDanger
                                        ? 'bg-gradient-to-r from-red-600 to-red-400'
                                        : 'bg-gradient-to-r from-emerald-500 to-green-400'
                                }`}
                                animate={{ width: `${playerPercent}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            >
                                {playerDanger && (
                                    <motion.div
                                        className="absolute inset-0 bg-red-400/50"
                                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                                        transition={{ duration: 0.5, repeat: Infinity }}
                                    />
                                )}
                            </motion.div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <Heart size={12} className={playerDanger ? 'text-red-400' : 'text-emerald-400'} />
                            <p className="text-xs text-slate-400 font-mono">
                                {playerHP} / {playerMaxHP}
                            </p>
                        </div>
                    </div>

                    {/* VS Divider */}
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-3xl"
                    >
                        <Swords className="text-red-500" size={32} />
                    </motion.div>

                    {/* Enemy Side */}
                    <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 mb-2 justify-end">
                            <span className="text-red-400 font-bold text-sm font-serif">{enemyName}</span>
                            <motion.div
                                animate={!isPlayerTurn ? { scale: [1, 1.3, 1], boxShadow: ['0 0 0px #f87171', '0 0 20px #f87171', '0 0 0px #f87171'] } : {}}
                                transition={{ duration: 0.8, repeat: !isPlayerTurn ? Infinity : 0 }}
                                className={`w-3 h-3 rounded-full ${
                                    !isPlayerTurn ? 'bg-red-400' : 'bg-slate-600'
                                }`}
                            />
                        </div>
                        <div className="h-5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
                            <motion.div
                                className="h-full bg-gradient-to-r from-red-600 to-red-400 relative"
                                animate={{ width: `${enemyPercent}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                            <p className="text-xs text-slate-400 font-mono">
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
// COMBAT ACTION BAR
// ============================================

export interface CombatAction {
    type: 'attack' | 'defend' | 'ability' | 'item' | 'flee';
    data?: {
        weaponName?: string;
        abilityName?: string;
        itemName?: string;
    };
}

interface CombatActionBarProps {
    onAction: (action: CombatAction) => void;
    isPlayerTurn: boolean;
    isLoading: boolean;
    equippedWeapon?: string;
    abilities?: Array<{ name: string; energyCost: number }>;
    consumables?: Array<{ name: string; quantity: number }>;
    playerEnergy: number;
    onOpenAbilities?: () => void;
    onOpenItems?: () => void;
}

export const CombatActionBar: React.FC<CombatActionBarProps> = ({
    onAction,
    isPlayerTurn,
    isLoading,
    equippedWeapon = 'fists',
    abilities = [],
    consumables = [],
    playerEnergy,
    onOpenAbilities,
    onOpenItems,
}) => {
    const [showAbilities, setShowAbilities] = useState(false);
    const [showItems, setShowItems] = useState(false);

    const handleAttack = useCallback(() => {
        onAction({ type: 'attack', data: { weaponName: equippedWeapon } });
    }, [onAction, equippedWeapon]);

    const handleDefend = useCallback(() => {
        onAction({ type: 'defend' });
    }, [onAction]);

    const handleAbility = useCallback((abilityName: string) => {
        onAction({ type: 'ability', data: { abilityName } });
        setShowAbilities(false);
    }, [onAction]);

    const handleItem = useCallback((itemName: string) => {
        onAction({ type: 'item', data: { itemName } });
        setShowItems(false);
    }, [onAction]);

    const handleFlee = useCallback(() => {
        onAction({ type: 'flee' });
    }, [onAction]);

    const disabled = !isPlayerTurn || isLoading;

    const actionButtonClass = (baseColor: string, isDisabled: boolean) => `
        flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl transition-all duration-300
        ${isDisabled
            ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/30'
            : `bg-gradient-to-br ${baseColor} text-white shadow-lg hover:scale-105 active:scale-95 border border-white/10`
        }
    `;

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4"
        >
            <div className="relative bg-slate-950/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-5 shadow-2xl overflow-hidden">
                <GlowingBorder color="amber" intensity="low" />
                <RuneCorners color="amber" />

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center flex-wrap relative z-10">
                    {/* Attack */}
                    <motion.button
                        whileHover={{ scale: disabled ? 1 : 1.05 }}
                        whileTap={{ scale: disabled ? 1 : 0.95 }}
                        onClick={handleAttack}
                        disabled={disabled}
                        className={actionButtonClass('from-red-600 via-red-500 to-rose-600 shadow-red-500/25', disabled)}
                    >
                        <Swords size={22} />
                        <span className="text-xs font-bold tracking-wide">Attack</span>
                    </motion.button>

                    {/* Defend */}
                    <motion.button
                        whileHover={{ scale: disabled ? 1 : 1.05 }}
                        whileTap={{ scale: disabled ? 1 : 0.95 }}
                        onClick={handleDefend}
                        disabled={disabled}
                        className={actionButtonClass('from-cyan-600 via-cyan-500 to-teal-600 shadow-cyan-500/25', disabled)}
                    >
                        <Shield size={22} />
                        <span className="text-xs font-bold tracking-wide">Defend</span>
                    </motion.button>

                    {/* Abilities */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: (disabled || abilities.length === 0) ? 1 : 1.05 }}
                            whileTap={{ scale: (disabled || abilities.length === 0) ? 1 : 0.95 }}
                            onClick={() => onOpenAbilities ? onOpenAbilities() : setShowAbilities(!showAbilities)}
                            disabled={disabled || abilities.length === 0}
                            className={actionButtonClass('from-purple-600 via-violet-500 to-purple-600 shadow-purple-500/25', disabled || abilities.length === 0)}
                        >
                            <Zap size={22} />
                            <span className="text-xs font-bold tracking-wide">Ability</span>
                        </motion.button>

                        <AnimatePresence>
                            {showAbilities && abilities.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full left-0 mb-3 bg-slate-950/95 border border-purple-500/40 rounded-xl p-2 min-w-[180px] shadow-2xl backdrop-blur-md"
                                >
                                    {abilities.map((ability, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAbility(ability.name)}
                                            disabled={playerEnergy < ability.energyCost}
                                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                                                playerEnergy < ability.energyCost
                                                    ? 'text-slate-500 cursor-not-allowed'
                                                    : 'text-white hover:bg-purple-500/20'
                                            }`}
                                        >
                                            <div className="font-medium font-serif">{ability.name}</div>
                                            <div className="text-xs text-purple-400 flex items-center gap-1 mt-0.5">
                                                <Zap size={10} />
                                                {ability.energyCost} Energy
                                            </div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Items */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: (disabled || consumables.length === 0) ? 1 : 1.05 }}
                            whileTap={{ scale: (disabled || consumables.length === 0) ? 1 : 0.95 }}
                            onClick={() => onOpenItems ? onOpenItems() : setShowItems(!showItems)}
                            disabled={disabled || consumables.length === 0}
                            className={actionButtonClass('from-emerald-600 via-green-500 to-emerald-600 shadow-emerald-500/25', disabled || consumables.length === 0)}
                        >
                            <Backpack size={22} />
                            <span className="text-xs font-bold tracking-wide">Item</span>
                        </motion.button>

                        <AnimatePresence>
                            {showItems && consumables.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full left-0 mb-3 bg-slate-950/95 border border-emerald-500/40 rounded-xl p-2 min-w-[180px] shadow-2xl backdrop-blur-md"
                                >
                                    {consumables.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleItem(item.name)}
                                            className="w-full text-left px-4 py-3 rounded-lg text-sm text-white hover:bg-emerald-500/20 transition-all"
                                        >
                                            <div className="font-medium font-serif">{item.name}</div>
                                            <div className="text-xs text-emerald-400 mt-0.5">x{item.quantity}</div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Flee */}
                    <motion.button
                        whileHover={{ scale: disabled ? 1 : 1.05 }}
                        whileTap={{ scale: disabled ? 1 : 0.95 }}
                        onClick={handleFlee}
                        disabled={disabled}
                        className={actionButtonClass('from-amber-600 via-orange-500 to-amber-600 shadow-amber-500/25', disabled)}
                    >
                        <Wind size={22} />
                        <span className="text-xs font-bold tracking-wide">Flee</span>
                    </motion.button>
                </div>

                {/* Turn Indicator */}
                <motion.div
                    className="mt-4 text-center relative z-10"
                    animate={isPlayerTurn ? { opacity: [0.8, 1, 0.8] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <span className={`text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 ${
                        isPlayerTurn ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                        {isPlayerTurn ? (
                            <>
                                <Swords size={14} />
                                <span className="font-serif">Your Turn - Choose an Action</span>
                                <Swords size={14} />
                            </>
                        ) : (
                            <>
                                <Shield size={14} />
                                <span className="font-serif">Enemy Turn - Please Wait...</span>
                                <Shield size={14} />
                            </>
                        )}
                    </span>
                </motion.div>
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
        const timer = setTimeout(onComplete, 600);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const effectStyles = {
        damage: 'bg-red-500/30',
        heal: 'bg-emerald-500/25',
        critical: 'bg-gradient-to-r from-red-600/40 via-orange-500/30 to-red-600/40',
        levelup: 'bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30',
    };

    return (
        <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={`fixed inset-0 pointer-events-none z-40 ${effectStyles[type]}`}
        >
            {type === 'critical' && (
                <motion.div
                    className="absolute inset-0"
                    animate={{ x: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                />
            )}
            {type === 'levelup' && (
                <motion.div
                    className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.3)_0%,transparent_70%)]"
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.8 }}
                />
            )}
        </motion.div>
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
                    animate={{ y: index * 100 }}
                    exit={{ x: 150, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    style={{ position: 'fixed', top: 96 + index * 100, right: 24, zIndex: 50 - index }}
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
