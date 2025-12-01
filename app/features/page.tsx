"use client";

import React, { useEffect, useState } from 'react';
import { Map, Sword, Star, ArrowRight, Sparkles, Ghost, Skull, Flame, Shield, Play } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function FeaturesPage() {
    // Initialize state for client-side rendering
    const [mounted, setMounted] = useState(false);
    const campaigns = useQuery(api.forge.getAllCampaigns);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Return skeleton/loading state if not mounted or loading
    if (!mounted) return <div className="min-h-screen bg-stone-950" />;

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-indigo-900 selection:text-white pt-20">

            {/* --- HERO SECTION --- */}
            <section className="relative py-20 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-stone-950 to-stone-950 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto text-center relative z-10 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-4">
                        <Sparkles size={16} />
                        <span>Community Showcase</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-serif font-bold text-white tracking-tight">
                        Explore the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Multiverse</span>
                    </h1>
                    <p className="text-xl text-stone-400 max-w-2xl mx-auto leading-relaxed">
                        Discover worlds forged by fellow travelers. From floating citadels to infinite dungeons, the only limit is your imagination.
                    </p>
                </div>
            </section>

            {/* --- FEATURED REALMS --- */}
            <section className="py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-12">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
                                <Map className="text-emerald-500" />
                                Featured Realms
                            </h2>
                            <p className="text-stone-500">Entire worlds waiting to be explored.</p>
                        </div>
                        <button className="text-indigo-400 hover:text-white font-medium flex items-center gap-2 transition-colors">
                            View All <ArrowRight size={16} />
                        </button>
                    </div>

                    {!campaigns ? (
                        <div className="grid md:grid-cols-3 gap-8 animate-pulse">
                             {[1, 2, 3].map(i => (
                                 <div key={i} className="h-80 bg-stone-900 rounded-xl border border-stone-800"></div>
                             ))}
                        </div>
                    ) : campaigns.length === 0 ? (
                         <div className="text-center py-20 border border-dashed border-stone-800 rounded-xl">
                             <p className="text-stone-500">No realms found. Be the first to forge one!</p>
                             <Link href="/forge" className="text-indigo-400 mt-2 inline-block hover:underline">Go to Forge</Link>
                         </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8">
                            {campaigns.map((campaign) => (
                                <div key={campaign._id} className={`group relative bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:border-indigo-500/50`}>
                                    <div className={`h-48 bg-stone-900 flex items-center justify-center relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                                        <Map size={64} className="text-white/20 group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{campaign.title}</h3>
                                            <p className="text-sm text-stone-500">XP Rate: <span className="text-stone-300">{campaign.xpRate}x</span></p>
                                        </div>
                                        <p className="text-stone-400 text-sm leading-relaxed line-clamp-3 min-h-[60px]">{campaign.description}</p>
                                        <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                                                <Star size={12} fill="currentColor" /> New
                                            </div>
                                            <Link href={`/play-df/${campaign._id}`} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors flex items-center gap-2">
                                                <Play size={12} fill="currentColor" />
                                                ENTER REALM
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* --- DUNGEONS --- */}
            <section className="py-16 px-6 bg-stone-900/30 border-y border-stone-900">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-12">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
                                <Skull className="text-purple-500" />
                                Deadly Dungeons
                            </h2>
                            <p className="text-stone-500">Short adventures for the brave.</p>
                        </div>
                        <button className="text-indigo-400 hover:text-white font-medium flex items-center gap-2 transition-colors">
                            View All <ArrowRight size={16} />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { title: "Crypt of the Lich", level: "Lvl 10-12", type: "Undead", icon: Ghost, color: "text-purple-400" },
                            { title: "Goblin Warrens", level: "Lvl 1-3", type: "Horde", icon: Shield, color: "text-emerald-400" },
                            { title: "Molten Core", level: "Lvl 15+", type: "Elemental", icon: Flame, color: "text-orange-400" },
                            { title: "The Void", level: "Lvl ???", type: "Cosmic", icon: Sparkles, color: "text-indigo-400" },
                        ].map((dungeon, i) => (
                            <div key={i} className="bg-stone-950 border border-stone-800 p-6 rounded-lg hover:border-stone-600 transition-colors group cursor-pointer">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg bg-stone-900 ${dungeon.color}`}>
                                        <dungeon.icon size={24} />
                                    </div>
                                    <span className="px-2 py-1 bg-stone-900 text-stone-500 text-[10px] font-bold uppercase tracking-wider rounded border border-stone-800">
                                        {dungeon.type}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-stone-200 group-hover:text-white mb-1">{dungeon.title}</h3>
                                <p className="text-xs text-stone-500 font-mono">{dungeon.level}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CREATE CTA --- */}
            <section className="py-24 px-6 text-center">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-4xl font-serif font-bold text-white">
                        Have a world in <span className="text-indigo-500">your</span> mind?
                    </h2>
                    <p className="text-stone-400 text-lg">
                        The forge is open. Create your own realm, populate it with life, and share it with the multiverse.
                    </p>
                    <a href="/sign-up" className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] hover:-translate-y-1 transition-all">
                        <Sword size={20} />
                        Start Forging Now
                    </a>
                </div>
            </section>

        </div>
    );
}