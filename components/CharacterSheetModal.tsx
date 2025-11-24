/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Zap, Brain, Hand, Heart, Eye } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

interface CharacterSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: any;
}

interface CharacterStats {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    skills: string;
    spellSlots: string;
}

const DEFAULT_STATS: CharacterStats = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    skills: "",
    spellSlots: ""
};

export default function CharacterSheetModal({ isOpen, onClose, character }: CharacterSheetModalProps) {
    const updateStats = useMutation(api.forge.updateCharacterStats);
    const [stats, setStats] = useState<CharacterStats>(DEFAULT_STATS);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (character?.stats) {
            try {
                const parsed = JSON.parse(character.stats);
                setStats({ ...DEFAULT_STATS, ...parsed });
            } catch (e) {
                console.error("Failed to parse character stats", e);
            }
        }
    }, [character]);

    const handleSave = async () => {
        if (!character) return;
        setIsSaving(true);
        try {
            await updateStats({
                characterId: character._id as Id<"characters">,
                stats: JSON.stringify(stats)
            });
            onClose();
        } catch (e) {
            console.error("Failed to save stats", e);
        } finally {
            setIsSaving(false);
        }
    };

    const updateStat = (key: keyof CharacterStats, value: any) => {
        setStats(prev => ({ ...prev, [key]: value }));
    };

    if (!isOpen) return null;

    const statConfig = [
        { key: 'strength', label: 'STR', icon: Shield, color: 'text-red-400', border: 'border-red-500/20' },
        { key: 'dexterity', label: 'DEX', icon: Zap, color: 'text-yellow-400', border: 'border-yellow-500/20' },
        { key: 'constitution', label: 'CON', icon: Heart, color: 'text-orange-400', border: 'border-orange-500/20' },
        { key: 'intelligence', label: 'INT', icon: Brain, color: 'text-blue-400', border: 'border-blue-500/20' },
        { key: 'wisdom', label: 'WIS', icon: Eye, color: 'text-emerald-400', border: 'border-emerald-500/20' },
        { key: 'charisma', label: 'CHA', icon: Hand, color: 'text-purple-400', border: 'border-purple-500/20' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300" 
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl bg-[#0c0a09] rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300 scale-100">
                
                {/* RGB Border Effect */}
                <div className="absolute inset-0 p-[1px] rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-50 pointer-events-none z-0" />
                
                {/* Content */}
                <div className="relative z-10 bg-[#0c0a09] h-full flex flex-col md:flex-row max-h-[90vh] md:max-h-[800px]">
                    
                    {/* Sidebar (Header & Info) */}
                    <div className="w-full md:w-1/3 bg-[#12100e] p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col gap-6">
                        <div className="flex justify-between items-start md:hidden">
                            <h2 className="text-2xl font-serif font-bold text-stone-200">{character?.name}</h2>
                            <button onClick={onClose} className="text-stone-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="hidden md:block text-center space-y-2">
                            <div className="w-24 h-24 mx-auto rounded-full bg-stone-800 border-2 border-white/10 flex items-center justify-center text-3xl font-serif font-bold text-stone-500 mb-4">
                                {character?.name?.charAt(0)}
                            </div>
                            <h2 className="text-3xl font-serif font-bold text-stone-200">{character?.name}</h2>
                            <p className="text-sm text-indigo-400 font-medium tracking-wider uppercase">Level {character?.level} {character?.class}</p>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                            <div className="bg-stone-900/50 p-4 rounded-xl border border-white/5">
                                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Class Features</h3>
                                <p className="text-sm text-stone-400 italic">
                                    Use the skills section to track specific class abilities, proficiencies, and other traits.
                                </p>
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all"
                            >
                                {isSaving ? <span className="animate-pulse">Saving...</span> : (
                                    <>
                                        <Save size={18} />
                                        <span>Save Character</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Main Stats Area */}
                    <div className="flex-1 p-6 md:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
                         <div className="flex justify-end mb-6 md:flex hidden">
                             <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                         </div>

                        {/* Ability Scores Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            {statConfig.map((stat) => {
                                const Icon = stat.icon;
                                const value = stats[stat.key as keyof CharacterStats] as number;
                                const mod = Math.floor((value - 10) / 2);
                                const modSign = mod >= 0 ? '+' : '';

                                return (
                                    <div key={stat.key} className={`bg-stone-900/40 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden`}>
                                        <div className={`absolute top-0 right-0 p-2 opacity-10 ${stat.color}`}>
                                            <Icon size={48} />
                                        </div>
                                        <div className="relative z-10 text-center">
                                            <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${stat.color}`}>{stat.label}</div>
                                            <input
                                                type="number"
                                                value={value}
                                                onChange={(e) => updateStat(stat.key as keyof CharacterStats, parseInt(e.target.value) || 10)}
                                                className="bg-transparent text-center text-3xl font-bold text-white w-full focus:outline-none focus:ring-0 border-none p-0 mb-1"
                                            />
                                            <div className="text-xs font-medium text-stone-500">
                                                Modifier: <span className="text-stone-300">{modSign}{mod}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Skills & Spells */}
                        <div className="grid grid-cols-1 gap-6">
                            
                            {/* Skills Section */}
                            <div className="bg-stone-900/30 rounded-xl p-6 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-stone-300 uppercase tracking-widest">Skills & Proficiencies</h3>
                                    <span className="text-xs text-stone-600">Markdown Supported</span>
                                </div>
                                <textarea
                                    value={stats.skills}
                                    onChange={(e) => updateStat('skills', e.target.value)}
                                    placeholder="- Acrobatics (+5)&#10;- Stealth (+7)&#10;- Perception (+3)"
                                    className="w-full h-32 bg-stone-950/50 border border-white/10 rounded-lg p-4 text-sm text-stone-300 focus:border-indigo-500/50 focus:ring-0 transition-colors resize-none font-mono"
                                />
                            </div>

                            {/* Spell Slots Section */}
                            <div className="bg-stone-900/30 rounded-xl p-6 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-stone-300 uppercase tracking-widest">Spell Slots & Magic</h3>
                                    <span className="text-xs text-stone-600">Markdown Supported</span>
                                </div>
                                <textarea
                                    value={stats.spellSlots}
                                    onChange={(e) => updateStat('spellSlots', e.target.value)}
                                    placeholder="**Level 1**: [x] [x] [ ] [ ]&#10;**Level 2**: [ ] [ ]"
                                    className="w-full h-32 bg-stone-950/50 border border-white/10 rounded-lg p-4 text-sm text-stone-300 focus:border-indigo-500/50 focus:ring-0 transition-colors resize-none font-mono"
                                />
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
