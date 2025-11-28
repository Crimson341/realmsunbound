'use client';

import React, { useRef, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useTheme } from '@/components/ThemeProvider';
import { motion } from 'framer-motion';
import {
    Brain, Users, Hammer, Sprout, BookOpen, Feather,
    ChevronLeft, ChevronRight, BookMarked
} from 'lucide-react';

// Page component wrapper for react-pageflip
const Page = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string; dark?: boolean; pageNum?: number }>(
    ({ children, className, dark, pageNum }, ref) => {
        return (
            <div
                ref={ref}
                className={`relative w-full h-full overflow-hidden ${className}`}
                style={{
                    backgroundColor: dark ? '#1a1714' : '#f5edd8',
                    backgroundImage: dark
                        ? 'linear-gradient(135deg, #1e1a16 0%, #2a2520 30%, #1e1a16 70%, #151210 100%)'
                        : 'linear-gradient(135deg, #faf4e8 0%, #f0e6d2 30%, #e8dcc4 70%, #f5edd8 100%)',
                    boxShadow: 'inset 0 0 80px rgba(0,0,0,0.15)',
                }}
            >
                {/* Paper texture overlay - removed mix-blend to prevent transparency */}
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* Aged paper stains */}
                <div
                    className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at 20% 80%, rgba(139,90,43,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,90,43,0.2) 0%, transparent 40%)',
                    }}
                />

                {/* Ornate border frame */}
                <div className="absolute inset-3 border border-[#D4AF37]/20 rounded pointer-events-none" />
                <div className="absolute inset-5 border border-[#D4AF37]/10 rounded pointer-events-none" />

                {/* Ornate corner decorations - larger and more detailed */}
                <div className="absolute top-3 left-3 w-16 h-16 border-t-2 border-l-2 border-[#D4AF37]/50 rounded-tl-xl pointer-events-none">
                    <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-[#D4AF37]/30" />
                </div>
                <div className="absolute top-3 right-3 w-16 h-16 border-t-2 border-r-2 border-[#D4AF37]/50 rounded-tr-xl pointer-events-none">
                    <div className="absolute top-1 right-1 w-3 h-3 border-t border-r border-[#D4AF37]/30" />
                </div>
                <div className="absolute bottom-3 left-3 w-16 h-16 border-b-2 border-l-2 border-[#D4AF37]/50 rounded-bl-xl pointer-events-none">
                    <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-[#D4AF37]/30" />
                </div>
                <div className="absolute bottom-3 right-3 w-16 h-16 border-b-2 border-r-2 border-[#D4AF37]/50 rounded-br-xl pointer-events-none">
                    <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-[#D4AF37]/30" />
                </div>

                {/* Center top ornament */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/40" />
                    <div className="w-2 h-2 rotate-45 border border-[#D4AF37]/40" />
                    <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/40" />
                </div>

                {/* Page content */}
                <div className="relative z-10 h-full p-10 md:p-14 overflow-hidden">
                    {children}
                </div>

                {/* Page edge shadow (binding side) */}
                <div
                    className="absolute top-0 left-0 w-12 h-full pointer-events-none"
                    style={{
                        background: 'linear-gradient(to right, rgba(0,0,0,0.15), transparent)',
                    }}
                />

                {/* Page number */}
                {pageNum && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
                        <span className="text-xs font-serif italic" style={{ color: '#D4AF37' }}>
                            — {pageNum} —
                        </span>
                    </div>
                )}
            </div>
        );
    }
);
Page.displayName = 'Page';

// Cover Page
const CoverPage = React.forwardRef<HTMLDivElement, { dark: boolean }>(({ dark }, ref) => (
    <div
        ref={ref}
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        style={{
            background: dark
                ? 'linear-gradient(145deg, #1a1510 0%, #2d2318 25%, #1a1510 50%, #0d0a07 100%)'
                : 'linear-gradient(145deg, #4a3520 0%, #6b4c2a 25%, #4a3520 50%, #2d1f14 100%)',
            boxShadow: 'inset 0 0 150px rgba(0,0,0,0.6)',
        }}
    >
        {/* Leather texture */}
        <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />

        {/* Embossed pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `repeating-linear-gradient(45deg, #D4AF37 0, #D4AF37 1px, transparent 0, transparent 50%)`,
            backgroundSize: '20px 20px',
        }} />

        {/* Multiple decorative borders */}
        <div className="absolute inset-4 border-2 border-[#D4AF37]/40 rounded-lg" />
        <div className="absolute inset-6 border border-[#D4AF37]/25 rounded-lg" />
        <div className="absolute inset-8 border border-[#D4AF37]/15 rounded" />

        {/* Corner emblems - more ornate */}
        <div className="absolute top-6 left-6 w-20 h-20">
            <div className="absolute inset-0 border-t-3 border-l-3 border-[#D4AF37]/60 rounded-tl-2xl" />
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]/40 rounded-tl" />
            <div className="absolute top-4 left-4 w-2 h-2 bg-[#D4AF37]/30 rounded-full" />
        </div>
        <div className="absolute top-6 right-6 w-20 h-20">
            <div className="absolute inset-0 border-t-3 border-r-3 border-[#D4AF37]/60 rounded-tr-2xl" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]/40 rounded-tr" />
            <div className="absolute top-4 right-4 w-2 h-2 bg-[#D4AF37]/30 rounded-full" />
        </div>
        <div className="absolute bottom-6 left-6 w-20 h-20">
            <div className="absolute inset-0 border-b-3 border-l-3 border-[#D4AF37]/60 rounded-bl-2xl" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]/40 rounded-bl" />
            <div className="absolute bottom-4 left-4 w-2 h-2 bg-[#D4AF37]/30 rounded-full" />
        </div>
        <div className="absolute bottom-6 right-6 w-20 h-20">
            <div className="absolute inset-0 border-b-3 border-r-3 border-[#D4AF37]/60 rounded-br-2xl" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]/40 rounded-br" />
            <div className="absolute bottom-4 right-4 w-2 h-2 bg-[#D4AF37]/30 rounded-full" />
        </div>

        {/* Center medallion glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full blur-3xl opacity-20" style={{ background: '#D4AF37' }} />
        </div>

        {/* Title content */}
        <div className="relative z-10 text-center px-8">
            {/* Decorative top flourish */}
            <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
                <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37]/60" />
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
            </div>

            <BookMarked size={72} className="mx-auto mb-8 text-[#D4AF37] drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]" strokeWidth={1} />

            <h1 className="font-serif text-6xl md:text-8xl font-bold text-[#D4AF37] mb-2 tracking-wider drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.2)' }}>
                REALMS
            </h1>

            <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#D4AF37]/60" />
                <div className="w-3 h-3 rotate-45 border-2 border-[#D4AF37]/60" />
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#D4AF37]/60" />
            </div>

            <p className="font-serif text-xl text-[#D4AF37]/80 tracking-[0.4em] uppercase mb-2">
                The Living Chronicle
            </p>

            <p className="font-serif text-sm text-[#D4AF37]/50 italic tracking-wider">
                Volume I
            </p>

            {/* Bottom flourish */}
            <div className="mt-16 flex items-center justify-center gap-2">
                <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/40" />
                <Feather size={16} className="text-[#D4AF37]/50" />
                <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/40" />
            </div>

            <p className="mt-6 text-xs text-[#D4AF37]/30 italic">
                Click or drag to turn pages
            </p>
        </div>

        {/* Spine shadow */}
        <div className="absolute top-0 left-0 w-6 h-full bg-gradient-to-r from-black/50 to-transparent" />

        {/* Edge highlight */}
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-r from-transparent to-[#D4AF37]/10" />
    </div>
));
CoverPage.displayName = 'CoverPage';

// Content sections for pages
const loreContent = [
    {
        icon: Brain,
        subtitle: "Chapter I",
        title: "The Mind that Dreams",
        content: `We do not write the stories. We birth the storyteller.

Gemini acts as your Dungeon Master, weaving narratives in real-time, reacting to your unpredictability with improvisational genius.

It understands intent, weaves causality, and remembers every choice you make. Each decision ripples through the fabric of reality, creating consequences that echo through time.

The AI doesn't just respond—it anticipates, it surprises, it challenges. Your story is never on rails; it flows like water, finding its own path through the landscape of possibility.`
    },
    {
        icon: Hammer,
        subtitle: "Chapter II",
        title: "Forge Your Reality",
        content: `You are not just a player; you are a creator.

In The Forge, you define the laws of reality. Craft legendary swords that sing with ancient power, scribe custom spells that bend the elements to your will, and birth villains with complex motives that would make gods weep.

Every item has a story. Every spell has a cost. Every character has a soul. The world obeys your design, limited only by the boundaries of your imagination.

What will you create?`
    },
    {
        icon: Sprout,
        subtitle: "Chapter III",
        title: "Instant World Genesis",
        content: `Creation need not be tedious.

With a single command, sprout entire continents from the void. From the snowy peaks of a Nordic realm to alien landscapes bathed in twin suns, our engine populates your world with thousands of entities, quests, and secrets in mere seconds.

Mountains rise. Rivers carve their paths. Cities spring forth with histories already ancient. NPCs are born with memories, grudges, loves, and fears.

A whole world, breathing and alive, ready for your first footstep.`
    },
    {
        icon: BookOpen,
        subtitle: "Chapter IV",
        title: "Knowledge is Power",
        content: `In Realms, the text itself is alive.

Hover over the name of a forgotten king or a cursed blade, and the Archives instantly reveal its secrets. The lore is not hidden in a wiki; it is woven into the very air you breathe.

Every word is a doorway. Every name holds power. The more you learn, the deeper you fall into the rabbit hole of interconnected histories and hidden truths.

Knowledge here is not just information—it is a weapon, a key, a compass.`
    },
    {
        icon: Users,
        subtitle: "Chapter V",
        title: "Destiny is Shared",
        content: `The hero's journey need not be solitary.

Connect your timelines. Form parties of unlikely allies. Forge alliances that span continents or declare wars that shake the heavens.

The state of the world is persistent and shared—a living tapestry woven by thousands of hands. Your actions affect others. Their deeds shape your reality.

In this interconnected web of fate, every player is both author and audience, hero and historian.`
    },
];

export default function LorePage() {
    const bookRef = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void } | undefined }>(null);
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    const goldColor = '#D4AF37';

    const nextPage = useCallback(() => {
        bookRef.current?.pageFlip()?.flipNext();
    }, []);

    const prevPage = useCallback(() => {
        bookRef.current?.pageFlip()?.flipPrev();
    }, []);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center py-20 px-4"
            style={{
                background: dark
                    ? 'radial-gradient(ellipse at center, #1a1d2e 0%, #0f1119 100%)'
                    : 'radial-gradient(ellipse at center, #f5f0e6 0%, #e8e0d0 100%)',
            }}
        >
            {/* Ambient particles */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-[#D4AF37]"
                        initial={{
                            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                            opacity: 0,
                        }}
                        animate={{
                            y: [null, -100],
                            opacity: [0, 0.6, 0],
                        }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                        }}
                    />
                ))}
            </div>

            {/* Title */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1
                    className="font-serif text-4xl md:text-5xl font-bold mb-2"
                    style={{ color: dark ? '#e8e6e3' : '#3E4255' }}
                >
                    The Archives
                </h1>
                <p className="text-sm tracking-[0.2em] uppercase" style={{ color: goldColor }}>
                    Tome of Knowledge
                </p>
            </motion.div>

            {/* Book Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
            >
                {/* Book shadow */}
                <div
                    className="absolute -inset-4 rounded-lg blur-2xl opacity-30"
                    style={{ background: goldColor }}
                />

                {/* @ts-expect-error - react-pageflip types issue */}
                <HTMLFlipBook
                    ref={bookRef}
                    width={700}
                    height={900}
                    size="stretch"
                    minWidth={400}
                    maxWidth={900}
                    minHeight={520}
                    maxHeight={1150}
                    showCover={true}
                    mobileScrollSupport={true}
                    className="shadow-[0_25px_80px_-15px_rgba(0,0,0,0.5)]"
                    style={{}}
                    startPage={0}
                    drawShadow={true}
                    flippingTime={1000}
                    usePortrait={true}
                    startZIndex={0}
                    autoSize={true}
                    maxShadowOpacity={0.6}
                    showPageCorners={true}
                    disableFlipByClick={false}
                    swipeDistance={30}
                    clickEventForward={true}
                    useMouseEvents={true}
                >
                    {/* Cover */}
                    <CoverPage dark={dark} />

                    {/* Title Page */}
                    <Page dark={dark}>
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="mb-8">
                                <div
                                    className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6"
                                    style={{
                                        background: `linear-gradient(135deg, ${goldColor}20, ${goldColor}10)`,
                                        border: `2px solid ${goldColor}40`,
                                    }}
                                >
                                    <Feather size={40} style={{ color: goldColor }} />
                                </div>
                            </div>

                            <h2
                                className="font-serif text-3xl font-bold mb-4"
                                style={{ color: dark ? '#e8e6e3' : '#3E4255' }}
                            >
                                Welcome, Traveler
                            </h2>

                            <div className="h-px w-32 mx-auto mb-6" style={{ background: `${goldColor}40` }} />

                            <p
                                className="font-serif text-base leading-relaxed italic max-w-xs"
                                style={{ color: dark ? '#a0a0a0' : '#6b6b6b' }}
                            >
                                Within these pages lies the knowledge of ages. Read carefully, for what you learn here shall shape your destiny.
                            </p>

                            <p
                                className="mt-8 text-xs uppercase tracking-widest"
                                style={{ color: goldColor }}
                            >
                                — The Archivists
                            </p>
                        </div>
                    </Page>

                    {/* Content Pages */}
                    {loreContent.map((section, index) => (
                        <Page key={index} dark={dark} pageNum={index + 2}>
                            <div className="h-full flex flex-col">
                                {/* Header */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center"
                                            style={{
                                                background: `linear-gradient(135deg, ${goldColor}15, ${goldColor}05)`,
                                                border: `1px solid ${goldColor}30`,
                                            }}
                                        >
                                            <section.icon size={28} style={{ color: goldColor }} />
                                        </div>
                                        <div>
                                            <p
                                                className="text-xs font-bold uppercase tracking-[0.25em] mb-1"
                                                style={{ color: goldColor }}
                                            >
                                                {section.subtitle}
                                            </p>
                                            <h3
                                                className="font-serif text-3xl font-bold leading-tight"
                                                style={{ color: dark ? '#e8e6e3' : '#3E4255' }}
                                            >
                                                {section.title}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Ornate Divider */}
                                    <div className="flex items-center gap-3 mt-6">
                                        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${goldColor}40)` }} />
                                        <div className="flex items-center gap-1">
                                            <div className="w-1 h-1 rotate-45" style={{ background: `${goldColor}60` }} />
                                            <div className="w-2 h-2 rotate-45 border" style={{ borderColor: `${goldColor}50` }} />
                                            <div className="w-1 h-1 rotate-45" style={{ background: `${goldColor}60` }} />
                                        </div>
                                        <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${goldColor}40)` }} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-hidden">
                                    <p
                                        className="font-serif text-lg leading-[2] whitespace-pre-line"
                                        style={{
                                            color: dark ? '#c5c0b8' : '#4a4540',
                                            textAlign: 'justify',
                                            hyphens: 'auto',
                                        }}
                                    >
                                        {section.content}
                                    </p>
                                </div>

                                {/* Bottom ornament */}
                                <div className="flex items-center justify-center gap-2 pt-6">
                                    <div className="w-6 h-px" style={{ background: `${goldColor}30` }} />
                                    <section.icon size={12} style={{ color: `${goldColor}40` }} />
                                    <div className="w-6 h-px" style={{ background: `${goldColor}30` }} />
                                </div>
                            </div>
                        </Page>
                    ))}

                    {/* Final Page */}
                    <Page dark={dark}>
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="mb-8">
                                <BookMarked size={48} style={{ color: goldColor }} strokeWidth={1} />
                            </div>

                            <h2
                                className="font-serif text-2xl font-bold mb-4"
                                style={{ color: dark ? '#e8e6e3' : '#3E4255' }}
                            >
                                The Realm Awaits
                            </h2>

                            <p
                                className="font-serif text-sm leading-relaxed italic max-w-xs mb-8"
                                style={{ color: dark ? '#a0a0a0' : '#6b6b6b' }}
                            >
                                The history of this world has not yet been written. It is waiting for your ink.
                            </p>

                            <a
                                href="/sign-up"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:scale-105"
                                style={{
                                    background: goldColor,
                                    color: dark ? '#0f1119' : '#fff',
                                }}
                            >
                                <span>Enter the Forge</span>
                                <Feather size={16} />
                            </a>
                        </div>
                    </Page>

                    {/* Back Cover */}
                    <div
                        className="w-full h-full"
                        style={{
                            background: dark
                                ? 'linear-gradient(135deg, #1a1510 0%, #2a2015 50%, #1a1510 100%)'
                                : 'linear-gradient(135deg, #3d2914 0%, #5a3d1e 50%, #3d2914 100%)',
                        }}
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <BookMarked size={80} className="text-[#D4AF37]/20" strokeWidth={1} />
                        </div>
                    </div>
                </HTMLFlipBook>
            </motion.div>

            {/* Navigation Controls */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-8 mt-10"
            >
                <button
                    onClick={prevPage}
                    className="group flex items-center gap-3 px-6 py-3 rounded-full transition-all hover:scale-105 hover:shadow-lg"
                    style={{
                        background: dark ? 'linear-gradient(135deg, #1a1d2e, #252a3d)' : 'linear-gradient(135deg, #fff, #f5f5f5)',
                        color: goldColor,
                        border: `2px solid ${goldColor}40`,
                        boxShadow: `0 4px 20px rgba(0,0,0,0.1)`,
                    }}
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold tracking-wide">Previous</span>
                </button>

                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: `${goldColor}40` }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: `${goldColor}60` }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: `${goldColor}40` }} />
                </div>

                <button
                    onClick={nextPage}
                    className="group flex items-center gap-3 px-6 py-3 rounded-full transition-all hover:scale-105 hover:shadow-xl"
                    style={{
                        background: `linear-gradient(135deg, ${goldColor}, #c9a227)`,
                        color: dark ? '#0f1119' : '#fff',
                        boxShadow: `0 4px 25px rgba(212,175,55,0.3)`,
                    }}
                >
                    <span className="text-sm font-bold tracking-wide">Next Page</span>
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>

            {/* Instructions */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6 text-sm flex items-center gap-2"
                style={{ color: dark ? '#6b6b6b' : '#9b9b9b' }}
            >
                <BookOpen size={14} />
                Click page corners or drag to turn pages
            </motion.p>
        </div>
    );
}
