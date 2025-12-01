"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Play, Users, Scroll, Map, Crown, Shield,
    Sword, Store, User, Sparkles, BookOpen, MapPin,
    Skull, Heart, Coins, Compass
} from 'lucide-react';

// Fallback image
const FALLBACK_IMAGE = '/assets/image.png';

// Genre definitions
const GENRES: Record<string, { label: string; icon: string; color: string }> = {
    'fantasy': { label: 'Fantasy', icon: '🏰', color: '#8B5CF6' },
    'sci-fi': { label: 'Sci-Fi', icon: '🚀', color: '#06B6D4' },
    'anime': { label: 'Anime', icon: '⚔️', color: '#EC4899' },
    'realism': { label: 'Realism', icon: '🌍', color: '#10B981' },
    'historical': { label: 'Historical', icon: '📜', color: '#F59E0B' },
    'horror': { label: 'Horror', icon: '👻', color: '#EF4444' },
    'mythology': { label: 'Mythology', icon: '⚡', color: '#F97316' },
    'cyberpunk': { label: 'Cyberpunk', icon: '🤖', color: '#14B8A6' },
    'steampunk': { label: 'Steampunk', icon: '⚙️', color: '#A78BFA' },
    'post-apocalyptic': { label: 'Post-Apocalyptic', icon: '☢️', color: '#84CC16' },
};

type TabType = 'overview' | 'lore' | 'npcs' | 'shops' | 'locations' | 'characters';

export default function RealmDetailsPage() {
    const params = useParams();
    const campaignId = params.id as Id<"campaigns">;

    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Fetch campaign details
    const campaignDetails = useQuery(api.forge.getCampaignDetails, { campaignId });
    const shops = useQuery(api.shops.getCampaignShops, { campaignId });
    const incrementView = useMutation(api.forge.incrementRealmView);

    // Increment view count on mount
    useEffect(() => {
        if (campaignId) {
            incrementView({ campaignId });
        }
    }, [campaignId, incrementView]);

    if (!campaignDetails) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-[#0f1119]' : 'bg-[#f8f7f5]'}`}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Compass size={48} className="text-[#D4AF37] animate-spin" />
                    <p className={`font-serif ${dark ? 'text-gray-400' : 'text-stone-500'}`}>Loading realm...</p>
                </motion.div>
            </div>
        );
    }

    const { campaign, locations, npcs, lore, items, quests, monsters, factions, activeQuests } = campaignDetails;
    const genre = campaign.genre ? GENRES[campaign.genre] : null;
    const imageUrl = campaign.imageUrl || FALLBACK_IMAGE;

    const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'overview', label: 'Overview', icon: <BookOpen size={16} /> },
        { key: 'lore', label: 'Lore', icon: <Scroll size={16} />, count: lore?.length },
        { key: 'npcs', label: 'Characters', icon: <User size={16} />, count: npcs?.length },
        { key: 'shops', label: 'Shops', icon: <Store size={16} />, count: shops?.length },
        { key: 'locations', label: 'Locations', icon: <MapPin size={16} />, count: locations?.length },
    ];

    return (
        <div className={`min-h-screen font-sans ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-[#f8f7f5] text-stone-800'}`}>
            {/* Hero Banner */}
            <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

                {/* Back Button */}
                <Link
                    href="/realms"
                    className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-md text-white text-sm font-bold hover:bg-black/50 transition-colors border border-white/10"
                >
                    <ArrowLeft size={16} />
                    Back to Realms
                </Link>

                {/* Hero Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10">
                    <div className="max-w-7xl mx-auto">
                        {/* Badges */}
                        <div className="flex items-center gap-3 mb-4">
                            {campaign.isFeatured && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
                                    <Crown size={12} /> Featured
                                </div>
                            )}
                            {genre && (
                                <div
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                                    style={{ backgroundColor: `${genre.color}20`, color: genre.color, border: `1px solid ${genre.color}40` }}
                                >
                                    <span>{genre.icon}</span> {genre.label}
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 drop-shadow-xl">
                            {campaign.title}
                        </h1>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-[#D4AF37]" />
                                <span>{campaign.xpRate}x XP Rate</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-emerald-400" />
                                <span>{campaign.playCount || 0} Players</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Map size={16} className="text-blue-400" />
                                <span>{locations?.length || 0} Locations</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-purple-400" />
                                <span>{npcs?.length || 0} NPCs</span>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-6">
                            <Link href={`/play-df/${campaignId}`}>
                                <button className={`px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl hover:shadow-2xl hover:-translate-y-1 ${
                                    dark
                                        ? 'bg-[#D4AF37] text-[#0f1119] hover:bg-[#eac88f]'
                                        : 'bg-white text-stone-900 hover:bg-stone-100'
                                }`}>
                                    <Play size={16} fill="currentColor" /> Enter Realm
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className={`sticky top-0 z-30 border-b backdrop-blur-md ${dark ? 'bg-[#0f1119]/90 border-[#2a2d3e]' : 'bg-white/90 border-stone-200'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? dark ? 'text-[#D4AF37]' : 'text-indigo-600'
                                        : dark ? 'text-gray-500 hover:text-gray-300' : 'text-stone-400 hover:text-stone-600'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                        activeTab === tab.key
                                            ? dark ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-indigo-100 text-indigo-600'
                                            : dark ? 'bg-[#2a2d3e] text-gray-400' : 'bg-stone-100 text-stone-500'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                                {activeTab === tab.key && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className={`absolute bottom-0 left-0 right-0 h-0.5 ${dark ? 'bg-[#D4AF37]' : 'bg-indigo-600'}`}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <AnimatePresence mode="wait">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* Description */}
                                <section className={`p-8 rounded-2xl border ${dark ? 'bg-[#1a1d2e] border-[#2a2d3e]' : 'bg-white border-stone-200'}`}>
                                    <h2 className={`text-xl font-serif font-bold mb-4 flex items-center gap-3 ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                        <Scroll size={20} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                        About This Realm
                                    </h2>
                                    <p className={`leading-relaxed text-lg ${dark ? 'text-gray-400' : 'text-stone-600'}`}>
                                        {campaign.description || "A mysterious realm waiting to be explored..."}
                                    </p>

                                    {campaign.worldBible && (
                                        <div className={`mt-6 pt-6 border-t ${dark ? 'border-[#2a2d3e]' : 'border-stone-200'}`}>
                                            <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 ${dark ? 'text-gray-500' : 'text-stone-400'}`}>
                                                World Lore
                                            </h3>
                                            <p className={`whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-400' : 'text-stone-600'}`}>
                                                {campaign.worldBible}
                                            </p>
                                        </div>
                                    )}
                                </section>

                                {/* Active Quests Preview */}
                                {activeQuests && activeQuests.length > 0 && (
                                    <section className={`p-8 rounded-2xl border ${dark ? 'bg-[#1a1d2e] border-[#2a2d3e]' : 'bg-white border-stone-200'}`}>
                                        <h2 className={`text-xl font-serif font-bold mb-4 flex items-center gap-3 ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                            <Sword size={20} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                            Available Quests
                                        </h2>
                                        <div className="space-y-3">
                                            {activeQuests.slice(0, 5).map((quest) => (
                                                <div
                                                    key={quest._id}
                                                    className={`p-4 rounded-xl border transition-colors ${dark ? 'bg-[#151821] border-[#2a2d3e] hover:border-[#D4AF37]/30' : 'bg-stone-50 border-stone-200 hover:border-indigo-200'}`}
                                                >
                                                    <h3 className={`font-bold mb-1 ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                                        {quest.title}
                                                    </h3>
                                                    <p className={`text-sm line-clamp-2 ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                                        {quest.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Quick Stats */}
                                <div className={`p-6 rounded-2xl border ${dark ? 'bg-[#1a1d2e] border-[#2a2d3e]' : 'bg-white border-stone-200'}`}>
                                    <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${dark ? 'text-gray-500' : 'text-stone-400'}`}>
                                        Realm Stats
                                    </h3>
                                    <div className="space-y-4">
                                        <StatItem icon={<Map size={16} />} label="Locations" value={locations?.length || 0} dark={dark} />
                                        <StatItem icon={<User size={16} />} label="NPCs" value={npcs?.length || 0} dark={dark} />
                                        <StatItem icon={<Store size={16} />} label="Shops" value={shops?.length || 0} dark={dark} />
                                        <StatItem icon={<Skull size={16} />} label="Monsters" value={monsters?.length || 0} dark={dark} />
                                        <StatItem icon={<Sword size={16} />} label="Quests" value={quests?.length || 0} dark={dark} />
                                        <StatItem icon={<Crown size={16} />} label="Items" value={items?.length || 0} dark={dark} />
                                    </div>
                                </div>

                                {/* Factions */}
                                {factions && factions.length > 0 && (
                                    <div className={`p-6 rounded-2xl border ${dark ? 'bg-[#1a1d2e] border-[#2a2d3e]' : 'bg-white border-stone-200'}`}>
                                        <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${dark ? 'text-gray-500' : 'text-stone-400'}`}>
                                            Factions
                                        </h3>
                                        <div className="space-y-3">
                                            {factions.map((faction) => (
                                                <div key={faction._id} className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-[#151821]' : 'bg-stone-100'}`}>
                                                        <Shield size={14} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                                            {faction.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Lore Tab */}
                    {activeTab === 'lore' && (
                        <motion.div
                            key="lore"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {lore && lore.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {lore.map((entry, idx) => (
                                        <motion.div
                                            key={entry._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className={`p-6 rounded-2xl border ${dark ? 'bg-[#1a1d2e] border-[#2a2d3e]' : 'bg-white border-stone-200'}`}
                                        >
                                            {entry.category && (
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-[#D4AF37]' : 'text-indigo-600'}`}>
                                                    {entry.category}
                                                </span>
                                            )}
                                            <h3 className={`text-xl font-serif font-bold mt-1 mb-3 ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                                {entry.title}
                                            </h3>
                                            <p className={`leading-relaxed ${dark ? 'text-gray-400' : 'text-stone-600'}`}>
                                                {entry.content}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<Scroll size={48} />}
                                    title="No Lore Yet"
                                    description="The history of this realm remains unwritten..."
                                    dark={dark}
                                />
                            )}
                        </motion.div>
                    )}

                    {/* NPCs Tab */}
                    {activeTab === 'npcs' && (
                        <motion.div
                            key="npcs"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {npcs && npcs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {npcs.map((npc, idx) => (
                                        <motion.div
                                            key={npc._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={`p-6 rounded-2xl border group hover:shadow-lg transition-all ${dark ? 'bg-[#1a1d2e] border-[#2a2d3e] hover:border-[#D4AF37]/30' : 'bg-white border-stone-200 hover:border-indigo-200'}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-serif font-bold shrink-0 ${dark ? 'bg-[#151821] text-[#D4AF37]' : 'bg-stone-100 text-indigo-600'}`}>
                                                    {npc.name[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`font-bold text-lg truncate group-hover:text-[#D4AF37] transition-colors ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                                        {npc.name}
                                                    </h3>
                                                    <p className={`text-sm ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                                        {npc.role}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                            npc.attitude === 'Hostile'
                                                                ? 'bg-red-500/20 text-red-400'
                                                                : npc.attitude === 'Friendly'
                                                                    ? 'bg-green-500/20 text-green-400'
                                                                    : dark ? 'bg-[#2a2d3e] text-gray-400' : 'bg-stone-100 text-stone-500'
                                                        }`}>
                                                            {npc.attitude}
                                                        </span>
                                                        {npc.willTrade && (
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${dark ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-amber-100 text-amber-600'}`}>
                                                                Trader
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className={`mt-4 text-sm line-clamp-3 ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                                {npc.description}
                                            </p>
                                            {npc.health && (
                                                <div className="mt-4 flex items-center gap-4 text-xs">
                                                    <div className="flex items-center gap-1">
                                                        <Heart size={12} className="text-red-400" />
                                                        <span className={dark ? 'text-gray-400' : 'text-stone-500'}>
                                                            {npc.health}/{npc.maxHealth}
                                                        </span>
                                                    </div>
                                                    {npc.gold !== undefined && npc.gold > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Coins size={12} className="text-[#D4AF37]" />
                                                            <span className={dark ? 'text-gray-400' : 'text-stone-500'}>
                                                                {npc.gold}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<User size={48} />}
                                    title="No NPCs Yet"
                                    description="This realm awaits its inhabitants..."
                                    dark={dark}
                                />
                            )}
                        </motion.div>
                    )}

                    {/* Shops Tab */}
                    {activeTab === 'shops' && (
                        <motion.div
                            key="shops"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {shops && shops.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {shops.map((shop, idx) => (
                                        <motion.div
                                            key={shop._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={`p-6 rounded-2xl border group hover:shadow-lg transition-all ${dark ? 'bg-[#1a1d2e] border-[#2a2d3e] hover:border-[#D4AF37]/30' : 'bg-white border-stone-200 hover:border-indigo-200'}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dark ? 'bg-[#151821]' : 'bg-stone-100'}`}>
                                                    <Store size={20} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={`font-bold text-lg group-hover:text-[#D4AF37] transition-colors ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                                        {shop.name}
                                                    </h3>
                                                    <p className={`text-sm ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                                        {shop.type.charAt(0).toUpperCase() + shop.type.slice(1)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className={`mt-4 text-sm line-clamp-2 ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                                {shop.description}
                                            </p>
                                            <div className={`mt-4 pt-4 border-t flex items-center justify-between ${dark ? 'border-[#2a2d3e]' : 'border-stone-200'}`}>
                                                <span className={`text-xs ${dark ? 'text-gray-500' : 'text-stone-400'}`}>
                                                    {shop.locationName}
                                                </span>
                                                <span className={`text-xs font-bold ${dark ? 'text-gray-400' : 'text-stone-500'}`}>
                                                    {shop.inventory?.length || 0} items
                                                </span>
                                            </div>
                                            {shop.shopkeeperName && (
                                                <div className={`mt-2 text-xs ${dark ? 'text-gray-500' : 'text-stone-400'}`}>
                                                    Run by <span className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'}>{shop.shopkeeperName}</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<Store size={48} />}
                                    title="No Shops Yet"
                                    description="This realm has no merchants... yet."
                                    dark={dark}
                                />
                            )}
                        </motion.div>
                    )}

                    {/* Locations Tab */}
                    {activeTab === 'locations' && (
                        <motion.div
                            key="locations"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {locations && locations.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {locations.map((location, idx) => (
                                        <motion.div
                                            key={location._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={`p-6 rounded-2xl border group hover:shadow-lg transition-all ${dark ? 'bg-[#1a1d2e] border-[#2a2d3e] hover:border-[#D4AF37]/30' : 'bg-white border-stone-200 hover:border-indigo-200'}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dark ? 'bg-[#151821]' : 'bg-stone-100'}`}>
                                                    <MapPin size={20} className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={`font-bold text-lg group-hover:text-[#D4AF37] transition-colors ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>
                                                        {location.name}
                                                    </h3>
                                                    <p className={`text-sm ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                                        {location.type}
                                                    </p>
                                                </div>
                                                {location.neighbors && location.neighbors.length > 0 && (
                                                    <span className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-[#2a2d3e] text-gray-400' : 'bg-stone-100 text-stone-500'}`}>
                                                        {location.neighbors.length} connections
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`mt-4 text-sm ${dark ? 'text-gray-500' : 'text-stone-500'}`}>
                                                {location.description}
                                            </p>
                                            {location.environment && (
                                                <p className={`mt-2 text-xs italic ${dark ? 'text-gray-600' : 'text-stone-400'}`}>
                                                    {location.environment}
                                                </p>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<Map size={48} />}
                                    title="No Locations Yet"
                                    description="The map of this realm remains blank..."
                                    dark={dark}
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Floating CTA */}
            <div className={`fixed bottom-8 right-8 z-40`}>
                <Link href={`/play-df/${campaignId}`}>
                    <button className={`px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest shadow-2xl flex items-center gap-2 hover:-translate-y-1 transition-all ${
                        dark
                            ? 'bg-[#D4AF37] text-[#0f1119] hover:bg-[#eac88f]'
                            : 'bg-stone-900 text-white hover:bg-black'
                    }`}>
                        <Play size={16} fill="currentColor" /> Play Now
                    </button>
                </Link>
            </div>
        </div>
    );
}

// Helper Components
const StatItem = ({ icon, label, value, dark }: { icon: React.ReactNode; label: string; value: number; dark: boolean }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className={dark ? 'text-[#D4AF37]' : 'text-indigo-600'}>{icon}</div>
            <span className={`text-sm ${dark ? 'text-gray-400' : 'text-stone-600'}`}>{label}</span>
        </div>
        <span className={`font-bold ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>{value}</span>
    </div>
);

const EmptyState = ({ icon, title, description, dark }: { icon: React.ReactNode; title: string; description: string; dark: boolean }) => (
    <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed ${dark ? 'border-[#2a2d3e]' : 'border-stone-200'}`}>
        <div className={dark ? 'text-gray-600' : 'text-stone-300'}>{icon}</div>
        <h3 className={`mt-4 text-xl font-serif font-bold ${dark ? 'text-[#e8e6e3]' : 'text-stone-800'}`}>{title}</h3>
        <p className={`mt-2 text-sm ${dark ? 'text-gray-500' : 'text-stone-500'}`}>{description}</p>
    </div>
);
