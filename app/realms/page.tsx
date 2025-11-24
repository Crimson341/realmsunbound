"use client";

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Link from 'next/link';
import { 
    Search, Map, Users, ArrowRight, 
    Sparkles, 
    Crown, Ghost
} from 'lucide-react';
import { motion } from 'framer-motion';
import RealmDetailsModal from '../../components/RealmDetailsModal';

// --- TYPES ---
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
    imageUrl?: string;
    xpRate: number;
    activeCharacters?: Character[];
    template?: {
        version: string;
        updates?: string[];
    };
    templateVersion?: string;
    rules?: string;
}

// --- COMPONENTS ---

const RealmCard = ({ campaign, index, onClick }: { campaign: Campaign, index: number, onClick: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            onClick={onClick}
            className="group relative bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        >
            {/* Image / Banner Placeholder */}
            <div className="h-48 bg-stone-100 relative overflow-hidden">
                {campaign.imageUrl ? (
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                        style={{ backgroundImage: `url(${campaign.imageUrl})` }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                
                <div className="absolute bottom-4 left-4 z-20">
                    <h3 className="text-white font-serif text-2xl font-bold drop-shadow-md line-clamp-1">{campaign.title}</h3>
                    <div className="flex items-center gap-2 text-stone-300 text-xs font-medium uppercase tracking-wider mt-1">
                        <span>XP Rate: {campaign.xpRate}x</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Users size={12} />
                            {campaign.activeCharacters?.length || 0} Online
                        </span>
                    </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
            </div>

            {/* Content */}
            <div className="p-6">
                <p className="text-stone-600 text-sm leading-relaxed line-clamp-3 mb-6 h-[4.5em]">
                    {campaign.description || "A mysterious realm waiting to be explored. No records exist of what lies within..."}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {/* Fake user avatars for "active players" feel */}
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-500">
                                {String.fromCharCode(65 + i)}
                            </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-400">
                            +
                        </div>
                    </div>

                    <button className="flex items-center gap-2 text-indigo-600 font-bold text-sm group/btn hover:text-indigo-700 transition-colors">
                        View Details <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const FeaturedRealm = ({ campaign, onDetails }: { campaign: Campaign, onDetails: () => void }) => {
    if (!campaign) return null;

    return (
        <div className="relative rounded-3xl overflow-hidden bg-stone-900 text-white mb-16 group shadow-2xl">
            {campaign.imageUrl ? (
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000"
                    style={{ backgroundImage: `url(${campaign.imageUrl})` }}
                />
            ) : (
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2000')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
            
            <div className="relative z-10 p-12 md:p-20 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
                    <Crown size={14} /> Featured Realm
                </div>
                <h2 className="text-5xl md:text-7xl font-serif font-bold mb-6 text-white leading-tight">
                    {campaign.title}
                </h2>
                <p className="text-lg text-stone-300 leading-relaxed mb-8 max-w-xl">
                    {campaign.description}
                </p>
                <div className="flex items-center gap-4">
                    <Link href={`/play/${campaign._id}`}>
                        <button className="bg-white text-stone-900 hover:bg-stone-200 px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2">
                            Begin Journey <ArrowRight size={16} />
                        </button>
                    </Link>
                    <button 
                        onClick={onDetails}
                        className="px-6 py-4 rounded-full border border-white/20 text-white/60 text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                    >
                        View Lore
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function RealmsPage() {
    const campaigns = useQuery(api.forge.getAllCampaigns);
    const [search, setSearch] = useState("");
    const [selectedRealm, setSelectedRealm] = useState<Campaign | null>(null);

        const filteredCampaigns = campaigns?.filter((c: Campaign) =>          c.title.toLowerCase().includes(search.toLowerCase()) || 
        c.description?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    // Pick a random featured campaign if available
    const featured = campaigns && campaigns.length > 0 ? campaigns[0] as Campaign : null;
    const list = filteredCampaigns.filter((c: Campaign) => c._id !== featured?._id) as Campaign[];

    return (
        <div className="min-h-screen bg-[#f8f7f5] text-stone-800 font-sans">
            <RealmDetailsModal 
                campaign={selectedRealm} 
                isOpen={!!selectedRealm} 
                onClose={() => setSelectedRealm(null)} 
            />

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="flex items-center gap-2 font-serif font-bold text-xl tracking-tight hover:opacity-70 transition-opacity">
                            <Map size={24} className="text-indigo-600" />
                            Realms
                        </Link>
                        <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-stone-500 uppercase tracking-wide">
                            <a href="#" className="text-stone-900">Browse</a>
                            <a href="#" className="hover:text-stone-900 transition-colors">Popular</a>
                            <a href="#" className="hover:text-stone-900 transition-colors">New</a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search realms..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-stone-100 border border-transparent focus:bg-white focus:border-indigo-500/50 rounded-full py-2 pl-10 pr-4 text-sm outline-none w-64 transition-all"
                            />
                        </div>
                        <Link href="/forge/create/campaign" className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-colors">
                            Create Realm
                        </Link>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                
                {!campaigns ? (
                    // Loading Skeleton
                    <div className="space-y-12 animate-pulse">
                        <div className="h-96 bg-stone-200 rounded-3xl w-full" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="h-80 bg-stone-200 rounded-2xl" />
                            <div className="h-80 bg-stone-200 rounded-2xl" />
                            <div className="h-80 bg-stone-200 rounded-2xl" />
                        </div>
                    </div>
                ) : (
                    <>
                        {featured && (
                            <FeaturedRealm 
                                campaign={featured} 
                                onDetails={() => setSelectedRealm(featured)} 
                            />
                        )}

                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
                                <Sparkles className="text-amber-500" size={24} />
                                Discover Realms
                            </h2>
                            <div className="flex items-center gap-2 text-sm font-bold text-stone-500">
                                <span>Sort by:</span>
                                <select className="bg-transparent border-none outline-none font-bold text-stone-900 cursor-pointer">
                                    <option>Popularity</option>
                                    <option>Newest</option>
                                    <option>Difficulty</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {list.length > 0 ? (
                                list.map((campaign: Campaign, idx: number) => (
                                    <RealmCard 
                                        key={campaign._id} 
                                        campaign={campaign} 
                                        index={idx} 
                                        onClick={() => setSelectedRealm(campaign)}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center text-stone-500">
                                    <Ghost size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-lg font-serif italic">No realms found matching your search.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
