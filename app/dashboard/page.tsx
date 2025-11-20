"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Link from 'next/link';
import { 
    Loader2, Sword, Shield, Map, User, Plus, Scroll, 
    FlaskConical, Skull, Sparkles, Crown, Gem, ChevronRight,
    BookOpen, Search, Bell, Feather, Settings, LogOut, LayoutDashboard
} from 'lucide-react';

export default function UserDashboard() {
    const { user, loading: authLoading } = useAuth();
    
    // Real Data Fetching
    const myCampaigns = useQuery(api.forge.getMyCampaigns);
    // @ts-ignore
    const playedCampaigns = useQuery(api.forge.getPlayedCampaigns);
    const myCharacters = useQuery(api.forge.getMyCharacters);
    const myItems = useQuery(api.forge.getMyItems);
    const mySpells = useQuery(api.forge.getMySpells);

    const dataLoading = !myCampaigns || !playedCampaigns || !myCharacters || !myItems || !mySpells;
    const [showLoadingScreen, setShowLoadingScreen] = useState(true);

    useEffect(() => {
        // Artificial delay to show the cool loading animation if data loads too fast
        const timer = setTimeout(() => setShowLoadingScreen(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const isLoading = authLoading || dataLoading || showLoadingScreen;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0908] flex items-center justify-center flex-col gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse" />
                    <Loader2 className="w-12 h-12 text-indigo-400 animate-spin relative z-10" />
                </div>
                <p className="text-stone-500 font-serif tracking-widest uppercase text-sm font-bold">Consulting the Archives...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0908] text-stone-200 font-sans flex overflow-hidden selection:bg-indigo-500/30 relative">
            
            {/* Ambient Background Effects */}
            <div className="fixed top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-900/10 rounded-full blur-[128px] pointer-events-none mix-blend-screen z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-900/10 rounded-full blur-[128px] pointer-events-none mix-blend-screen z-0" />
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none z-0" />

            {/* --- LEFT SIDEBAR: The Binding --- */}
            <aside className="w-72 bg-[#0f0e0d]/95 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-20 shadow-2xl">
                
                {/* Brand */}
                <div className="p-8 border-b border-white/5 relative">
                    <Link href="/" className="flex items-center gap-3 text-indigo-400 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur opacity-50 animate-pulse" />
                            <Sword className="w-8 h-8 rotate-45 relative z-10 group-hover:rotate-12 transition-transform" strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-serif font-black tracking-tighter uppercase text-white">Forge</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-6 space-y-2 relative">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 pl-3">Grimoire</p>
                    
                    <NavItem href="/dashboard" active={true} icon={<LayoutDashboard size={20} />} label="Overview" />
                    <NavItem href="/forge" active={false} icon={<Map size={20} />} label="Campaigns" />
                    <NavItem href="/roster" active={false} icon={<User size={20} />} label="Heroes" />
                    <NavItem href="/artifacts" active={false} icon={<Gem size={20} />} label="Artifacts" />
                    <NavItem href="/spellbook" active={false} icon={<Scroll size={20} />} label="Spellbook" />
                </nav>

                {/* User Profile Snippet */}
                <div className="p-6 bg-white/5 border-t border-white/5 relative group cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px]">
                            <div className="w-full h-full rounded-full bg-[#0a0908] flex items-center justify-center font-bold text-white">
                                {user?.firstName?.[0] || "U"}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-stone-200 truncate group-hover:text-white">{user?.firstName || "Traveler"}</p>
                            <p className="text-xs text-stone-500 truncate">Grand Archivist</p>
                        </div>
                        <Settings size={18} className="text-stone-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                </div>
            </aside>


            {/* --- MAIN CONTENT: The Pages --- */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">

                {/* Top Bar */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0908]/80 backdrop-blur-sm sticky top-0 z-30">
                    <div className="flex items-center gap-4 text-stone-400">
                        <h1 className="text-2xl font-serif font-bold text-white">Guild Ledger</h1>
                        <span className="h-6 w-px bg-white/10" />
                        <span className="text-sm italic text-stone-500 font-mono">Day {new Date().getDate()} of the Sun Month</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="relative group hidden md:block">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                            <input 
                                type="text" 
                                placeholder="Search archives..." 
                                className="relative pl-10 pr-4 py-2 bg-stone-900/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 placeholder-stone-600 text-stone-300 transition-all w-64 font-sans"
                            />
                            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                        <button className="relative text-stone-400 hover:text-white transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        </button>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
                    
                    {/* Stats Ledger */}
                    <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <LedgerCard label="Active Quests" value={playedCampaigns.length} icon={<Shield />} color="text-indigo-400" />
                        <LedgerCard label="Heroes" value={myCharacters.length} icon={<User />} color="text-emerald-400" />
                        <LedgerCard label="Relics Found" value={myItems.length} icon={<Gem />} color="text-amber-400" />
                        <LedgerCard label="Spells Known" value={mySpells.length} icon={<FlaskConical />} color="text-purple-400" />
                    </section>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                        
                        {/* Main Column */}
                        <div className="xl:col-span-2 space-y-10">
                            
                            {/* Active Campaigns */}
                            <section>
                                <div className="flex items-end justify-between mb-6 border-b border-white/5 pb-4">
                                    <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                                        <Map className="text-indigo-400" size={20} />
                                        My Adventures
                                    </h2>
                                </div>
                                {playedCampaigns.length === 0 ? (
                                    <div className="p-8 border border-dashed border-stone-800 rounded-xl text-center text-stone-500">
                                        <p>You are not participating in any campaigns yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {playedCampaigns.map((data: any) => (
                                            <Link href={`/play/${data._id}`} key={data._id} className="group relative overflow-hidden bg-stone-900/40 border border-white/5 hover:border-indigo-500/30 rounded-xl p-6 transition-all hover:bg-stone-900/60 block">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors" />
                                                
                                                {/* Header */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-stone-200 group-hover:text-white transition-colors">{data.title}</h3>
                                                        <p className="text-sm text-stone-500 italic line-clamp-1">"{data.description}"</p>
                                                    </div>
                                                    <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">Active</span>
                                                </div>

                                                {/* Character & Items Grid */}
                                                <div className="grid md:grid-cols-2 gap-6 mt-6">
                                                    {/* Character Info */}
                                                    <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                                                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <User size={12} /> Hero
                                                        </p>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                                                                {data.character?.name?.[0] || "?"}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-stone-200">{data.character?.name || "Unknown Hero"}</p>
                                                                <p className="text-xs text-stone-500">Level {data.character?.level || 1} {data.character?.class || "Adventurer"}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Items Inventory */}
                                                    <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                                                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Gem size={12} /> Loot ({data.items?.length || 0})
                                                        </p>
                                                        {(!data.items || data.items.length === 0) ? (
                                                            <p className="text-xs text-stone-600 italic">No items collected yet.</p>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2">
                                                                {data.items.slice(0, 5).map((item: any) => (
                                                                    <div 
                                                                        key={item._id} 
                                                                        className="px-2 py-1 bg-stone-800/50 border border-white/10 rounded text-xs text-stone-300 truncate max-w-[150px]"
                                                                        title={item.name}
                                                                    >
                                                                        {item.name}
                                                                    </div>
                                                                ))}
                                                                {data.items.length > 5 && (
                                                                    <span className="px-2 py-1 bg-stone-800/50 border border-white/10 rounded text-xs text-stone-500">
                                                                        +{data.items.length - 5} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end mt-4 text-xs font-sans text-stone-400 gap-4">
                                                    <span className="hover:text-indigo-400 transition-colors flex items-center gap-1">Enter World <ChevronRight size={12} /></span>
                                                </div>
                                                
                                                {/* Hover shine */}
                                                <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:animate-shine pointer-events-none" />
                                            </Link>
                                        ))}
                                        
                                        {/* Find New Adventure Button */}
                                        <Link href="/forge/create/campaign" className="border border-dashed border-stone-800 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-stone-600 hover:bg-white/5 hover:border-indigo-500/30 hover:text-indigo-400 transition-all group">
                                            <div className="w-12 h-12 rounded-full bg-stone-900 flex items-center justify-center group-hover:scale-110 transition-transform border border-stone-800 group-hover:border-indigo-500/30">
                                                <Search size={20} />
                                            </div>
                                            <span className="font-bold text-sm">Find New Adventure</span>
                                        </Link>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Sidebar Column */}
                        <div className="space-y-8">
                            
                            {/* Rankings Widget (Replaces Hero Roster) */}
                            <div className="bg-stone-900/40 backdrop-blur-md p-6 border border-white/5 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-tr-xl pointer-events-none" />
                                
                                <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2 text-white">
                                    <Crown size={18} className="text-amber-400" /> Creator Rankings
                                </h3>
                                <div className="space-y-3">
                                    {/* Current User Rank Mock */}
                                    <div className="flex items-center gap-3 p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg">
                                        <div className="font-black text-2xl text-amber-500 w-8 text-center">3</div>
                                        <div>
                                            <p className="font-bold text-sm text-white">You</p>
                                            <p className="text-xs text-stone-400">{myCampaigns.length} Realms • {myCampaigns.reduce((acc:number, c:any) => acc + (c.playerCount||0), 0)} Players</p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-center pt-2">
                                        <p className="text-[10px] text-stone-500 uppercase tracking-widest">Global Leaderboard Coming Soon</p>
                                    </div>
                                </div>
                            </div>

                             {/* Quick Actions / Tools */}
                             <div className="bg-gradient-to-br from-stone-900 to-[#0a0908] border border-white/10 p-6 rounded-xl shadow-lg relative overflow-hidden group">
                                <div className="absolute -right-10 -top-10 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors duration-700">
                                    <Sparkles size={150} strokeWidth={1} />
                                </div>
                                <h3 className="text-lg font-serif font-bold mb-2 relative z-10 text-white">The Forge</h3>
                                <p className="text-xs text-stone-400 mb-6 relative z-10 leading-relaxed max-w-[80%]">
                                    Craft new items, scribe spells, or generate encounters instantly.
                                </p>
                                <div className="grid grid-cols-2 gap-3 relative z-10">
                                    <ToolBtn href="/forge/create/item" label="Item" icon={<Sword size={14} />} color="hover:border-amber-500/50 hover:text-amber-400" />
                                    <ToolBtn href="/forge/create/spell" label="Spell" icon={<Scroll size={14} />} color="hover:border-purple-500/50 hover:text-purple-400" />
                                    <ToolBtn href="/forge/create/character" label="Hero" icon={<User size={14} />} color="hover:border-emerald-500/50 hover:text-emerald-400" />
                                    <ToolBtn href="/forge/create/campaign" label="Realm" icon={<Map size={14} />} color="hover:border-blue-500/50 hover:text-blue-400" />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// --- Components ---

const NavItem = ({ active, icon, label, href }: { active: boolean, icon: any, label: string, href: string }) => (
    <Link 
        href={href}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden ${
            active 
            ? 'bg-white/5 text-white shadow-lg border border-white/5' 
            : 'text-stone-500 hover:bg-white/5 hover:text-stone-300'
        }`}
    >
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />}
        <div className={`${active ? 'text-indigo-400' : 'text-stone-600 group-hover:text-stone-400'}`}>
            {icon}
        </div>
        <span className="font-bold text-sm tracking-wide">{label}</span>
        {active && <ChevronRight size={14} className="ml-auto text-indigo-400" />}
    </Link>
);

const LedgerCard = ({ label, value, icon, color }: { label: string, value: number, icon: any, color: string }) => (
    <div className="bg-stone-900/40 backdrop-blur-sm p-5 border border-white/5 rounded-xl flex items-center gap-4 hover:bg-stone-900/60 transition-colors group">
        <div className={`w-12 h-12 rounded-xl bg-stone-950 border border-white/5 flex items-center justify-center ${color} shadow-inner group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider group-hover:text-stone-400 transition-colors">{label}</p>
        </div>
    </div>
);

const ToolBtn = ({ label, icon, color, href }: { label: string, icon: any, color?: string, href: string }) => (
    <Link href={href} className={`flex items-center justify-center gap-2 bg-stone-950 border border-white/10 py-3 rounded-lg text-xs font-bold text-stone-400 transition-all hover:bg-stone-900 hover:shadow-lg ${color}`}>
        {icon} {label}
    </Link>
);
