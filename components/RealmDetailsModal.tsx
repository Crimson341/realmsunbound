"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Users, Scroll, Sparkles, History, Shield, Crown } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

interface Character {
    _id: string;
    name: string;
    class: string;
    level: number;
}

interface Campaign {
    _id: string;
    title: string;
    description: string;
    imageUrl?: string | null;
    xpRate: number;
    activeCharacters?: Character[];
    template?: {
        version: string;
        updates?: string[];
    } | null;
    templateVersion?: string;
    rules?: string;
}

interface RealmDetailsModalProps {
    campaign: Campaign | null;
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'updates' | 'lore' | 'characters';

export default function RealmDetailsModal({ campaign, isOpen, onClose }: RealmDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('updates');
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    // If not open or no campaign, don't render
    if (!isOpen || !campaign) return null;

    const hasUpdate = campaign.template && campaign.templateVersion !== campaign.template.version;

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className={`absolute inset-0 backdrop-blur-sm ${dark ? 'bg-black/80' : 'bg-stone-900/80'}`}
                    />

                    {/* Modal Content */}
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full max-w-5xl max-h-[85vh] rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col md:flex-row z-10 border ${
                            dark 
                                ? 'bg-[#1a1d2e] border-[#2a2d3e]' 
                                : 'bg-[#faf9f6] border-white/20'
                        }`}
                    >
                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 z-30 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-md border border-white/10"
                        >
                            <X size={20} />
                        </button>

                        {/* Left Side: Immersive Visuals */}
                        <div className={`md:w-5/12 relative min-h-[300px] md:min-h-full overflow-hidden group ${dark ? 'bg-[#0f1119]' : 'bg-stone-900'}`}>
                            {campaign.imageUrl ? (
                                <div 
                                    className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-1000 group-hover:scale-105"
                                    style={{ backgroundImage: `url(${campaign.imageUrl})` }}
                                />
                            ) : (
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                            )}
                            
                            {/* Gradient Overlays */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
                            
                            <div className="absolute bottom-0 left-0 p-10 text-white z-10 w-full">
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 backdrop-blur-sm ${
                                        dark 
                                            ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]' 
                                            : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                                    }`}
                                >
                                    <Crown size={12} /> Realm Details
                                </motion.div>
                                
                                <motion.h2 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-4xl md:text-5xl font-serif font-bold leading-none mb-6 drop-shadow-xl text-transparent bg-clip-text bg-gradient-to-br from-white via-stone-200 to-stone-400"
                                >
                                    {campaign.title}
                                </motion.h2>
                                
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex flex-wrap gap-3"
                                >
                                    <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-bold backdrop-blur-md shadow-lg">
                                        <span className="text-stone-400 uppercase text-[10px] tracking-wider block mb-0.5">XP Rate</span>
                                        <span className="text-white text-sm">{campaign.xpRate}x</span>
                                    </div>
                                    <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-bold backdrop-blur-md shadow-lg">
                                        <span className="text-stone-400 uppercase text-[10px] tracking-wider block mb-0.5">Population</span>
                                        <span className="text-white text-sm flex items-center gap-1">
                                            <Users size={14} className="text-emerald-400" /> 
                                            {campaign.activeCharacters?.length || 0}
                                        </span>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Right Side: Content */}
                        <div className={`md:w-7/12 flex flex-col h-full max-h-[85vh] ${dark ? 'bg-[#1a1d2e]' : 'bg-[#faf9f6]'}`}>
                            {/* Tabs Header */}
                            <div className={`px-8 pt-8 pb-2 border-b sticky top-0 z-20 ${
                                dark 
                                    ? 'border-[#2a2d3e] bg-[#1a1d2e]/50 backdrop-blur-xl' 
                                    : 'border-stone-200 bg-white/50 backdrop-blur-xl'
                            }`}>
                                <div className="flex space-x-8">
                                    {['updates', 'lore', 'characters'].map((tab) => (
                                        <button 
                                            key={tab}
                                            onClick={() => setActiveTab(tab as Tab)}
                                            className={`relative pb-4 text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
                                                activeTab === tab 
                                                    ? dark ? 'text-[#e8e6e3]' : 'text-stone-900'
                                                    : dark ? 'text-gray-500 hover:text-gray-300' : 'text-stone-400 hover:text-stone-600'
                                            }`}
                                        >
                                            {tab}
                                            {activeTab === tab && (
                                                <motion.div 
                                                    layoutId="activeTab"
                                                    className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${dark ? 'bg-[#D4AF37]' : 'bg-stone-900'}`}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scrollable Content Area */}
                            <div className={`p-8 overflow-y-auto custom-scrollbar flex-1 ${dark ? 'bg-[#1a1d2e]' : 'bg-[#faf9f6]'}`}>
                                <AnimatePresence mode="wait">
                                    {activeTab === 'updates' && (
                                        <motion.div
                                            key="updates"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="space-y-6"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className={`text-xl font-serif font-bold flex items-center gap-3 ${dark ? 'text-[#e8e6e3]' : 'text-stone-900'}`}>
                                                    <History size={20} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                                    Realm Status
                                                </h3>
                                            </div>

                                            {campaign.template ? (
                                                <div className={`relative p-6 rounded-2xl border transition-all duration-500 ${
                                                    hasUpdate 
                                                        ? dark 
                                                            ? 'bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30 shadow-[#D4AF37]/10' 
                                                            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-amber-100'
                                                        : dark 
                                                            ? 'bg-[#151821] border-[#2a2d3e] shadow-sm' 
                                                            : 'bg-white border-stone-200 shadow-sm'
                                                }`}>
                                                    {hasUpdate && (
                                                        <div className="absolute -top-3 -right-3">
                                                            <span className="flex h-6 w-6 relative">
                                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dark ? 'bg-[#D4AF37]' : 'bg-amber-400'}`}></span>
                                                                <span className={`relative inline-flex rounded-full h-6 w-6 border-2 border-white items-center justify-center ${dark ? 'bg-[#D4AF37]' : 'bg-amber-500'}`}>
                                                                    <Sparkles size={12} className="text-white" />
                                                                </span>
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="space-y-1">
                                                            <p className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-stone-400'}`}>Current Version</p>
                                                            <div className="flex items-baseline gap-2">
                                                                <p className={`text-3xl font-serif font-bold ${dark ? 'text-[#e8e6e3]' : 'text-stone-900'}`}>{campaign.templateVersion || "v1.0.0"}</p>
                                                                {hasUpdate && (
                                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${dark ? 'text-[#D4AF37] bg-[#D4AF37]/20' : 'text-amber-600 bg-amber-100'}`}>
                                                                        Update Available
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {hasUpdate && (
                                                            <div className="text-right">
                                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${dark ? 'text-[#D4AF37]' : 'text-amber-500'}`}>Incoming</p>
                                                                <p className={`text-2xl font-serif font-bold ${dark ? 'text-[#D4AF37]' : 'text-amber-600'}`}>{campaign.template.version}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {hasUpdate && campaign.template.updates ? (
                                                        <div className={`rounded-xl p-5 border ${dark ? 'bg-[#0f1119]/60 border-[#D4AF37]/10' : 'bg-white/60 border-amber-100/50'}`}>
                                                            <p className={`text-sm font-bold mb-3 flex items-center gap-2 ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                                                <Scroll size={14} className={dark ? 'text-[#D4AF37]' : 'text-amber-600'} /> Patch Notes
                                                            </p>
                                                            <ul className="space-y-3">
                                                                {campaign.template.updates.map((u: string, i: number) => (
                                                                    <li key={i} className={`text-sm flex items-start gap-3 group/item ${dark ? 'text-gray-400' : 'text-stone-600'}`}>
                                                                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 group-hover/item:scale-125 transition-transform ${dark ? 'bg-[#D4AF37]' : 'bg-amber-400'}`} />
                                                                        <span className={`transition-colors ${dark ? 'group-hover/item:text-[#e8e6e3]' : 'group-hover/item:text-stone-900'}`}>{u}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ) : (
                                                        !hasUpdate && (
                                                            <div className={`flex items-center gap-4 p-4 rounded-xl ${dark ? 'text-gray-400 bg-[#0f1119]' : 'text-stone-500 bg-stone-50'}`}>
                                                                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                                                    <Shield size={20} />
                                                                </div>
                                                                <div className="text-sm">
                                                                    <p className={`font-bold ${dark ? 'text-[#e8e6e3]' : 'text-stone-700'}`}>Up to Date</p>
                                                                    <p className="text-xs opacity-80">This realm is running on the latest stable version.</p>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={`rounded-2xl p-10 text-center border-2 border-dashed ${dark ? 'bg-[#151821] border-[#2a2d3e]' : 'bg-stone-100 border-stone-200'}`}>
                                                    <History size={32} className={`mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-stone-300'}`} />
                                                    <p className={`font-medium ${dark ? 'text-gray-400' : 'text-stone-500'}`}>Custom Realm</p>
                                                    <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-stone-400'}`}>This world follows its own unique path.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'lore' && (
                                        <motion.div
                                            key="lore"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <h3 className={`text-xl font-serif font-bold flex items-center gap-3 mb-6 ${dark ? 'text-[#e8e6e3]' : 'text-stone-900'}`}>
                                                <Scroll size={20} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                                The Archives
                                            </h3>
                                            <div className={`p-8 rounded-2xl border shadow-sm relative overflow-hidden ${dark ? 'bg-[#151821] border-[#2a2d3e]' : 'bg-white border-stone-200'}`}>
                                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                    <Sparkles size={100} />
                                                </div>
                                                <div className="prose prose-stone prose-sm max-w-none">
                                                    <p className={`leading-loose text-base font-serif italic ${dark ? 'text-gray-400' : 'text-stone-600'}`}>
                                                        &ldquo;{campaign.description || "A mysterious realm with no recorded history. The fog of war obscures all but the most immediate surroundings..."}&rdquo;
                                                    </p>
                                                </div>
                                                
                                                {campaign.rules && (
                                                    <div className={`mt-8 pt-6 border-t ${dark ? 'border-[#2a2d3e]' : 'border-stone-100'}`}>
                                                        <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 ${dark ? 'text-gray-500' : 'text-stone-400'}`}>Core Ruleset</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${dark ? 'bg-[#0f1119] text-gray-400 border-[#2a2d3e]' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                                                                Standard 5e
                                                            </span>
                                                            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${dark ? 'bg-[#0f1119] text-gray-400 border-[#2a2d3e]' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                                                                High Magic
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'characters' && (
                                        <motion.div
                                            key="characters"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <h3 className={`text-xl font-serif font-bold flex items-center gap-3 mb-6 ${dark ? 'text-[#e8e6e3]' : 'text-stone-900'}`}>
                                                <Users size={20} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                                Active Roster
                                            </h3>
                                            {campaign.activeCharacters && campaign.activeCharacters.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {campaign.activeCharacters.map((char: Character) => (
                                                        <motion.div 
                                                            whileHover={{ scale: 1.02, y: -2 }}
                                                            key={char._id} 
                                                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group cursor-default ${
                                                                dark 
                                                                    ? 'bg-[#151821] border-[#2a2d3e] hover:border-[#D4AF37]/30 hover:shadow-lg' 
                                                                    : 'bg-white border-stone-200 hover:border-indigo-200 hover:shadow-lg'
                                                            }`}
                                                        >
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-serif font-bold text-lg border shadow-inner transition-colors ${
                                                                dark 
                                                                    ? 'bg-gradient-to-br from-[#1a1d2e] to-[#2a2d3e] text-gray-400 border-[#2a2d3e] group-hover:text-[#D4AF37]' 
                                                                    : 'bg-gradient-to-br from-stone-100 to-stone-200 text-stone-500 border-stone-100 group-hover:text-indigo-600'
                                                            }`}>
                                                                {char.name[0]}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className={`text-base font-bold line-clamp-1 transition-colors ${
                                                                    dark 
                                                                        ? 'text-[#e8e6e3] group-hover:text-[#D4AF37]' 
                                                                        : 'text-stone-900 group-hover:text-indigo-900'
                                                                }`}>{char.name}</div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                                                                        dark 
                                                                            ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20' 
                                                                            : 'text-indigo-500 bg-indigo-50 border-indigo-100'
                                                                    }`}>
                                                                        {char.class}
                                                                    </span>
                                                                    <span className={`text-xs font-medium ${dark ? 'text-gray-500' : 'text-stone-400'}`}>
                                                                        Level {char.level}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={`p-12 text-center rounded-2xl border shadow-sm ${dark ? 'bg-[#151821] border-[#2a2d3e]' : 'bg-white border-stone-200'}`}>
                                                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${dark ? 'bg-[#0f1119]' : 'bg-stone-50'}`}>
                                                        <Users size={32} className={dark ? 'text-gray-600' : 'text-stone-300'} />
                                                    </div>
                                                    <p className={`font-bold text-lg mb-1 ${dark ? 'text-[#e8e6e3]' : 'text-stone-900'}`}>The Realm is Quiet</p>
                                                    <p className={`text-sm mb-6 ${dark ? 'text-gray-500' : 'text-stone-500'}`}>No adventurers have set foot here... yet.</p>
                                                    <Link href={`/play-df/${campaign._id}`}>
                                                        <button className={`text-xs font-bold uppercase tracking-widest hover:underline ${dark ? 'text-[#D4AF37]' : 'text-indigo-600'}`}>
                                                            Be the First Hero
                                                        </button>
                                                    </Link>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Footer Action */}
                            <div className={`p-8 pt-6 border-t flex justify-between items-center backdrop-blur-md rounded-br-[2rem] ${
                                dark 
                                    ? 'border-[#2a2d3e] bg-[#1a1d2e]/80' 
                                    : 'border-stone-200 bg-white/80'
                            }`}>
                                <div className="hidden sm:block">
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${dark ? 'text-gray-500' : 'text-stone-400'}`}>Your Journey</p>
                                    <p className={`text-sm font-bold ${dark ? 'text-[#e8e6e3]' : 'text-stone-900'}`}>Ready to embark?</p>
                                </div>
                                <Link href={`/play-df/${campaign._id}`} className="w-full sm:w-auto">
                                    <button className={`w-full px-10 py-4 rounded-full font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 ${
                                        dark 
                                            ? 'bg-[#D4AF37] hover:bg-[#eac88f] text-[#0f1119] shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30' 
                                            : 'bg-stone-900 hover:bg-black text-white shadow-stone-900/20 hover:shadow-stone-900/30'
                                    }`}>
                                        Enter Realm <Play size={16} fill="currentColor" />
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
