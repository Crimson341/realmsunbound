'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    Brain, Sparkles, Scroll, Zap, Users, Sword, Crown, Map,
    Compass, Star, Hexagon, ChevronRight, Feather,
    Eye, Anchor, Wind, Hourglass, Infinity as InfinityIcon,
    Hammer, Sprout, BookOpen
} from 'lucide-react';

// --- ASSETS ---
const StarField = () => (
    <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
            backgroundImage: 'radial-gradient(#C8A051 1.5px, transparent 1.5px)',
            backgroundSize: '48px 48px'
        }}
    />
);

const GlowGradient = () => (
    <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-white via-transparent to-transparent z-0 pointer-events-none" />
);

// --- COMPONENTS ---

const ThreadNode = ({ icon: Icon, title, subtitle, children, align = 'left', index }: { icon: any, title: string, subtitle: string, children: React.ReactNode, align?: 'left' | 'right', index: number }) => {
    const isLeft = align === 'left';

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className={`relative flex items-center justify-between w-full py-24 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
        >
            {/* Content Side */}
            <div className={`w-[45%] ${isLeft ? 'text-right pr-16' : 'text-left pl-16'}`}>
                <div className={`flex flex-col gap-4 ${isLeft ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-3 text-[#C8A051]">
                        <Icon size={20} />
                        <span className="text-xs font-bold uppercase tracking-[0.3em]">{subtitle}</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#3E4255] leading-tight">
                        {title}
                    </h2>
                    <div className={`h-1 w-20 bg-[#C8A051]/30 ${isLeft ? 'mr-0' : 'ml-0'}`} />
                    <p className="text-[#7A8099] text-lg leading-relaxed font-serif italic">
                        {children}
                    </p>
                </div>
            </div>

            {/* The Center Node on the Thread */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-12 z-20">
                <div className="absolute w-3 h-3 bg-[#C8A051] rounded-full shadow-[0_0_15px_#C8A051]" />
                <div className="absolute w-8 h-8 border border-[#C8A051]/50 rounded-full animate-ping opacity-20" />
                <div className="absolute w-12 h-12 border border-[#C8A051]/20 rounded-full" />
            </div>

            {/* Empty Side for Balance (or Visuals) */}
            <div className="w-[45%] opacity-20 hover:opacity-40 transition-opacity duration-700 flex justify-center">
                <Icon size={200} strokeWidth={0.5} className="text-[#C8A051] rotate-12" />
            </div>
        </motion.div>
    );
};

const CentralThread = () => {
    const { scrollYProgress } = useScroll();
    const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

    return (
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#C8A051]/10 -translate-x-1/2 z-10 h-full">
            <motion.div
                style={{ height }}
                className="w-full bg-[#C8A051] shadow-[0_0_10px_#C8A051]"
            />
        </div>
    );
};

export default function LorePage() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const opacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#F9F9F9] text-[#3E4255] font-serif overflow-x-hidden selection:bg-[#C8A051] selection:text-white">

            {/* Background Layers */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <StarField />
                <GlowGradient />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.07]" />
            </div>

            {/* The Central Golden Thread */}
            <CentralThread />

            <main className="relative z-10 pb-40">

                {/* --- HERO SECTION --- */}
                <motion.section
                    style={{ opacity, scale }}
                    className="h-screen flex flex-col items-center justify-center text-center sticky top-0 z-0 px-4 pt-32"
                >
                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-[#C8A051] blur-[80px] opacity-20 rounded-full" />
                        <Compass size={64} strokeWidth={1} className="text-[#3E4255] relative z-10" />
                    </div>

                    <h1 className="text-7xl md:text-9xl font-medium text-[#3E4255] tracking-tighter leading-none mb-6">
                        Realms
                    </h1>

                    <div className="flex items-center gap-4 text-[#C8A051]">
                        <div className="h-px w-12 bg-[#C8A051]" />
                        <span className="text-sm font-sans font-bold tracking-[0.4em] uppercase">The Living Chronicle</span>
                        <div className="h-px w-12 bg-[#C8A051]" />
                    </div>

                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute bottom-12 text-[#C8A051]/50 flex flex-col items-center gap-2"
                    >
                        <span className="text-[10px] font-sans tracking-[0.2em] uppercase">Begin the Journey</span>
                        <div className="w-px h-12 bg-gradient-to-b from-[#C8A051]/50 to-transparent" />
                    </motion.div>
                </motion.section>

                {/* --- SPACER for Hero Scroll --- */}
                <div className="h-[80vh]" />


                {/* --- CONTENT NODES --- */}
                <div className="relative z-10 bg-[#F9F9F9]/80 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-6">

                        {/* NODE 1: AI DM */}
                        <ThreadNode
                            index={0}
                            align="left"
                            icon={Brain}
                            subtitle="The Architect"
                            title="The Mind that Dreams"
                        >
                            We do not write the stories. We birth the storyteller. <span className="text-[#C8A051]">Gemini</span> acts as your Dungeon Master, weaving narratives in real-time, reacting to your unpredictability with improvisational genius. It understands intent, weaves causality, and remembers every choice.
                        </ThreadNode>

                        {/* NODE 2: THE FORGE */}
                        <ThreadNode
                            index={1}
                            align="right"
                            icon={Hammer}
                            subtitle="The Anvil"
                            title="Forge Your Reality"
                        >
                            You are not just a player; you are a creator. In <span className="text-[#C8A051]">The Forge</span>, you define the laws of reality. Craft legendary swords, scribe custom spells, and birth villains with complex motives. The world obeys your design.
                        </ThreadNode>

                        {/* NODE 3: SEEDING */}
                        <ThreadNode
                            index={2}
                            align="left"
                            icon={Sprout}
                            subtitle="The Genesis"
                            title="Instant World Genesis"
                        >
                            Creation need not be tedious. With a single command, sprout entire continents. From the snowy peaks of a Nordic realm to alien landscapes, our engine populates your world with thousands of entities, quests, and secrets in seconds.
                        </ThreadNode>

                        {/* NODE 4: INTERACTIVE LORE */}
                        <ThreadNode
                            index={3}
                            align="right"
                            icon={BookOpen}
                            subtitle="The Codex"
                            title="Knowledge is Power"
                        >
                            In Realms, the text itself is alive. Hover over the name of a forgotten king or a cursed blade, and the <span className="text-[#C8A051]">Archives</span> instantly reveal its secrets. The lore is not hidden in a wiki; it is woven into the very air you breathe.
                        </ThreadNode>

                        {/* NODE 5: MULTIPLAYER */}
                        <ThreadNode
                            index={4}
                            align="left"
                            icon={Users}
                            subtitle="The Gathering"
                            title="Destiny is Shared"
                        >
                            The hero's journey need not be solitary. Connect your timelines. Form parties. Forge alliances or declare wars. The state of the world is persistent and shared, a living tapestry woven by thousands of hands.
                        </ThreadNode>

                    </div>
                </div>

                {/* --- FINAL CTA SECTION --- */}
                <motion.section
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="relative h-screen flex items-center justify-center bg-[#3E4255] text-[#F9F9F9] mt-40 overflow-hidden"
                >
                    {/* Decorative Background Ring */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[800px] h-[800px] border border-[#C8A051]/10 rounded-full" />
                        <div className="absolute w-[600px] h-[600px] border border-[#C8A051]/20 rounded-full border-dashed animate-[spin_60s_linear_infinite]" />
                    </div>

                    <div className="text-center space-y-10 relative z-10 px-4">
                        <Star size={48} className="mx-auto text-[#C8A051]" fill="#C8A051" />

                        <h2 className="text-5xl md:text-7xl font-serif font-bold">
                            The Realm <span className="italic text-[#C8A051]">Awaits</span>
                        </h2>

                        <p className="text-white/60 max-w-lg mx-auto text-lg font-light">
                            The history of this world has not yet been written. It is waiting for your ink.
                        </p>

                        <div className="pt-8">
                            <a href="/sign-up" className="group relative inline-flex items-center gap-4 px-12 py-5 bg-[#F9F9F9] text-[#3E4255] font-bold rounded-full hover:bg-[#C8A051] hover:text-white transition-all duration-500">
                                <span className="text-sm font-sans font-bold uppercase tracking-[0.2em]">Enter the Forge</span>
                                <Feather size={18} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </div>
                </motion.section>

            </main>
        </div>
    );
}