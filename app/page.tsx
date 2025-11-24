'use client';

import Hero from '@/components/Hero';
import WhyPlay from '@/components/WhyPlay';
import WishSimulator from '@/components/WishSimulator';
import CrystalScene from '@/components/CrystalScene';
import { useTheme } from '@/components/ThemeProvider';

export default function App() {
  const { theme, mounted } = useTheme();
  const dark = mounted ? theme === 'dark' : false;

  return (
    <div className={`relative min-h-screen ${dark ? 'bg-[#0f1119]' : 'bg-white'}`}>
      <CrystalScene />
      
      <main>
        <Hero />
        
        <div className={`relative z-20 ${dark ? 'bg-gradient-to-b from-[#0f1119] to-[#151821]' : 'bg-gradient-to-b from-white to-genshin-white'}`}>
          <section className="py-20 px-8 text-center max-w-4xl mx-auto">
            <h3 className="font-sans font-bold text-genshin-gold tracking-widest uppercase mb-4">Open World Exploration</h3>
            <h2 className={`font-serif text-4xl md:text-5xl mb-8 ${dark ? 'text-genshin-white' : 'text-genshin-dark'}`}>Climb Any Mountain, Swim Any River</h2>
            <p className={`leading-relaxed text-lg ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
              Fly across the vast open world, swim through crystal-clear waters, and climb towering mountains. 
              Stray off the beaten path to discover hidden secrets of a world forgotten by time.
            </p>
          </section>

          <WhyPlay />
          
          <WishSimulator />
        </div>
      </main>
    </div>
  );
}
