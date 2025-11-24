'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Link from 'next/link';
import { 
    Shield, Map, User, Plus, Scroll, 
    Sparkles, Crown, Gem, ChevronRight, Bell, 
    Settings, LayoutDashboard, Star, Compass, Zap
} from 'lucide-react';

// --- TYPES ---
interface Character {
    name?: string;
    level?: number;
    element?: string;
}

interface Campaign {
    _id: string;
    title: string;
    description?: string;
    xpRate?: number;
    character?: Character;
    creatorName?: string;
}

// --- ASSETS & ICONS ---
const ElementIcon = ({ element }: { element?: string }) => {
    const colors: Record<string, string> = {
        Electro: "text-purple-500",
        Dendro: "text-green-500",
        Pyro: "text-orange-500",
        Hydro: "text-blue-500",
        Cryo: "text-cyan-400",
        Geo: "text-yellow-500",
        Anemo: "text-teal-400"
    };
    return <Zap className={`${(element && colors[element]) || 'text-gray-400'} drop-shadow-sm`} size={14} fill="currentColor" />;
};

// --- DECORATIVE COMPONENTS ---
const GoldDivider = () => (
    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent my-2" />
);

const StarPattern = () => (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
         style={{ 
             backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)', 
             backgroundSize: '32px 32px' 
         }} 
    />
);

// --- LOADING SCREEN ---
const DivineLoader = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-[#fcfcfc] overflow-hidden relative selection:bg-[#D4AF37] selection:text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-50/50 via-white to-white" />
        <StarPattern />
        
        <div className="relative z-10 flex flex-col items-center gap-8">
            <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Intricate Spinner */}
                <motion.div 
                    className="absolute inset-0 border-4 border-[#e8e0c5] rounded-full"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                    className="absolute inset-2 border-[1px] border-[#D4AF37] rounded-full border-dashed"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                />
                <motion.div 
                    className="absolute inset-0 m-auto w-24 h-24 bg-[#D4AF37] rounded-full opacity-10 blur-xl animate-pulse"
                />
                
                {/* Center Icon */}
                <div className="relative z-10 bg-white p-4 rounded-full shadow-lg border border-[#D4AF37]/30">
                    <Compass size={32} className="text-[#D4AF37]" />
                </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
                <p className="text-[#43485C] font-serif tracking-[0.2em] text-sm font-bold uppercase">
                    Opening Archives
                </p>
                <motion.div 
                    className="h-1 bg-[#e8e0c5] w-32 rounded-full overflow-hidden"
                >
                    <motion.div 
                        className="h-full bg-[#D4AF37]"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>
            </div>
        </div>
    </div>
);

export default function UserDashboard() {
    const { user, loading: authLoading } = useAuth();
    
    // Real Data Fetching
    const myCampaigns = useQuery(api.forge.getMyCampaigns);
    const playedCampaigns = useQuery(api.forge.getPlayedCampaigns);
    const myCharacters = useQuery(api.forge.getMyCharacters);
    const myItems = useQuery(api.forge.getMyItems);
    const mySpells = useQuery(api.forge.getMySpells);

    const dataLoading = !myCampaigns || !playedCampaigns || !myCharacters || !myItems || !mySpells;
    const [showLoadingScreen, setShowLoadingScreen] = useState(true);

    useEffect(() => {
        // Artificial delay to show the cool loading animation if data loads too fast
        const timer = setTimeout(() => setShowLoadingScreen(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const isLoading = authLoading || dataLoading || showLoadingScreen;

    if (isLoading) return <DivineLoader />;

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#43485C] font-serif selection:bg-[#D4AF37] selection:text-white relative overflow-hidden flex items-center justify-center p-4 md:p-8">
            
            {/* --- BACKGROUND ATMOSPHERE --- */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[#fcfcfc]">
                {/* Subtle Grain/Paper Texture */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                <StarPattern />
                {/* Corner Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0)_50%,rgba(212,175,55,0.03)_100%)]" />
            </div>

            {/* --- MAIN "MENU" CONTAINER --- */}
            <motion.div 
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative w-full max-w-[1600px] h-[90vh] bg-white/60 backdrop-blur-md rounded-[32px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] border border-white/60 overflow-hidden flex z-10 ring-1 ring-[#D4AF37]/10"
            >

                {/* --- SIDEBAR --- */}
                <aside className="w-24 md:w-72 flex flex-col relative z-20 border-r border-[#D4AF37]/10 bg-white/40">
                    
                    {/* Profile Section - Floating */}
                    <div className="p-8 flex flex-col items-center">
                        <div className="relative w-20 h-20 mb-4 group cursor-pointer">
                            <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-[20px] opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative w-full h-full rounded-full border-[2px] border-white shadow-lg overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${user?.firstName}&background=D4AF37&color=fff`} alt="User" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-[#f0f0f0]">
                                <Star size={12} className="fill-[#D4AF37] text-[#D4AF37]" />
                            </div>
                        </div>
                        <div className="hidden md:block text-center">
                            <h2 className="text-xl font-bold text-[#43485C] drop-shadow-sm">{user?.firstName || "Traveler"}</h2>
                            <p className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest mt-1">Grand Archivist</p>
                        </div>
                    </div>

                    {/* Navigation - Text Only with Indicators */}
                    <nav className="flex-1 py-6 px-6 space-y-1 overflow-y-auto">
                        <NavButton href="/dashboard" icon={<LayoutDashboard size={18} />} label="Overview" active />
                        <NavButton href="/forge" icon={<Map size={18} />} label="Forge" />
                        <NavButton href="/roster" icon={<User size={18} />} label="Characters" />
                        <NavButton href="/artifacts" icon={<Gem size={18} />} label="Artifacts" />
                        <NavButton href="/spellbook" icon={<Scroll size={18} />} label="Spellbook" />
                        
                        <div className="py-6 px-2">
                            <div className="h-[1px] w-12 bg-[#D4AF37]/30" />
                        </div>
                        
                        <NavButton href="/settings" icon={<Settings size={18} />} label="Settings" />
                    </nav>

                    {/* Bottom Logo */}
                    <div className="p-8 text-center opacity-40 hidden md:block">
                         <div className="flex justify-center mb-2">
                            <Compass size={24} className="text-[#43485C]" />
                         </div>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold">The Forge</p>
                    </div>
                </aside>


                {/* --- MAIN CONTENT AREA --- */}
                <main className="flex-1 relative flex flex-col min-w-0">
                    
                    {/* Header - Transparent */}
                    <header className="h-24 flex items-center justify-between px-10 sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold text-[#43485C] font-serif tracking-tight drop-shadow-sm">
                                Handbook
                            </h1>
                            <span className="hidden md:block text-xs font-bold text-[#D4AF37]/80 uppercase tracking-widest border-l-2 border-[#D4AF37]/20 pl-4">
                                Chapter IV: The Journey
                            </span>
                        </div>

                        {/* Resources - Floating Pills */}
                        <div className="flex items-center gap-6">
                            <ResourceDisplay icon={<Gem size={14} className="text-purple-500" />} amount={myItems?.length?.toString() || "0"} />
                            <ResourceDisplay icon={<div className="w-3 h-3 bg-[#D4AF37] rounded-full shadow-[0_0_5px_#D4AF37]" />} amount="2.5M" />
                            <button className="relative group">
                                <Bell size={20} className="text-[#43485C] group-hover:text-[#D4AF37] transition-colors" />
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full border-2 border-white" />
                            </button>
                        </div>
                    </header>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-[#D4AF37]/20 scrollbar-track-transparent">
                        <div className="max-w-6xl mx-auto space-y-12">
                            
                            {/* Stats Row - Frameless */}
                            <div className="flex items-center justify-between px-4">
                                <StatContent title="Active Quests" value={playedCampaigns?.length?.toString() || "0"} icon={<Shield className="text-[#D4AF37]" size={24} />} />
                                <div className="h-12 w-[1px] bg-[#D4AF37]/10" />
                                <StatContent title="Heroes" value={myCharacters?.length?.toString() || "0"} icon={<User className="text-blue-500" size={24} />} />
                                <div className="h-12 w-[1px] bg-[#D4AF37]/10" />
                                <StatContent title="Relics" value={myItems?.length?.toString() || "0"} icon={<Crown className="text-purple-500" size={24} />} />
                            </div>

                            {/* Main Hero - Full Width Image */}
                            <section className="relative group rounded-[24px] overflow-hidden shadow-[0_15px_40px_-10px_rgba(0,0,0,0.2)]">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518562180175-34a163b1a9a6?q=80&w=2000')] bg-cover bg-center transition-transform duration-[2s] group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#2d3142] via-[#2d3142]/40 to-transparent" />
                                
                                <div className="relative z-10 p-12 md:p-16 w-full md:w-2/3 text-white flex flex-col items-start">
                                    <div className="flex items-center gap-3 mb-4 opacity-80">
                                        <div className="h-[1px] w-8 bg-white/50" />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Current Objective</span>
                                    </div>
                                    
                                    <h2 className="text-5xl font-serif font-bold mb-4 drop-shadow-lg">Celestia&apos;s Fall</h2>
                                    <p className="text-white/80 font-sans mb-8 leading-relaxed max-w-lg drop-shadow-md">
                                        The ley lines are disrupting the upper atmosphere. Journey to the peak of Dragonspine and stabilize the anomaly before the stars descend.
                                    </p>
                                    
                                    <Link href="/forge/create/campaign">
                                        <button className="flex items-center gap-3 bg-white text-[#2d3142] px-8 py-3 rounded-full font-bold uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all">
                                            Navigate <ChevronRight size={14} />
                                        </button>
                                    </Link>
                                </div>
                            </section>

                            {/* Bottom Grid - Frameless Lists */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                
                                {/* Party Setup */}
                                <div className="lg:col-span-2">
                                    <SectionHeader title="Active Campaigns" icon={<User size={18} />} />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {playedCampaigns && playedCampaigns.length > 0 ? (
                                            playedCampaigns.map((c: Campaign) => (
                                                <Link href={`/play/${c._id}`} key={c._id}>
                                                    <CharacterRow 
                                                        char={c.character || { name: "Unknown Hero", level: 1, element: "Anemo" }} 
                                                        campaignTitle={c.title}
                                                        creatorName={c.creatorName}
                                                    />
                                                </Link>
                                            ))
                                        ) : (
                                            <p className="text-gray-400 text-sm italic p-4">No active campaigns found.</p>
                                        )}
                                        
                                        {/* Add Slot - Dashed, minimal */}
                                        <Link href="/forge/create/campaign" className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-[#D4AF37]/30 text-[#8d99ae] hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all group">
                                            <div className="w-12 h-12 rounded-full border border-dashed border-[#D4AF37]/30 flex items-center justify-center group-hover:border-[#D4AF37]">
                                                <Plus size={18} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-widest">Start New Adventure</span>
                                        </Link>
                                    </div>
                                </div>

                                {/* Commissions - Simple List */}
                                <div>
                                    <SectionHeader title="Daily Commissions" icon={<Sparkles size={18} />} />

                                    <div className="space-y-6 mt-2">
                                        <CommissionItem title="Defeat 5 Hilichurls" completed />
                                        <GoldDivider />
                                        <CommissionItem title="Complete 1 Domain" completed />
                                        <GoldDivider />
                                        <CommissionItem title="Cook 3 Dishes" />
                                        <GoldDivider />
                                        <CommissionItem title="Forge a Weapon" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </main>
            </motion.div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const SectionHeader = ({ title, icon }: { title: string, icon: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="text-[#D4AF37]">{icon}</div>
        <h3 className="font-bold text-xl text-[#43485C]">{title}</h3>
    </div>
);

const NavButton = ({ icon, label, active, href }: { icon: React.ReactNode, label: string, active?: boolean, href: string }) => (
    <Link href={href || "#"} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active ? 'text-[#43485C]' : 'text-gray-400 hover:text-[#D4AF37]'
    }`}>
        <div className={`relative z-10 ${active ? 'text-[#D4AF37]' : 'group-hover:text-[#D4AF37]'}`}>
            {icon}
        </div>
        <span className={`hidden md:block text-sm font-bold tracking-wide ${active ? 'font-serif' : 'font-sans'}`}>
            {label}
        </span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
    </Link>
);

const StatContent = ({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
    <div className="flex items-center gap-5 px-4">
        <div className="p-3 bg-[#fff] rounded-2xl shadow-sm text-[#D4AF37]">
            {icon}
        </div>
        <div>
            <p className="text-4xl font-serif font-bold text-[#43485C] tracking-tight">{value}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{title}</p>
        </div>
    </div>
);

const ResourceDisplay = ({ icon, amount }: { icon: React.ReactNode, amount: string }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full shadow-sm border border-white/50">
        {icon}
        <span className="text-sm font-bold text-[#43485C] font-sans">{amount}</span>
    </div>
);

const CharacterRow = ({ char, campaignTitle, creatorName }: { char: Character, campaignTitle?: string, creatorName?: string }) => (
    <div className="flex items-center gap-4 p-2 group cursor-pointer">
        <div className="relative w-14 h-14">
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-full h-full bg-[#f8f9fa] rounded-full border-2 border-white shadow-md flex items-center justify-center text-xl font-bold text-gray-300 overflow-hidden">
                {char.name ? char.name[0] : "?"}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
                <ElementIcon element={char.element} />
            </div>
        </div>
        
        <div className="flex-1">
            <h4 className="font-bold text-[#43485C] text-lg group-hover:text-[#D4AF37] transition-colors">{char.name}</h4>
            <p className="text-xs font-bold text-gray-400 uppercase">Lv. {char.level} / 90</p>
            {campaignTitle && <p className="text-xs text-gray-500 mt-1 font-medium">{campaignTitle}</p>}
            {creatorName && <p className="text-[10px] text-[#D4AF37] uppercase tracking-wider mt-0.5">Created by {creatorName}</p>}
        </div>
        
        <ChevronRight className="text-gray-300 group-hover:text-[#D4AF37] transition-transform group-hover:translate-x-1" size={16} />
    </div>
);

const CommissionItem = ({ title, completed }: { title: string, completed?: boolean }) => (
    <div className="flex items-center justify-between group cursor-pointer py-1">
        <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${completed ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-gray-300 group-hover:border-[#D4AF37]'}`}>
                {completed && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <span className={`text-sm font-bold transition-colors ${completed ? 'text-gray-400 line-through' : 'text-[#43485C] group-hover:text-[#D4AF37]'}`}>
                {title}
            </span>
        </div>
        {!completed && (
            <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Go
            </div>
        )}
    </div>
);
