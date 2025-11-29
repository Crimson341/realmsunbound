"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Plus, Map, Settings, ChevronRight, Crown, Shield, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { useTheme } from '@/components/ThemeProvider';
import { motion } from 'framer-motion';

const StarPattern = () => (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
         style={{ 
             backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)', 
             backgroundSize: '32px 32px' 
         }} 
    />
);

const DivineLoader = ({ dark }: { dark?: boolean }) => (
    <div className={`flex flex-col items-center justify-center h-screen overflow-hidden relative selection:bg-[#D4AF37] selection:text-white ${dark ? 'bg-[#0f1119]' : 'bg-[#fcfcfc]'}`}>
        <div className={`absolute inset-0 ${dark ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1d2e]/50 via-[#0f1119] to-[#0f1119]' : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-50/50 via-white to-white'}`} />
        <StarPattern />
        <div className="relative z-10 flex flex-col items-center gap-8">
            <div className="relative w-40 h-40 flex items-center justify-center">
                <motion.div 
                    className={`absolute inset-0 border-4 rounded-full ${dark ? 'border-[#2a2d3e]' : 'border-[#e8e0c5]'}`}
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
            <p className={`font-serif tracking-[0.2em] text-sm font-bold uppercase ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>
                Loading Realms
            </p>
        </div>
    </div>
);

export default function ForgeDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    const campaigns = useQuery(api.forge.getMyCampaigns);
    const isLoading = !campaigns;

    // Seed mutations
    const seedDragonBall = useMutation(api.forge.seedDragonBall);
    const [seeding, setSeeding] = useState(false);

    const handleSeedDragonBall = async () => {
        setSeeding(true);
        try {
            const result = await seedDragonBall();
            if (result.success) {
                window.location.href = `/forge/campaign/${result.campaignId}`;
            }
        } catch (e) {
            console.error('Failed to seed Dragon Ball campaign:', e);
            setSeeding(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            window.location.href = '/sign-in';
        }
    }, [user, authLoading]);

    if (authLoading || !user || isLoading) {
        return <DivineLoader dark={dark} />;
    }

    return (
        <div className={`min-h-screen font-serif selection:bg-[#D4AF37] selection:text-white relative overflow-hidden p-6 md:p-12 ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-[#f8f9fa] text-[#43485C]'}`}>
            
            {/* Background */}
            <div className={`fixed inset-0 z-0 pointer-events-none ${dark ? 'bg-[#0a0c12]' : 'bg-[#fcfcfc]'}`}>
                 <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                 <StarPattern />
                 <div className={`absolute inset-0 ${dark ? 'bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0)_50%,rgba(212,175,55,0.02)_100%)]' : 'bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0)_50%,rgba(212,175,55,0.03)_100%)]'}`} />
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
                        <h1 className={`text-5xl font-bold tracking-tight drop-shadow-sm ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>The Forge</h1>
                        <p className={`mt-4 font-sans max-w-lg leading-relaxed ${dark ? 'text-[#e8e6e3]/60' : 'text-[#43485C]/60'}`}>
                            Craft your legends. Shape the geography, history, and destiny of your worlds.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                         <button
                            onClick={handleSeedDragonBall}
                            disabled={seeding}
                            className={`h-12 px-6 rounded-full border font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 ${dark ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' : 'border-orange-500/30 text-orange-600 hover:bg-orange-500/5'}`}
                        >
                            {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            <span className="hidden md:inline">{seeding ? 'Creating...' : 'Dragon Ball'}</span>
                        </button>
                         <Link href="/settings">
                            <button className={`h-12 px-6 rounded-full border font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 ${dark ? 'border-[#D4AF37]/30 text-[#e8e6e3] hover:bg-[#D4AF37]/10' : 'border-[#D4AF37]/30 text-[#43485C] hover:bg-[#D4AF37]/5'}`}>
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

                {/* Campaigns Grid */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <h2 className={`text-2xl font-bold flex items-center gap-3 ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>
                            <Map className="text-[#D4AF37]" size={24} />
                            My Realms
                        </h2>
                        <div className="flex items-center gap-2 text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
                            <span>{campaigns.length} Worlds</span>
                        </div>
                    </div>

                    {campaigns.length === 0 ? (
                        <div className={`border-2 border-dashed rounded-3xl p-16 text-center flex flex-col items-center ${dark ? 'bg-[#1a1d2e]/40 border-[#D4AF37]/20' : 'bg-white/40 border-[#D4AF37]/20'}`}>
                            <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] mb-6">
                                <Map size={32} />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>Uncharted Territory</h3>
                            <p className={`max-w-md mb-8 font-sans ${dark ? 'text-[#e8e6e3]/60' : 'text-[#43485C]/60'}`}>You haven&apos;t created any worlds yet. The void awaits your command.</p>
                            <Link href="/forge/create/campaign">
                                <button className={`px-8 py-3 rounded-full font-bold text-sm uppercase tracking-widest shadow-lg transition-all ${dark ? 'bg-[#D4AF37] text-white hover:bg-[#c9a432]' : 'bg-[#43485C] text-white hover:bg-[#2d3142]'}`}>
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
                                        <div className={`group relative rounded-[2rem] p-2 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border ${dark ? 'bg-[#1a1d2e] border-[#D4AF37]/10' : 'bg-white border-[#D4AF37]/10'}`}>
                                            {/* Image / Preview Area */}
                                            <div className={`relative aspect-[16/9] rounded-[1.5rem] overflow-hidden mb-4 ${dark ? 'bg-[#151821]' : 'bg-[#f0f0f0]'}`}>
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
                                                    <h3 className={`font-bold text-xl group-hover:text-[#D4AF37] transition-colors font-serif ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>
                                                        {campaign.title}
                                                    </h3>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity -mr-2 ${dark ? 'bg-[#151821]' : 'bg-[#f8f9fa]'}`}>
                                                        <ChevronRight size={18} />
                                                    </div>
                                                </div>
                                                <p className={`text-sm font-sans line-clamp-2 leading-relaxed mb-4 h-10 ${dark ? 'text-[#e8e6e3]/60' : 'text-[#43485C]/60'}`}>
                                                    {campaign.description || "No description provided."}
                                                </p>
                                                
                                                <div className={`flex items-center gap-4 pt-4 border-t ${dark ? 'border-[#2a2d3e]' : 'border-[#f0f0f0]'}`}>
                                                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${dark ? 'text-[#e8e6e3]/40' : 'text-[#43485C]/40'}`}>
                                                        <Shield size={12} />
                                                        <span>{campaign.playCount || 0} Heroes</span>
                                                    </div>
                                                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${dark ? 'text-[#e8e6e3]/40' : 'text-[#43485C]/40'}`}>
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
                                    <div className={`h-full min-h-[320px] rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 group transition-all cursor-pointer ${dark ? 'bg-[#151821] border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5' : 'bg-[#f8f9fa] border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5'}`}>
                                        <div className={`w-16 h-16 rounded-full shadow-sm flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform ${dark ? 'bg-[#1a1d2e]' : 'bg-white'}`}>
                                            <Plus size={24} />
                                        </div>
                                        <p className={`font-bold uppercase tracking-widest text-sm ${dark ? 'text-[#e8e6e3]/60' : 'text-[#43485C]/60'}`}>Forge New Realm</p>
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
