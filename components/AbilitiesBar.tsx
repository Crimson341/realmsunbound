"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, Sword, Heart, Shield, Sparkles, Lock, X, Info } from "lucide-react";

// Type for ability data
interface Ability {
    _id: string;
    name: string;
    level: number;
    school: string;
    description?: string;
    energyCost?: number;
    cooldown?: number;
    cooldownRemaining?: number;
    canUse?: boolean;
    damage?: number;
    damageDice?: string;
    damageType?: string;
    healing?: number;
    iconEmoji?: string;
    isPassive?: boolean;
    tags?: string[];
}

interface AbilitiesBarProps {
    abilities: Ability[];
    currentEnergy: number;
    maxEnergy: number;
    energyName?: string; // "Mana", "Chakra", "Stamina", etc.
    onUseAbility: (abilityId: string, abilityName: string) => void;
    disabled?: boolean;
    inCombat?: boolean;
}

// School color mapping
const SCHOOL_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    fire: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400", glow: "shadow-orange-500/30" },
    ice: { bg: "bg-cyan-500/20", border: "border-cyan-500/50", text: "text-cyan-400", glow: "shadow-cyan-500/30" },
    lightning: { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400", glow: "shadow-yellow-500/30" },
    earth: { bg: "bg-amber-700/20", border: "border-amber-700/50", text: "text-amber-600", glow: "shadow-amber-700/30" },
    water: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400", glow: "shadow-blue-500/30" },
    wind: { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400", glow: "shadow-emerald-500/30" },
    healing: { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400", glow: "shadow-green-500/30" },
    shadow: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400", glow: "shadow-purple-500/30" },
    light: { bg: "bg-amber-300/20", border: "border-amber-300/50", text: "text-amber-300", glow: "shadow-amber-300/30" },
    ninjutsu: { bg: "bg-blue-600/20", border: "border-blue-600/50", text: "text-blue-400", glow: "shadow-blue-600/30" },
    taijutsu: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400", glow: "shadow-red-500/30" },
    genjutsu: { bg: "bg-pink-500/20", border: "border-pink-500/50", text: "text-pink-400", glow: "shadow-pink-500/30" },
    default: { bg: "bg-neutral-500/20", border: "border-neutral-500/50", text: "text-neutral-400", glow: "shadow-neutral-500/30" },
};

function getSchoolColors(school: string) {
    return SCHOOL_COLORS[school.toLowerCase()] || SCHOOL_COLORS.default;
}

// Get icon based on ability type
function getAbilityIcon(ability: Ability) {
    if (ability.iconEmoji) return ability.iconEmoji;
    if (ability.healing) return "💚";
    if (ability.damage) return "⚔️";
    if (ability.school.toLowerCase() === "fire") return "🔥";
    if (ability.school.toLowerCase() === "ice") return "❄️";
    if (ability.school.toLowerCase() === "lightning") return "⚡";
    if (ability.school.toLowerCase() === "ninjutsu") return "🌀";
    if (ability.school.toLowerCase() === "taijutsu") return "👊";
    if (ability.school.toLowerCase() === "genjutsu") return "👁️";
    return "✨";
}

// Ability tooltip component
function AbilityTooltip({ ability, energyName }: { ability: Ability; energyName: string }) {
    const colors = getSchoolColors(ability.school);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50"
        >
            <div className={`rounded-xl border ${colors.border} bg-neutral-900/95 backdrop-blur-md p-3 shadow-xl ${colors.glow}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{getAbilityIcon(ability)}</span>
                        <div>
                            <h4 className="font-bold text-white text-sm">{ability.name}</h4>
                            <p className={`text-xs ${colors.text}`}>{ability.school} • Level {ability.level}</p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {ability.description && (
                    <p className="text-xs text-neutral-300 mb-3 leading-relaxed">{ability.description}</p>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {(ability.energyCost ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 text-blue-400">
                            <Zap className="w-3 h-3" />
                            <span>{ability.energyCost} {energyName}</span>
                        </div>
                    )}
                    {(ability.cooldown ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span>{ability.cooldown} turn cooldown</span>
                        </div>
                    )}
                    {ability.damage && (
                        <div className="flex items-center gap-1.5 text-red-400">
                            <Sword className="w-3 h-3" />
                            <span>{ability.damage} {ability.damageType || "damage"}</span>
                        </div>
                    )}
                    {ability.damageDice && !ability.damage && (
                        <div className="flex items-center gap-1.5 text-red-400">
                            <Sword className="w-3 h-3" />
                            <span>{ability.damageDice} {ability.damageType || ""}</span>
                        </div>
                    )}
                    {ability.healing && (
                        <div className="flex items-center gap-1.5 text-green-400">
                            <Heart className="w-3 h-3" />
                            <span>{ability.healing} healing</span>
                        </div>
                    )}
                    {ability.isPassive && (
                        <div className="flex items-center gap-1.5 text-purple-400">
                            <Shield className="w-3 h-3" />
                            <span>Passive</span>
                        </div>
                    )}
                </div>

                {/* Tags */}
                {ability.tags && ability.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-neutral-700/50">
                        {ability.tags.map((tag, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px]">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Cooldown Warning */}
                {(ability.cooldownRemaining ?? 0) > 0 && (
                    <div className="mt-2 pt-2 border-t border-neutral-700/50 flex items-center gap-1.5 text-amber-500 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>On cooldown: {ability.cooldownRemaining} turns remaining</span>
                    </div>
                )}
            </div>
            {/* Arrow */}
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${colors.bg} border-b border-r ${colors.border}`} />
        </motion.div>
    );
}

// Individual ability button
function AbilityButton({
    ability,
    currentEnergy,
    energyName,
    onUse,
    disabled,
}: {
    ability: Ability;
    currentEnergy: number;
    energyName: string;
    onUse: () => void;
    disabled: boolean;
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const colors = getSchoolColors(ability.school);
    const icon = getAbilityIcon(ability);

    const onCooldown = (ability.cooldownRemaining ?? 0) > 0;
    const notEnoughEnergy = currentEnergy < (ability.energyCost ?? 0);
    const canUse = !disabled && !onCooldown && !notEnoughEnergy && !ability.isPassive;

    return (
        <div className="relative">
            <AnimatePresence>
                {showTooltip && <AbilityTooltip ability={ability} energyName={energyName} />}
            </AnimatePresence>

            <motion.button
                whileHover={canUse ? { scale: 1.05 } : {}}
                whileTap={canUse ? { scale: 0.95 } : {}}
                onClick={canUse ? onUse : undefined}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                disabled={!canUse}
                className={`
                    relative w-14 h-14 rounded-xl border-2 transition-all
                    flex flex-col items-center justify-center gap-0.5
                    ${canUse
                        ? `${colors.bg} ${colors.border} hover:shadow-lg hover:${colors.glow} cursor-pointer`
                        : "bg-neutral-800/50 border-neutral-700/50 cursor-not-allowed opacity-60"
                    }
                `}
            >
                {/* Icon */}
                <span className={`text-lg ${canUse ? "" : "grayscale"}`}>{icon}</span>

                {/* Energy cost */}
                {(ability.energyCost ?? 0) > 0 && (
                    <span className={`text-[10px] ${notEnoughEnergy ? "text-red-500" : "text-blue-400"}`}>
                        {ability.energyCost}
                    </span>
                )}

                {/* Cooldown overlay */}
                {onCooldown && (
                    <div className="absolute inset-0 bg-neutral-900/80 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                            <Clock className="w-4 h-4 text-amber-500 mx-auto" />
                            <span className="text-xs text-amber-500">{ability.cooldownRemaining}</span>
                        </div>
                    </div>
                )}

                {/* Passive indicator */}
                {ability.isPassive && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                        <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                )}
            </motion.button>
        </div>
    );
}

// Energy bar component
function EnergyBar({
    current,
    max,
    name,
}: {
    current: number;
    max: number;
    name: string;
}) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const isLow = percentage < 25;

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
                <Zap className={`w-4 h-4 ${isLow ? "text-red-400 animate-pulse" : "text-blue-400"}`} />
                <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">{name}</span>
            </div>
            <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden min-w-[80px]">
                <motion.div
                    className={`h-full rounded-full ${isLow ? "bg-red-500" : "bg-gradient-to-r from-blue-600 to-cyan-400"}`}
                    initial={false}
                    animate={{ width: `${percentage}%` }}
                    transition={{ type: "spring", damping: 15, stiffness: 200 }}
                />
            </div>
            <span className={`text-xs font-bold tabular-nums ${isLow ? "text-red-400" : "text-blue-400"}`}>
                {current}/{max}
            </span>
        </div>
    );
}

// Main component
export function AbilitiesBar({
    abilities,
    currentEnergy,
    maxEnergy,
    energyName = "Energy",
    onUseAbility,
    disabled = false,
    inCombat = false,
}: AbilitiesBarProps) {
    const [expanded, setExpanded] = useState(true);

    // Separate active and passive abilities
    const activeAbilities = abilities.filter((a) => !a.isPassive);
    const passiveAbilities = abilities.filter((a) => a.isPassive);

    if (abilities.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                rounded-xl border backdrop-blur-md p-3
                ${inCombat
                    ? "bg-red-950/30 border-red-500/30"
                    : "bg-neutral-900/80 border-neutral-700/50"
                }
            `}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${inCombat ? "text-red-400" : "text-amber-400"}`} />
                    <span className="text-sm font-bold text-white">
                        {inCombat ? "Combat Abilities" : "Abilities"}
                    </span>
                    <span className="text-xs text-neutral-500">({activeAbilities.length})</span>
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-neutral-400 hover:text-white transition-colors"
                >
                    {expanded ? <X className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                </button>
            </div>

            {/* Energy Bar */}
            <div className="mb-3">
                <EnergyBar current={currentEnergy} max={maxEnergy} name={energyName} />
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {/* Active Abilities */}
                        <div className="flex flex-wrap gap-2 mb-2">
                            {activeAbilities.map((ability) => (
                                <AbilityButton
                                    key={ability._id}
                                    ability={ability}
                                    currentEnergy={currentEnergy}
                                    energyName={energyName}
                                    onUse={() => onUseAbility(ability._id, ability.name)}
                                    disabled={disabled}
                                />
                            ))}
                        </div>

                        {/* Passive Abilities */}
                        {passiveAbilities.length > 0 && (
                            <div className="pt-2 border-t border-neutral-700/50">
                                <span className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block">Passive</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {passiveAbilities.map((ability) => (
                                        <AbilityButton
                                            key={ability._id}
                                            ability={ability}
                                            currentEnergy={currentEnergy}
                                            energyName={energyName}
                                            onUse={() => {}}
                                            disabled={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Combat hint */}
            {inCombat && !disabled && (
                <div className="mt-2 pt-2 border-t border-red-500/20 text-center">
                    <span className="text-[10px] text-red-400/70 uppercase tracking-wider">
                        Click an ability to use it in combat
                    </span>
                </div>
            )}
        </motion.div>
    );
}

// Compact version for the quick action bar
export function AbilitiesQuickBar({
    abilities,
    currentEnergy,
    maxEnergy,
    energyName = "Energy",
    onUseAbility,
    disabled = false,
}: Omit<AbilitiesBarProps, "inCombat">) {
    const activeAbilities = abilities.filter((a) => !a.isPassive).slice(0, 6); // Show max 6

    if (abilities.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
            {/* Mini energy display */}
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-md border border-blue-500/30">
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-bold text-blue-400 tabular-nums">{currentEnergy}</span>
            </div>

            {/* Ability buttons */}
            {activeAbilities.map((ability) => (
                <AbilityButton
                    key={ability._id}
                    ability={ability}
                    currentEnergy={currentEnergy}
                    energyName={energyName}
                    onUse={() => onUseAbility(ability._id, ability.name)}
                    disabled={disabled}
                />
            ))}

            {abilities.length > 6 && (
                <span className="text-xs text-neutral-500">+{abilities.length - 6}</span>
            )}
        </div>
    );
}





