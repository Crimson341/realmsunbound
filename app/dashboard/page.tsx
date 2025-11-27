'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import {
    Shield, Map, User, Plus, Scroll,
    Crown, ChevronRight, Bell,
    Settings, Compass, Zap,
    Backpack, Sword, Gamepad2, Hammer,
    Sparkles, BookOpen, Moon, Sun
} from 'lucide-react';

const FALLBACK_IMAGE = '/assets/image.png';

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
    imageUrl?: string;
    playerCount?: number;
}

interface HeroCharacter {
    _id: string;
    name: string;
    class: string;
    level: number;
    stats: string;
    campaignId?: string;
    campaignTitle: string;
    campaignImageUrl: string | null;
    characterImageUrl: string | null;
    itemCount: number;
    spellCount: number;
    inventoryPreview: Array<{
        _id: string;
        name: string;
        type: string;
        rarity: string;
        textColor?: string;
    }>;
}

// --- CONSTELLATION BACKGROUND ---
const ConstellationBg = ({ dark }: { dark: boolean }) => {
    const stars = useMemo(() =>
        Array.from({ length: 60 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 3,
            opacity: Math.random() * 0.5 + 0.2
        })), []
    );

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Base gradient */}
            <div className={`absolute inset-0 ${
                dark
                    ? 'bg-gradient-to-br from-[#0a0c14] via-[#0f1119] to-[#141825]'
                    : 'bg-gradient-to-br from-[#faf9f7] via-[#f5f3ef] to-[#ebe7df]'
            }`} />

            {/* Ink texture overlay */}
            <div className={`absolute inset-0 opacity-[0.03] mix-blend-multiply`}
                 style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                 }}
            />

            {/* Celestial glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[120px] ${
                dark ? 'bg-indigo-900/10' : 'bg-amber-200/20'
            }`} />

            {/* Corner vignette */}
            <div className={`absolute inset-0 ${
                dark
                    ? 'bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]'
                    : 'bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.03)_100%)]'
            }`} />

            {/* Stars */}
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className={`absolute rounded-full ${dark ? 'bg-amber-200' : 'bg-amber-600'}`}
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                        opacity: star.opacity * (dark ? 1 : 0.4),
                    }}
                    animate={{
                        opacity: [star.opacity * (dark ? 1 : 0.4), star.opacity * (dark ? 0.3 : 0.1), star.opacity * (dark ? 1 : 0.4)],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 3 + star.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: star.delay,
                    }}
                />
            ))}
        </div>
    );
};

// --- DIVINE LOADER ---
const DivineLoader = ({ dark }: { dark: boolean }) => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${dark ? 'bg-[#0a0c14]' : 'bg-[#faf9f7]'}`}>
        <ConstellationBg dark={dark} />

        <div className="relative z-10 flex flex-col items-center">
            {/* Orbital rings */}
            <div className="relative w-40 h-40">
                <motion.div
                    className={`absolute inset-0 rounded-full border ${dark ? 'border-amber-500/20' : 'border-amber-600/20'}`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className={`absolute inset-4 rounded-full border border-dashed ${dark ? 'border-indigo-400/30' : 'border-indigo-500/20'}`}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className={`absolute inset-8 rounded-full border ${dark ? 'border-amber-400/40' : 'border-amber-500/30'}`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />

                {/* Center compass */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <div className={`p-4 rounded-2xl backdrop-blur-sm ${
                        dark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-600/10 border border-amber-600/20'
                    }`}>
                        <Compass className={dark ? 'text-amber-400' : 'text-amber-600'} size={28} />
                    </div>
                </motion.div>
            </div>

            {/* Loading text */}
            <motion.div
                className="mt-10 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <p className={`font-serif text-lg tracking-[0.3em] uppercase ${dark ? 'text-amber-200/70' : 'text-amber-700/70'}`}>
                    Opening Codex
                </p>
                <div className={`mt-4 flex gap-1.5 justify-center`}>
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className={`w-2 h-2 rounded-full ${dark ? 'bg-amber-400' : 'bg-amber-600'}`}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    </div>
);

// --- MAIN DASHBOARD ---
export default function UserDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { theme, mounted, toggleTheme } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    const [activeTab, setActiveTab] = useState<'playing' | 'creating'>('playing');
    const [showLoader, setShowLoader] = useState(true);

    // Data
    const myCampaigns = useQuery(api.forge.getMyCampaigns);
    const playedCampaigns = useQuery(api.forge.getPlayedCampaigns);
    const heroesStats = useQuery(api.forge.getMyHeroesStats);

    const isDataLoading = !myCampaigns || !playedCampaigns || !heroesStats;

    useEffect(() => {
        const timer = setTimeout(() => setShowLoader(false), 1800);
        return () => clearTimeout(timer);
    }, []);

    if (authLoading || isDataLoading || showLoader) {
        return <DivineLoader dark={dark} />;
    }

    const stats = activeTab === 'playing'
        ? [
            { label: 'Total Level', value: heroesStats?.totalLevel || 0, icon: Shield, color: 'text-amber-500' },
            { label: 'Heroes', value: heroesStats?.characters?.length || 0, icon: Sword, color: 'text-indigo-400' },
            { label: 'Relics', value: heroesStats?.totalItems || 0, icon: Crown, color: 'text-rose-400' },
            { label: 'Spells', value: heroesStats?.totalSpells || 0, icon: Scroll, color: 'text-cyan-400' },
        ]
        : [
            { label: 'Realms', value: myCampaigns?.length || 0, icon: Map, color: 'text-amber-500' },
            { label: 'Players', value: myCampaigns?.reduce((acc, c) => acc + (c.playerCount || 0), 0) || 0, icon: User, color: 'text-indigo-400' },
        ];

    return (
        <div className={`min-h-screen relative ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
            <ConstellationBg dark={dark} />

            {/* === MAIN CONTENT === */}
            <div className="relative z-10 min-h-screen">

                {/* --- TOP BAR --- */}
                <motion.header
                    className={`sticky top-0 z-40 backdrop-blur-xl border-b ${
                        dark ? 'bg-[#0a0c14]/80 border-white/5' : 'bg-white/60 border-black/5'
                    }`}
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        {/* Logo / Title */}
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${dark ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
                                <BookOpen className={dark ? 'text-amber-400' : 'text-amber-600'} size={22} />
                            </div>
                            <div>
                                <h1 className="font-serif text-2xl font-bold tracking-tight">
                                    Chronicle
                                </h1>
                                <p className={`text-[10px] uppercase tracking-[0.25em] ${dark ? 'text-amber-400/60' : 'text-amber-600/60'}`}>
                                    Personal Archives
                                </p>
                            </div>
                        </div>

                        {/* Right actions */}
                        <div className="flex items-center gap-3">
                            {/* Theme toggle */}
                            <button
                                onClick={toggleTheme}
                                className={`p-2.5 rounded-xl transition-all ${
                                    dark
                                        ? 'bg-white/5 hover:bg-white/10 text-amber-300'
                                        : 'bg-black/5 hover:bg-black/10 text-amber-600'
                                }`}
                            >
                                {dark ? <Sun size={18} /> : <Moon size={18} />}
                            </button>

                            {/* Notifications */}
                            <button className={`relative p-2.5 rounded-xl transition-all ${
                                dark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
                            }`}>
                                <Bell size={18} className={dark ? 'text-gray-400' : 'text-gray-600'} />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
                            </button>

                            {/* Profile */}
                            <Link href="/settings" className="flex items-center gap-3 ml-2">
                                <div className={`relative w-10 h-10 rounded-xl overflow-hidden ring-2 ${
                                    dark ? 'ring-amber-500/30' : 'ring-amber-400/40'
                                }`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${user?.firstName}&background=d4af37&color=fff`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </Link>
                        </div>
                    </div>
                </motion.header>

                {/* --- HERO SECTION --- */}
                <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
                    <motion.div
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        {/* Greeting */}
                        <div>
                            <motion.p
                                className={`text-sm uppercase tracking-[0.2em] mb-2 ${dark ? 'text-amber-400/60' : 'text-amber-600/70'}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                Welcome back, Traveler
                            </motion.p>
                            <motion.h2
                                className="font-serif text-4xl md:text-5xl font-bold"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <span className={dark ? 'text-white' : 'text-gray-900'}>
                                    {user?.firstName || 'Adventurer'}
                                </span>
                                <span className={dark ? 'text-amber-400' : 'text-amber-500'}>.</span>
                            </motion.h2>
                        </div>

                        {/* Tab Switcher */}
                        <motion.div
                            className={`inline-flex p-1.5 rounded-2xl ${dark ? 'bg-white/5' : 'bg-black/5'}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {(['playing', 'creating'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                                        activeTab === tab
                                            ? dark
                                                ? 'text-amber-900'
                                                : 'text-white'
                                            : dark
                                                ? 'text-gray-400 hover:text-gray-200'
                                                : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className={`absolute inset-0 rounded-xl ${dark ? 'bg-amber-400' : 'bg-amber-500'}`}
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative z-10">
                                        {tab === 'playing' ? <Gamepad2 size={16} /> : <Hammer size={16} />}
                                    </span>
                                    <span className="relative z-10 hidden sm:inline">{tab}</span>
                                </button>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>

                {/* --- STATS ROW --- */}
                <div className="max-w-7xl mx-auto px-6 pb-8">
                    <motion.div
                        className={`flex flex-wrap gap-4 md:gap-8 p-6 rounded-3xl ${
                            dark ? 'bg-white/[0.02] border border-white/5' : 'bg-white/50 border border-black/5 shadow-sm'
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                className="flex items-center gap-4 flex-1 min-w-[140px]"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                            >
                                <div className={`p-3 rounded-2xl ${dark ? 'bg-white/5' : 'bg-black/5'}`}>
                                    <stat.icon className={stat.color} size={22} />
                                </div>
                                <div>
                                    <p className="font-serif text-3xl font-bold tracking-tight">{stat.value}</p>
                                    <p className={`text-[11px] uppercase tracking-[0.15em] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {stat.label}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* --- MAIN CONTENT --- */}
                <div className="max-w-7xl mx-auto px-6 pb-20">
                    <AnimatePresence mode="wait">
                        {activeTab === 'playing' ? (
                            <motion.div
                                key="playing"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-12"
                            >
                                {/* Heroes Section */}
                                <section>
                                    <SectionHeader
                                        title="Heroes"
                                        subtitle="Your legendary characters"
                                        icon={<Sword size={20} />}
                                        dark={dark}
                                    />

                                    {heroesStats?.characters && heroesStats.characters.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {heroesStats.characters.map((hero: HeroCharacter, i: number) => (
                                                <motion.div
                                                    key={hero._id}
                                                    initial={{ opacity: 0, y: 30 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                >
                                                    <HeroCard hero={hero} dark={dark} />
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={<Sword size={40} />}
                                            title="No heroes yet"
                                            description="Begin your journey by joining a realm"
                                            action={{ label: "Browse Realms", href: "/realms" }}
                                            dark={dark}
                                        />
                                    )}
                                </section>

                                {/* Active Campaigns */}
                                <section>
                                    <SectionHeader
                                        title="Active Adventures"
                                        subtitle="Continue your quests"
                                        icon={<Compass size={20} />}
                                        dark={dark}
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {playedCampaigns && playedCampaigns.length > 0 ? (
                                            <>
                                                {playedCampaigns.map((campaign: Campaign, i: number) => (
                                                    <motion.div
                                                        key={campaign._id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.1 }}
                                                    >
                                                        <AdventureCard campaign={campaign} dark={dark} />
                                                    </motion.div>
                                                ))}
                                            </>
                                        ) : null}

                                        {/* Browse more */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: (playedCampaigns?.length || 0) * 0.1 }}
                                        >
                                            <Link href="/realms" className="block h-full">
                                                <div className={`h-full min-h-[100px] flex items-center justify-center gap-4 p-6 rounded-2xl border-2 border-dashed transition-all ${
                                                    dark
                                                        ? 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5 text-amber-400/60 hover:text-amber-400'
                                                        : 'border-amber-400/30 hover:border-amber-500/50 hover:bg-amber-50 text-amber-600/60 hover:text-amber-600'
                                                }`}>
                                                    <Compass size={20} />
                                                    <span className="font-bold text-sm uppercase tracking-wider">Explore Realms</span>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="creating"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <section>
                                    <div className="flex items-center justify-between mb-8">
                                        <SectionHeader
                                            title="My Realms"
                                            subtitle="Worlds you've forged"
                                            icon={<Map size={20} />}
                                            dark={dark}
                                        />
                                        <Link href="/forge/create/campaign">
                                            <motion.button
                                                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                                                    dark
                                                        ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                                                        : 'bg-amber-500 text-white hover:bg-amber-600'
                                                }`}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Sparkles size={16} />
                                                Create Realm
                                            </motion.button>
                                        </Link>
                                    </div>

                                    {myCampaigns && myCampaigns.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {myCampaigns.map((campaign, i: number) => (
                                                <motion.div
                                                    key={campaign._id}
                                                    initial={{ opacity: 0, y: 30 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                >
                                                    <RealmCard campaign={campaign} dark={dark} />
                                                </motion.div>
                                            ))}

                                            {/* Create new realm card */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: myCampaigns.length * 0.1 }}
                                            >
                                                <Link href="/forge/create/campaign" className="block h-full">
                                                    <div className={`h-full min-h-[320px] flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed transition-all group ${
                                                        dark
                                                            ? 'border-amber-500/20 hover:border-amber-500/40 bg-white/[0.01] hover:bg-amber-500/5'
                                                            : 'border-amber-400/30 hover:border-amber-500/50 bg-amber-50/30 hover:bg-amber-50'
                                                    }`}>
                                                        <div className={`p-5 rounded-2xl transition-transform group-hover:scale-110 ${
                                                            dark ? 'bg-amber-500/10' : 'bg-amber-100'
                                                        }`}>
                                                            <Plus className={dark ? 'text-amber-400' : 'text-amber-600'} size={28} />
                                                        </div>
                                                        <p className={`font-bold uppercase tracking-[0.15em] text-sm ${
                                                            dark ? 'text-amber-400/60' : 'text-amber-600/60'
                                                        }`}>
                                                            Forge New Realm
                                                        </p>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={<Map size={40} />}
                                            title="No realms yet"
                                            description="Create your first world and invite players"
                                            action={{ label: "Create Realm", href: "/forge/create/campaign" }}
                                            dark={dark}
                                        />
                                    )}
                                </section>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* --- FLOATING NAV --- */}
                <motion.nav
                    className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-2xl backdrop-blur-xl shadow-2xl ${
                        dark
                            ? 'bg-[#1a1d2e]/90 border border-white/10'
                            : 'bg-white/90 border border-black/10'
                    }`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring", bounce: 0.3 }}
                >
                    <NavItem href="/dashboard" icon={<BookOpen size={20} />} label="Chronicle" active dark={dark} />
                    <NavItem href="/forge" icon={<Hammer size={20} />} label="Forge" dark={dark} />
                    <NavItem href="/realms" icon={<Compass size={20} />} label="Realms" dark={dark} />
                    <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" dark={dark} />
                </motion.nav>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const SectionHeader = ({ title, subtitle, icon, dark }: { title: string; subtitle: string; icon: React.ReactNode; dark: boolean }) => (
    <div className="flex items-center gap-4 mb-8">
        <div className={`p-3 rounded-xl ${dark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
            {icon}
        </div>
        <div>
            <h3 className="font-serif text-2xl font-bold">{title}</h3>
            <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>
        </div>
    </div>
);

const NavItem = ({ href, icon, label, active, dark }: { href: string; icon: React.ReactNode; label: string; active?: boolean; dark: boolean }) => (
    <Link
        href={href}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
            active
                ? dark
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-amber-100 text-amber-600'
                : dark
                    ? 'text-gray-400 hover:text-amber-400 hover:bg-white/5'
                    : 'text-gray-500 hover:text-amber-600 hover:bg-black/5'
        }`}
    >
        {icon}
        <span className="text-sm font-bold hidden sm:inline">{label}</span>
    </Link>
);

const EmptyState = ({ icon, title, description, action, dark }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action: { label: string; href: string };
    dark: boolean;
}) => (
    <div className={`text-center py-16 px-8 rounded-3xl border-2 border-dashed ${
        dark ? 'border-white/10 bg-white/[0.01]' : 'border-black/10 bg-black/[0.01]'
    }`}>
        <div className={`inline-flex p-5 rounded-2xl mb-6 ${dark ? 'bg-white/5 text-gray-500' : 'bg-black/5 text-gray-400'}`}>
            {icon}
        </div>
        <p className={`font-serif text-xl font-bold mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{title}</p>
        <p className={`text-sm mb-6 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{description}</p>
        <Link href={action.href}>
            <motion.button
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider ${
                    dark
                        ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <Compass size={16} />
                {action.label}
            </motion.button>
        </Link>
    </div>
);

const HeroCard = ({ hero, dark }: { hero: HeroCharacter; dark: boolean }) => {
    const maxLevel = 90;
    const levelProgress = (hero.level / maxLevel) * 100;

    let parsedStats: Record<string, number> = {};
    try {
        parsedStats = JSON.parse(hero.stats || '{}');
    } catch {
        parsedStats = {};
    }

    const statEntries = Object.entries(parsedStats).slice(0, 4);

    return (
        <Link href={hero.campaignId ? `/play/${hero.campaignId}` : '#'}>
            <motion.div
                className={`group relative overflow-hidden rounded-3xl transition-all duration-300 ${
                    dark
                        ? 'bg-[#151821] hover:bg-[#1a1e2a] ring-1 ring-white/5 hover:ring-amber-500/20'
                        : 'bg-white hover:shadow-xl shadow-md ring-1 ring-black/5 hover:ring-amber-400/30'
                }`}
                whileHover={{ y: -4 }}
            >
                {/* Header image */}
                <div className="relative h-28 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={hero.campaignImageUrl || FALLBACK_IMAGE}
                        alt={hero.campaignTitle}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Campaign name */}
                    <div className="absolute bottom-3 left-4 right-16">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 truncate">
                            {hero.campaignTitle}
                        </p>
                    </div>

                    {/* Character avatar */}
                    <div className={`absolute -bottom-7 right-4 w-16 h-16 rounded-2xl overflow-hidden ring-4 shadow-lg ${
                        dark ? 'ring-[#151821]' : 'ring-white'
                    }`}>
                        {hero.characterImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={hero.characterImageUrl} alt={hero.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center text-xl font-serif font-bold ${
                                dark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                            }`}>
                                {hero.name[0]}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 pt-3">
                    <div className="mb-4">
                        <h4 className={`font-serif text-xl font-bold group-hover:text-amber-500 transition-colors ${
                            dark ? 'text-white' : 'text-gray-900'
                        }`}>
                            {hero.name}
                        </h4>
                        <p className={`text-xs uppercase tracking-[0.15em] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {hero.class}
                        </p>
                    </div>

                    {/* Level bar */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-[10px] uppercase tracking-wider font-bold ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Level
                            </span>
                            <span className={`text-sm font-bold ${dark ? 'text-amber-400' : 'text-amber-500'}`}>
                                {hero.level}/{maxLevel}
                            </span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-white/5' : 'bg-black/5'}`}>
                            <motion.div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${levelProgress}%` }}
                                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    {statEntries.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {statEntries.map(([key, value]) => (
                                <div key={key} className={`px-3 py-2 rounded-xl ${dark ? 'bg-white/5' : 'bg-black/[0.02]'}`}>
                                    <p className={`text-[9px] uppercase tracking-wider ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {key}
                                    </p>
                                    <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Items & Spells */}
                    <div className={`flex items-center gap-4 pt-4 border-t ${dark ? 'border-white/5' : 'border-black/5'}`}>
                        <div className="flex items-center gap-2">
                            <Backpack size={14} className="text-rose-400" />
                            <span className={`text-xs font-bold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {hero.itemCount}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Scroll size={14} className="text-cyan-400" />
                            <span className={`text-xs font-bold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {hero.spellCount}
                            </span>
                        </div>
                        <ChevronRight size={16} className={`ml-auto transition-transform group-hover:translate-x-1 ${
                            dark ? 'text-gray-600 group-hover:text-amber-400' : 'text-gray-300 group-hover:text-amber-500'
                        }`} />
                    </div>
                </div>
            </motion.div>
        </Link>
    );
};

const AdventureCard = ({ campaign, dark }: { campaign: Campaign; dark: boolean }) => (
    <Link href={`/play/${campaign._id}`}>
        <motion.div
            className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                dark
                    ? 'bg-white/[0.02] hover:bg-white/[0.05] ring-1 ring-white/5 hover:ring-amber-500/20'
                    : 'bg-white hover:shadow-md shadow-sm ring-1 ring-black/5 hover:ring-amber-400/20'
            }`}
            whileHover={{ x: 4 }}
        >
            {/* Character avatar */}
            <div className={`w-14 h-14 rounded-xl overflow-hidden ring-2 flex-shrink-0 ${
                dark ? 'ring-amber-500/20' : 'ring-amber-400/20'
            }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={campaign.imageUrl || FALLBACK_IMAGE}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="flex-1 min-w-0">
                <h4 className={`font-serif font-bold text-lg truncate group-hover:text-amber-500 transition-colors ${
                    dark ? 'text-white' : 'text-gray-900'
                }`}>
                    {campaign.character?.name || 'Unknown Hero'}
                </h4>
                <p className={`text-xs truncate ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {campaign.title}
                </p>
                {campaign.creatorName && (
                    <p className={`text-[10px] uppercase tracking-wider mt-1 ${dark ? 'text-amber-500/60' : 'text-amber-600/60'}`}>
                        by {campaign.creatorName}
                    </p>
                )}
            </div>

            <ChevronRight size={18} className={`flex-shrink-0 transition-transform group-hover:translate-x-1 ${
                dark ? 'text-gray-600 group-hover:text-amber-400' : 'text-gray-300 group-hover:text-amber-500'
            }`} />
        </motion.div>
    </Link>
);

const RealmCard = ({ campaign, dark }: { campaign: Campaign; dark: boolean }) => (
    <Link href={`/forge/campaign/${campaign._id}`}>
        <motion.div
            className={`group relative overflow-hidden rounded-3xl transition-all duration-300 ${
                dark
                    ? 'bg-[#151821] hover:bg-[#1a1e2a] ring-1 ring-white/5 hover:ring-amber-500/20'
                    : 'bg-white hover:shadow-xl shadow-md ring-1 ring-black/5 hover:ring-amber-400/30'
            }`}
            whileHover={{ y: -4 }}
        >
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={campaign.imageUrl || FALLBACK_IMAGE}
                    alt={campaign.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* XP badge */}
                <div className="absolute top-4 left-4">
                    <div className={`px-3 py-1.5 rounded-full backdrop-blur-md text-[10px] font-bold uppercase tracking-wider ${
                        dark
                            ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                            : 'bg-white/20 text-white ring-1 ring-white/30'
                    }`}>
                        <Zap size={10} className="inline mr-1" />
                        {campaign.xpRate}x XP
                    </div>
                </div>

                {/* Title overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-serif text-xl font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {campaign.title}
                    </h3>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <p className={`text-sm line-clamp-2 mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {campaign.description || 'No description provided.'}
                </p>

                <div className={`flex items-center gap-4 pt-4 border-t ${dark ? 'border-white/5' : 'border-black/5'}`}>
                    <div className="flex items-center gap-2">
                        <User size={14} className="text-indigo-400" />
                        <span className={`text-xs font-bold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {campaign.playerCount || 0} Players
                        </span>
                    </div>
                    <ChevronRight size={16} className={`ml-auto transition-transform group-hover:translate-x-1 ${
                        dark ? 'text-gray-600 group-hover:text-amber-400' : 'text-gray-300 group-hover:text-amber-500'
                    }`} />
                </div>
            </div>
        </motion.div>
    </Link>
);
