"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Terminal, Sparkles } from 'lucide-react';
import Link from 'next/link';

// --- TYPES ---
type ChangeType = 'feature' | 'fix' | 'improvement' | 'system';

interface ChangeItem {
    type: ChangeType;
    text: string;
}

interface LogEntry {
    version: string;
    date: string;
    title: string;
    description: string;
    changes: ChangeItem[];
}

// --- MOCK DATA ---
const CHANGELOG_DATA: LogEntry[] = [
    {
        version: "v2.4.0",
        date: "October 24, 2024",
        title: "The Narrative Engine",
        description: "A massive overhaul to the AI storyteller, introducing context-aware memory and better NPC improvisation.",
        changes: [
            { type: 'feature', text: "Introduced 'Deep Memory' for long-running campaigns." },
            { type: 'feature', text: "New 'Whisper' mode for secret GM-only outcomes." },
            { type: 'improvement', text: "Reduced token latency by 40%." },
            { type: 'fix', text: "Fixed an issue where Goblins forgot their own names." }
        ]
    },
    {
        version: "v2.3.1",
        date: "October 10, 2024",
        title: "Economy Patch",
        description: "Balancing the gold economy and making inventory management less of a headache.",
        changes: [
            { type: 'improvement', text: "Items now automatically group by rarity." },
            { type: 'fix', text: "Gold pieces no longer duplicate when dragging." },
            { type: 'system', text: "Database migration for item schemas." }
        ]
    },
    {
        version: "v2.3.0",
        date: "September 28, 2024",
        title: "Realms of Shadow",
        description: "Added support for dark mode maps and dynamic lighting rendering in the VTT.",
        changes: [
            { type: 'feature', text: "Dynamic Lighting 1.0 released." },
            { type: 'feature', text: "New 'Shadow' biome assets added." },
            { type: 'improvement', text: "Sidebar UI contrast improved." }
        ]
    }
];

// --- COMPONENT: FADE BLOCK ---
// Handles the "blur-in" effect for text elements
const FadeBlock = ({ 
    children, 
    delay = 0, 
    className = "" 
}: { 
    children: React.ReactNode, 
    delay?: number, 
    className?: string 
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div className={`transition-all duration-1000 ease-out transform ${
            isVisible 
                ? 'opacity-100 blur-0 translate-y-0' 
                : 'opacity-0 blur-sm translate-y-4'
        } ${className}`}>
            {children}
        </div>
    );
};

export default function ChangelogPage() {
    const [isSystemReady, setIsSystemReady] = useState(false);

    // Initial "Boot" Sequence
    useEffect(() => {
        const timer = setTimeout(() => setIsSystemReady(true), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#0c0a09] text-stone-300 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
            
            {/* Subtle Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-900/10 blur-[150px] rounded-full opacity-30" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-stone-800/10 blur-[150px] rounded-full opacity-30" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.02]" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 p-6 md:p-12 pointer-events-none">
                <div className="max-w-4xl mx-auto flex justify-between items-center pointer-events-auto">
                    <Link 
                        href="/" 
                        className="group flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-stone-500 hover:text-stone-200 transition-colors"
                    >
                        <div className="relative w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-indigo-500/50 transition-colors overflow-hidden bg-[#0c0a09]">
                            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                        <span>Dashboard</span>
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 pt-32 md:pt-48 pb-32 max-w-2xl mx-auto px-6 md:px-0">
                
                {!isSystemReady ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center">
                        <div className="flex items-center gap-3 text-stone-600 animate-pulse">
                            <Terminal size={16} />
                            <span className="font-mono text-xs">INITIALIZING_LOGS...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header Title */}
                        <FadeBlock delay={100} className="mb-24">
                            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 tracking-tight">
                                Updates
                            </h1>
                            <div className="h-1 w-12 bg-indigo-500/50 rounded-full" />
                        </FadeBlock>

                        {/* Timeline Feed */}
                        <div className="relative border-l border-white/5 pl-8 md:pl-12 space-y-20">
                            
                            {CHANGELOG_DATA.map((entry, index) => (
                                <div key={entry.version} className="relative group">
                                    {/* Timeline Marker - Glows on hover */}
                                    <div className="absolute -left-[37px] md:-left-[53px] top-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-stone-800 border border-stone-700 group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.6)] transition-all duration-500 ease-out"></div>
                                    </div>

                                    {/* Entry Header */}
                                    <FadeBlock delay={300 + (index * 200)}>
                                        <div className="flex items-center gap-3 mb-3 font-mono text-xs tracking-widest">
                                            <span className="text-indigo-400 font-bold">{entry.version}</span>
                                            <span className="text-stone-600">/</span>
                                            <span className="text-stone-500 uppercase">{entry.date}</span>
                                        </div>
                                        
                                        <h2 className="text-3xl md:text-4xl font-medium text-stone-200 mb-4 group-hover:text-white transition-colors duration-500">
                                            {entry.title}
                                        </h2>
                                        
                                        <p className="text-lg text-stone-500 leading-relaxed mb-8 max-w-lg group-hover:text-stone-400 transition-colors duration-500">
                                            {entry.description}
                                        </p>
                                    </FadeBlock>

                                    {/* Changes List */}
                                    <ul className="space-y-4">
                                        {entry.changes.map((change, i) => (
                                            <li key={i}>
                                                <FadeBlock delay={500 + (index * 200) + (i * 100)}>
                                                    <div className="flex items-baseline gap-4 group/item cursor-default">
                                                        {/* Bullet Point */}
                                                        <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-stone-800 group-hover/item:bg-white transition-colors duration-300 mt-2"></div>
                                                        
                                                        {/* Text */}
                                                        <p className="text-stone-400 group-hover/item:text-stone-200 transition-colors duration-300 text-base leading-relaxed flex-1">
                                                            {change.text}
                                                        </p>

                                                        {/* Type Tag - Fades in on hover */}
                                                        <span className={`
                                                            shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-white/5 
                                                            opacity-0 translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300
                                                            ${change.type === 'feature' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : ''}
                                                            ${change.type === 'fix' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : ''}
                                                            ${change.type === 'improvement' ? 'text-amber-200 bg-amber-500/10 border-amber-500/20' : ''}
                                                            ${change.type === 'system' ? 'text-stone-400 bg-stone-500/10 border-stone-500/20' : ''}
                                                        `}>
                                                            {change.type}
                                                        </span>
                                                    </div>
                                                </FadeBlock>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <FadeBlock delay={2000} className="mt-32 pt-12 border-t border-white/5 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] text-stone-500 uppercase tracking-widest hover:bg-white/10 hover:text-stone-300 transition-all cursor-pointer">
                                <Sparkles size={12} />
                                <span>End of Log</span>
                            </div>
                        </FadeBlock>
                    </>
                )}
            </main>
        </div>
    );
}