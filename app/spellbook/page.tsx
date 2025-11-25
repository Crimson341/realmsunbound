"use client";

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { Loader2, BookOpen, Flame, Sparkles, Skull, Eye, Shield, Zap, Search, Filter, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SpellbookPage() {
    const { user } = useAuth();
    const spells = useQuery(api.forge.getMySpells);
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');

    if (!spells) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-[#0f1119]' : 'bg-stone-950'}`}>
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    // Unique Schools for Filter
    const schools = ['All', ...new Set(spells.map(s => s.school).filter(Boolean))];

    const filteredSpells = spells.filter(spell => {
        const matchesSearch = spell.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || spell.school === filter;
        return matchesSearch && matchesFilter;
    });

    
    return (
        <div className={`min-h-screen font-serif pt-24 px-6 pb-20 ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-stone-950 text-stone-200'}`}>
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className={`p-2 rounded-full transition-colors ${dark ? 'bg-[#1a1d2e] hover:bg-[#252838] text-gray-400' : 'bg-stone-900 hover:bg-stone-800 text-stone-400'}`}>
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white flex items-center gap-3">
                                <BookOpen className={dark ? 'text-[#D4AF37]' : 'text-purple-500'} size={40} />
                                Grimoire
                            </h1>
                            <p className={`mt-2 font-sans ${dark ? 'text-gray-500' : 'text-stone-400'}`}>
                                The collected arcane knowledge of {user?.firstName || 'the Archmage'}.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto font-sans">
                        <div className="relative group flex-1 md:w-64">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${dark ? 'text-gray-600 group-focus-within:text-[#D4AF37]' : 'text-stone-500 group-focus-within:text-purple-400'}`} size={18} />
                            <input 
                                type="text" 
                                placeholder="Search incantations..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`w-full border rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none transition-all ${
                                    dark 
                                        ? 'bg-[#1a1d2e]/50 border-[#2a2d3e] focus:border-[#D4AF37] placeholder:text-gray-600' 
                                        : 'bg-stone-900/50 border-stone-800 focus:border-purple-500 placeholder:text-stone-600'
                                }`}
                            />
                        </div>
                        <div className="relative">
                            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-600' : 'text-stone-500'}`} size={18} />
                            <select 
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className={`border rounded-full py-2 pl-10 pr-8 text-sm focus:outline-none appearance-none cursor-pointer transition-colors ${
                                    dark 
                                        ? 'bg-[#1a1d2e]/50 border-[#2a2d3e] focus:border-[#D4AF37] hover:bg-[#1a1d2e]' 
                                        : 'bg-stone-900/50 border-stone-800 focus:border-purple-500 hover:bg-stone-900'
                                }`}
                            >
                                {schools.map(s => <option key={s} value={s}>{s} School</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Spell Grid */}
                {filteredSpells.length === 0 ? (
                    <div className={`text-center py-20 border-2 border-dashed rounded-xl ${dark ? 'border-[#2a2d3e] bg-[#1a1d2e]/20' : 'border-stone-800 bg-stone-900/20'}`}>
                        <BookOpen className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-stone-700'}`} />
                        <h3 className={`text-xl font-bold mb-2 ${dark ? 'text-gray-400' : 'text-stone-400'}`}>The Pages are Blank</h3>
                        <p className={`mb-6 font-sans ${dark ? 'text-gray-500' : 'text-stone-500'}`}>You haven&apos;t inscribed any spells matching these criteria.</p>
                        <Link href="/forge/create/spell" className={`inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-bold font-sans transition-all ${dark ? 'bg-[#D4AF37] hover:bg-[#eac88f]' : 'bg-purple-600 hover:bg-purple-500'}`}>
                            <Sparkles size={18} /> Inscribe New Spell
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredSpells.map((spell) => (
                            <SpellCard key={spell._id} spell={spell} dark={dark} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpellCard = ({ spell, dark }: { spell: any, dark: boolean }) => {
    const getIcon = (school: string) => {
        const s = school?.toLowerCase() || '';
        if (s.includes('evocation')) return <Flame className="text-red-400" />;
        if (s.includes('necromancy')) return <Skull className="text-green-400" />;
        if (s.includes('divination')) return <Eye className="text-blue-400" />;
        if (s.includes('abjuration')) return <Shield className="text-yellow-400" />;
        if (s.includes('illusion')) return <Sparkles className="text-pink-400" />;
        return <Zap className={dark ? 'text-[#D4AF37]' : 'text-purple-400'} />;
    };

    return (
        <div className={`group relative border rounded-xl p-1 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col ${
            dark 
                ? 'bg-[#1a1d2e] border-[#2a2d3e] hover:border-[#D4AF37]/50 hover:shadow-[0_10px_30px_-10px_rgba(212,175,55,0.2)]' 
                : 'bg-stone-900 border-stone-800 hover:border-purple-500/50 hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.2)]'
        }`}>
            {/* Card Content */}
            <div className={`rounded-lg p-5 h-full flex flex-col relative overflow-hidden ${dark ? 'bg-[#0f1119]' : 'bg-stone-950'}`}>
                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <img src="/artifact-tome.svg" className="w-20 h-20 invert" alt="" />
                </div>

                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className={`p-3 rounded-lg border transition-colors ${
                        dark 
                            ? 'bg-[#1a1d2e] border-[#2a2d3e] group-hover:border-[#D4AF37]/30' 
                            : 'bg-stone-900 border-stone-800 group-hover:border-purple-500/30'
                    }`}>
                        {getIcon(spell.school)}
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wider border px-2 py-1 rounded ${
                        dark 
                            ? 'text-gray-500 border-[#2a2d3e] bg-[#1a1d2e]' 
                            : 'text-stone-500 border-stone-800 bg-stone-900'
                    }`}>
                        Lvl {spell.level}
                    </div>
                </div>

                <h3 className={`text-xl font-bold mb-1 font-serif transition-colors ${dark ? 'text-white group-hover:text-[#D4AF37]' : 'text-white group-hover:text-purple-400'}`}>{spell.name}</h3>
                <div className={`text-xs font-bold mb-4 uppercase tracking-wide ${dark ? 'text-[#D4AF37]' : 'text-purple-400'}`}>{spell.school}</div>

                <div className={`grid grid-cols-2 gap-2 mb-4 text-xs font-sans ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                    <div className={`p-2 rounded border ${dark ? 'bg-[#1a1d2e]/50 border-[#2a2d3e]/50' : 'bg-stone-900/50 border-stone-800/50'}`}>
                        <span className={`block uppercase text-[10px] ${dark ? 'text-gray-600' : 'text-stone-600'}`}>Time</span>
                        {spell.castingTime}
                    </div>
                    <div className={`p-2 rounded border ${dark ? 'bg-[#1a1d2e]/50 border-[#2a2d3e]/50' : 'bg-stone-900/50 border-stone-800/50'}`}>
                        <span className={`block uppercase text-[10px] ${dark ? 'text-gray-600' : 'text-stone-600'}`}>Range</span>
                        {spell.range}
                    </div>
                    <div className={`p-2 rounded border ${dark ? 'bg-[#1a1d2e]/50 border-[#2a2d3e]/50' : 'bg-stone-900/50 border-stone-800/50'}`}>
                        <span className={`block uppercase text-[10px] ${dark ? 'text-gray-600' : 'text-stone-600'}`}>Duration</span>
                        {spell.duration}
                    </div>
                    <div className={`p-2 rounded border ${dark ? 'bg-[#1a1d2e]/50 border-[#2a2d3e]/50' : 'bg-stone-900/50 border-stone-800/50'}`}>
                        <span className={`block uppercase text-[10px] ${dark ? 'text-gray-600' : 'text-stone-600'}`}>Comp</span>
                        {spell.components || 'V, S'}
                    </div>
                </div>

                <p className={`text-sm font-sans leading-relaxed line-clamp-4 mb-4 flex-grow ${dark ? 'text-gray-400' : 'text-stone-400'}`}>
                    {spell.description}
                </p>

                {/* Footer Stats */}
                {(spell.damageDice || spell.save) && (
                    <div className={`mt-auto pt-4 border-t flex items-center justify-between text-xs font-sans font-bold ${dark ? 'border-[#1a1d2e]' : 'border-stone-900'}`}>
                        {spell.damageDice && (
                            <span className="text-red-400 flex items-center gap-1">
                                <Flame size={12} /> {spell.damageDice} {spell.damageType}
                            </span>
                        )}
                        {spell.save && (
                            <span className="text-yellow-400 flex items-center gap-1">
                                <Shield size={12} /> {spell.save} Save
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
