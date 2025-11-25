"use client";

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '@/components/ThemeProvider';
import { Loader2, Users, User, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

export default function RosterPage() {
    const characters = useQuery(api.forge.getMyCharacters);
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    if (!characters) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-[#0f1119]' : 'bg-stone-950'}`}>
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen font-serif pt-24 px-6 pb-20 ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-stone-950 text-stone-200'}`}>
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className={`p-2 rounded-full transition-colors ${dark ? 'bg-[#1a1d2e] hover:bg-[#252838] text-gray-400' : 'bg-stone-900 hover:bg-stone-800 text-stone-400'}`}>
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white flex items-center gap-3">
                                <Users className={dark ? 'text-[#D4AF37]' : 'text-indigo-500'} size={40} />
                                Hero Roster
                            </h1>
                            <p className={`mt-2 font-sans ${dark ? 'text-gray-500' : 'text-stone-400'}`}>
                                The champions and adventurers you have guided through the realms.
                            </p>
                        </div>
                    </div>
                    
                    <Link href="/forge/create/character" className={`hidden md:flex items-center gap-2 px-6 py-3 text-white rounded-lg font-bold font-sans transition-all ${dark ? 'bg-[#D4AF37] hover:bg-[#eac88f]' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                        <Plus size={18} /> Recruit New Hero
                    </Link>
                </div>

                {/* Character Grid */}
                {characters.length === 0 ? (
                    <div className={`text-center py-20 border-2 border-dashed rounded-xl ${dark ? 'border-[#2a2d3e] bg-[#1a1d2e]/20' : 'border-stone-800 bg-stone-900/20'}`}>
                        <User className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-stone-700'}`} />
                        <h3 className={`text-xl font-bold mb-2 ${dark ? 'text-gray-400' : 'text-stone-400'}`}>Empty Barracks</h3>
                        <p className={`mb-6 font-sans ${dark ? 'text-gray-500' : 'text-stone-500'}`}>You have no active characters.</p>
                        <Link href="/forge/create/character" className={`inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-bold font-sans transition-all ${dark ? 'bg-[#D4AF37] hover:bg-[#eac88f]' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                            <Plus size={18} /> Create Character
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {characters.map((char) => (
                            <CharacterCard key={char._id} character={char} dark={dark} />
                        ))}
                        
                        {/* Add New Card */}
                        <Link href="/forge/create/character" className={`group flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-all min-h-[300px] ${
                            dark 
                                ? 'border-[#2a2d3e] hover:border-[#D4AF37] hover:bg-[#1a1d2e]/50' 
                                : 'border-stone-800 hover:border-indigo-500 hover:bg-stone-900/50'
                        }`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-all mb-4 ${
                                dark 
                                    ? 'bg-[#1a1d2e] text-gray-600 group-hover:text-[#D4AF37]' 
                                    : 'bg-stone-900 text-stone-600 group-hover:text-indigo-400'
                            }`}>
                                <Plus size={32} />
                            </div>
                            <h3 className={`text-xl font-bold group-hover:text-white transition-colors ${dark ? 'text-gray-500' : 'text-stone-500'}`}>Recruit Hero</h3>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CharacterCard = ({ character, dark }: { character: any, dark: boolean }) => {
    // Parse stats if string, otherwise default
    let stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    try {
        if (typeof character.stats === 'string') {
            stats = JSON.parse(character.stats);
        }
    } catch {}

    return (
        <div className={`border rounded-xl overflow-hidden transition-all group hover:shadow-xl ${
            dark 
                ? 'bg-[#1a1d2e] border-[#2a2d3e] hover:border-[#D4AF37]/50 hover:shadow-[#D4AF37]/10' 
                : 'bg-stone-900 border-stone-800 hover:border-indigo-500/50 hover:shadow-indigo-900/20'
        }`}>
            {/* Top Banner / Image placeholder */}
            <div className={`h-32 relative overflow-hidden ${dark ? 'bg-gradient-to-br from-[#D4AF37]/10 to-[#1a1d2e]' : 'bg-gradient-to-br from-indigo-900/20 to-stone-900'}`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                <div className="absolute bottom-4 left-6">
                    <div className={`w-20 h-20 rounded-xl border-4 shadow-lg flex items-center justify-center ${
                        dark 
                            ? 'bg-[#1a1d2e] border-[#0f1119] text-[#D4AF37]' 
                            : 'bg-stone-800 border-stone-900 text-indigo-400'
                    }`}>
                        <User size={40} />
                    </div>
                </div>
            </div>

            <div className="pt-10 px-6 pb-6">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className={`text-2xl font-bold font-serif transition-colors ${dark ? 'text-white group-hover:text-[#D4AF37]' : 'text-white group-hover:text-indigo-400'}`}>{character.name}</h3>
                        <p className={`font-sans font-medium ${dark ? 'text-gray-500' : 'text-stone-500'}`}>Level {character.level} {character.class}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 my-6 font-sans">
                    <StatBox label="STR" value={stats.str} dark={dark} />
                    <StatBox label="DEX" value={stats.dex} dark={dark} />
                    <StatBox label="CON" value={stats.con} dark={dark} />
                    <StatBox label="INT" value={stats.int} dark={dark} />
                    <StatBox label="WIS" value={stats.wis} dark={dark} />
                    <StatBox label="CHA" value={stats.cha} dark={dark} />
                </div>

                <div className="flex gap-2 mt-6">
                     <Link href={`/play/${character.campaignId}`} className={`flex-1 py-2 rounded-lg font-bold text-sm text-center transition-colors ${
                         dark 
                             ? 'bg-[#D4AF37] hover:bg-[#eac88f] text-[#0f1119]' 
                             : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                     }`}>
                        Play
                    </Link>
                    <button className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                        dark 
                            ? 'bg-[#252838] hover:bg-[#2a2d3e] text-gray-300 hover:text-white' 
                            : 'bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white'
                    }`}>
                        Edit
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, dark }: { label: string, value: number, dark: boolean }) => (
    <div className={`rounded border p-2 text-center ${
        dark 
            ? 'bg-[#0f1119] border-[#2a2d3e]' 
            : 'bg-stone-950 border-stone-800'
    }`}>
        <div className={`text-[10px] font-bold tracking-wider ${dark ? 'text-gray-600' : 'text-stone-500'}`}>{label}</div>
        <div className={`text-lg font-bold ${dark ? 'text-gray-300' : 'text-stone-300'}`}>{value}</div>
    </div>
);
