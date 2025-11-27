'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import {
    ChevronLeft, Save, User, Mail, Building2, Calendar,
    Map, Users, Eye, Crown, Zap, Moon, Sun, Shield,
    ExternalLink, Check, Loader2, Camera, Sparkles
} from 'lucide-react';

// Constellation background (reused from dashboard)
const ConstellationBg = ({ dark }: { dark: boolean }) => {
    const stars = useMemo(() =>
        Array.from({ length: 40 }, (_, i) => ({
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
            <div className={`absolute inset-0 ${
                dark
                    ? 'bg-gradient-to-br from-[#0a0c14] via-[#0f1119] to-[#141825]'
                    : 'bg-gradient-to-br from-[#faf9f7] via-[#f5f3ef] to-[#ebe7df]'
            }`} />
            <div className={`absolute inset-0 opacity-[0.03] mix-blend-multiply`}
                 style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                 }}
            />
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className={`absolute rounded-full ${dark ? 'bg-amber-200' : 'bg-amber-600'}`}
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                        opacity: star.opacity * (dark ? 1 : 0.3),
                    }}
                    animate={{
                        opacity: [star.opacity * (dark ? 1 : 0.3), star.opacity * (dark ? 0.3 : 0.1), star.opacity * (dark ? 1 : 0.3)],
                    }}
                    transition={{
                        duration: 3 + star.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
};

// Subscription tier badge
const SubscriptionBadge = ({ tier, dark }: { tier: string; dark: boolean }) => {
    const tiers: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
        free: { color: 'text-gray-400', icon: <User size={14} />, label: 'Free' },
        creator: { color: 'text-amber-500', icon: <Sparkles size={14} />, label: 'Creator' },
        pro: { color: 'text-purple-500', icon: <Crown size={14} />, label: 'Pro' },
    };

    const t = tiers[tier] || tiers.free;

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            dark ? 'bg-white/5' : 'bg-black/5'
        } ${t.color}`}>
            {t.icon}
            {t.label}
        </div>
    );
};

export default function SettingsPage() {
    const { user: authUser, loading: authLoading } = useAuth();
    const { theme, mounted, toggleTheme } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    // Data
    const myProfile = useQuery(api.forge.getMyProfile);
    const myCampaigns = useQuery(api.forge.getMyCampaigns);
    const updateProfile = useMutation(api.forge.updateProfile);

    // Form state
    const [displayName, setDisplayName] = useState('');
    const [studioName, setStudioName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Initialize form from profile
    useEffect(() => {
        if (myProfile) {
            setDisplayName(myProfile.name || '');
            setStudioName(myProfile.studioName || '');
        } else if (authUser) {
            setDisplayName(authUser.firstName || '');
        }
    }, [myProfile, authUser]);

    // Calculate stats
    const stats = useMemo(() => {
        if (!myCampaigns) return { realms: 0, players: 0, views: 0 };
        return {
            realms: myCampaigns.length,
            players: myCampaigns.reduce((acc, c) => acc + (c.playCount || 0), 0),
            views: myCampaigns.reduce((acc, c) => acc + (c.viewCount || 0), 0),
        };
    }, [myCampaigns]);

    // Handle save
    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await updateProfile({
                name: displayName,
                studioName: studioName || undefined,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error('Failed to save profile:', e);
        } finally {
            setSaving(false);
        }
    };

    // Format date
    const memberSince = authUser?.createdAt
        ? new Date(authUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Unknown';

    if (authLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-[#0a0c14]' : 'bg-[#faf9f7]'}`}>
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    return (
        <div className={`min-h-screen relative ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
            <ConstellationBg dark={dark} />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
                {/* Back link */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Link
                        href="/dashboard"
                        className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-8 transition-colors ${
                            dark ? 'text-gray-500 hover:text-amber-400' : 'text-gray-400 hover:text-amber-600'
                        }`}
                    >
                        <ChevronLeft size={16} />
                        Back to Chronicle
                    </Link>
                </motion.div>

                {/* Main layout - GitHub style */}
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* === LEFT SIDEBAR - Profile Card === */}
                    <motion.aside
                        className="lg:w-80 flex-shrink-0"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className={`rounded-3xl overflow-hidden ${
                            dark ? 'bg-[#151821] ring-1 ring-white/5' : 'bg-white shadow-lg ring-1 ring-black/5'
                        }`}>
                            {/* Profile header with avatar */}
                            <div className="p-6 pb-0">
                                {/* Avatar */}
                                <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-6 group">
                                    <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${
                                        dark ? 'bg-amber-500' : 'bg-amber-400'
                                    }`} />
                                    <div className={`relative w-full h-full rounded-full overflow-hidden ring-4 ${
                                        dark ? 'ring-amber-500/20' : 'ring-amber-400/30'
                                    }`}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={authUser?.profilePictureUrl || `https://ui-avatars.com/api/?name=${displayName}&background=d4af37&color=fff&size=200`}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Edit overlay */}
                                        <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                                            dark ? 'bg-black/60' : 'bg-black/50'
                                        }`}>
                                            <Camera className="text-white" size={28} />
                                        </div>
                                    </div>
                                    {/* Status indicator */}
                                    <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 ${
                                        dark ? 'bg-green-500 border-[#151821]' : 'bg-green-500 border-white'
                                    }`} />
                                </div>

                                {/* Name section */}
                                <div className="text-center mb-4">
                                    <h1 className="font-serif text-2xl font-bold mb-1">
                                        {displayName || authUser?.firstName || 'Adventurer'}
                                    </h1>
                                    {studioName && (
                                        <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {studioName}
                                        </p>
                                    )}
                                </div>

                                {/* Subscription badge */}
                                <div className="flex justify-center mb-6">
                                    <SubscriptionBadge tier="free" dark={dark} />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className={`h-px mx-6 ${dark ? 'bg-white/5' : 'bg-black/5'}`} />

                            {/* Meta info */}
                            <div className="p-6 space-y-4">
                                {/* Email */}
                                <div className="flex items-center gap-3">
                                    <Mail size={16} className={dark ? 'text-gray-500' : 'text-gray-400'} />
                                    <span className={`text-sm truncate ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {authUser?.email || 'No email'}
                                    </span>
                                </div>

                                {/* Member since */}
                                <div className="flex items-center gap-3">
                                    <Calendar size={16} className={dark ? 'text-gray-500' : 'text-gray-400'} />
                                    <span className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        Joined {memberSince}
                                    </span>
                                </div>

                                {/* Studio */}
                                {studioName && (
                                    <div className="flex items-center gap-3">
                                        <Building2 size={16} className={dark ? 'text-gray-500' : 'text-gray-400'} />
                                        <span className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {studioName}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className={`h-px mx-6 ${dark ? 'bg-white/5' : 'bg-black/5'}`} />

                            {/* Stats */}
                            <div className="p-6">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <Map size={14} className="text-amber-500" />
                                            <span className="font-serif text-xl font-bold">{stats.realms}</span>
                                        </div>
                                        <p className={`text-[10px] uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Realms
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <Users size={14} className="text-indigo-400" />
                                            <span className="font-serif text-xl font-bold">{stats.players}</span>
                                        </div>
                                        <p className={`text-[10px] uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Players
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <Eye size={14} className="text-cyan-400" />
                                            <span className="font-serif text-xl font-bold">{stats.views}</span>
                                        </div>
                                        <p className={`text-[10px] uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Views
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.aside>

                    {/* === MAIN CONTENT === */}
                    <motion.main
                        className="flex-1 space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {/* Profile Settings */}
                        <section className={`rounded-3xl p-6 ${
                            dark ? 'bg-[#151821] ring-1 ring-white/5' : 'bg-white shadow-lg ring-1 ring-black/5'
                        }`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-2.5 rounded-xl ${dark ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
                                    <User className={dark ? 'text-amber-400' : 'text-amber-600'} size={20} />
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl font-bold">Profile Settings</h2>
                                    <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Manage your public identity
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Display Name */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                                        dark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Your name"
                                        className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                                            dark
                                                ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600'
                                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
                                        }`}
                                    />
                                </div>

                                {/* Studio Name */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                                        dark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        Studio Name
                                    </label>
                                    <input
                                        type="text"
                                        value={studioName}
                                        onChange={(e) => setStudioName(e.target.value)}
                                        placeholder="e.g. Mythic Forge Studios"
                                        className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                                            dark
                                                ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600'
                                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
                                        }`}
                                    />
                                    <p className={`text-xs mt-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        This name will appear on your realm cards as the creator
                                    </p>
                                </div>

                                {/* Email (read-only) */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                                        dark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        Email
                                    </label>
                                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                                        dark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50/50 border-gray-100'
                                    }`}>
                                        <Mail size={16} className={dark ? 'text-gray-500' : 'text-gray-400'} />
                                        <span className={dark ? 'text-gray-400' : 'text-gray-500'}>
                                            {authUser?.email || 'No email'}
                                        </span>
                                        <span className={`ml-auto text-[10px] uppercase tracking-wider ${
                                            dark ? 'text-gray-600' : 'text-gray-400'
                                        }`}>
                                            Verified
                                        </span>
                                    </div>
                                </div>

                                {/* Save button */}
                                <div className="pt-4">
                                    <motion.button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className={`flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                                            saved
                                                ? 'bg-green-500 text-white'
                                                : dark
                                                    ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                                        } disabled:opacity-50`}
                                        whileHover={{ scale: saving ? 1 : 1.01 }}
                                        whileTap={{ scale: saving ? 1 : 0.99 }}
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : saved ? (
                                            <>
                                                <Check size={16} />
                                                Saved!
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                Save Changes
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </section>

                        {/* Subscription Section */}
                        <section className={`rounded-3xl p-6 ${
                            dark ? 'bg-[#151821] ring-1 ring-white/5' : 'bg-white shadow-lg ring-1 ring-black/5'
                        }`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-2.5 rounded-xl ${dark ? 'bg-purple-500/10' : 'bg-purple-100'}`}>
                                    <Crown className={dark ? 'text-purple-400' : 'text-purple-600'} size={20} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="font-serif text-xl font-bold">Subscription</h2>
                                    <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Manage your plan and billing
                                    </p>
                                </div>
                                <SubscriptionBadge tier="free" dark={dark} />
                            </div>

                            {/* Current plan details */}
                            <div className={`rounded-2xl p-5 mb-6 ${dark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">Free Plan</h3>
                                        <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Perfect for getting started
                                        </p>
                                    </div>
                                    <p className="font-serif text-3xl font-bold">
                                        $0<span className={`text-sm font-normal ${dark ? 'text-gray-500' : 'text-gray-400'}`}>/mo</span>
                                    </p>
                                </div>

                                {/* Usage limits */}
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className={dark ? 'text-gray-400' : 'text-gray-500'}>Realms</span>
                                            <span className="font-bold">{stats.realms} / 3</span>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-white/5' : 'bg-gray-200'}`}>
                                            <div
                                                className="h-full bg-amber-500 rounded-full"
                                                style={{ width: `${Math.min((stats.realms / 3) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className={dark ? 'text-gray-400' : 'text-gray-500'}>AI Generations / day</span>
                                            <span className="font-bold">0 / 50</span>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-white/5' : 'bg-gray-200'}`}>
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '0%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Upgrade CTA */}
                            <div className={`rounded-2xl p-5 border-2 border-dashed ${
                                dark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-400/30 bg-amber-50'
                            }`}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${dark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                                        <Zap className="text-amber-500" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg mb-1">Unlock More Power</h3>
                                        <p className={`text-sm mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Get unlimited realms, priority AI, custom themes, and more with Creator or Pro plans.
                                        </p>
                                        <button className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                                            dark
                                                ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                                                : 'bg-amber-500 text-white hover:bg-amber-600'
                                        }`}>
                                            <Sparkles size={14} />
                                            View Plans
                                            <ExternalLink size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Appearance */}
                        <section className={`rounded-3xl p-6 ${
                            dark ? 'bg-[#151821] ring-1 ring-white/5' : 'bg-white shadow-lg ring-1 ring-black/5'
                        }`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-2.5 rounded-xl ${dark ? 'bg-indigo-500/10' : 'bg-indigo-100'}`}>
                                    {dark ? (
                                        <Moon className="text-indigo-400" size={20} />
                                    ) : (
                                        <Sun className="text-indigo-600" size={20} />
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl font-bold">Appearance</h2>
                                    <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Customize your experience
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold">Theme</p>
                                    <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {dark ? 'Dark mode enabled' : 'Light mode enabled'}
                                    </p>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className={`relative w-16 h-9 rounded-full transition-colors ${
                                        dark ? 'bg-indigo-500' : 'bg-amber-400'
                                    }`}
                                >
                                    <motion.div
                                        className="absolute top-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center"
                                        animate={{ left: dark ? 32 : 4 }}
                                        transition={{ type: "spring", bounce: 0.4 }}
                                    >
                                        {dark ? (
                                            <Moon size={14} className="text-indigo-500" />
                                        ) : (
                                            <Sun size={14} className="text-amber-500" />
                                        )}
                                    </motion.div>
                                </button>
                            </div>
                        </section>

                        {/* Danger Zone */}
                        <section className={`rounded-3xl p-6 border-2 ${
                            dark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-2.5 rounded-xl ${dark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                                    <Shield className="text-red-500" size={20} />
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl font-bold text-red-500">Danger Zone</h2>
                                    <p className={`text-sm ${dark ? 'text-red-400/60' : 'text-red-400'}`}>
                                        Irreversible account actions
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`font-bold ${dark ? 'text-red-400' : 'text-red-600'}`}>Delete Account</p>
                                    <p className={`text-sm ${dark ? 'text-red-400/60' : 'text-red-400'}`}>
                                        Permanently delete your account and all data
                                    </p>
                                </div>
                                <button className={`px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider border-2 transition-colors ${
                                    dark
                                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                        : 'border-red-300 text-red-500 hover:bg-red-100'
                                }`}>
                                    Delete
                                </button>
                            </div>
                        </section>
                    </motion.main>
                </div>
            </div>
        </div>
    );
}
