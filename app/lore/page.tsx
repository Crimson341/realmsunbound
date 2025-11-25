'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';
import {
    Brain,
    Users,
    Compass, Star,
    Hammer, Sprout, BookOpen, Feather
} from 'lucide-react';

// --- ASSETS ---
const StarField = ({ dark }: { dark: boolean }) => (
    <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
            backgroundImage: `radial-gradient(${dark ? '#D4AF37' : '#C8A051'} 1.5px, transparent 1.5px)`,
            backgroundSize: '48px 48px'
        }}
    />
);

const GlowGradient = ({ dark }: { dark: boolean }) => (
    <div className={`absolute top-0 left-0 w-full h-[800px] z-0 pointer-events-none ${
        dark 
            ? 'bg-gradient-to-b from-[#0f1119] via-transparent to-transparent' 
            : 'bg-gradient-to-b from-white via-transparent to-transparent'
    }`} />
);

// --- COMPONENTS ---

const ThreadNode = ({ icon: Icon, title, subtitle, children, align = 'left', index, dark }: { icon: React.ElementType, title: string, subtitle: string, children: React.ReactNode, align?: 'left' | 'right', index: number, dark: boolean }) => {
    const isLeft = align === 'left';
    const goldColor = dark ? '#D4AF37' : '#C8A051';
    const textColor = dark ? '#e8e6e3' : '#3E4255';
    const mutedColor = dark ? '#7a7a7a' : '#7A8099';

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
                    <div className="flex items-center gap-3" style={{ color: goldColor }}>
                        <Icon size={20} />
                        <span className="text-xs font-bold uppercase tracking-[0.3em]">{subtitle}</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight" style={{ color: textColor }}>
                        {title}
                    </h2>
                    <div className="h-1 w-20" style={{ backgroundColor: `${goldColor}30` }} />
                    <p className="text-lg leading-relaxed font-serif italic" style={{ color: mutedColor }}>
                        {children}
                    </p>
                </div>
            </div>

            {/* The Center Node on the Thread */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-12 z-20">
                <div className="absolute w-3 h-3 rounded-full" style={{ backgroundColor: goldColor, boxShadow: `0 0 15px ${goldColor}` }} />
                <div className="absolute w-8 h-8 border rounded-full animate-ping opacity-20" style={{ borderColor: `${goldColor}50` }} />
                <div className="absolute w-12 h-12 border rounded-full" style={{ borderColor: `${goldColor}20` }} />
            </div>

            {/* Empty Side for Balance (or Visuals) */}
            <div className="w-[45%] opacity-20 hover:opacity-40 transition-opacity duration-700 flex justify-center">
                <Icon size={200} strokeWidth={0.5} className="rotate-12" style={{ color: goldColor }} />
            </div>
        </motion.div>
    );
};

const CentralThread = ({ dark }: { dark: boolean }) => {
    const { scrollYProgress } = useScroll();
    const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
    const goldColor = dark ? '#D4AF37' : '#C8A051';

    return (
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 z-10 h-full" style={{ backgroundColor: `${goldColor}10` }}>
            <motion.div
                style={{ height, backgroundColor: goldColor, boxShadow: `0 0 10px ${goldColor}` }}
                className="w-full"
            />
        </div>
    );
};

export default function LorePage() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const opacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    const goldColor = dark ? '#D4AF37' : '#C8A051';
    const textColor = dark ? '#e8e6e3' : '#3E4255';
    const bgColor = dark ? '#0f1119' : '#F9F9F9';
    const bgColorAlt = dark ? '#1a1d2e' : '#3E4255';

    return (
        <div ref={containerRef} className="relative min-h-screen font-serif overflow-x-hidden" style={{ backgroundColor: bgColor, color: textColor }}>

            {/* Background Layers */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <StarField dark={dark} />
                <GlowGradient dark={dark} />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.07]" />
            </div>

            {/* The Central Golden Thread */}
            <CentralThread dark={dark} />

            <main className="relative z-10 pb-40">

                {/* --- HERO SECTION --- */}
                <motion.section
                    style={{ opacity, scale }}
                    className="h-screen flex flex-col items-center justify-center text-center sticky top-0 z-0 px-4 pt-32"
                >
                    <div className="mb-8 relative">
                        <div className="absolute inset-0 blur-[80px] opacity-20 rounded-full" style={{ backgroundColor: goldColor }} />
                        <Compass size={64} strokeWidth={1} className="relative z-10" style={{ color: textColor }} />
                    </div>

                    <h1 className="text-7xl md:text-9xl font-medium tracking-tighter leading-none mb-6" style={{ color: textColor }}>
                        Realms
                    </h1>

                    <div className="flex items-center gap-4" style={{ color: goldColor }}>
                        <div className="h-px w-12" style={{ backgroundColor: goldColor }} />
                        <span className="text-sm font-sans font-bold tracking-[0.4em] uppercase">The Living Chronicle</span>
                        <div className="h-px w-12" style={{ backgroundColor: goldColor }} />
                    </div>

                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute bottom-12 flex flex-col items-center gap-2"
                        style={{ color: `${goldColor}50` }}
                    >
                        <span className="text-[10px] font-sans tracking-[0.2em] uppercase">Begin the Journey</span>
                        <div className="w-px h-12 bg-gradient-to-b" style={{ backgroundImage: `linear-gradient(to bottom, ${goldColor}50, transparent)` }} />
                    </motion.div>
                </motion.section>

                {/* --- SPACER for Hero Scroll --- */}
                <div className="h-[80vh]" />


                {/* --- CONTENT NODES --- */}
                <div className="relative z-10 backdrop-blur-sm" style={{ backgroundColor: `${bgColor}cc` }}>
                    <div className="max-w-7xl mx-auto px-6">

                        {/* NODE 1: AI DM */}
                        <ThreadNode
                            index={0}
                            align="left"
                            icon={Brain}
                            subtitle="The Architect"
                            title="The Mind that Dreams"
                            dark={dark}
                        >
                            We do not write the stories. We birth the storyteller. <span style={{ color: goldColor }}>Gemini</span> acts as your Dungeon Master, weaving narratives in real-time, reacting to your unpredictability with improvisational genius. It understands intent, weaves causality, and remembers every choice.
                        </ThreadNode>

                        {/* NODE 2: THE FORGE */}
                        <ThreadNode
                            index={1}
                            align="right"
                            icon={Hammer}
                            subtitle="The Anvil"
                            title="Forge Your Reality"
                            dark={dark}
                        >
                            You are not just a player; you are a creator. In <span style={{ color: goldColor }}>The Forge</span>, you define the laws of reality. Craft legendary swords, scribe custom spells, and birth villains with complex motives. The world obeys your design.
                        </ThreadNode>

                        {/* NODE 3: SEEDING */}
                        <ThreadNode
                            index={2}
                            align="left"
                            icon={Sprout}
                            subtitle="The Genesis"
                            title="Instant World Genesis"
                            dark={dark}
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
                            dark={dark}
                        >
                            In Realms, the text itself is alive. Hover over the name of a forgotten king or a cursed blade, and the <span style={{ color: goldColor }}>Archives</span> instantly reveal its secrets. The lore is not hidden in a wiki; it is woven into the very air you breathe.
                        </ThreadNode>

                        {/* NODE 5: MULTIPLAYER */}
                        <ThreadNode
                            index={4}
                            align="left"
                            icon={Users}
                            subtitle="The Gathering"
                            title="Destiny is Shared"
                            dark={dark}
                        >
                            The hero&apos;s journey need not be solitary. Connect your timelines. Form parties. Forge alliances or declare wars. The state of the world is persistent and shared, a living tapestry woven by thousands of hands.
                        </ThreadNode>

                    </div>
                </div>

                {/* --- FINAL CTA SECTION --- */}
                <motion.section
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="relative h-screen flex items-center justify-center mt-40 overflow-hidden"
                    style={{ backgroundColor: bgColorAlt, color: bgColor }}
                >
                    {/* Decorative Background Ring */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[800px] h-[800px] border rounded-full" style={{ borderColor: `${goldColor}10` }} />
                        <div className="absolute w-[600px] h-[600px] border rounded-full border-dashed animate-[spin_60s_linear_infinite]" style={{ borderColor: `${goldColor}20` }} />
                    </div>

                    <div className="text-center space-y-10 relative z-10 px-4">
                        <Star size={48} className="mx-auto" style={{ color: goldColor }} fill={goldColor} />

                        <h2 className="text-5xl md:text-7xl font-serif font-bold" style={{ color: dark ? '#e8e6e3' : '#F9F9F9' }}>
                            The Realm <span className="italic" style={{ color: goldColor }}>Awaits</span>
                        </h2>

                        <p className="max-w-lg mx-auto text-lg font-light" style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.6)' }}>
                            The history of this world has not yet been written. It is waiting for your ink.
                        </p>

                        <div className="pt-8">
                            <a href="/sign-up" className="group relative inline-flex items-center gap-4 px-12 py-5 font-bold rounded-full transition-all duration-500" style={{
                                backgroundColor: dark ? goldColor : '#F9F9F9',
                                color: dark ? '#0f1119' : '#3E4255'
                            }}>
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
