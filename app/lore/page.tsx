"use client";

import React from 'react';
import { Brain, Sparkles, Gamepad2, Scroll, Zap, Globe, Users, Sword, Crown, Map } from 'lucide-react';

// Simple replacement for Next.js Link to ensure compatibility in this environment
const Link = ({ href, children, className }) => (
    <a href={href} className={className}>
        {children}
    </a>
);

export default function LorePage() {
    return (
        <div className="relative min-h-screen bg-[#0c0a09] text-stone-200 font-serif selection:bg-indigo-500/30 overflow-x-hidden">

            {/* --- DUNGEON ATMOSPHERE --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Grain/Texture Overlay (Simulated with patterns) */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                {/* Ambient "Torchlight" Glows */}
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-indigo-950/30 blur-[120px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-900/10 blur-[100px] rounded-full mix-blend-color-dodge"></div>
            </div>

            <main className="relative z-10 pt-40 pb-24 px-6">
                <div className="max-w-5xl mx-auto space-y-32">

                    {/* --- HERO SECTION --- */}
                    <section className="text-center space-y-8 relative">
                        {/* Decorative Divider Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent -z-10"></div>

                        <div className="inline-flex items-center justify-center p-4 relative">
                            <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                            <Scroll className="text-indigo-300 relative z-10 drop-shadow-[0_0_10px_rgba(165,180,252,0.5)]" size={48} />
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold text-stone-100 drop-shadow-lg tracking-tight leading-tight">
                            The Spark of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-300 via-indigo-400 to-indigo-600 filter drop-shadow-[0_0_2px_rgba(99,102,241,0.5)]">Creation</span>
                        </h1>

                        <div className="max-w-2xl mx-auto relative">
                            {/* Quote decoration */}
                            <span className="absolute -top-4 -left-4 text-6xl text-stone-800/50 font-serif">“</span>
                            <p className="text-xl text-stone-400 leading-relaxed italic font-serif">
                                Every world has an origin. Ours was born from a desire to break the static boundaries of traditional gaming and forge something truly alive.
                            </p>
                            <span className="absolute -bottom-8 -right-4 text-6xl text-stone-800/50 font-serif transform rotate-180">“</span>
                        </div>
                    </section>

                    {/* --- THE VISION (ARCANE INTELLIGENCE) --- */}
                    <section className="grid md:grid-cols-12 gap-12 items-center">
                        <div className="md:col-span-5 space-y-8 order-2 md:order-1">
                            <div className="space-y-4 border-l-2 border-indigo-500/30 pl-6">
                                <h2 className="text-3xl md:text-4xl font-bold text-stone-100">
                                    The Ghost in <br /><span className="text-indigo-400">The Machine</span>
                                </h2>
                                <p className="text-sm font-sans text-indigo-300/70 tracking-widest uppercase">
                                    The Dungeon Master's Mind
                                </p>
                            </div>
                            <div className="space-y-6 text-stone-400 leading-relaxed text-lg font-medium">
                                <p>
                                    We were inspired by a new wave of games where the world doesn't just react—it <span className="text-stone-200 decoration-indigo-500/50 underline underline-offset-4 decoration-2">thinks</span>. Traditional RPGs rely on pre-written scripts and static trees.
                                </p>
                                <p>
                                    We wanted to harness the raw, chaotic potential of Artificial Intelligence to create a <strong className="text-indigo-300">Dungeon Master that never sleeps</strong>.
                                </p>
                            </div>
                        </div>

                        {/* Decorative "Magic Item" Visual */}
                        <div className="md:col-span-7 relative order-1 md:order-2 group">
                            <div className="absolute inset-4 bg-indigo-600/10 blur-3xl rounded-full opacity-40 group-hover:opacity-60 transition-opacity duration-1000"></div>

                            {/* The "Artifact" Container */}
                            <div className="relative bg-[#110f0e] border-2 border-stone-800 p-1 rounded-xl shadow-2xl transform transition-transform duration-500 group-hover:scale-[1.01] group-hover:border-indigo-500/30">
                                <div className="border border-stone-800 rounded-lg p-8 relative overflow-hidden h-[400px] flex flex-col items-center justify-center text-center bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">

                                    {/* Background Runes */}
                                    <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                                        <Brain size={300} strokeWidth={0.5} />
                                    </div>

                                    {/* Glowing Orb / Core */}
                                    <div className="relative z-10 mb-8">
                                        <div className="w-24 h-24 rounded-full bg-indigo-950 border-4 border-stone-700 shadow-[0_0_50px_rgba(99,102,241,0.3)] flex items-center justify-center relative overflow-hidden group-hover:shadow-[0_0_80px_rgba(99,102,241,0.5)] transition-all duration-700">
                                            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500 to-transparent opacity-50 animate-pulse"></div>
                                            <Brain className="text-indigo-200 relative z-10" size={40} />
                                        </div>
                                    </div>

                                    <div className="relative z-10 space-y-2 max-w-xs mx-auto">
                                        <p className="font-serif italic text-indigo-200 text-lg">"The lore isn't just history written in a book..."</p>
                                        <div className="h-px w-12 bg-indigo-500/50 mx-auto my-4"></div>
                                        <p className="text-sm text-stone-500 font-sans uppercase tracking-widest">Construct Active</p>
                                    </div>

                                    {/* Corner Ornaments */}
                                    <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-stone-600"></div>
                                    <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-stone-600"></div>
                                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-stone-600"></div>
                                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-stone-600"></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* --- INTERACTIVITY (THE PARTY) --- */}
                    <section className="grid md:grid-cols-12 gap-12 items-center">
                        <div className="md:col-span-7 relative">
                            {/* Grid of "Cards" / Inventory Slots */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: Map, label: "The World", sub: "Infinite", color: "text-emerald-400", bg: "bg-emerald-950/20", border: "border-emerald-900/50" },
                                    { icon: Users, label: "NPCs", sub: "Living", color: "text-amber-400", bg: "bg-amber-950/20", border: "border-amber-900/50" },
                                    { icon: Zap, label: "Events", sub: "Dynamic", color: "text-indigo-400", bg: "bg-indigo-950/20", border: "border-indigo-900/50" },
                                    { icon: Crown, label: "You", sub: "The Hero", color: "text-purple-400", bg: "bg-purple-950/20", border: "border-purple-900/50" }
                                ].map((item, idx) => (
                                    <div key={idx} className={`group relative p-6 rounded-lg border ${item.border} bg-[#131110] hover:bg-[#1a1816] transition-all duration-300 shadow-lg hover:-translate-y-1`}>
                                        {/* Card Inner Border */}
                                        <div className="absolute inset-1 border border-stone-800/50 rounded pointer-events-none"></div>

                                        <div className="flex flex-col items-center text-center gap-3 relative z-10">
                                            <div className={`p-3 rounded-full ${item.bg} ${item.color} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                                                <item.icon size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-stone-200 font-serif font-bold tracking-wide">{item.label}</h4>
                                                <span className="text-xs font-sans text-stone-500 uppercase tracking-wider font-bold">{item.sub}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-5 space-y-8">
                            <div className="space-y-4 border-l-2 border-amber-500/30 pl-6">
                                <h2 className="text-3xl md:text-4xl font-bold text-stone-100">
                                    True <span className="text-amber-500">Agency</span>
                                </h2>
                                <p className="text-sm font-sans text-amber-500/70 tracking-widest uppercase">
                                    Consequence & Fate
                                </p>
                            </div>
                            <div className="space-y-6 text-stone-400 leading-relaxed text-lg">
                                <p>
                                    Interactivity shouldn't just be pressing 'F' to pay respects. We built DragonForge to be a sandbox where your actions ripple outwards.
                                </p>
                                <p className="italic text-stone-300 border-l-2 border-stone-700 pl-4">
                                    "Save a village? It might grow into a city. Burn a forest? You might awaken an ancient elemental."
                                </p>
                                <p>
                                    The story isn't ours to tell anymore—it's <span className="text-stone-100 font-bold border-b border-amber-500/50">yours</span>.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* --- CTA (QUEST BOARD) --- */}
                    <section className="relative pt-16 pb-16">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-transparent rounded-3xl -z-10"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

                        <div className="text-center space-y-8">
                            <h3 className="text-3xl md:text-5xl font-bold text-stone-200 drop-shadow-md">
                                Ready to write your own <span className="text-indigo-400">legend</span>?
                            </h3>
                            <p className="text-stone-500 max-w-lg mx-auto">The tavern is open, the party is gathering, and the dice are waiting to be rolled.</p>

                            <div>
                                <Link href="/sign-up" className="group relative inline-flex items-center gap-3 px-12 py-5 bg-indigo-900 text-indigo-100 font-bold rounded hover:bg-indigo-800 transition-all border border-indigo-500 overflow-hidden shadow-[0_0_20px_rgba(67,56,202,0.3)]">
                                    {/* Button Shine Effect */}
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>

                                    <Sword size={20} className="group-hover:rotate-45 transition-transform duration-300" />
                                    <span className="uppercase tracking-widest text-sm">Enter the Realm</span>
                                </Link>
                            </div>
                        </div>
                    </section>

                </div>
            </main>


        </div>
    );
}