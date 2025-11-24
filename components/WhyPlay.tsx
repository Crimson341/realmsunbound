'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { Sparkles, Star, Compass, BrainCircuit, Hammer, Map, BookOpen } from 'lucide-react';

// --- 3D Card Component (Celestia Style) ---
interface VisionCardProps {
    title: string;
    description: string;
    img: string;
    icon: React.ElementType;
    index: number;
}

const VisionCard = ({ title, description, img, icon: Icon, index }: VisionCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;
        mouseX.set(xPct);
        mouseY.set(yPct);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);
    const shineOpacity = useTransform(mouseX, [-0.5, 0.5], [0, 0.5]);

    const isEven = index % 2 === 0;

    // --- Text Animation Variants ---
    const textContainerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: {
                staggerChildren: 0.3,
                delayChildren: 0.2
            }
        }
    };

    const textItemVariants = {
        hidden: { 
            opacity: 0, 
            y: 30, 
            filter: 'blur(10px)' // The "Mist" effect
        },
        visible: { 
            opacity: 1, 
            y: 0, 
            filter: 'blur(0px)',
            transition: { 
                duration: 1.2, 
                ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number]
            } 
        }
    };

    return (
        <div className={`flex items-center gap-12 md:gap-40 mb-32 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
            
            {/* Text Content */}
            <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-20%" }}
                variants={textContainerVariants}
                className={`flex-1 ${isEven ? 'text-right' : 'text-left'} z-10`}
            >
                <motion.div variants={textItemVariants} className={`inline-flex items-center gap-3 mb-3 ${isEven ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[#d4af37] tracking-[0.3em] text-xs font-bold font-serif uppercase">Feature 0{index + 1}</span>
                    <div className="h-[1px] w-16 bg-gradient-to-r from-[#d4af37] to-transparent"></div>
                </motion.div>
                
                <motion.h3 variants={textItemVariants} className="font-serif text-5xl md:text-6xl font-bold text-[#3d405b] mb-6 drop-shadow-sm">
                    {title}
                </motion.h3>
                
                <motion.p variants={textItemVariants} className="font-serif text-lg text-[#6c757d] leading-relaxed tracking-wide">
                    {description}
                </motion.p>
            </motion.div>

            {/* The 3D Artifact Card */}
            <motion.div 
                ref={ref}
                style={{ rotateX, rotateY, perspective: 1000 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="flex-1 relative group cursor-none w-full max-w-[500px]"
            >
                {/* Card Frame - Marble & Gold */}
                <motion.div 
                    className="relative w-full aspect-[3/4] rounded-[2rem] bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden"
                >
                    {/* Gold Border Container */}
                    <div className="absolute inset-0 border-[6px] border-white z-20 rounded-[2rem] pointer-events-none ring-1 ring-[#d4af37]/20"></div>
                    <div className="absolute inset-[6px] border-[1px] border-[#d4af37]/40 z-20 rounded-[1.6rem] pointer-events-none"></div>
                    
                    {/* Image */}
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                         style={{ backgroundImage: `url(${img})` }} />
                    
                    {/* Light/Holy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent z-10" />
                    
                    {/* Decorative Corner Accents (Filigree) */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#d4af37] z-20 rounded-tl-lg opacity-60"></div>
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#d4af37] z-20 rounded-tr-lg opacity-60"></div>
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#d4af37] z-20 rounded-bl-lg opacity-60"></div>
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#d4af37] z-20 rounded-br-lg opacity-60"></div>

                    {/* Icon Badge */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            {/* Rotating Gold Halo */}
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border border-[#d4af37] border-dashed rounded-full"
                            />
                            <div className="absolute inset-2 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-white flex items-center justify-center">
                                <Icon size={36} className="text-[#d4af37]" />
                            </div>
                        </div>
                    </div>

                    {/* Stars Rarity */}
                    <div className="absolute bottom-8 left-0 w-full flex justify-center gap-2 z-30">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 fill-[#d4af37] text-[#d4af37]" />
                        ))}
                    </div>

                    {/* Dynamic Shine */}
                    <motion.div 
                        style={{ opacity: shineOpacity }}
                        className="absolute inset-0 z-40 bg-gradient-to-tr from-transparent via-white/60 to-transparent pointer-events-none"
                    />
                </motion.div>
            </motion.div>
        </div>
    );
};

// --- Background Atmosphere ---
const SkyCanvas = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none bg-[#f8f9fa]">
             {/* Subtle Sky Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#e6f3ff] via-[#fff] to-[#fff]" />
            
            {/* "Cloud" textures */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-multiply"></div>
            
            {/* Divine Light Rays (CSS Gradients) */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[150%] h-[80%] bg-gradient-to-b from-white via-transparent to-transparent opacity-80 blur-3xl rounded-full"></div>
        </div>
    );
};

const WhyPlay = () => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    
    const pathLength = useSpring(scrollYProgress, { stiffness: 50, damping: 20 });

    const features = [
        {
            title: "AI Dungeon Master",
            description: "Experience a story that never repeats. Powered by Gemini, your AI Dungeon Master dynamically generates every scene, dialogue, and outcome based on your choices and the world's lore.",
            img: "https://images.unsplash.com/photo-1614726365723-49cfae96c213?q=80&w=1920&auto=format&fit=crop",
            icon: BrainCircuit
        },
        {
            title: "The Forge",
            description: "Be the Creator. Design your own campaigns from scratch. Craft unique locations, forge legendary items, birth complex NPCs, and write the quests that players will embark upon.",
            img: "https://images.unsplash.com/photo-1542379653-b92d3be46e58?q=80&w=1920&auto=format&fit=crop",
            icon: Hammer
        },
        {
            title: "Instant Adventures",
            description: "Don't want to start from a blank slate? Use our powerful seeding tools to instantly generate massive, fully-populated worlds like 'Skyrim' with a single click.",
            img: "https://images.unsplash.com/photo-1470137237906-d8a4f71e1966?q=80&w=1920&auto=format&fit=crop",
            icon: Map
        },
        {
            title: "Living Lore",
            description: "The world is alive. Hover over highlighted names of people, places, and artifacts within the story to instantly reveal their deep lore, stats, and hidden secrets.",
            img: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1920&auto=format&fit=crop",
            icon: BookOpen
        }
    ];

    return (
        <div ref={containerRef} className="relative min-h-screen text-[#3d405b] overflow-hidden selection:bg-[#d4af37] selection:text-white">
            <SkyCanvas />

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-6 py-32">
                
                {/* Header */}
                <div className="text-center mb-48 relative">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <Sparkles className="w-8 h-8 text-[#d4af37] mx-auto mb-6 animate-pulse" />
                        <h1 className="font-serif text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#d4af37] to-[#b08d26] drop-shadow-sm tracking-tight">
                            NEW HORIZONS
                        </h1>
                        <p className="mt-6 text-xl font-serif text-[#8d99ae] italic tracking-widest uppercase">
                            Powered by Artificial Intelligence
                        </p>
                        
                        {/* Divine Divider */}
                        <div className="mt-12 flex items-center justify-center gap-4">
                            <div className="h-[1px] w-12 bg-gradient-to-l from-[#d4af37] to-transparent opacity-50"></div>
                            <div className="w-2 h-2 rotate-45 border border-[#d4af37]"></div>
                            <div className="h-[1px] w-12 bg-gradient-to-r from-[#d4af37] to-transparent opacity-50"></div>
                        </div>
                    </motion.div>
                </div>

                {/* Central Timeline Line (Gold) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 hidden md:block h-full pointer-events-none">
                     <svg className="h-full w-20 -ml-10 overflow-visible">
                         {/* Base Line */}
                         <path
                            d="M 40 0 L 40 10000"
                            stroke="#d4af37"
                            strokeWidth="1"
                            strokeDasharray="8 8"
                            strokeOpacity="0.2"
                            fill="none"
                         />
                         {/* Active Progress Line */}
                         <motion.path
                            d="M 40 0 L 40 5000"
                            stroke="#d4af37"
                            strokeWidth="2"
                            fill="none"
                            style={{ pathLength }}
                            strokeLinecap="round"
                            filter="drop-shadow(0 0 4px rgba(212, 175, 55, 0.5))"
                         />
                     </svg>
                </div>

                {/* Cards Loop */}
                <div className="relative max-w-6xl mx-auto">
                    {features.map((feature, index) => (
                        <VisionCard 
                            key={index} 
                            {...feature} 
                            index={index} 
                        />
                    ))}
                </div>

                {/* Footer CTA */}
                <div className="mt-32 text-center pb-20">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative group px-12 py-4 bg-white text-[#d4af37] font-serif font-bold text-lg tracking-[0.1em] uppercase border border-[#d4af37]/30 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.3)] overflow-hidden rounded-full"
                    >
                         <span className="relative z-10 flex items-center gap-3">
                            <Compass className="w-5 h-5" />
                            Enter The Realm
                         </span>
                         {/* Hover Fill */}
                         <div className="absolute inset-0 bg-[#d4af37] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                         <span className="absolute inset-0 z-20 flex items-center justify-center gap-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Compass className="w-5 h-5" />
                            Enter The Realm
                         </span>
                    </motion.button>
                </div>
            </div>
            
            {/* Floating Gold Dust */}
            <div className="fixed inset-0 pointer-events-none z-50">
                {[...Array(15)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-[#d4af37] rounded-full"
                        initial={{ 
                            x: Math.random() * 100 + "vw", 
                            y: Math.random() * 100 + "vh", 
                            opacity: 0,
                            scale: 0
                        }}
                        animate={{ 
                            y: [null, Math.random() * -100],
                            opacity: [0, 0.6, 0],
                            scale: [0, 1, 0]
                        }}
                        transition={{ 
                            duration: Math.random() * 5 + 5, 
                            repeat: Infinity, 
                            delay: Math.random() * 5,
                            ease: "easeInOut"
                        }}
                        style={{ 
                            width: Math.random() * 4 + 2 + "px", 
                            height: Math.random() * 4 + 2 + "px",
                            boxShadow: "0 0 8px rgba(212, 175, 55, 0.4)"
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default WhyPlay;

