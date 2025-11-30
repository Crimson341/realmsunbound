'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Eye, Footprints, MessageCircle,
    Swords, Shield, Zap, Wind,
    HelpCircle, HandCoins, Skull,
    Tent, Backpack, Map, Scroll,
    Sparkles, Trophy, Heart, Star,
    BookOpen, Target, X
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
// FULL COMBAT OVERLAY SYSTEM
// ============================================

// Enhanced combat state with dice rolls and log
export interface CombatRoll {
    id: string;
    type: 'attack' | 'damage' | 'defense' | 'ability' | 'saving_throw' | 'initiative';
    roller: 'player' | 'enemy';
    diceType: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
    baseRoll: number;
    modifier: number;
    modifierSource?: string; // e.g., "STR +3"
    total: number;
    isNatural20?: boolean;
    isNatural1?: boolean;
    target?: number; // AC or DC
    success?: boolean;
    timestamp: number;
}

export interface CombatLogEntry {
    id: string;
    type: 'action' | 'roll' | 'damage' | 'effect' | 'narration';
    actor: 'player' | 'enemy' | 'system';
    actorName?: string;
    text: string;
    roll?: CombatRoll;
    damage?: number;
    damageType?: string;
    isCritical?: boolean;
    timestamp: number;
}

export interface CombatAbility {
    id: string;
    name: string;
    description?: string;
    type: 'attack' | 'spell' | 'skill' | 'item';
    energyCost?: number;
    damage?: string; // e.g., "2d6+3"
    range?: 'melee' | 'ranged';
    icon?: string;
    cooldown?: number;
    currentCooldown?: number;
}

export interface FullCombatState {
    isActive: boolean;
    turn: number;
    isPlayerTurn: boolean;
    initiative: { player: number; enemy: number };
    player: {
        name: string;
        hp: number;
        maxHp: number;
        mp?: number;
        maxMp?: number;
        ac: number;
        stats: {
            str: number;
            dex: number;
            con: number;
            int: number;
            wis: number;
            cha: number;
        };
        abilities: CombatAbility[];
        equippedWeapon?: string;
        statusEffects?: Array<{ name: string; duration: number; type: 'buff' | 'debuff' }>;
    };
    enemy: {
        name: string;
        hp: number;
        maxHp: number;
        ac: number;
        type?: string; // e.g., "Beast", "Undead", "Humanoid"
        statusEffects?: Array<{ name: string; duration: number; type: 'buff' | 'debuff' }>;
    };
    combatLog: CombatLogEntry[];
    currentRoll?: CombatRoll;
    lastAction?: string;
}

// Dice Roll Animation Component
const DiceRollAnimation: React.FC<{
    roll: CombatRoll;
    onComplete?: () => void;
}> = ({ roll, onComplete }) => {
    const [displayValue, setDisplayValue] = useState(1);
    const [isRolling, setIsRolling] = useState(true);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        const maxValue = parseInt(roll.diceType.slice(1));
        let count = 0;
        const rollInterval = setInterval(() => {
            setDisplayValue(Math.floor(Math.random() * maxValue) + 1);
            count++;
            if (count > 15) {
                clearInterval(rollInterval);
                setDisplayValue(roll.baseRoll);
                setIsRolling(false);
                setShowResult(true);
                setTimeout(() => {
                    onComplete?.();
                }, 1500);
            }
        }, 50);
        return () => clearInterval(rollInterval);
    }, [roll, onComplete]);

    const getDiceColor = () => {
        if (roll.isNatural20) return 'from-yellow-500 to-amber-400';
        if (roll.isNatural1) return 'from-red-600 to-red-500';
        if (roll.success) return 'from-emerald-500 to-green-400';
        if (roll.success === false) return 'from-slate-500 to-slate-400';
        return 'from-purple-500 to-violet-400';
    };

    const getResultText = () => {
        if (roll.isNatural20) return 'CRITICAL!';
        if (roll.isNatural1) return 'CRITICAL FAIL!';
        if (roll.success) return 'HIT!';
        if (roll.success === false) return 'MISS!';
        return '';
    };

    return (
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
        >
            <div className="relative">
                {/* Dice */}
                <motion.div
                    animate={isRolling ? {
                        rotate: [0, 360],
                        scale: [1, 1.1, 1],
                    } : {}}
                    transition={isRolling ? {
                        duration: 0.3,
                        repeat: Infinity,
                    } : {}}
                    className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${getDiceColor()} shadow-2xl flex items-center justify-center border-4 border-white/30`}
                >
                    <span className="text-5xl font-bold text-white font-mono drop-shadow-lg">
                        {displayValue}
                    </span>
                </motion.div>

                {/* Dice type label */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                    <span className="text-sm font-bold text-white/80 uppercase tracking-wider bg-slate-900/80 px-3 py-1 rounded-full">
                        {roll.diceType}
                    </span>
                </div>

                {/* Roll type */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-lg font-bold text-white uppercase tracking-wider">
                        {roll.type.replace('_', ' ')} Roll
                    </span>
                </div>

                {/* Modifier and total */}
                <AnimatePresence>
                    {showResult && (
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="absolute -right-40 top-1/2 -translate-y-1/2"
                        >
                            <div className="bg-slate-900/90 rounded-xl px-4 py-3 border border-slate-600">
                                <div className="text-slate-400 text-xs mb-1">
                                    {roll.modifierSource || 'Modifier'}
                                </div>
                                <div className="flex items-center gap-2 text-xl font-mono">
                                    <span className="text-white">{roll.baseRoll}</span>
                                    <span className="text-slate-500">+</span>
                                    <span className={roll.modifier >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        {roll.modifier >= 0 ? `+${roll.modifier}` : roll.modifier}
                                    </span>
                                    <span className="text-slate-500">=</span>
                                    <span className="text-amber-400 font-bold text-2xl">{roll.total}</span>
                                </div>
                                {roll.target && (
                                    <div className="text-xs text-slate-500 mt-1">
                                        vs {roll.type === 'attack' ? 'AC' : 'DC'} {roll.target}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Result text */}
                <AnimatePresence>
                    {showResult && getResultText() && (
                        <motion.div
                            initial={{ scale: 0, y: -20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="absolute -top-20 left-1/2 -translate-x-1/2"
                        >
                            <span className={`text-3xl font-black uppercase tracking-wider ${
                                roll.isNatural20 ? 'text-yellow-400' :
                                roll.isNatural1 ? 'text-red-500' :
                                roll.success ? 'text-emerald-400' : 'text-slate-400'
                            } drop-shadow-lg`}>
                                {getResultText()}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// Combat Log Component
const CombatLogPanel: React.FC<{
    entries: CombatLogEntry[];
    maxEntries?: number;
}> = ({ entries, maxEntries = 8 }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [entries]);

    const getEntryStyle = (entry: CombatLogEntry) => {
        switch (entry.type) {
            case 'damage':
                return entry.isCritical ? 'text-yellow-400' : 'text-red-400';
            case 'effect':
                return 'text-purple-400';
            case 'roll':
                return 'text-cyan-400';
            case 'narration':
                return 'text-slate-300 italic';
            default:
                return entry.actor === 'player' ? 'text-emerald-400' : 'text-red-400';
        }
    };

    const getEntryIcon = (entry: CombatLogEntry) => {
        switch (entry.type) {
            case 'damage':
                return '⚔️';
            case 'effect':
                return '✨';
            case 'roll':
                return '🎲';
            case 'narration':
                return '📜';
            default:
                return entry.actor === 'player' ? '🗡️' : '👹';
        }
    };

    return (
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-900/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={14} />
                    Combat Log
                </span>
            </div>
            <div
                ref={scrollRef}
                className="p-3 h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-700"
            >
                {entries.slice(-maxEntries).map((entry, index) => (
                    <motion.div
                        key={entry.id || `log_${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-sm ${getEntryStyle(entry)}`}
                    >
                        <span className="mr-2">{getEntryIcon(entry)}</span>
                        {entry.actorName && (
                            <span className="font-bold mr-1">{entry.actorName}:</span>
                        )}
                        <span>{entry.text}</span>
                        {entry.roll && (
                            <span className="ml-2 text-xs text-slate-500">
                                [{entry.roll.diceType}: {entry.roll.baseRoll}+{entry.roll.modifier}={entry.roll.total}]
                            </span>
                        )}
                        {entry.damage && (
                            <span className={`ml-2 font-bold ${entry.isCritical ? 'text-yellow-400' : 'text-red-400'}`}>
                                (-{entry.damage} {entry.damageType || 'HP'})
                            </span>
                        )}
                    </motion.div>
                ))}
                {entries.length === 0 && (
                    <div className="text-slate-600 text-sm italic text-center py-4">
                        Combat begins...
                    </div>
                )}
            </div>
        </div>
    );
};

// Player Stats Panel for Combat
const CombatStatsPanel: React.FC<{
    player: FullCombatState['player'];
    onAbilityUse: (ability: CombatAbility) => void;
    isPlayerTurn: boolean;
    isLoading: boolean;
}> = ({ player, onAbilityUse, isPlayerTurn, isLoading }) => {
    const getStatModifier = (stat: number) => Math.floor((stat - 10) / 2);
    const formatMod = (mod: number) => mod >= 0 ? `+${mod}` : `${mod}`;

    const stats = [
        { key: 'str', label: 'STR', value: player.stats.str },
        { key: 'dex', label: 'DEX', value: player.stats.dex },
        { key: 'con', label: 'CON', value: player.stats.con },
        { key: 'int', label: 'INT', value: player.stats.int },
        { key: 'wis', label: 'WIS', value: player.stats.wis },
        { key: 'cha', label: 'CHA', value: player.stats.cha },
    ];

    return (
        <div className="bg-slate-950/90 backdrop-blur-md border border-purple-500/30 rounded-xl overflow-hidden">
            {/* Stats Header */}
            <div className="px-4 py-2 border-b border-slate-700/50 bg-purple-900/20">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    <Target size={14} />
                    {player.name}&apos;s Stats
                </span>
            </div>

            {/* Stats Grid */}
            <div className="p-3 grid grid-cols-6 gap-2">
                {stats.map(({ key, label, value }) => {
                    const mod = getStatModifier(value);
                    return (
                        <div
                            key={key}
                            className="text-center bg-slate-800/50 rounded-lg p-2 border border-slate-700/50"
                        >
                            <div className="text-xs text-slate-500 uppercase">{label}</div>
                            <div className="text-lg font-bold text-white">{value}</div>
                            <div className={`text-xs font-mono ${mod >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatMod(mod)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* AC Display */}
            <div className="px-3 pb-2">
                <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Shield size={16} className="text-cyan-400" />
                        <span className="text-slate-400">AC:</span>
                        <span className="text-white font-bold">{player.ac}</span>
                    </div>
                    {player.equippedWeapon && (
                        <div className="flex items-center gap-2">
                            <Swords size={16} className="text-red-400" />
                            <span className="text-slate-300 text-xs">{player.equippedWeapon}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Abilities */}
            <div className="border-t border-slate-700/50">
                <div className="px-4 py-2 bg-slate-900/50">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Zap size={14} />
                        Abilities ({player.abilities.length})
                    </span>
                </div>
                <div className="p-2 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {player.abilities.map((ability) => (
                        <motion.button
                            key={ability.id || ability.name}
                            whileHover={{ scale: isPlayerTurn && !isLoading ? 1.02 : 1 }}
                            whileTap={{ scale: isPlayerTurn && !isLoading ? 0.98 : 1 }}
                            onClick={() => isPlayerTurn && !isLoading && onAbilityUse(ability)}
                            disabled={!isPlayerTurn || isLoading || Boolean(ability.currentCooldown && ability.currentCooldown > 0)}
                            className={`
                                p-2 rounded-lg text-left transition-all text-sm
                                ${!isPlayerTurn || isLoading || (ability.currentCooldown && ability.currentCooldown > 0)
                                    ? 'bg-slate-800/30 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-900/40 to-orange-900/40 text-amber-300 hover:from-amber-800/50 hover:to-orange-800/50 border border-amber-500/30'
                                }
                            `}
                        >
                            <div className="font-bold text-xs">{ability.icon || '⚡'} {ability.name}</div>
                            {ability.damage && (
                                <div className="text-xs text-red-400 mt-0.5">{ability.damage} dmg</div>
                            )}
                            {ability.energyCost && (
                                <div className="text-xs text-blue-400">{ability.energyCost} MP</div>
                            )}
                            {ability.currentCooldown && ability.currentCooldown > 0 && (
                                <div className="text-xs text-slate-500">CD: {ability.currentCooldown}</div>
                            )}
                        </motion.button>
                    ))}
                    {player.abilities.length === 0 && (
                        <div className="col-span-2 text-center text-slate-500 text-xs py-2">
                            No special abilities
                        </div>
                    )}
                </div>
            </div>

            {/* Status Effects */}
            {player.statusEffects && player.statusEffects.length > 0 && (
                <div className="p-2 border-t border-slate-700/50">
                    <div className="flex flex-wrap gap-1">
                        {player.statusEffects.map((effect, i) => (
                            <span
                                key={i}
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                    effect.type === 'buff'
                                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-red-900/50 text-red-400 border border-red-500/30'
                                }`}
                            >
                                {effect.name} ({effect.duration})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Full Combat Overlay - Main Component
interface FullCombatOverlayProps {
    combat: FullCombatState;
    onAction: (action: CombatAction) => void;
    onAbilityUse: (ability: CombatAbility) => void;
    isLoading: boolean;
    onClose?: () => void;
    activeDiceRoll?: CombatRoll | null; // Controlled dice roll from parent
}

export const FullCombatOverlay: React.FC<FullCombatOverlayProps> = ({
    combat,
    onAction,
    onAbilityUse,
    isLoading,
    onClose,
    activeDiceRoll,
}) => {
    // Dice roll is now controlled by parent via activeDiceRoll prop

    const playerPercent = (combat.player.hp / combat.player.maxHp) * 100;
    const enemyPercent = (combat.enemy.hp / combat.enemy.maxHp) * 100;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        >
            {/* Background Combat Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        background: [
                            'radial-gradient(circle at 30% 30%, rgba(239,68,68,0.15) 0%, transparent 50%)',
                            'radial-gradient(circle at 70% 70%, rgba(239,68,68,0.15) 0%, transparent 50%)',
                            'radial-gradient(circle at 30% 30%, rgba(239,68,68,0.15) 0%, transparent 50%)',
                        ],
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0"
                />
            </div>

            {/* Top HUD - Health Bars */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
                <div className="bg-slate-950/95 backdrop-blur-md border border-red-500/40 rounded-2xl p-6 shadow-2xl">
                    <GlowingBorder color="red" intensity="low" />
                    <RuneCorners color="red" />

                    {/* Turn Counter */}
                    <div className="text-center mb-4">
                        <span className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                            <Swords size={14} />
                            <span className="font-serif">Combat - Turn {combat.turn}</span>
                            <Swords size={14} />
                        </span>
                    </div>

                    <div className="flex justify-between items-center gap-8">
                        {/* Player Side */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <motion.div
                                    animate={combat.isPlayerTurn ? {
                                        scale: [1, 1.3, 1],
                                        boxShadow: ['0 0 0px #4ade80', '0 0 20px #4ade80', '0 0 0px #4ade80']
                                    } : {}}
                                    transition={{ duration: 0.8, repeat: combat.isPlayerTurn ? Infinity : 0 }}
                                    className={`w-3 h-3 rounded-full ${combat.isPlayerTurn ? 'bg-emerald-400' : 'bg-slate-600'}`}
                                />
                                <span className="text-white font-bold font-serif">{combat.player.name}</span>
                                {combat.isPlayerTurn && (
                                    <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Your Turn</span>
                                )}
                            </div>
                            <div className="h-6 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
                                <motion.div
                                    className={`h-full ${playerPercent < 25 ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-emerald-500 to-green-400'}`}
                                    animate={{ width: `${playerPercent}%` }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <Heart size={12} className={playerPercent < 25 ? 'text-red-400' : 'text-emerald-400'} />
                                <span className="text-xs text-slate-400 font-mono">{combat.player.hp} / {combat.player.maxHp}</span>
                                {combat.player.mp !== undefined && (
                                    <>
                                        <span className="text-slate-600 mx-1">|</span>
                                        <Zap size={12} className="text-blue-400" />
                                        <span className="text-xs text-slate-400 font-mono">{combat.player.mp} / {combat.player.maxMp}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* VS */}
                        <motion.div
                            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Swords className="text-red-500" size={36} />
                        </motion.div>

                        {/* Enemy Side */}
                        <div className="flex-1 text-right">
                            <div className="flex items-center gap-2 mb-2 justify-end">
                                <span className="text-red-400 font-bold font-serif">{combat.enemy.name}</span>
                                {combat.enemy.type && (
                                    <span className="text-xs text-slate-500">({combat.enemy.type})</span>
                                )}
                                <motion.div
                                    animate={!combat.isPlayerTurn ? {
                                        scale: [1, 1.3, 1],
                                        boxShadow: ['0 0 0px #f87171', '0 0 20px #f87171', '0 0 0px #f87171']
                                    } : {}}
                                    transition={{ duration: 0.8, repeat: !combat.isPlayerTurn ? Infinity : 0 }}
                                    className={`w-3 h-3 rounded-full ${!combat.isPlayerTurn ? 'bg-red-400' : 'bg-slate-600'}`}
                                />
                            </div>
                            <div className="h-6 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                    animate={{ width: `${enemyPercent}%` }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                                <span className="text-xs text-slate-400 font-mono">{combat.enemy.hp} / {combat.enemy.maxHp}</span>
                                <Heart size={12} className="text-red-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Left Panel - Player Stats & Abilities */}
            <div className="absolute left-4 top-44 w-80">
                <CombatStatsPanel
                    player={combat.player}
                    onAbilityUse={onAbilityUse}
                    isPlayerTurn={combat.isPlayerTurn}
                    isLoading={isLoading}
                />
            </div>

            {/* Right Panel - Combat Log */}
            <div className="absolute right-4 top-44 w-80">
                <CombatLogPanel entries={combat.combatLog} />
            </div>

            {/* Bottom - Action Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
                <CombatActionBar
                    onAction={onAction}
                    isPlayerTurn={combat.isPlayerTurn}
                    isLoading={isLoading}
                    equippedWeapon={combat.player.equippedWeapon}
                    abilities={combat.player.abilities.map(a => ({ name: a.name, energyCost: a.energyCost || 0 }))}
                    consumables={[]} // TODO: Pass consumables
                    playerEnergy={combat.player.mp || 0}
                />
            </div>

            {/* Dice Roll Animation - controlled by parent */}
            <AnimatePresence>
                {activeDiceRoll && (
                    <DiceRollAnimation
                        roll={activeDiceRoll}
                        onComplete={() => {}} // Parent controls visibility via activeDiceRoll prop
                    />
                )}
            </AnimatePresence>

            {/* Exit button (for flee/victory/defeat) */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            )}
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
                    key={reward.id || `reward_${index}`}
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

// ============================================
// PLAYER STATE TYPES
// ============================================

export interface PlayerStats {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
}

export interface InventoryItem {
    id: string;
    itemId: string;
    name: string;
    type: string;
    rarity: Rarity;
    category?: string;
    effects?: string;
    description?: string;
    quantity: number;
    equippedSlot?: string | null;
    usable?: boolean;
    consumable?: boolean;
}

export interface PlayerState {
    hp: number;
    maxHp: number;
    energy?: number;
    maxEnergy?: number;
    xp: number;
    level: number;
    gold?: number;
    activeBuffs?: Array<{ name: string; duration: number; icon?: string }>;
}

export interface CharacterInfo {
    name: string;
    class: string;
    race?: string;
    level: number;
    stats: PlayerStats;
    imageUrl?: string | null;
}

// ============================================
// STATS BAR - Compact HP/MP/XP Bar
// ============================================

interface StatsBarProps {
    hp: number;
    maxHp: number;
    energy?: number;
    maxEnergy?: number;
    xp: number;
    xpToNextLevel: number;
    level: number;
    gold?: number;
    className?: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({
    hp,
    maxHp,
    energy,
    maxEnergy,
    xp,
    xpToNextLevel,
    level,
    gold = 0,
    className = '',
}) => {
    const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const energyPercent = maxEnergy ? Math.max(0, Math.min(100, ((energy || 0) / maxEnergy) * 100)) : 0;
    const xpPercent = Math.max(0, Math.min(100, (xp / xpToNextLevel) * 100));

    const getHpColor = () => {
        if (hpPercent > 60) return 'bg-emerald-500';
        if (hpPercent > 30) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className={`flex items-center gap-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-4 py-2 ${className}`}>
            {/* HP Bar */}
            <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <div className="w-24 h-3 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${getHpColor()} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${hpPercent}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
                <span className="text-xs text-slate-300 min-w-[3rem]">{hp}/{maxHp}</span>
            </div>

            {/* Energy/Mana Bar (if applicable) */}
            {maxEnergy && maxEnergy > 0 && (
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <div className="w-20 h-3 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-cyan-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${energyPercent}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <span className="text-xs text-slate-300 min-w-[3rem]">{energy}/{maxEnergy}</span>
                </div>
            )}

            {/* Level & XP */}
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
                <div className="flex items-center justify-center w-6 h-6 bg-purple-600 rounded-full">
                    <span className="text-xs font-bold text-white">{level}</span>
                </div>
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-purple-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${xpPercent}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            {/* Gold */}
            {gold !== undefined && (
                <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
                    <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                        <span className="text-[8px] font-bold text-amber-900">G</span>
                    </div>
                    <span className="text-sm text-amber-300 font-medium">{gold.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};

// ============================================
// INVENTORY PANEL - Grid-based Inventory
// ============================================

interface InventoryPanelProps {
    items: InventoryItem[];
    isOpen: boolean;
    onClose: () => void;
    onUseItem?: (itemId: string) => void;
    onEquipItem?: (itemId: string, slot: string) => void;
    onDropItem?: (itemId: string) => void;
    equippedSlots?: {
        weapon?: InventoryItem | null;
        armor?: InventoryItem | null;
        accessory?: InventoryItem | null;
    };
}

const RARITY_COLORS: Record<Rarity, { bg: string; border: string; text: string; glow: string }> = {
    common: { bg: 'bg-slate-700', border: 'border-slate-500', text: 'text-slate-200', glow: '' },
    uncommon: { bg: 'bg-emerald-900/50', border: 'border-emerald-500', text: 'text-emerald-300', glow: 'shadow-emerald-500/20' },
    rare: { bg: 'bg-blue-900/50', border: 'border-blue-500', text: 'text-blue-300', glow: 'shadow-blue-500/30' },
    epic: { bg: 'bg-purple-900/50', border: 'border-purple-500', text: 'text-purple-300', glow: 'shadow-purple-500/40' },
    legendary: { bg: 'bg-amber-900/50', border: 'border-amber-500', text: 'text-amber-300', glow: 'shadow-amber-500/50' },
};

const InventorySlot: React.FC<{
    item?: InventoryItem | null;
    slotType?: string;
    onClick?: () => void;
    onRightClick?: (e: React.MouseEvent) => void;
}> = ({ item, slotType, onClick, onRightClick }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const colors = item ? RARITY_COLORS[item.rarity] : RARITY_COLORS.common;

    return (
        <div
            className={`
                relative w-12 h-12 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${item ? colors.bg : 'bg-slate-800/50'}
                ${item ? colors.border : 'border-slate-600/50 border-dashed'}
                ${item ? `shadow-lg ${colors.glow}` : ''}
                hover:scale-105 hover:brightness-110
            `}
            onClick={onClick}
            onContextMenu={onRightClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {item ? (
                <>
                    {/* Item Icon (placeholder) */}
                    <div className="absolute inset-1 flex items-center justify-center">
                        <span className="text-lg">{getItemEmoji(item.category || item.type)}</span>
                    </div>
                    {/* Quantity badge */}
                    {item.quantity > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-bold px-1 rounded">
                            {item.quantity}
                        </div>
                    )}
                    {/* Tooltip */}
                    <AnimatePresence>
                        {showTooltip && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-lg border ${colors.bg} ${colors.border} min-w-[150px] shadow-xl`}
                            >
                                <div className={`font-semibold ${colors.text}`}>{item.name}</div>
                                <div className="text-xs text-slate-400 capitalize">{item.rarity} {item.type}</div>
                                {item.description && <div className="text-xs text-slate-300 mt-1">{item.description}</div>}
                                {item.effects && <div className="text-xs text-emerald-400 mt-1">{item.effects}</div>}
                                <div className="text-[10px] text-slate-500 mt-2">
                                    {item.usable && 'Click to use • '}Right-click for options
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            ) : (
                slotType && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-[10px] uppercase">
                        {slotType}
                    </div>
                )
            )}
        </div>
    );
};

const getItemEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
        weapon: '⚔️',
        armor: '🛡️',
        potion: '🧪',
        scroll: '📜',
        consumable: '🍖',
        material: '💎',
        quest: '⭐',
        accessory: '💍',
        gold: '🪙',
    };
    return emojis[category.toLowerCase()] || '📦';
};

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
    items,
    isOpen,
    onClose,
    onUseItem,
    onEquipItem,
    onDropItem,
    equippedSlots,
}) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: InventoryItem } | null>(null);

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
        if (!item.equippedSlot) {
            const cat = item.category || 'misc';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
        }
        return acc;
    }, {} as Record<string, InventoryItem[]>);

    const handleContextMenu = (e: React.MouseEvent, item: InventoryItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 top-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl z-40"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <Backpack className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-white">Inventory</h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    ✕
                </button>
            </div>

            {/* Equipped Slots */}
            <div className="p-4 border-b border-slate-700">
                <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Equipped</div>
                <div className="flex gap-2 justify-center">
                    <InventorySlot
                        item={equippedSlots?.weapon}
                        slotType="weapon"
                        onClick={() => equippedSlots?.weapon && setSelectedItem(equippedSlots.weapon)}
                    />
                    <InventorySlot
                        item={equippedSlots?.armor}
                        slotType="armor"
                        onClick={() => equippedSlots?.armor && setSelectedItem(equippedSlots.armor)}
                    />
                    <InventorySlot
                        item={equippedSlots?.accessory}
                        slotType="acc"
                        onClick={() => equippedSlots?.accessory && setSelectedItem(equippedSlots.accessory)}
                    />
                </div>
            </div>

            {/* Inventory Grid */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category} className="mb-4">
                        <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                            <span>{getItemEmoji(category)}</span>
                            <span>{category}</span>
                            <span className="text-slate-600">({categoryItems.length})</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {categoryItems.map((item, itemIndex) => (
                                <InventorySlot
                                    key={item.id || `item_${category}_${itemIndex}`}
                                    item={item}
                                    onClick={() => {
                                        if (item.usable && onUseItem) onUseItem(item.id);
                                        else setSelectedItem(item);
                                    }}
                                    onRightClick={(e) => handleContextMenu(e, item)}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center text-slate-500 py-8">
                        <Backpack className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Your inventory is empty</p>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 z-50"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        {contextMenu.item.usable && onUseItem && (
                            <button
                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                                onClick={() => { onUseItem(contextMenu.item.id); setContextMenu(null); }}
                            >
                                <Sparkles className="w-4 h-4" /> Use
                            </button>
                        )}
                        {contextMenu.item.category === 'weapon' || contextMenu.item.category === 'armor' || contextMenu.item.category === 'accessory' ? (
                            <button
                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                                onClick={() => { onEquipItem?.(contextMenu.item.id, contextMenu.item.category || 'weapon'); setContextMenu(null); }}
                            >
                                <Shield className="w-4 h-4" /> Equip
                            </button>
                        ) : null}
                        <button
                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                            onClick={() => { onDropItem?.(contextMenu.item.id); setContextMenu(null); }}
                        >
                            <Skull className="w-4 h-4" /> Drop
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ============================================
// CHARACTER SHEET - Full Stats Panel
// ============================================

interface CharacterSheetProps {
    character: CharacterInfo;
    playerState: PlayerState;
    isOpen: boolean;
    onClose: () => void;
}

const StatBlock: React.FC<{ label: string; value: number; modifier: number }> = ({ label, value, modifier }) => {
    const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    return (
        <div className="flex flex-col items-center p-2 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className={`text-sm font-medium ${modifier >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {modifierStr}
            </div>
        </div>
    );
};

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
    character,
    playerState,
    isOpen,
    onClose,
}) => {
    const calculateModifier = (stat: number) => Math.floor((stat - 10) / 2);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="fixed left-4 top-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl z-40"
        >
            {/* Header */}
            <div className="relative p-4 border-b border-slate-700">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    ✕
                </button>
                <div className="flex items-center gap-3">
                    {/* Character Avatar */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center border-2 border-purple-400">
                        {character.imageUrl ? (
                            <img src={character.imageUrl} alt={character.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="text-2xl">🧙</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{character.name}</h3>
                        <div className="text-sm text-slate-400">
                            Level {character.level} {character.race && `${character.race} `}{character.class}
                        </div>
                    </div>
                </div>
            </div>

            {/* HP/Energy Bars */}
            <div className="p-4 border-b border-slate-700 space-y-3">
                {/* HP */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Health</span>
                        <span className="text-white">{playerState.hp} / {playerState.maxHp}</span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                            animate={{ width: `${(playerState.hp / playerState.maxHp) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Energy (if applicable) */}
                {playerState.maxEnergy && playerState.maxEnergy > 0 && (
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-400">Energy</span>
                            <span className="text-white">{playerState.energy} / {playerState.maxEnergy}</span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                                animate={{ width: `${((playerState.energy || 0) / playerState.maxEnergy) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* XP */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Experience</span>
                        <span className="text-white">{playerState.xp} XP</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                            animate={{ width: `${(playerState.xp % 1000) / 10}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="p-4">
                <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Attributes</div>
                <div className="grid grid-cols-3 gap-2">
                    <StatBlock label="STR" value={character.stats.strength} modifier={calculateModifier(character.stats.strength)} />
                    <StatBlock label="DEX" value={character.stats.dexterity} modifier={calculateModifier(character.stats.dexterity)} />
                    <StatBlock label="CON" value={character.stats.constitution} modifier={calculateModifier(character.stats.constitution)} />
                    <StatBlock label="INT" value={character.stats.intelligence} modifier={calculateModifier(character.stats.intelligence)} />
                    <StatBlock label="WIS" value={character.stats.wisdom} modifier={calculateModifier(character.stats.wisdom)} />
                    <StatBlock label="CHA" value={character.stats.charisma} modifier={calculateModifier(character.stats.charisma)} />
                </div>
            </div>

            {/* Active Buffs */}
            {playerState.activeBuffs && playerState.activeBuffs.length > 0 && (
                <div className="p-4 border-t border-slate-700">
                    <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Active Effects</div>
                    <div className="flex flex-wrap gap-2">
                        {playerState.activeBuffs.map((buff, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-1 px-2 py-1 bg-emerald-900/50 border border-emerald-500/50 rounded text-xs text-emerald-300"
                            >
                                {buff.icon || '✨'} {buff.name}
                                {buff.duration > 0 && <span className="text-emerald-500">({buff.duration})</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Gold */}
            <div className="p-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                    <span className="text-slate-400">Gold</span>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-bold text-amber-900">G</span>
                        </div>
                        <span className="text-lg font-bold text-amber-300">{(playerState.gold || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// PLAYER HUD - Main Container
// ============================================

interface PlayerHUDProps {
    character: CharacterInfo;
    playerState: PlayerState;
    inventory: InventoryItem[];
    xpToNextLevel: number;
    equippedSlots?: {
        weapon?: InventoryItem | null;
        armor?: InventoryItem | null;
        accessory?: InventoryItem | null;
    };
    onUseItem?: (itemId: string) => void;
    onEquipItem?: (itemId: string, slot: string) => void;
    onDropItem?: (itemId: string) => void;
    className?: string;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
    character,
    playerState,
    inventory,
    xpToNextLevel,
    equippedSlots,
    onUseItem,
    onEquipItem,
    onDropItem,
    className = '',
}) => {
    const [showInventory, setShowInventory] = useState(false);
    const [showCharacterSheet, setShowCharacterSheet] = useState(false);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                setShowInventory(prev => !prev);
            }
            if (e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                setShowCharacterSheet(prev => !prev);
            }
            if (e.key === 'Escape') {
                setShowInventory(false);
                setShowCharacterSheet(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className={className}>
            {/* Top Stats Bar */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30">
                <StatsBar
                    hp={playerState.hp}
                    maxHp={playerState.maxHp}
                    energy={playerState.energy}
                    maxEnergy={playerState.maxEnergy}
                    xp={playerState.xp}
                    xpToNextLevel={xpToNextLevel}
                    level={playerState.level}
                    gold={playerState.gold}
                />
            </div>

            {/* Quick Access Buttons */}
            <div className="fixed top-4 right-4 z-30 flex gap-2">
                <button
                    onClick={() => setShowCharacterSheet(prev => !prev)}
                    className={`p-2 rounded-lg border transition-all ${
                        showCharacterSheet
                            ? 'bg-purple-600 border-purple-400 text-white'
                            : 'bg-slate-800/90 border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Character Sheet (C)"
                >
                    <Star className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setShowInventory(prev => !prev)}
                    className={`p-2 rounded-lg border transition-all ${
                        showInventory
                            ? 'bg-amber-600 border-amber-400 text-white'
                            : 'bg-slate-800/90 border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Inventory (I)"
                >
                    <Backpack className="w-5 h-5" />
                </button>
            </div>

            {/* Panels */}
            <AnimatePresence>
                {showCharacterSheet && (
                    <CharacterSheet
                        character={character}
                        playerState={playerState}
                        isOpen={showCharacterSheet}
                        onClose={() => setShowCharacterSheet(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showInventory && (
                    <InventoryPanel
                        items={inventory}
                        isOpen={showInventory}
                        onClose={() => setShowInventory(false)}
                        onUseItem={onUseItem}
                        onEquipItem={onEquipItem}
                        onDropItem={onDropItem}
                        equippedSlots={equippedSlots}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ============================================
// DIALOGUE SYSTEM TYPES
// ============================================

export interface DialogueLine {
    speaker?: string;
    speakerPortrait?: string;
    text: string;
    emotion?: 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised' | 'thinking';
}

export interface DialogueChoice {
    id: string;
    text: string;
    skillCheck?: {
        skill: string;
        dc: number;
        modifier?: number;
    };
    consequence?: string;
    disabled?: boolean;
    disabledReason?: string;
}

export interface DialogueState {
    lines: DialogueLine[];
    currentLineIndex: number;
    choices?: DialogueChoice[];
    isComplete: boolean;
}

// ============================================
// DIALOGUE BOX - RPG-Style Bottom Overlay
// ============================================

interface DialogueBoxProps {
    dialogue: DialogueLine;
    onAdvance: () => void;
    onComplete?: () => void;
    isLastLine?: boolean;
    typingSpeed?: number;
    className?: string;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
    dialogue,
    onAdvance,
    onComplete,
    isLastLine = false,
    typingSpeed = 30,
    className = '',
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [showContinue, setShowContinue] = useState(false);

    // Typing animation effect
    useEffect(() => {
        setDisplayedText('');
        setIsTyping(true);
        setShowContinue(false);

        let index = 0;
        const interval = setInterval(() => {
            if (index < dialogue.text.length) {
                setDisplayedText(dialogue.text.slice(0, index + 1));
                index++;
            } else {
                setIsTyping(false);
                setShowContinue(true);
                clearInterval(interval);
            }
        }, typingSpeed);

        return () => clearInterval(interval);
    }, [dialogue.text, typingSpeed]);

    // Handle click/space to advance or skip typing
    const handleInteraction = useCallback(() => {
        if (isTyping) {
            // Skip typing animation
            setDisplayedText(dialogue.text);
            setIsTyping(false);
            setShowContinue(true);
        } else if (isLastLine && onComplete) {
            onComplete();
        } else {
            onAdvance();
        }
    }, [isTyping, dialogue.text, isLastLine, onComplete, onAdvance]);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleInteraction();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInteraction]);

    const getEmotionColor = () => {
        switch (dialogue.emotion) {
            case 'angry': return 'border-red-500/50';
            case 'happy': return 'border-emerald-500/50';
            case 'sad': return 'border-blue-500/50';
            case 'surprised': return 'border-amber-500/50';
            case 'thinking': return 'border-purple-500/50';
            default: return 'border-slate-600/50';
        }
    };

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}
            onClick={handleInteraction}
        >
            <div className={`mx-auto max-w-4xl p-4`}>
                <div className={`bg-slate-900/95 backdrop-blur-md border-2 ${getEmotionColor()} rounded-t-2xl shadow-2xl`}>
                    {/* Speaker Header */}
                    {dialogue.speaker && (
                        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-700/50">
                            {/* Portrait */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center border-2 border-purple-400 shadow-lg">
                                {dialogue.speakerPortrait ? (
                                    <img src={dialogue.speakerPortrait} alt={dialogue.speaker} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <span className="text-xl">👤</span>
                                )}
                            </div>
                            {/* Name */}
                            <div>
                                <h3 className="font-bold text-lg text-amber-300">{dialogue.speaker}</h3>
                                {dialogue.emotion && dialogue.emotion !== 'neutral' && (
                                    <span className="text-xs text-slate-400 capitalize">({dialogue.emotion})</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Dialogue Text */}
                    <div className="px-6 py-4 min-h-[100px]">
                        <p className="text-lg text-slate-100 leading-relaxed font-serif">
                            {displayedText}
                            {isTyping && (
                                <motion.span
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                    className="inline-block w-2 h-5 bg-amber-400 ml-1"
                                />
                            )}
                        </p>
                    </div>

                    {/* Continue Indicator */}
                    <AnimatePresence>
                        {showContinue && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="px-6 pb-3 flex justify-end"
                            >
                                <motion.div
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="flex items-center gap-2 text-slate-400 text-sm"
                                >
                                    <span>{isLastLine ? 'Press SPACE to close' : 'Press SPACE to continue'}</span>
                                    <span className="text-amber-400">▼</span>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// CHOICE MENU - Clickable Dialogue Options
// ============================================

interface ChoiceMenuProps {
    choices: DialogueChoice[];
    onSelect: (choiceId: string) => void;
    className?: string;
}

export const ChoiceMenu: React.FC<ChoiceMenuProps> = ({
    choices,
    onSelect,
    className = '',
}) => {
    const [hoveredChoice, setHoveredChoice] = useState<string | null>(null);

    return (
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}
        >
            <div className="mx-auto max-w-2xl p-4">
                <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600/50 rounded-xl shadow-2xl p-4">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-3 text-center">
                        Choose your response
                    </div>
                    <div className="space-y-2">
                        {choices.map((choice, index) => (
                            <motion.button
                                key={choice.id || `fallback_${index}`}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => !choice.disabled && onSelect(choice.id)}
                                onMouseEnter={() => setHoveredChoice(choice.id)}
                                onMouseLeave={() => setHoveredChoice(null)}
                                disabled={choice.disabled}
                                className={`
                                    w-full text-left px-4 py-3 rounded-lg border transition-all duration-200
                                    ${choice.disabled
                                        ? 'bg-slate-800/30 border-slate-700/30 text-slate-500 cursor-not-allowed'
                                        : 'bg-slate-800/50 border-slate-600/50 text-slate-200 hover:bg-purple-900/30 hover:border-purple-500/50 hover:text-white cursor-pointer'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Number indicator */}
                                    <span className={`
                                        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${choice.disabled ? 'bg-slate-700 text-slate-500' : 'bg-purple-600 text-white'}
                                    `}>
                                        {index + 1}
                                    </span>

                                    <div className="flex-1">
                                        {/* Choice text */}
                                        <span className="block">{choice.text}</span>

                                        {/* Skill check indicator */}
                                        {choice.skillCheck && (
                                            <span className={`
                                                inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium
                                                ${choice.skillCheck.modifier && choice.skillCheck.modifier >= choice.skillCheck.dc - 10
                                                    ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30'
                                                    : 'bg-amber-900/50 text-amber-300 border border-amber-500/30'
                                                }
                                            `}>
                                                [{choice.skillCheck.skill} DC {choice.skillCheck.dc}]
                                                {choice.skillCheck.modifier !== undefined && (
                                                    <span className="ml-1 opacity-75">
                                                        (Your modifier: {choice.skillCheck.modifier >= 0 ? '+' : ''}{choice.skillCheck.modifier})
                                                    </span>
                                                )}
                                            </span>
                                        )}

                                        {/* Disabled reason */}
                                        {choice.disabled && choice.disabledReason && (
                                            <span className="block mt-1 text-xs text-red-400">
                                                {choice.disabledReason}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Consequence hint on hover */}
                                <AnimatePresence>
                                    {hoveredChoice === choice.id && choice.consequence && !choice.disabled && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-2 pl-9 text-xs text-amber-400 italic"
                                        >
                                            → {choice.consequence}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// NARRATIVE OVERLAY - Cinematic Text Display
// ============================================

interface NarrativeOverlayProps {
    title?: string;
    subtitle?: string;
    description?: string;
    type?: 'location' | 'event' | 'chapter' | 'death';
    onComplete?: () => void;
    duration?: number;
}

export const NarrativeOverlay: React.FC<NarrativeOverlayProps> = ({
    title,
    subtitle,
    description,
    type = 'location',
    onComplete,
    duration = 4000,
}) => {
    useEffect(() => {
        if (onComplete) {
            const timer = setTimeout(onComplete, duration);
            return () => clearTimeout(timer);
        }
    }, [onComplete, duration]);

    const getTypeStyles = () => {
        switch (type) {
            case 'death':
                return {
                    bg: 'from-red-950/95 via-slate-950/95 to-red-950/95',
                    titleColor: 'text-red-500',
                    subtitleColor: 'text-red-300',
                };
            case 'chapter':
                return {
                    bg: 'from-purple-950/95 via-slate-950/95 to-purple-950/95',
                    titleColor: 'text-purple-400',
                    subtitleColor: 'text-purple-200',
                };
            case 'event':
                return {
                    bg: 'from-amber-950/95 via-slate-950/95 to-amber-950/95',
                    titleColor: 'text-amber-400',
                    subtitleColor: 'text-amber-200',
                };
            default:
                return {
                    bg: 'from-slate-950/95 via-slate-900/95 to-slate-950/95',
                    titleColor: 'text-amber-300',
                    subtitleColor: 'text-slate-300',
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b ${styles.bg} backdrop-blur-sm`}
            onClick={onComplete}
        >
            <div className="text-center px-8 max-w-2xl">
                {/* Decorative line */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-6"
                />

                {/* Subtitle (e.g., "You have arrived at") */}
                {subtitle && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`text-sm uppercase tracking-[0.3em] ${styles.subtitleColor} mb-2`}
                    >
                        {subtitle}
                    </motion.p>
                )}

                {/* Title (Location/Event name) */}
                {title && (
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className={`text-4xl md:text-5xl font-serif font-bold ${styles.titleColor} mb-4`}
                    >
                        {title}
                    </motion.h1>
                )}

                {/* Description */}
                {description && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-slate-400 text-lg font-serif italic leading-relaxed"
                    >
                        {description}
                    </motion.p>
                )}

                {/* Decorative line */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 1 }}
                    className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-6"
                />

                {/* Click to continue */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.5, 1] }}
                    transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
                    className="text-slate-500 text-xs mt-8"
                >
                    Click anywhere to continue
                </motion.p>
            </div>
        </motion.div>
    );
};

// ============================================
// INTERACTION PROMPT - "E to Talk" Prompts
// ============================================

interface InteractionPromptProps {
    action: string;
    target: string;
    keyHint?: string;
    position: { x: number; y: number };
}

export const InteractionPrompt: React.FC<InteractionPromptProps> = ({
    action,
    target,
    keyHint = 'E',
    position,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-40 pointer-events-none"
            style={{ left: position.x, top: position.y - 60 }}
        >
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-amber-500 text-slate-900 text-xs font-bold rounded">
                        {keyHint}
                    </span>
                    <span className="text-slate-200 text-sm">
                        {action} <span className="text-amber-300">{target}</span>
                    </span>
                </div>
            </div>
            {/* Arrow pointing down */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-900/95" />
        </motion.div>
    );
};

// ============================================
// NOTIFICATION TOAST - Quest/Discovery Updates
// ============================================

export type NotificationType = 'quest' | 'discovery' | 'achievement' | 'warning' | 'info';

interface GameNotificationProps {
    type: NotificationType;
    title: string;
    description?: string;
    icon?: string;
    onComplete?: () => void;
    duration?: number;
}

export const GameNotification: React.FC<GameNotificationProps> = ({
    type,
    title,
    description,
    icon,
    onComplete,
    duration = 4000,
}) => {
    useEffect(() => {
        if (onComplete) {
            const timer = setTimeout(onComplete, duration);
            return () => clearTimeout(timer);
        }
    }, [onComplete, duration]);

    const getTypeStyles = () => {
        switch (type) {
            case 'quest':
                return {
                    bg: 'bg-purple-900/90',
                    border: 'border-purple-500/50',
                    iconBg: 'bg-purple-600',
                    titleColor: 'text-purple-200',
                    defaultIcon: '📜',
                };
            case 'discovery':
                return {
                    bg: 'bg-amber-900/90',
                    border: 'border-amber-500/50',
                    iconBg: 'bg-amber-600',
                    titleColor: 'text-amber-200',
                    defaultIcon: '✨',
                };
            case 'achievement':
                return {
                    bg: 'bg-emerald-900/90',
                    border: 'border-emerald-500/50',
                    iconBg: 'bg-emerald-600',
                    titleColor: 'text-emerald-200',
                    defaultIcon: '🏆',
                };
            case 'warning':
                return {
                    bg: 'bg-red-900/90',
                    border: 'border-red-500/50',
                    iconBg: 'bg-red-600',
                    titleColor: 'text-red-200',
                    defaultIcon: '⚠️',
                };
            default:
                return {
                    bg: 'bg-slate-800/90',
                    border: 'border-slate-600/50',
                    iconBg: 'bg-slate-600',
                    titleColor: 'text-slate-200',
                    defaultIcon: 'ℹ️',
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className={`${styles.bg} backdrop-blur-md border ${styles.border} rounded-lg shadow-2xl overflow-hidden min-w-[280px] max-w-[350px]`}
        >
            {/* Progress bar */}
            <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className="h-1 bg-white/30 origin-left"
            />

            <div className="p-4 flex items-start gap-3">
                {/* Icon */}
                <div className={`${styles.iconBg} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-xl">{icon || styles.defaultIcon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold ${styles.titleColor}`}>{title}</h4>
                    {description && (
                        <p className="text-sm text-slate-400 mt-1">{description}</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// NOTIFICATION QUEUE MANAGER
// ============================================

interface NotificationQueueProps {
    notifications: Array<GameNotificationProps & { id: string }>;
    onDismiss: (id: string) => void;
}

export const NotificationQueue: React.FC<NotificationQueueProps> = ({
    notifications,
    onDismiss,
}) => {
    return (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
            <AnimatePresence>
                {notifications.slice(0, 4).map((notification, index) => (
                    <GameNotification
                        key={notification.id || `notification_${index}`}
                        {...notification}
                        onComplete={() => onDismiss(notification.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

// ============================================
// DIALOGUE MANAGER - Full System Controller
// ============================================

interface DialogueManagerProps {
    dialogue?: DialogueState;
    onDialogueAdvance: () => void;
    onDialogueComplete: () => void;
    onChoiceSelect: (choiceId: string) => void;
    narrativeOverlay?: NarrativeOverlayProps;
    onNarrativeComplete?: () => void;
    interactionPrompt?: InteractionPromptProps;
}

export const DialogueManager: React.FC<DialogueManagerProps> = ({
    dialogue,
    onDialogueAdvance,
    onDialogueComplete,
    onChoiceSelect,
    narrativeOverlay,
    onNarrativeComplete,
    interactionPrompt,
}) => {
    const currentLine = dialogue?.lines[dialogue.currentLineIndex];
    const isLastLine = dialogue ? dialogue.currentLineIndex >= dialogue.lines.length - 1 : false;
    const showChoices = dialogue && isLastLine && dialogue.choices && dialogue.choices.length > 0 && !dialogue.isComplete;

    return (
        <>
            {/* Narrative Overlay (Location arrivals, chapter starts, etc.) */}
            <AnimatePresence>
                {narrativeOverlay && (
                    <NarrativeOverlay
                        {...narrativeOverlay}
                        onComplete={onNarrativeComplete}
                    />
                )}
            </AnimatePresence>

            {/* Dialogue Box */}
            <AnimatePresence>
                {currentLine && !showChoices && !dialogue?.isComplete && (
                    <DialogueBox
                        dialogue={currentLine}
                        onAdvance={onDialogueAdvance}
                        onComplete={onDialogueComplete}
                        isLastLine={isLastLine && (!dialogue?.choices || dialogue.choices.length === 0)}
                    />
                )}
            </AnimatePresence>

            {/* Choice Menu */}
            <AnimatePresence>
                {showChoices && dialogue?.choices && (
                    <ChoiceMenu
                        choices={dialogue.choices}
                        onSelect={onChoiceSelect}
                    />
                )}
            </AnimatePresence>

            {/* Interaction Prompt */}
            <AnimatePresence>
                {interactionPrompt && (
                    <InteractionPrompt {...interactionPrompt} />
                )}
            </AnimatePresence>
        </>
    );
};
