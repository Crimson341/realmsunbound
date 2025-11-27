"use client";

import React, { useState, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import {
    Search, Map, Users, ArrowRight,
    Sparkles, Crown, Ghost, ChevronLeft, ChevronRight,
    TrendingUp, Clock, Flame, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

// Fallback image for campaigns without an uploaded image
const FALLBACK_IMAGE = '/assets/image.png';

// --- GENRE DEFINITIONS ---
const GENRES = [
    { key: 'fantasy', label: 'Fantasy', icon: '🏰', color: '#8B5CF6' },
    { key: 'sci-fi', label: 'Sci-Fi', icon: '🚀', color: '#06B6D4' },
    { key: 'anime', label: 'Anime', icon: '⚔️', color: '#EC4899' },
    { key: 'realism', label: 'Realism', icon: '🌍', color: '#10B981' },
    { key: 'historical', label: 'Historical', icon: '📜', color: '#F59E0B' },
    { key: 'horror', label: 'Horror', icon: '👻', color: '#EF4444' },
    { key: 'mythology', label: 'Mythology', icon: '⚡', color: '#F97316' },
    { key: 'cyberpunk', label: 'Cyberpunk', icon: '🤖', color: '#14B8A6' },
    { key: 'steampunk', label: 'Steampunk', icon: '⚙️', color: '#A78BFA' },
    { key: 'post-apocalyptic', label: 'Post-Apocalyptic', icon: '☢️', color: '#84CC16' },
] as const;

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
    imageUrl?: string | null;
    xpRate: number;
    genre?: string;
    viewCount?: number;
    playCount?: number;
    tags?: string[];
    activeCharacters?: Character[];
    template?: {
        version: string;
        updates?: string[];
    } | null;
    templateVersion?: string;
    rules?: string;
    isFeatured?: boolean;
}

// --- COMPONENTS ---

const HorizontalScrollSection = ({ 
    title, 
    icon, 
    children, 
    dark,
    accentColor = '#D4AF37',
    viewAllHref
}: { 
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    dark: boolean;
    accentColor?: string;
    viewAllHref?: string;
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 400;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-serif font-bold flex items-center gap-3 ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                    <span style={{ color: accentColor }}>{icon}</span>
                    {title}
                </h2>
                <div className="flex items-center gap-2">
                    {viewAllHref && (
                        <Link 
                            href={viewAllHref}
                            className={`text-sm font-medium mr-4 ${dark ? 'text-gray-400 hover:text-[#D4AF37]' : 'text-stone-500 hover:text-indigo-600'} transition-colors`}
                        >
                            View All
                        </Link>
                    )}
                    <button 
                        onClick={() => scroll('left')}
                        className={`p-2 rounded-full transition-colors ${
                            dark 
                                ? 'bg-[#1a1d2e] hover:bg-[#2a2d3e] text-gray-400' 
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                        }`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                        onClick={() => scroll('right')}
                        className={`p-2 rounded-full transition-colors ${
                            dark 
                                ? 'bg-[#1a1d2e] hover:bg-[#2a2d3e] text-gray-400' 
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                        }`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
            <div 
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
            </div>
        </section>
    );
};

const RealmCard = ({ campaign, index, dark, compact = false }: {
    campaign: Campaign;
    index: number;
    dark: boolean;
    compact?: boolean;
}) => {
    const genre = GENRES.find(g => g.key === campaign.genre);
    const imageUrl = campaign.imageUrl || FALLBACK_IMAGE;

    return (
        <Link href={`/realms/${campaign._id}`}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`group relative border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex-shrink-0 ${
                    compact ? 'w-72' : 'w-80'
                } ${
                    dark
                        ? 'bg-[#1a1d2e] border-[#2a2d3e]'
                        : 'bg-white border-stone-200'
                }`}
            >
                {/* Image / Banner */}
                <div className={`${compact ? 'h-40' : 'h-48'} relative overflow-hidden ${dark ? 'bg-[#151821]' : 'bg-stone-100'}`}>
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                        style={{ backgroundImage: `url(${imageUrl})` }}
                    />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
                
                {/* Genre Badge */}
                {genre && (
                    <div 
                        className="absolute top-3 left-3 z-20 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                        style={{ backgroundColor: `${genre.color}20`, color: genre.color, border: `1px solid ${genre.color}40` }}
                    >
                        <span>{genre.icon}</span>
                        <span>{genre.label}</span>
                    </div>
                )}

                {/* Stats overlay */}
                {(campaign.viewCount || campaign.playCount) && (
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                        {campaign.playCount && campaign.playCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/80 text-xs">
                                <Flame size={12} className="text-orange-400" />
                                {campaign.playCount}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="absolute bottom-4 left-4 right-4 z-20">
                    <h3 className="text-white font-serif text-xl font-bold drop-shadow-md line-clamp-1">{campaign.title}</h3>
                    <div className="flex items-center gap-2 text-stone-300 text-xs font-medium uppercase tracking-wider mt-1">
                        <span>XP Rate: {campaign.xpRate}x</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Users size={12} />
                            {campaign.activeCharacters?.length || 0} Online
                        </span>
                    </div>
                </div>

                <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
            </div>

            {/* Content */}
            <div className={`${compact ? 'p-4' : 'p-6'}`}>
                <p className={`text-sm leading-relaxed line-clamp-2 mb-4 ${dark ? 'text-gray-400' : 'text-stone-600'}`}>
                    {campaign.description || "A mysterious realm waiting to be explored..."}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                                dark 
                                    ? 'border-[#1a1d2e] bg-[#2a2d3e] text-gray-400' 
                                    : 'border-white bg-stone-200 text-stone-500'
                            }`}>
                                {String.fromCharCode(65 + i)}
                            </div>
                        ))}
                    </div>

                    <span className={`flex items-center gap-1 font-bold text-xs group/btn transition-colors ${
                        dark
                            ? 'text-[#D4AF37] hover:text-[#eac88f]'
                            : 'text-indigo-600 hover:text-indigo-700'
                    }`}>
                        Explore <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                </div>
            </div>
            </motion.div>
        </Link>
    );
};

const FeaturedRealm = ({ campaign, dark }: { campaign: Campaign; dark: boolean }) => {
    if (!campaign) return null;
    const genre = GENRES.find(g => g.key === campaign.genre);
    const imageUrl = campaign.imageUrl || FALLBACK_IMAGE;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`relative rounded-3xl overflow-hidden text-white mb-16 group shadow-2xl ${dark ? 'bg-[#0f1119]' : 'bg-stone-900'}`}
        >
            <div
                className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:scale-105 transition-transform duration-1000"
                style={{ backgroundImage: `url(${imageUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            
            <div className="relative z-10 p-12 md:p-20 max-w-3xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
                        <Crown size={14} /> Featured Realm
                    </div>
                    {genre && (
                        <div 
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                            style={{ backgroundColor: `${genre.color}20`, color: genre.color, border: `1px solid ${genre.color}40` }}
                        >
                            <span>{genre.icon}</span> {genre.label}
                        </div>
                    )}
                </div>
                <h2 className="text-5xl md:text-7xl font-serif font-bold mb-6 text-white leading-tight">
                    {campaign.title}
                </h2>
                <p className="text-lg text-stone-300 leading-relaxed mb-8 max-w-xl">
                    {campaign.description}
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                    <Link href={`/play/${campaign._id}`}>
                        <button className={`px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2 ${
                            dark
                                ? 'bg-[#D4AF37] text-[#0f1119] hover:bg-[#eac88f]'
                                : 'bg-white text-stone-900 hover:bg-stone-200'
                        }`}>
                            Begin Journey <ArrowRight size={16} />
                        </button>
                    </Link>
                    <Link href={`/realms/${campaign._id}`}>
                        <button className="px-6 py-4 rounded-full border border-white/20 text-white/60 text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-colors">
                            View Lore
                        </button>
                    </Link>
                </div>
            </div>
        </motion.div>
    );
};

const GenreFilter = ({ 
    selectedGenre, 
    onSelectGenre, 
    dark 
}: { 
    selectedGenre: string | null;
    onSelectGenre: (genre: string | null) => void;
    dark: boolean;
}) => {
    return (
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide mb-8" style={{ scrollbarWidth: 'none' }}>
            <button
                onClick={() => onSelectGenre(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedGenre === null
                        ? dark 
                            ? 'bg-[#D4AF37] text-[#0f1119]' 
                            : 'bg-indigo-600 text-white'
                        : dark 
                            ? 'bg-[#1a1d2e] text-gray-400 hover:bg-[#2a2d3e]' 
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
            >
                All Realms
            </button>
            {GENRES.map((genre) => (
                <button
                    key={genre.key}
                    onClick={() => onSelectGenre(genre.key)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                        selectedGenre === genre.key
                            ? 'text-white'
                            : dark 
                                ? 'bg-[#1a1d2e] text-gray-400 hover:bg-[#2a2d3e]' 
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                    style={selectedGenre === genre.key ? { backgroundColor: genre.color } : {}}
                >
                    <span>{genre.icon}</span>
                    {genre.label}
                </button>
            ))}
        </div>
    );
};

const GenreSection = ({
    genre,
    campaigns,
    dark
}: {
    genre: typeof GENRES[number];
    campaigns: Campaign[];
    dark: boolean;
}) => {
    if (campaigns.length === 0) return null;

    return (
        <HorizontalScrollSection
            title={genre.label}
            icon={<span className="text-2xl">{genre.icon}</span>}
            dark={dark}
            accentColor={genre.color}
        >
            {campaigns.map((campaign, idx) => (
                <RealmCard
                    key={campaign._id}
                    campaign={campaign}
                    index={idx}
                    dark={dark}
                    compact
                />
            ))}
        </HorizontalScrollSection>
    );
};

export default function RealmsPage() {
    const allCampaigns = useQuery(api.forge.getAllCampaigns);
    const featuredRealms = useQuery(api.forge.getFeaturedRealms);
    const popularRealms = useQuery(api.forge.getPopularRealms, { limit: 10 });
    const newestRealms = useQuery(api.forge.getNewestRealms, { limit: 10 });
    const realmsByGenre = useQuery(api.forge.getRealmsGroupedByGenre);

    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;
    const [search, setSearch] = useState("");
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

    // Get featured realm (first featured, or first popular, or first campaign)
    const featuredRealm = featuredRealms?.[0] || popularRealms?.[0] || allCampaigns?.[0] || null;

    // Filter campaigns based on search and genre
    const filteredCampaigns = allCampaigns?.filter((c: Campaign) => {
        const matchesSearch = !search || 
            c.title.toLowerCase().includes(search.toLowerCase()) || 
            c.description?.toLowerCase().includes(search.toLowerCase());
        const matchesGenre = !selectedGenre || c.genre === selectedGenre;
        return matchesSearch && matchesGenre;
    }) || [];

    const isLoading = !allCampaigns;

    return (
        <div className={`min-h-screen font-sans ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-[#f8f7f5] text-stone-800'}`}>
            {/* --- HEADER --- */}
            <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${
                dark 
                    ? 'bg-[#0f1119]/80 border-[#2a2d3e]/50' 
                    : 'bg-white/80 border-stone-200/50'
            }`}>
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className={`flex items-center gap-2 font-serif font-bold text-xl tracking-tight hover:opacity-70 transition-opacity ${dark ? 'text-[#e8e6e3]' : ''}`}>
                            <Map size={24} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                            Realms
                        </Link>
                        <nav className={`hidden md:flex items-center gap-6 text-sm font-bold uppercase tracking-wide ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                            <a href="#featured" className={dark ? 'text-[#e8e6e3]' : 'text-stone-900'}>Featured</a>
                            <a href="#popular" className={`hover:${dark ? 'text-[#e8e6e3]' : 'text-stone-900'} transition-colors`}>Popular</a>
                            <a href="#genres" className={`hover:${dark ? 'text-[#e8e6e3]' : 'text-stone-900'} transition-colors`}>Genres</a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-500' : 'text-stone-400'}`} size={16} />
                            <input 
                                type="text" 
                                placeholder="Search realms..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`border border-transparent rounded-full py-2 pl-10 pr-4 text-sm outline-none w-64 transition-all ${
                                    dark 
                                        ? 'bg-[#1a1d2e] focus:bg-[#1a1d2e] focus:border-[#D4AF37]/50 text-[#e8e6e3] placeholder:text-gray-500' 
                                        : 'bg-stone-100 focus:bg-white focus:border-indigo-500/50'
                                }`}
                            />
                        </div>
                        <Link href="/forge/create/campaign" className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-colors ${
                            dark 
                                ? 'bg-[#D4AF37] hover:bg-[#eac88f] text-[#0f1119]' 
                                : 'bg-stone-900 hover:bg-stone-800 text-white'
                        }`}>
                            Create Realm
                        </Link>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                
                {isLoading ? (
                    // Loading Skeleton
                    <div className="space-y-12 animate-pulse">
                        <div className={`h-96 rounded-3xl w-full ${dark ? 'bg-[#1a1d2e]' : 'bg-stone-200'}`} />
                        <div className="flex gap-6 overflow-hidden">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className={`h-72 w-72 rounded-2xl flex-shrink-0 ${dark ? 'bg-[#1a1d2e]' : 'bg-stone-200'}`} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Featured Realm */}
                        <section id="featured">
                            {featuredRealm && (
                                <FeaturedRealm
                                    campaign={featuredRealm as Campaign}
                                    dark={dark}
                                />
                            )}
                        </section>

                        {/* Most Popular */}
                        {popularRealms && popularRealms.length > 0 && (
                            <section id="popular">
                                <HorizontalScrollSection
                                    title="Most Popular"
                                    icon={<TrendingUp size={24} />}
                                    dark={dark}
                                    accentColor="#EC4899"
                                >
                                    {popularRealms.map((campaign, idx) => (
                                        <RealmCard
                                            key={campaign._id}
                                            campaign={campaign as Campaign}
                                            index={idx}
                                            dark={dark}
                                            compact
                                        />
                                    ))}
                                </HorizontalScrollSection>
                            </section>
                        )}

                        {/* Newest Realms */}
                        {newestRealms && newestRealms.length > 0 && (
                            <HorizontalScrollSection
                                title="Fresh Arrivals"
                                icon={<Clock size={24} />}
                                dark={dark}
                                accentColor="#10B981"
                            >
                                {newestRealms.map((campaign, idx) => (
                                    <RealmCard
                                        key={campaign._id}
                                        campaign={campaign as Campaign}
                                        index={idx}
                                        dark={dark}
                                        compact
                                    />
                                ))}
                            </HorizontalScrollSection>
                        )}

                        {/* Genre Sections */}
                        <section id="genres">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className={`text-2xl font-serif font-bold flex items-center gap-3 ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                    <Filter size={24} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                    Browse by Genre
                                </h2>
                            </div>
                            
                            <GenreFilter 
                                selectedGenre={selectedGenre} 
                                onSelectGenre={setSelectedGenre} 
                                dark={dark} 
                            />

                            {selectedGenre ? (
                                // Show filtered results when genre is selected
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredCampaigns.length > 0 ? (
                                        filteredCampaigns.map((campaign: Campaign, idx: number) => (
                                            <motion.div
                                                key={campaign._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                            >
                                                <RealmCard
                                                    campaign={campaign}
                                                    index={idx}
                                                    dark={dark}
                                                />
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className={`col-span-full py-20 text-center ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                            <Ghost size={48} className="mx-auto mb-4 opacity-20" />
                                            <p className="text-lg font-serif italic">No realms found in this genre yet.</p>
                                            <Link href="/forge/create/campaign" className={`mt-4 inline-block text-sm font-bold ${dark ? 'text-[#D4AF37]' : 'text-indigo-600'}`}>
                                                Be the first to create one →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Show genre sections when no genre is selected
                                realmsByGenre && GENRES.map((genre) => {
                                    const genreCampaigns = realmsByGenre[genre.key] || [];
                                    return (
                                        <GenreSection
                                            key={genre.key}
                                            genre={genre}
                                            campaigns={genreCampaigns as Campaign[]}
                                            dark={dark}
                                        />
                                    );
                                })
                            )}
                        </section>

                        {/* All Realms Section (when searching) */}
                        {search && (
                            <section className="mt-16">
                                <h2 className={`text-2xl font-serif font-bold flex items-center gap-3 mb-8 ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                    <Sparkles className="text-amber-500" size={24} />
                                    Search Results
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredCampaigns.length > 0 ? (
                                        filteredCampaigns.map((campaign: Campaign, idx: number) => (
                                            <RealmCard
                                                key={campaign._id}
                                                campaign={campaign}
                                                index={idx}
                                                dark={dark}
                                            />
                                        ))
                                    ) : (
                                        <div className={`col-span-full py-20 text-center ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                            <Ghost size={48} className="mx-auto mb-4 opacity-20" />
                                            <p className="text-lg font-serif italic">No realms found matching &quot;{search}&quot;</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
