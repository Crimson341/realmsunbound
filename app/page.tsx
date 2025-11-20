"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Shield, ChevronRight, Star, Users, Scroll, Play, Compass, Brain, Layout, Wand2, Sparkles, Clock, Infinity, Sword, ArrowRight, Zap, Share2 } from 'lucide-react';

/**
 * DragonForge Landing Page
 * Features:
 * - Realm Loader
 * - Hero Section
 * - Triptych (How it Works)
 * - Why Section
 * - CTA Section
 * - NEW: Footer
 */

// --- ANIMATION HOOKS ---
const useScrollReveal = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
};

// --- REALM LOADER COMPONENT (Unchanged) ---
const RealmLoader = ({ onComplete }: { onComplete: () => void }) => {
  const [loadingText, setLoadingText] = useState("Severing Divine Connection...");
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const phrases = [
      { text: "Weaving Leylines...", time: 0 },
      { text: "Forging Geography...", time: 1200 },
      { text: "Aligning Celestial Planes...", time: 2400 },
      { text: "Realm Stabilized.", time: 3600 },
    ];

    const timeouts = phrases.map(({ text, time }) =>
      setTimeout(() => setLoadingText(text), time)
    );

    const exitTimer = setTimeout(() => setIsExiting(true), 4200);
    const completeTimer = setTimeout(() => onComplete(), 5000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden transition-opacity duration-1000 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black animate-pulse-slow"></div>

      <div className={`relative w-64 h-64 md:w-96 md:h-96 transition-transform duration-1000 ${isExiting ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}>
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_0_15px_rgba(100,100,255,0.5)]">
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bf953f" />
              <stop offset="50%" stopColor="#fcf6ba" />
              <stop offset="100%" stopColor="#aa771c" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="origin-center animate-spin-slow">
            <circle cx="200" cy="200" r="190" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <path d="M200,10 A190,190 0 0,1 390,200" fill="none" stroke="url(#goldGrad)" strokeWidth="2" strokeLinecap="round" />
            <path d="M200,390 A190,190 0 0,1 10,200" fill="none" stroke="url(#goldGrad)" strokeWidth="2" strokeLinecap="round" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <circle key={i} cx="200" cy="15" r="3" fill="#aa771c" transform={`rotate(${deg} 200 200)`} />
            ))}
          </g>

          <g className="origin-center animate-spin-reverse-medium">
            <circle cx="200" cy="200" r="140" fill="none" stroke="#444" strokeWidth="1" />
            <circle cx="200" cy="200" r="140" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="20 60" filter="url(#glow)" />
            <path d="M200,60 L200,80 M200,320 L200,340 M60,200 L80,200 M320,200 L340,200" stroke="#6366f1" strokeWidth="2" />
          </g>

          <g className="origin-center animate-spin-fast">
            <rect x="160" y="160" width="80" height="80" fill="none" stroke="url(#goldGrad)" strokeWidth="2" transform="rotate(45 200 200)" />
            <rect x="160" y="160" width="80" height="80" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.8" />
          </g>

          <circle cx="200" cy="200" r="20" fill="#fff" className="animate-pulse-fast" filter="url(#glow)" />
        </svg>
      </div>

      <div className="mt-8 h-8 relative flex items-center justify-center overflow-hidden">
        <div className={`font-serif text-xl md:text-2xl tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-stone-400 via-white to-stone-400 animate-fade-in-up key-${loadingText}`}>
          {loadingText}
        </div>
      </div>
      <div className={`absolute inset-0 bg-indigo-100 mix-blend-overlay transition-opacity duration-700 ${isExiting ? 'opacity-20' : 'opacity-0'}`}></div>
    </div>
  );
};



// --- HERO SECTION (Unchanged) ---
const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold tracking-wider uppercase animate-in slide-in-from-bottom-4 fade-in duration-700">
            <Star size={12} fill="currentColor" />
            V 1.0 Now Live with Realm Shaping
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-stone-200 to-stone-500 leading-[1.1] animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-200 drop-shadow-sm">
            Weave Your <br />
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">Destiny</span>
          </h1>

          <p className="text-lg text-stone-400 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300">
            The ultimate AI-powered companion for Tabletop RPGs. Generate complex worlds, expansive lore, and immersive backstories in seconds, not hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-500">
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 group">
              <Zap size={20} className="group-hover:text-yellow-600 transition-colors" />
              Create Realm
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-transparent border border-stone-700 text-stone-300 font-bold rounded hover:bg-stone-800/50 transition-colors flex items-center justify-center gap-2">
              <Play size={20} />
              Watch Demo
            </button>
          </div>

          <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-stone-500 text-sm font-medium animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-700">
            <div className="flex items-center gap-2"><Users size={16} /> 50k+ Realms Created</div>
            <div className="flex items-center gap-2"><Scroll size={16} /> System Agnostic</div>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end animate-in zoom-in-95 fade-in duration-1000 delay-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-[80px] -z-10"></div>

          <div className="relative w-full max-w-[500px] aspect-square animate-float">

            <img
              src="/hero/mage.svg"
              alt="Mystic Mage Character"
              className="relative w-full h-full object-contain drop-shadow-[0_0_30px_rgba(99,102,241,0.4)]"
              style={{ mixBlendMode: 'normal' }}
            />

            <div className="absolute top-10 left-0 bg-stone-900/90 backdrop-blur-md p-3 rounded-lg border border-stone-700 shadow-xl flex items-center gap-3 animate-bounce-slow">
              <div className="w-8 h-8 rounded bg-green-900/30 flex items-center justify-center text-green-400 font-bold">V1</div>
              <div className="text-xs text-stone-300">
                <div className="font-bold">Release 1.0</div>
                <div className="text-stone-500">Stable Build</div>
              </div>
            </div>

            <div className="absolute bottom-20 right-0 bg-stone-900/90 backdrop-blur-md p-3 rounded-lg border border-stone-700 shadow-xl flex items-center gap-3 animate-bounce-slower">
              <div className="w-8 h-8 rounded bg-purple-900/30 flex items-center justify-center text-purple-400">
                <Brain size={16} />
              </div>
              <div className="text-xs text-stone-300">
                <div className="font-bold">AI Memory</div>
                <div className="text-stone-500">Assets Learned</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-600 animate-bounce">
        <span className="text-[10px] uppercase tracking-widest">Explore</span>
        <ChevronRight className="rotate-90" size={16} />
      </div>
    </section>
  );
};

// --- TRIPTYCH SECTION (Unchanged) ---
const ForgeTriptych = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 0,
      title: "The Blueprint",
      subtitle: "Forge Templates",
      desc: "Begin by crafting the skeleton of your world. Define intricate rules, stats, and the very laws of physics that govern your realm.",
      icon: <Layout size={40} />,
      color: "indigo",
      image: "http://googleusercontent.com/image_generation_content/3"
    },
    {
      id: 1,
      title: "The Gallery",
      subtitle: "Share & Discover",
      desc: "A living library of artifacts. Upload your creations to the Nexus and watch as others weave your items into their own legends.",
      icon: <Share2 size={40} />,
      color: "purple",
      image: "http://googleusercontent.com/image_generation_content/0"
    },
    {
      id: 2,
      title: "The Soul",
      subtitle: "Living Memory",
      desc: "This is where the magic breathes. Our AI engine remembers every sword swing and whisper, evolving your lore in real-time.",
      icon: <Brain size={40} />,
      color: "pink",
      image: "http://googleusercontent.com/image_generation_content/3"
    }
  ];

  return (
    <section className="min-h-[800px] md:h-screen bg-stone-950 flex flex-col md:flex-row overflow-hidden relative border-y border-stone-900">
      {/* Background Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-transparent to-stone-950"></div>
      </div>

      {steps.map((step, index) => {
        const isActive = activeStep === index;
        const activeWidth = isActive ? 'md:flex-[3] flex-[2]' : 'md:flex-[1] flex-[1]';
        const colorClass = step.color === 'indigo' ? 'text-indigo-400 border-indigo-500/50 bg-indigo-950/30'
          : step.color === 'purple' ? 'text-purple-400 border-purple-500/50 bg-purple-950/30'
            : 'text-pink-400 border-pink-500/50 bg-pink-950/30';
        const glowClass = step.color === 'indigo' ? 'shadow-[0_0_50px_rgba(99,102,241,0.2)]'
          : step.color === 'purple' ? 'shadow-[0_0_50px_rgba(168,85,247,0.2)]'
            : 'shadow-[0_0_50px_rgba(236,72,153,0.2)]';

        return (
          <div
            key={step.id}
            className={`relative ${activeWidth} transition-all duration-700 ease-out group cursor-pointer border-r border-stone-900 overflow-hidden flex flex-col justify-end`}
            onMouseEnter={() => setActiveStep(index)}
            onClick={() => setActiveStep(index)}
          >
            <div className="absolute inset-0 z-0 transition-transform duration-1000 ease-out overflow-hidden">
              <img
                src={step.image}
                alt={step.title}
                className={`w-full h-full object-cover opacity-40 transition-all duration-1000 
                           ${isActive ? 'scale-110 opacity-60' : 'scale-100 grayscale opacity-20'}
                           ${step.id === 2 ? 'hue-rotate-180' : ''}`}
              />
              <div className={`absolute inset-0 bg-stone-950/60 transition-opacity duration-700 ${isActive ? 'opacity-30' : 'opacity-80'}`}></div>
            </div>

            {isActive && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 pointer-events-none animate-spin-slow">
                <svg width="600" height="600" viewBox="0 0 100 100">
                  <path id="curve" d="M 10, 50 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="transparent" />
                  <text width="500">
                    <textPath href="#curve" className={`fill-current ${step.color === 'indigo' ? 'text-indigo-500' : step.color === 'purple' ? 'text-purple-500' : 'text-pink-500'} text-[5px] font-serif tracking-[2px] uppercase`}>
                      • Arcane Knowledge • Ancient Power • Eternal Memory • Mystic Arts •
                    </textPath>
                  </text>
                </svg>
              </div>
            )}

            <div className="relative z-10 p-8 md:p-12 flex flex-col items-start h-full justify-end bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent">
              <div className={`flex items-center gap-4 mb-4 transition-all duration-500 ${isActive ? 'translate-y-0' : 'translate-y-4'}`}>
                <div className={`p-4 rounded-xl border backdrop-blur-sm ${colorClass} transition-all duration-500 ${isActive ? glowClass : ''}`}>
                  {React.cloneElement(step.icon, { size: isActive ? 32 : 24 })}
                </div>
                <span className="text-6xl font-bold text-stone-800 select-none">0{index + 1}</span>
              </div>

              <div className="overflow-hidden">
                <h4 className={`text-sm font-bold tracking-widest uppercase mb-2 ${step.color === 'indigo' ? 'text-indigo-400' : step.color === 'purple' ? 'text-purple-400' : 'text-pink-400'}`}>
                  {step.subtitle}
                </h4>
                <h2 className={`text-3xl md:text-5xl font-serif font-bold text-white mb-4 leading-tight transition-all duration-500 origin-left ${isActive ? 'scale-100' : 'scale-75 opacity-70'}`}>
                  {step.title}
                </h2>
              </div>

              <div className={`grid transition-all duration-700 ease-in-out ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <p className="text-stone-300 text-lg leading-relaxed max-w-md border-l-2 border-stone-700 pl-4 mt-2">
                    {step.desc}
                  </p>
                  <button className="mt-8 group flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider hover:gap-4 transition-all">
                    Explore {step.subtitle} <ChevronRight size={16} className={`${step.color === 'indigo' ? 'text-indigo-500' : step.color === 'purple' ? 'text-purple-500' : 'text-pink-500'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className={`absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-20'}`}></div>
          </div>
        );
      })}
    </section>
  );
};

// --- WHY SECTION (Unchanged) ---
const WhySection = () => {
  const [textRef, isTextVisible] = useScrollReveal(0.2);
  const [imgRef, isImgVisible] = useScrollReveal(0.4);

  const features = [
    { icon: <Clock size={20} />, text: "Generate 100 years of lore in seconds" },
    { icon: <Infinity size={20} />, text: "Infinite plot hooks, zero writers block" },
    { icon: <Sword size={20} />, text: "Combat-balanced stats for 5e & PF2e" },
  ];

  return (
    <section className="py-32 bg-gradient-to-b from-stone-950 to-stone-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-20 w-2 h-2 bg-indigo-500 rounded-full animate-float" style={{ animationDuration: '5s' }}></div>
        <div className="absolute top-40 right-40 w-1 h-1 bg-purple-500 rounded-full animate-float" style={{ animationDuration: '7s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-2 h-2 bg-pink-500 rounded-full animate-float" style={{ animationDuration: '6s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
        <div ref={textRef} className="space-y-8 relative z-10">
          <div className={`transition-all duration-1000 ease-out transform ${isTextVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}>
            <div className="flex items-center gap-3 text-purple-400 font-bold tracking-widest uppercase text-sm mb-4">
              <span className="w-8 h-[1px] bg-purple-500"></span>
              Why Choose Us
            </div>
            <h2 className="text-5xl md:text-7xl font-serif font-bold text-white leading-none mb-6">
              Built for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Dungeon Masters</span>
            </h2>
            <p className="text-xl text-stone-400 leading-relaxed">
              Stop wrestling with spreadsheets and writer's block. DragonForge functions as your
              <span className="text-white font-semibold"> tireless co-DM</span>, handling the math and minutiae so you can focus on the story.
            </p>
          </div>

          <div className="space-y-4 mt-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 p-4 rounded-lg border border-stone-800 bg-stone-900/50 backdrop-blur-md transition-all duration-700 delay-${i * 200} ${isTextVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}
                style={{ transitionDelay: `${i * 150 + 300}ms` }}
              >
                <div className="p-2 bg-stone-800 rounded-full text-indigo-400">{f.icon}</div>
                <span className="text-stone-300 font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          <button className={`mt-8 px-8 py-4 bg-white text-black font-bold rounded hover:bg-stone-200 transition-all duration-700 delay-700 ${isTextVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            Start Your Campaign
          </button>
        </div>

        <div ref={imgRef} className="relative h-[600px] w-full perspective-1000">
          <div className={`relative w-full h-full transition-all duration-1000 ease-out transform ${isImgVisible ? 'rotate-y-0 opacity-100 scale-100' : 'rotate-y-12 opacity-0 scale-90'}`}>
            <div className="absolute top-10 left-10 right-10 bottom-10 bg-stone-900 rounded-xl border border-stone-800 shadow-2xl overflow-hidden transform rotate-3 hover:rotate-0 transition-transform duration-700">
              <img src="http://googleusercontent.com/image_generation_content/3" className="w-full h-full object-cover opacity-60" alt="Map Base" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent"></div>
            </div>
            <div className="absolute -top-10 -right-10 w-3/4 h-3/4 pointer-events-none">
              <img
                src="http://googleusercontent.com/image_generation_content/4"
                className={`w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-float`}
                alt="Dragon Overlay"
                style={{ animationDuration: '8s' }}
              />
            </div>
            <div className="absolute bottom-20 left-0 bg-stone-800/90 backdrop-blur-md p-4 rounded-lg border border-stone-700 shadow-xl w-64 animate-float" style={{ animationDelay: '1s', animationDuration: '6s' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-stone-500 uppercase">Initiative</span>
                <span className="text-green-400 font-mono font-bold">+5</span>
              </div>
              <div className="h-1 bg-stone-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-3/4"></div>
              </div>
            </div>
            <div className="absolute top-40 -left-8 bg-stone-800/90 backdrop-blur-md p-4 rounded-lg border border-stone-700 shadow-xl w-48 animate-float" style={{ animationDelay: '2s', animationDuration: '7s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Wand2 size={20} />
                </div>
                <div>
                  <div className="text-xs text-stone-500 uppercase">Spell Slot</div>
                  <div className="font-bold text-white">Fireball (Lvl 3)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- CTA SECTION (Unchanged) ---
const CTASection = () => {
  const [ref, isVisible] = useScrollReveal(0.3);

  return (
    <section className="relative py-32 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-stone-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-stone-950 to-stone-950"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
      </div>

      <div ref={ref} className={`relative z-10 max-w-4xl mx-auto px-6 text-center transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="inline-block mb-6 p-3 rounded-full bg-stone-900/50 border border-stone-800 backdrop-blur-md animate-bounce-slow">
          <Sparkles className="text-yellow-400" size={32} />
        </div>

        <h2 className="text-5xl md:text-7xl font-serif font-bold text-white mb-8 leading-tight">
          The Sagas Are Waiting. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">What Will You Forge?</span>
        </h2>

        <p className="text-xl text-stone-400 mb-12 max-w-2xl mx-auto">
          Join a guild of over 10,000 Dungeon Masters who have stopped prepping and started playing. Your first realm is on the house.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button className="px-10 py-5 bg-white text-black text-lg font-bold rounded-lg hover:bg-stone-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center gap-2">
            <Zap size={24} className="text-yellow-600" />
            Start Forging Free
          </button>
          <button className="px-10 py-5 bg-transparent border border-stone-600 text-stone-300 text-lg font-bold rounded-lg hover:bg-stone-800/50 hover:text-white transition-all group flex items-center gap-2">
            View Pricing <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-indigo-500/10 rounded-full animate-spin-slow pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-purple-500/10 rounded-full animate-spin-reverse-medium pointer-events-none"></div>
    </section>
  );
};

const FeatureStrip = () => (
  <section className="py-12 border-t border-stone-800 bg-stone-950">
    <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-between gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
      {['Wizards of the Coast', 'Critical Role', 'D&D Beyond', 'Roll20', 'Foundry VTT'].map((brand, i) => (
        <span key={i} className="text-2xl font-serif font-bold text-stone-400 cursor-default">{brand}</span>
      ))}
    </div>
  </section>
);

// --- MAIN APP SHELL ---

export default function App() {
  const [appLoaded, setAppLoaded] = useState(false);

  useEffect(() => {
    // Check if user has already seen the loader in this session
    const hasSeenLoader = sessionStorage.getItem('hasSeenLoader');
    if (hasSeenLoader) {
      setAppLoaded(true);
    }

    // Cleanup any existing service workers to prevent "no-op fetch handler" warnings
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  const handleLoaderComplete = () => {
    setAppLoaded(true);
    sessionStorage.setItem('hasSeenLoader', 'true');
  };

  return (
    <>
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse-medium { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes spin-fast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-fast { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.7; } }
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes bounce-slower { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes pulse-arrow { 0%, 100% { transform: translateX(0) translateY(-50%); } 50% { transform: translateX(10px) translateY(-50%); } }

        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse-medium { animation: spin-reverse-medium 8s linear infinite; }
        .animate-spin-fast { animation: spin-fast 3s linear infinite; }
        .animate-pulse-fast { animation: pulse-fast 1.5s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .animate-bounce-slower { animation: bounce-slower 5s ease-in-out infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-arrow { animation: pulse-arrow 2s ease-in-out infinite; }
        
        .perspective-1000 { perspective: 1000px; }
        .rotate-y-12 { transform: rotateY(12deg); }
        .rotate-y-0 { transform: rotateY(0deg); }
      `}</style>

      {!appLoaded && <RealmLoader onComplete={handleLoaderComplete} />}

      <div className={`min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-indigo-900 selection:text-white ${!appLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-1000'}`}>
        <HeroSection />
        <ForgeTriptych />
        <WhySection />
        <CTASection />
        <FeatureStrip />
      </div>
    </>
  );
}