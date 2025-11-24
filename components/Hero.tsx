'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

const Hero = () => {
    const comp = useRef(null);
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline();
            
            tl.set(".hero-text", { y: 50, opacity: 0 });

            tl.to(".hero-text", 
                { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.2 }
            );
        }, comp);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={comp} className="relative h-screen w-full flex items-center justify-center overflow-hidden">
            {/* Background Gradient */}
            <div className={`absolute inset-0 pointer-events-none ${
                dark 
                    ? 'bg-gradient-to-b from-indigo-950 via-purple-950 to-[#0f1119] opacity-50' 
                    : 'bg-gradient-to-b from-blue-300 via-purple-200 to-white opacity-30'
            }`}></div>
            
            <div className="relative z-10 text-center px-4 flex flex-col items-center">
                
                <h2 className={`hero-text font-sans tracking-[0.3em] text-sm md:text-base uppercase mb-4 font-bold ${dark ? 'text-genshin-gold-light' : 'text-genshin-dark'}`}>
                    Step Into a Vast Magical World of Adventure
                </h2>
                <h1 className={`hero-text font-serif text-6xl md:text-8xl mb-8 text-shadow-gold ${dark ? 'text-genshin-white' : 'text-genshin-dark'}`}>
                    REALMS UNBOUND
                </h1>
                <div className="hero-text flex flex-col md:flex-row gap-4 justify-center items-center">
                    <Link href="/realms">
                        <button className={`btn-genshin group relative px-8 py-4 border border-genshin-gold rounded-sm min-w-[200px] overflow-hidden ${
                            dark ? 'bg-genshin-dark text-genshin-gold' : 'bg-genshin-dark text-genshin-gold'
                        }`}>
                            <span className="font-serif text-xl z-10 relative group-hover:text-white transition-colors">START JOURNEY</span>
                            <div className="absolute inset-0 bg-genshin-gold transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 z-0"></div>
                        </button>
                    </Link>
                </div>
            </div>

            {/* Decor elements */}
            <div className={`absolute bottom-0 w-full h-32 z-10 pointer-events-none ${
                dark 
                    ? 'bg-gradient-to-t from-[#0f1119] to-transparent' 
                    : 'bg-gradient-to-t from-white to-transparent'
            }`}></div>
        </section>
    );
};

export default Hero;
