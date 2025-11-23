"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Star, Compass, Scroll } from 'lucide-react';
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
        <div className={`transition-all duration-1000 ease-out transform ${isVisible
                ? 'opacity-100 blur-0 translate-y-0'
                : 'opacity-0 blur-sm translate-y-4'
            } ${className}`}>
            {children}
        </div>
    );
};

// --- COMPONENT: PRIMOGEM STAR MARKER ---
const PrimogemMarker = () => (
    <div className="relative w-4 h-4 flex items-center justify-center">
        <div className="absolute inset-0 bg-[#D3BC8E] rotate-45 rounded-[1px] shadow-[0_0_10px_#D3BC8E]"></div>
        <div className="absolute inset-0 bg-white w-[60%] h-[60%] m-auto rotate-45 rounded-[1px]"></div>
    </div>
);

export default function GenshinChangelog() {
    const [isSystemReady, setIsSystemReady] = useState(false);

    // Initial "Ley Line" Sequence
    useEffect(() => {
        const timer = setTimeout(() => setIsSystemReady(true), 1200);
        return () => clearTimeout(timer);
    }, []);

    return (
        // Base Background: Clean paper white/gray typical of Genshin Menus
        <div className="min-h-screen bg-[#F0F1F5] text-[#3B4255] font-sans selection:bg-[#D3BC8E]/30 selection:text-[#3B4255] overflow-x-hidden relative">

            {/* --- CELESTIAL BACKGROUND ELEMENTS --- */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* Soft Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-[#E3E5E8] opacity-80" />

                {/* Constellation Lines (SVG Pattern) */}
                <svg className="absolute top-0 right-0 w-[800px] h-[800px] opacity-[0.03] text-[#3B4255]" viewBox="0 0 100 100">
                    <path d="M10,10 L30,30 L50,10 L70,40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    <circle cx="10" cy="10" r="1" fill="currentColor" />
                    <circle cx="30" cy="30" r="1" fill="currentColor" />
                    <circle cx="50" cy="10" r="1" fill="currentColor" />
                    <circle cx="70" cy="40" r="1" fill="currentColor" />
                </svg>

                {/* Bottom Left Pattern */}
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#D3BC8E]/5 rounded-full blur-[100px]" />
            </div>

            {/* --- NAVIGATION --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 p-6 md:p-12 pointer-events-none">
                <div className="max-w-4xl mx-auto flex justify-between items-center pointer-events-auto">
                    <Link
                        href="/"
                        className="group flex items-center gap-3"
                    >
                        {/* Genshin-style Back Button Circle */}
                        <div className="relative w-10 h-10 rounded-full bg-[#EBEBEB] border-2 border-[#D3BC8E] flex items-center justify-center shadow-sm group-hover:bg-white group-hover:shadow-[0_0_15px_#D3BC8E] transition-all duration-300">
                            <ArrowLeft size={18} className="text-[#3B4255] group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-widest text-[#838692] group-hover:text-[#D3BC8E] transition-colors">
                            Paimon Menu
                        </span>
                    </Link>
                </div>
            </nav>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 pt-32 md:pt-48 pb-32 max-w-3xl mx-auto px-6 md:px-0">

                {!isSystemReady ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
                        {/* Loading Icon */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#D3BC8E] blur-xl opacity-50 animate-pulse"></div>
                            <Compass size={48} className="text-[#3B4255] animate-[spin_4s_linear_infinite] relative z-10" />
                        </div>
                        <div className="flex items-center gap-3 text-[#D3BC8E] animate-pulse">
                            <span className="font-serif text-sm tracking-[0.2em] font-bold">CONNECTING TO LEY LINES...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* --- HEADER --- */}
                        <FadeBlock delay={100} className="mb-20 text-center relative">
                            {/* Decorative Top Line */}
                            <div className="flex justify-center items-center gap-4 mb-6 opacity-50">
                                <div className="h-[1px] w-12 bg-[#D3BC8E]" />
                                <Star size={12} className="text-[#D3BC8E] fill-[#D3BC8E]" />
                                <div className="h-[1px] w-12 bg-[#D3BC8E]" />
                            </div>

                            <h1 className="text-5xl md:text-6xl font-serif font-bold text-[#3B4255] mb-4 tracking-wide drop-shadow-sm">
                                Archive Log
                            </h1>
                            <p className="text-[#838692] font-medium tracking-wide uppercase text-xs">
                                Travel Log / System Updates
                            </p>
                        </FadeBlock>

                        {/* --- TIMELINE FEED --- */}
                        <div className="relative pl-4 md:pl-0 space-y-16">

                            {/* Vertical Guide Line */}
                            <div className="absolute left-4 md:left-[27px] top-4 bottom-0 w-[2px] bg-gradient-to-b from-[#D3BC8E] via-[#D3BC8E]/30 to-transparent md:block hidden" />

                            {CHANGELOG_DATA.map((entry, index) => (
                                <div key={entry.version} className="relative md:pl-20 group">

                                    {/* Timeline Marker (Desktop) */}
                                    <div className="absolute left-[19px] top-3 hidden md:block z-20 group-hover:scale-125 transition-transform duration-500">
                                        <PrimogemMarker />
                                    </div>

                                    {/* Card Container - Genshin Style Card */}
                                    <FadeBlock delay={300 + (index * 200)}>
                                        <div className="bg-white rounded-xl p-8 border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden hover:shadow-[0_8px_30px_-4px_rgba(211,188,142,0.2)] transition-all duration-500">

                                            {/* Subtle Gold Corner Decoration */}
                                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                                <Scroll size={40} className="text-[#D3BC8E] rotate-12" />
                                            </div>

                                            {/* Version & Date */}
                                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                                                <span className="inline-block bg-[#3B4255] text-[#D3BC8E] text-xs font-bold px-3 py-1 rounded-full tracking-widest">
                                                    {entry.version}
                                                </span>
                                                <span className="text-[#838692] text-xs font-bold uppercase tracking-widest">
                                                    {entry.date}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h2 className="text-3xl font-serif font-bold text-[#3B4255] mb-3 group-hover:text-[#A08655] transition-colors duration-300">
                                                {entry.title}
                                            </h2>

                                            {/* Description */}
                                            <p className="text-[#686D7F] leading-relaxed mb-8 border-l-2 border-[#D3BC8E]/30 pl-4 text-sm md:text-base">
                                                {entry.description}
                                            </p>

                                            {/* Changes List */}
                                            <ul className="space-y-3">
                                                {entry.changes.map((change, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm group/item">
                                                        {/* Custom Bullet - 4 Point Star */}
                                                        <div className="mt-1.5 shrink-0 text-[#D3BC8E]">
                                                            <svg width="10" height="10" viewBox="0 0 10 10" className="fill-current group-hover/item:rotate-90 transition-transform duration-500">
                                                                <path d="M5 0L6.5 3.5L10 5L6.5 6.5L5 10L3.5 6.5L0 5L3.5 3.5L5 0Z" />
                                                            </svg>
                                                        </div>

                                                        <span className="text-[#3B4255] group-hover/item:text-black transition-colors flex-1">
                                                            {change.text}
                                                        </span>

                                                        {/* Tag - Genshin Element Style */}
                                                        <span className={`
                                                            shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border
                                                            transition-all duration-300
                                                            ${change.type === 'feature' ? 'text-[#4E7CFF] border-[#4E7CFF]/20 bg-[#4E7CFF]/5' : ''}
                                                            ${change.type === 'fix' ? 'text-[#2CB988] border-[#2CB988]/20 bg-[#2CB988]/5' : ''}
                                                            ${change.type === 'improvement' ? 'text-[#FF9C33] border-[#FF9C33]/20 bg-[#FF9C33]/5' : ''}
                                                            ${change.type === 'system' ? 'text-[#838692] border-[#838692]/20 bg-[#838692]/5' : ''}
                                                        `}>
                                                            {change.type}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </FadeBlock>
                                </div>
                            ))}
                        </div>

                        {/* --- FOOTER --- */}
                        <FadeBlock delay={1500} className="mt-24 text-center pb-12">
                            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-[#D3BC8E]/30 text-[#D3BC8E] text-xs font-bold uppercase tracking-widest hover:bg-[#D3BC8E] hover:text-white transition-all cursor-pointer shadow-sm">
                                <Sparkles size={14} />
                                <span>Travel Complete</span>
                            </div>
                        </FadeBlock>
                    </>
                )}
            </main>
        </div>
    );
}