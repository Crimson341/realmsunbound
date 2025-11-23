'use client';

import Hero from '@/components/Hero';
import WhyPlay from '@/components/WhyPlay';
import WishSimulator from '@/components/WishSimulator';
import CrystalScene from '@/components/CrystalScene';

export default function App() {
  return (
    <div className="relative min-h-screen">
      <CrystalScene />
      
      <main>
        <Hero />
        
        <div className="relative z-20 bg-gradient-to-b from-white to-genshin-white">
          <section className="py-20 px-8 text-center max-w-4xl mx-auto">
            <h3 className="font-sans font-bold text-genshin-gold tracking-widest uppercase mb-4">Open World Exploration</h3>
            <h2 className="font-serif text-4xl md:text-5xl text-genshin-dark mb-8">Climb Any Mountain, Swim Any River</h2>
            <p className="text-gray-600 leading-relaxed text-lg">
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
