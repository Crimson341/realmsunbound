"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Plus, Map, Loader2, Database, Sparkles, Settings, ChevronRight, Crown, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { motion } from 'framer-motion';

const StarPattern = () => (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
         style={{ 
             backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)', 
             backgroundSize: '32px 32px' 
         }} 
    />
);

const DivineLoader = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-[#fcfcfc] overflow-hidden relative selection:bg-[#D4AF37] selection:text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-50/50 via-white to-white" />
        <StarPattern />
        <div className="relative z-10 flex flex-col items-center gap-8">
            <div className="relative w-40 h-40 flex items-center justify-center">
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
                <Map size={32} className="text-[#D4AF37] relative z-10" />
            </div>
            <p className="text-[#43485C] font-serif tracking-[0.2em] text-sm font-bold uppercase">
                Loading Realms
            </p>
        </div>
    </div>
);

export default function ForgeDashboard() {
    const { user, loading: authLoading } = useAuth();

    const campaigns = useQuery(api.forge.getMyCampaigns);
    const isLoading = !campaigns;

    const seedSkyrim = useMutation(api.forge.seedSkyrim);
    const seedEffectsLibrary = useMutation(api.forge.seedEffectsLibrary);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isSeedingEffects, setIsSeedingEffects] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            window.location.href = '/sign-in';
        }
    }, [user, authLoading]);

    const handleSeedSkyrim = async () => {
        setIsSeeding(true);
        try {
            await seedSkyrim({});
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSeedEffects = async () => {
        setIsSeedingEffects(true);
        try {
            await seedEffectsLibrary({});
        } finally {
            setIsSeedingEffects(false);
        }
    };

    if (authLoading || !user || isLoading) {
        return <DivineLoader />;
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#43485C] font-serif selection:bg-[#D4AF37] selection:text-white relative overflow-hidden p-6 md:p-12">
            
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[#fcfcfc]">
                 <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                 <StarPattern />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0)_50%,rgba(212,175,55,0.03)_100%)]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6"
                >
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-[1px] w-12 bg-[#D4AF37]" />
                            <span className="text-[#D4AF37] font-bold text-xs uppercase tracking-[0.3em]">World Builder</span>
                        </div>
                        <h1 className="text-5xl font-bold text-[#43485C] tracking-tight drop-shadow-sm">The Forge</h1>
                        <p className="text-[#43485C]/60 mt-4 font-sans max-w-lg leading-relaxed">
                            Craft your legends. Shape the geography, history, and destiny of your worlds.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                         <Link href="/settings">
                            <button className="h-12 px-6 rounded-full border border-[#D4AF37]/30 text-[#43485C] font-bold text-sm uppercase tracking-wider hover:bg-[#D4AF37]/5 transition-colors flex items-center gap-2">
                                <Settings size={16} />
                                <span className="hidden md:inline">Studio</span>
                            </button>
                        </Link>
                        <Link href="/forge/create/campaign">
                            <button className="h-12 px-8 bg-[#D4AF37] text-white rounded-full shadow-[0_4px_20px_-5px_rgba(212,175,55,0.5)] hover:shadow-[0_8px_25px_-5px_rgba(212,175,55,0.6)] hover:-translate-y-0.5 transition-all font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                                <Plus size={18} />
                                Create
                            </button>
                        </Link>
                    </div>
                </motion.div>

                {/* Quick Actions / Seeding */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
                >
                    {/* Seed Skyrim Card */}
                    <div 
                        onClick={!isSeeding ? handleSeedSkyrim : undefined}
                        className={`relative group bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-[#D4AF37]/20 cursor-pointer transition-all hover:shadow-lg overflow-hidden ${isSeeding ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37] mb-4 group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                                {isSeeding ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
                            </div>
                            <h3 className="font-bold text-[#43485C] text-lg mb-1">Seed Skyrim</h3>
                            <p className="text-xs text-[#43485C]/60 font-sans leading-relaxed">Import the Elder Scrolls V template world data.</p>
                        </div>
                    </div>

                    {/* Seed Effects Card */}
                    <div 
                        onClick={!isSeedingEffects ? handleSeedEffects : undefined}
                        className={`relative group bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-[#D4AF37]/20 cursor-pointer transition-all hover:shadow-lg overflow-hidden ${isSeedingEffects ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                {isSeedingEffects ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            </div>
                            <h3 className="font-bold text-[#43485C] text-lg mb-1">Seed Magic</h3>
                            <p className="text-xs text-[#43485C]/60 font-sans leading-relaxed">Populate the standard 5e spell and effect library.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Campaigns Grid */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-bold text-[#43485C] flex items-center gap-3">
                            <Map className="text-[#D4AF37]" size={24} />
                            My Realms
                        </h2>
                        <div className="flex items-center gap-2 text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
                            <span>{campaigns.length} Worlds</span>
                        </div>
                    </div>

                    {campaigns.length === 0 ? (
                        <div className="bg-white/40 border-2 border-dashed border-[#D4AF37]/20 rounded-3xl p-16 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] mb-6">
                                <Map size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-[#43485C] mb-2">Uncharted Territory</h3>
                            <p className="text-[#43485C]/60 max-w-md mb-8 font-sans">You haven&apos;t created any worlds yet. The void awaits your command.</p>
                            <Link href="/forge/create/campaign">
                                <button className="px-8 py-3 bg-[#43485C] text-white rounded-full font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-[#2d3142] transition-all">
                                    Begin Creation
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {campaigns.map((campaign, idx) => (
                                <motion.div
                                    key={campaign._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Link href={`/forge/campaign/${campaign._id}`}>
                                        <div className="group relative bg-white rounded-[2rem] p-2 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-[#D4AF37]/10">
                                            {/* Image / Preview Area */}
                                            <div className="relative aspect-[16/9] rounded-[1.5rem] overflow-hidden mb-4 bg-[#f0f0f0]">
                                                {campaign.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                ) : (
                                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                                
                                                {/* Floating Badges */}
                                                <div className="absolute top-4 left-4 flex gap-2">
                                                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/20">
                                                        {campaign.xpRate}x XP
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="px-4 pb-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-xl text-[#43485C] group-hover:text-[#D4AF37] transition-colors font-serif">
                                                        {campaign.title}
                                                    </h3>
                                                    <div className="w-8 h-8 rounded-full bg-[#f8f9fa] flex items-center justify-center text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                                                        <ChevronRight size={18} />
                                                    </div>
                                                </div>
                                                <p className="text-sm text-[#43485C]/60 font-sans line-clamp-2 leading-relaxed mb-4 h-10">
                                                    {campaign.description || "No description provided."}
                                                </p>
                                                
                                                <div className="flex items-center gap-4 pt-4 border-t border-[#f0f0f0]">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-[#43485C]/40 uppercase tracking-wider">
                                                        <Shield size={12} />
                                                        <span>{campaign.playerCount || 0} Heroes</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-[#43485C]/40 uppercase tracking-wider">
                                                        <Crown size={12} />
                                                        <span>DM Mode</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                            
                            {/* Add New Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: campaigns.length * 0.1 }}
                            >
                                <Link href="/forge/create/campaign" className="block h-full">
                                    <div className="h-full min-h-[320px] bg-[#f8f9fa] rounded-[2rem] border-2 border-dashed border-[#D4AF37]/20 flex flex-col items-center justify-center gap-4 group hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all cursor-pointer">
                                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                                            <Plus size={24} />
                                        </div>
                                        <p className="font-bold text-[#43485C]/60 uppercase tracking-widest text-sm">Forge New Realm</p>
                                    </div>
                                </Link>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}