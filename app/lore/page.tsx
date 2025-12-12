'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Brain, Hammer, Map, Sparkles, Swords, Feather, ScrollText, ArrowRight } from 'lucide-react';

type Pillar = {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type Step = {
  title: string;
  description: string;
};

function PillarCard({ title, description, Icon }: Pillar) {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-genshin-gold/40 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-genshin-gold/10 border border-genshin-gold/20">
          <Icon className="w-6 h-6 text-genshin-gold" />
        </div>
        <div className="space-y-2">
          <h3 className="font-serif text-xl theme-text">{title}</h3>
          <p className="text-sm theme-text-secondary leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ index, title, description }: Step & { index: number }) {
  return (
    <div className="relative pl-10">
      <div className="absolute left-0 top-1">
        <div className="w-7 h-7 rounded-full bg-genshin-gold text-white flex items-center justify-center text-xs font-bold">
          {index}
        </div>
      </div>
      <h4 className="font-sans font-bold theme-text">{title}</h4>
      <p className="text-sm theme-text-secondary leading-relaxed mt-1">{description}</p>
    </div>
  );
}

export default function LorePage() {
  const { theme, mounted } = useTheme();
  const dark = mounted ? theme === 'dark' : false;
  const [clientMounted, setClientMounted] = useState(false);

  useEffect(() => setClientMounted(true), []);

  const pillars = useMemo<Array<Pillar>>(
    () => [
      {
        title: 'AI Dungeon Master',
        description: 'A reactive narrator that improvises with you — consequences, twists, and continuity included.',
        Icon: Brain,
      },
      {
        title: 'The Forge',
        description: 'Create worlds, items, spells, NPCs, and quests. Your imagination becomes the rules of reality.',
        Icon: Hammer,
      },
      {
        title: 'Living Maps',
        description: 'Explore hand-crafted + AI-assisted locations that feel cohesive, readable, and fun to navigate.',
        Icon: Map,
      },
      {
        title: 'Moments that Surprise You',
        description: 'The best sessions aren’t scripted. Realms is built to deliver “wait… what just happened?” moments.',
        Icon: Sparkles,
      },
    ],
    [],
  );

  const steps = useMemo<Array<Step>>(
    () => [
      {
        title: 'The itch',
        description:
          'I love the feeling of tabletop campaigns and open-world RPGs — but I wanted the freedom of a DM with the immediacy of a game.',
      },
      {
        title: 'The idea',
        description:
          'What if you could describe a world, press “forge”, and immediately play inside it — with lore that remembers your choices?',
      },
      {
        title: 'The build',
        description:
          'Realms is my attempt to merge creation + play: a builder you can actually use, and an adventure that keeps unfolding.',
      },
    ],
    [],
  );

  // Prevent theme “flash” on first paint (consistent with other pages).
  if (!clientMounted) return <div className="min-h-screen theme-bg" />;

  return (
    <div className="min-h-screen theme-bg">
      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: dark
              ? 'radial-gradient(ellipse at top, rgba(220,180,120,0.10), transparent 55%), radial-gradient(ellipse at bottom, rgba(99,102,241,0.10), transparent 55%)'
              : 'radial-gradient(ellipse at top, rgba(220,180,120,0.18), transparent 60%), radial-gradient(ellipse at bottom, rgba(99,102,241,0.12), transparent 60%)',
          }}
        />
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-star-pattern bg-size-[18px_18px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel">
            <ScrollText className="w-4 h-4 text-genshin-gold" />
            <span className="text-xs font-bold tracking-widest uppercase theme-text-secondary">
              Lore • Origins • Vision
            </span>
          </div>

          <div className="mt-8 grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 space-y-6">
              <h1 className="font-serif text-4xl md:text-6xl leading-tight theme-text">
                A world you can <span className="text-genshin-gold text-shadow-gold">create</span>, then{' '}
                <span className="text-genshin-gold text-shadow-gold">live</span> in.
              </h1>
              <p className="text-lg theme-text-secondary leading-relaxed max-w-2xl">
                Realms is an AI-driven fantasy RPG where the story adapts to you — and the world is something you can
                forge, not just consume.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/forge"
                  className="btn-genshin inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-genshin-gold text-white font-bold border border-white/20 hover:bg-yellow-500 transition-colors"
                >
                  <Hammer className="w-4 h-4" />
                  Start Forging
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/features"
                  className="btn-genshin inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full glass-panel font-bold border border-genshin-gold/25 hover:border-genshin-gold/50 transition-colors"
                >
                  <Map className="w-4 h-4 text-genshin-gold" />
                  Explore Realms
                </Link>
                <Link
                  href="/sign-up"
                  className="btn-genshin inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full theme-surface font-bold border border-white/10 hover:border-white/20 transition-colors"
                >
                  <Swords className="w-4 h-4 text-genshin-gold" />
                  Join the Adventure
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-genshin-gold/10 border border-genshin-gold/20 flex items-center justify-center">
                    <Feather className="w-5 h-5 text-genshin-gold" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest theme-text-muted">Creator note</p>
                    <p className="font-serif text-xl theme-text">Why I’m building Realms</p>
                  </div>
                </div>
                <p className="mt-4 text-sm theme-text-secondary leading-relaxed">
                  I wanted that “friends-at-a-table” feeling — the unexpected turns, the meaningful choices, the lore
                  that remembers — but with the speed and polish of a game you can jump into instantly.
                </p>
                <p className="mt-3 text-sm theme-text-secondary leading-relaxed">
                  This page is the short version. No encyclopedia — just enough to understand the vibe, the goals, and
                  the dream.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-6 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-8">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl theme-text">What the game is</h2>
              <p className="mt-2 theme-text-secondary max-w-2xl">
                The core loop is simple: imagine → forge → play → your choices become canon.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {pillars.map((p) => (
              <PillarCard key={p.title} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* Origin timeline */}
      <section className="px-6 py-14">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-3">
            <h2 className="font-serif text-3xl md:text-4xl theme-text">How it started</h2>
            <p className="theme-text-secondary leading-relaxed">
              Realms began as a personal itch — I kept wanting a game that didn’t make me choose between freedom and
              momentum.
            </p>
          </div>

          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-white/10">
            <div className="relative">
              <div className="absolute left-3 top-3 bottom-3 w-px bg-genshin-gold/20" />
              <div className="space-y-6">
                {steps.map((s, idx) => (
                  <TimelineStep key={s.title} index={idx + 1} {...s} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 py-18 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="glass-panel rounded-2xl p-8 md:p-10 border border-genshin-gold/20">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="space-y-3 max-w-2xl">
                <h3 className="font-serif text-2xl md:text-3xl theme-text">The promise</h3>
                <p className="theme-text-secondary leading-relaxed">
                  Realms is built for people who love discovery, creativity, and stories that respect your choices. If
                  that’s you — welcome home.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/forge"
                  className="btn-genshin inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-genshin-gold text-white font-bold border border-white/20 hover:bg-yellow-500 transition-colors"
                >
                  Forge a World
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/sign-up"
                  className="btn-genshin inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full glass-panel font-bold border border-genshin-gold/25 hover:border-genshin-gold/50 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
