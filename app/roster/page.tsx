"use client";

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Loader2, Users, User, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

export default function RosterPage() {
    const characters = useQuery(api.forge.getMyCharacters);

    if (!characters) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-serif pt-24 px-6 pb-20">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 rounded-full bg-stone-900 hover:bg-stone-800 transition-colors text-stone-400">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white flex items-center gap-3">
                                <Users className="text-indigo-500" size={40} />
                                Hero Roster
                            </h1>
                            <p className="text-stone-400 mt-2 font-sans">
                                The champions and adventurers you have guided through the realms.
                            </p>
                        </div>
                    </div>
                    
                    <Link href="/forge/create/character" className="hidden md:flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold font-sans transition-all">
                        <Plus size={18} /> Recruit New Hero
                    </Link>
                </div>

                {/* Character Grid */}
                {characters.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-stone-800 rounded-xl bg-stone-900/20">
                        <User className="w-16 h-16 mx-auto mb-4 text-stone-700" />
                        <h3 className="text-xl text-stone-400 font-bold mb-2">Empty Barracks</h3>
                        <p className="text-stone-500 mb-6 font-sans">You have no active characters.</p>
                        <Link href="/forge/create/character" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold font-sans transition-all">
                            <Plus size={18} /> Create Character
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {characters.map((char) => (
                            <CharacterCard key={char._id} character={char} />
                        ))}
                        
                        {/* Add New Card */}
                        <Link href="/forge/create/character" className="group flex flex-col items-center justify-center border-2 border-dashed border-stone-800 rounded-xl p-8 hover:border-indigo-500 hover:bg-stone-900/50 transition-all min-h-[300px]">
                            <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center text-stone-600 group-hover:text-indigo-400 group-hover:scale-110 transition-all mb-4">
                                <Plus size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-stone-500 group-hover:text-white transition-colors">Recruit Hero</h3>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CharacterCard = ({ character }: { character: any }) => {
    // Parse stats if string, otherwise default
    let stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    try {
        if (typeof character.stats === 'string') {
            stats = JSON.parse(character.stats);
        }
    } catch {}

    return (
        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all group hover:shadow-xl hover:shadow-indigo-900/20">
            {/* Top Banner / Image placeholder */}
            <div className="h-32 bg-gradient-to-br from-indigo-900/20 to-stone-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                <div className="absolute bottom-4 left-6">
                    <div className="w-20 h-20 rounded-xl bg-stone-800 border-4 border-stone-900 shadow-lg flex items-center justify-center text-indigo-400">
                        <User size={40} />
                    </div>
                </div>
            </div>

            <div className="pt-10 px-6 pb-6">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-2xl font-bold text-white font-serif group-hover:text-indigo-400 transition-colors">{character.name}</h3>
                        <p className="text-stone-500 font-sans font-medium">Level {character.level} {character.class}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 my-6 font-sans">
                    <StatBox label="STR" value={stats.str} />
                    <StatBox label="DEX" value={stats.dex} />
                    <StatBox label="CON" value={stats.con} />
                    <StatBox label="INT" value={stats.int} />
                    <StatBox label="WIS" value={stats.wis} />
                    <StatBox label="CHA" value={stats.cha} />
                </div>

                <div className="flex gap-2 mt-6">
                     <Link href={`/play/${character.campaignId}`} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-bold text-sm text-center transition-colors">
                        Play
                    </Link>
                    <button className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white py-2 rounded-lg font-bold text-sm transition-colors">
                        Edit
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value }: { label: string, value: number }) => (
    <div className="bg-stone-950 rounded border border-stone-800 p-2 text-center">
        <div className="text-[10px] text-stone-500 font-bold tracking-wider">{label}</div>
        <div className="text-lg font-bold text-stone-300">{value}</div>
    </div>
);
