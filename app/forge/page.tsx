"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Plus, Sword, Scroll, Users, Map, Loader2, Database, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

export default function ForgeDashboard() {
    const { user, loading: authLoading } = useAuth();

    const campaigns = useQuery(api.forge.getMyCampaigns);

    const isLoading = !campaigns;

    const seedCampaign = useMutation(api.forge.seedCampaign);
    const seedEffectsLibrary = useMutation(api.forge.seedEffectsLibrary);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isSeedingEffects, setIsSeedingEffects] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            window.location.href = '/sign-in';
        }
    }, [user, authLoading]);

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            await seedCampaign({});
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

    // Show loading while checking auth
    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0f0f14] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans pt-24 px-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-4">The Forge</h1>
                        <p className="text-stone-400 max-w-2xl">
                            Manage your campaigns and build your worlds. This is your creative workshop.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleSeed}
                            disabled={isSeeding}
                            className="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSeeding ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
                            Seed Demo Campaign
                        </button>
                        <button
                            onClick={handleSeedEffects}
                            disabled={isSeedingEffects}
                            className="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSeedingEffects ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            Seed Effects Library
                        </button>
                        <Link href="/forge/create/campaign" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2">
                            <Plus size={20} />
                            Create New Campaign
                        </Link>
                    </div>
                </div>

                {/* Tabs - Removed, showing only Campaigns */}

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-indigo-500" />
                        <p className="text-stone-400">Loading campaigns...</p>
                    </div>
                )}

                {/* Campaigns Section */}
                {!isLoading && campaigns && (
                    <div className="space-y-12">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Map className="text-indigo-400" />
                                    My Campaigns
                                </h2>
                                <Link href="/forge/create/campaign" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-colors">
                                    <Plus size={16} />
                                    New Campaign
                                </Link>
                            </div>
                            {campaigns.length === 0 ? (
                                <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-12 text-center">
                                    <Map className="w-16 h-16 mx-auto mb-4 text-stone-700" />
                                    <p className="text-stone-400 mb-4">No campaigns yet. Create your first campaign to get started!</p>
                                    <Link href="/forge/create/campaign" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                                        <Plus size={20} />
                                        Create Campaign
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {campaigns.map((campaign) => (
                                        <a
                                            key={campaign._id}
                                            href={`/forge/campaign/${campaign._id}`}
                                            className="group bg-stone-900/50 rounded-lg border border-stone-800 hover:border-indigo-500 transition-all p-6 hover:shadow-lg hover:shadow-indigo-500/20"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <h3 className="font-bold text-xl text-white group-hover:text-indigo-400 transition-colors">{campaign.title}</h3>
                                                <Map className="text-stone-600 group-hover:text-indigo-400 transition-colors" />
                                            </div>
                                            <p className="text-stone-400 mb-4 line-clamp-2">{campaign.description}</p>
                                            <div className="text-sm text-stone-500">
                                                <div>XP Rate: {campaign.xpRate}x</div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const Card = ({ title, subtitle, icon: Icon }: { title: string, subtitle: string, icon: any }) => (
    <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 hover:border-indigo-500/50 transition-all group cursor-pointer">
        <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-stone-950 rounded-lg text-indigo-400 group-hover:text-white transition-colors">
                <Icon size={24} />
            </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-stone-500">{subtitle}</p>
    </div>
);

const EmptyState = ({ type }: { type: string }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-stone-800 rounded-xl">
        <div className="p-4 bg-stone-900 rounded-full mb-4 text-stone-600">
            <Scroll size={32} />
        </div>
        <h3 className="text-xl font-bold text-stone-300 mb-2">No {type}s Found</h3>
        <p className="text-stone-500 max-w-md mb-6">
            The archives are empty. Be the first to forge a new {type.toLowerCase()}.
        </p>
        <Link href={`/forge/create/${type.toLowerCase()}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
            Create {type} &rarr;
        </Link>
    </div>
);
