/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { Loader2, Gem, Shield, Sword, Search, Filter, ArrowLeft, Box, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ArtifactsPage() {
    const { user } = useAuth();
    const items = useQuery(api.forge.getMyItems);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');

    if (!items) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
        );
    }

    // Rarities for Filter
    const rarities = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact'];

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || item.rarity === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-serif pt-24 px-6 pb-20">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 rounded-full bg-stone-900 hover:bg-stone-800 transition-colors text-stone-400">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white flex items-center gap-3">
                                <Gem className="text-amber-500" size={40} />
                                The Vault
                            </h1>
                            <p className="text-stone-400 mt-2 font-sans">
                                Artifacts and curiosities collected by {user?.firstName || 'the Curator'}.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto font-sans">
                        <div className="relative group flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-amber-400 transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search artifacts..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-stone-900/50 border border-stone-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-amber-500 transition-all placeholder:text-stone-600"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                            <select 
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-stone-900/50 border border-stone-800 rounded-full py-2 pl-10 pr-8 text-sm focus:outline-none focus:border-amber-500 appearance-none cursor-pointer hover:bg-stone-900 transition-colors"
                            >
                                {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Item Grid */}
                {filteredItems.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-stone-800 rounded-xl bg-stone-900/20">
                        <Box className="w-16 h-16 mx-auto mb-4 text-stone-700" />
                        <h3 className="text-xl text-stone-400 font-bold mb-2">The Vault is Empty</h3>
                        <p className="text-stone-500 mb-6 font-sans">No artifacts found matching your search.</p>
                        <Link href="/forge/create/item" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold font-sans transition-all">
                            <Sparkles size={18} /> Forge New Item
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item) => (
                            <ArtifactCard key={item._id} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const ArtifactCard = ({ item }: { item: any }) => {
    const getRarityColor = (rarity: string) => {
        const r = rarity?.toLowerCase() || '';
        if (r === 'common') return 'border-stone-600 text-stone-400 shadow-stone-500/10';
        if (r === 'uncommon') return 'border-green-600 text-green-400 shadow-green-500/10';
        if (r === 'rare') return 'border-blue-600 text-blue-400 shadow-blue-500/10';
        if (r === 'epic') return 'border-purple-600 text-purple-400 shadow-purple-500/10';
        if (r === 'legendary') return 'border-amber-500 text-amber-500 shadow-amber-500/10';
        return 'border-stone-800 text-stone-500';
    };

    const getIcon = (type: string) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('weapon')) return <Sword size={24} />;
        if (t.includes('armor')) return <Shield size={24} />;
        if (t.includes('consumable')) return <Sparkles size={24} />;
        return <Box size={24} />;
    };

    const rarityClass = getRarityColor(item.rarity);

    return (
        <div className={`group relative bg-stone-950 border-2 rounded-xl p-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${rarityClass.replace('text-', 'hover:shadow-').replace('border-', 'hover:border-')} border-stone-800 h-full flex flex-col`}>
            
            <div className="bg-stone-900/50 rounded-lg p-5 h-full flex flex-col relative overflow-hidden">
                
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-stone-950 rounded-lg border border-stone-800 ${rarityClass.split(' ')[1]}`}>
                        {getIcon(item.type)}
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border bg-stone-950 ${rarityClass.split(' ')[0]} ${rarityClass.split(' ')[1]}`}>
                        {item.rarity}
                    </div>
                </div>

                <h3 className={`text-xl font-bold mb-1 font-serif transition-colors ${rarityClass.split(' ')[1]} group-hover:brightness-125`}>
                    {item.name}
                </h3>
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-4">{item.type}</div>

                {/* Mechanics */}
                {item.effects && (
                     <div className="mb-4 p-3 bg-stone-950/80 rounded border border-stone-800/50 text-xs font-sans text-stone-300">
                        <span className="block text-stone-600 uppercase text-[10px] font-bold mb-1">Effect</span>
                        {item.effects}
                     </div>
                )}

                <p className="text-sm text-stone-400 font-sans leading-relaxed line-clamp-4 mb-4 flex-grow italic">
                    "{item.description}"
                </p>

                {/* Footer */}
                <div className="mt-auto pt-4 border-t border-stone-800 flex items-center justify-between text-xs font-sans font-bold text-stone-500">
                    <span>{item.usage || 'Passive'}</span>
                    {item.requirements && (
                        <span className="text-stone-600 flex items-center gap-1">
                             req: {item.requirements}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
