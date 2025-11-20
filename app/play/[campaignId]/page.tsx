"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import {
    Send, Heart, MapPin, Package,
    Users, Menu, X, ArrowLeft,
    Loader2, Sparkles, Swords, Backpack, Crown
} from 'lucide-react';
import Link from 'next/link';

// --- TYPES ---
type Message = {
    role: 'user' | 'model';
    content: string;
    choices?: string[];
};

// --- UTILS ---
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// --- COMPONENTS ---

const HighlightText = ({ text, entities }: { text: string, entities: { name: string, type: string, color?: string }[] }) => {
    const sortedEntities = useMemo(() => {
        return [...entities].sort((a, b) => b.name.length - a.name.length);
    }, [entities]);

    const parts = useMemo(() => {
        if (sortedEntities.length === 0) return [text];
        const pattern = new RegExp(`(${sortedEntities.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
        return text.split(pattern);
    }, [text, sortedEntities]);

    return (
        <>
            {parts.map((part, i) => {
                const entity = sortedEntities.find(e => e.name.toLowerCase() === part.toLowerCase());
                if (entity) {
                    return (
                        <span
                            key={i}
                            className="relative inline-block font-semibold text-white border-b border-dotted border-white/40 hover:border-indigo-400 cursor-help transition-colors group"
                            style={{ color: entity.color }}
                        >
                            {part}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-900 text-xs rounded border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                                {entity.type}
                            </span>
                        </span>
                    );
                }
                return part;
            })}
        </>
    );
};

export default function PlayPage() {
    const params = useParams();
    const campaignId = params.campaignId as Id<"campaigns">;

    const data = useQuery(api.forge.getCampaignDetails, { campaignId });
    const generateNarrative = useAction(api.ai.generateNarrative);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Game State
    const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
    const [hp, setHp] = useState(18);
    const [maxHp, setMaxHp] = useState(20);

    const entities = useMemo(() => {
        if (!data) return [];
        return [
            ...(data.locations?.map(l => ({ name: l.name, type: 'Location', color: '#a7f3d0' })) || []), // Emerald-200
            ...(data.npcs?.map(n => ({ name: n.name, type: 'NPC', color: '#fbcfe8' })) || []), // Pink-200
            ...(data.items?.map(i => ({ name: i.name, type: 'Item', color: i.textColor || '#fde68a' })) || []), // Amber-200
            ...(data.monsters?.map(m => ({ name: m.name, type: 'Monster', color: '#fca5a5' })) || []) // Red-300
        ];
    }, [data]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    // Init Game
    useEffect(() => {
        if (data && messages.length === 0 && !isLoading) {
            const startLocation = data.locations[0];
            setCurrentLocationId(startLocation?._id || null);
            handleStartGame(startLocation);
        }
    }, [data]);

    const handleStartGame = async (startLocation: any) => {
        if (!data) return;
        setIsLoading(true);

        const systemContext = `
        You are the Dungeon Master for "${data.campaign.title}".
        World: ${data.campaign.description}. Rules: ${data.campaign.rules}.
        Start Location: ${startLocation?.name || "Unknown"}.
        Describe the scene vividly (2 paragraphs). Address the player as "you".
        `.trim();

        try {
            const response = await generateNarrative({
                prompt: `Start the adventure at ${startLocation?.name}.`,
                history: [{ role: "user", content: systemContext }]
            });
            const parsed = JSON.parse(response);
            setMessages([{ role: 'model', content: parsed.content, choices: parsed.choices }]);
        } catch (error) {
            setMessages([{ role: 'model', content: "The mists of time obscure your vision... (Network Error)" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const submitAction = async (actionText: string) => {
        if (!actionText.trim() || isLoading) return;

        setMessages(prev => [...prev, { role: 'user', content: actionText }]);
        setInput("");
        setIsLoading(true);

        const currentLocation = data?.locations.find(l => l._id === currentLocationId);
        const contextReminder = `[Context: Location: ${currentLocation?.name}. HP: ${hp}/${maxHp}.]`;

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content })).slice(-10);
            const response = await generateNarrative({
                prompt: actionText + " " + contextReminder,
                history: history
            });
            const parsed = JSON.parse(response);
            setMessages(prev => [...prev, { role: 'model', content: parsed.content, choices: parsed.choices }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: "The connection is severed... (AI Error)" }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!data) return (
        <div className="h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 text-stone-400">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <span className="text-xs uppercase tracking-[0.3em] font-medium">Initializing Realm</span>
        </div>
    );

    const { campaign, items } = data;
    const currentLocation = data.locations?.find(l => l._id === currentLocationId) || data.locations?.[0];
    const hpPercentage = (hp / maxHp) * 100;

    return (
        <div className="flex h-screen bg-[#0c0a09] text-stone-300 font-sans overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">

            {/* --- BACKGROUND ATMOSPHERE --- */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 blur-[120px] rounded-full opacity-50" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]" />
                {/* Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0c0a09_100%)] opacity-80" />
            </div>

            {/* --- HUD SIDEBAR --- */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-[300px] bg-[#12100e]/90 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-500 ease-out flex flex-col",
                "md:relative md:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/features" className="group flex items-center gap-2 text-stone-500 hover:text-white transition-colors">
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] uppercase tracking-widest font-bold">Exit</span>
                        </Link>
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-stone-500">
                            <X size={20} />
                        </button>
                    </div>
                    <h2 className="text-xl font-serif font-bold text-stone-100 tracking-wide leading-none mb-1">{campaign.title}</h2>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">Online</span>
                    </div>
                </div>

                {/* Stats Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">

                    {/* HP Module */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wider font-bold text-stone-500">
                            <span>Vitality</span>
                            <span className="text-stone-300">{hp} <span className="text-stone-600">/</span> {maxHp}</span>
                        </div>
                        <div className="h-2 w-full bg-stone-800/50 rounded-full overflow-hidden ring-1 ring-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-rose-900 via-red-600 to-orange-600 transition-all duration-700 ease-out relative"
                                style={{ width: `${hpPercentage}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_white]" />
                            </div>
                        </div>
                    </div>

                    {/* Location Module */}
                    <div className="relative group rounded-xl bg-gradient-to-b from-white/5 to-transparent p-[1px]">
                        <div className="bg-[#161412] rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <MapPin size={48} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-1">Current Location</h3>
                                <div className="text-lg font-medium text-stone-100 mb-1">{currentLocation?.name || "Unknown"}</div>
                                <div className="text-xs text-emerald-400/70 mb-3">{currentLocation?.type}</div>
                                <p className="text-xs text-stone-500 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                                    {currentLocation?.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Grid System */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-500">Inventory</h3>
                            <Backpack size={14} className="text-stone-600" />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {items?.slice(0, 12).map(item => (
                                <div
                                    key={item._id}
                                    className="aspect-square rounded bg-stone-800/40 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all cursor-help group relative flex items-center justify-center"
                                >
                                    {/* Icon Placeholder or Initial */}
                                    <span className="text-xs font-bold text-stone-500 group-hover:text-indigo-300">{item.name.charAt(0)}</span>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-stone-900 border border-white/10 rounded shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                        <div className="text-xs font-bold text-white mb-0.5">{item.name}</div>
                                        <div className="text-[9px] text-stone-400 uppercase">{item.rarity}</div>
                                    </div>
                                </div>
                            ))}
                            {/* Empty Slots */}
                            {Array.from({ length: Math.max(0, 8 - (items?.length || 0)) }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square rounded bg-stone-900/20 border border-white/5 opacity-50" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                            <Crown size={14} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-stone-200">Dungeon Master</div>
                            <div className="text-[10px] text-stone-500">AI Narrative Engine</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- MAIN STAGE --- */}
            <main className="flex-1 flex flex-col relative z-10 h-full">

                {/* Mobile Nav Trigger */}
                <header className="md:hidden p-4 flex items-center justify-between border-b border-white/5 bg-[#0c0a09]/80 backdrop-blur">
                    <h1 className="font-serif font-bold text-stone-200">{campaign.title}</h1>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-stone-400 active:text-white">
                        <Menu size={20} />
                    </button>
                </header>

                {/* Narrative Stream */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-0">
                    <div className="max-w-3xl mx-auto py-12 md:py-20 space-y-10">

                        {/* Loading State */}
                        {messages.length === 0 && isLoading && (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                <Sparkles size={32} className="text-indigo-500/50 mb-4" />
                                <p className="text-xs font-medium uppercase tracking-widest text-stone-600">Constructing World...</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={cn(
                                "flex flex-col transition-all duration-500 ease-out",
                                msg.role === 'user' ? "items-end opacity-100 translate-y-0" : "items-start opacity-100 translate-y-0"
                            )}>
                                {msg.role === 'user' ? (
                                    // User Action Bubble
                                    <div className="flex items-center gap-4 max-w-[85%]">
                                        <div className="bg-stone-800/80 backdrop-blur-sm border border-white/10 text-stone-300 rounded-2xl rounded-br-sm px-6 py-3 shadow-lg text-sm md:text-base leading-relaxed">
                                            "{msg.content}"
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center shrink-0">
                                            <Users size={14} className="text-stone-400" />
                                        </div>
                                    </div>
                                ) : (
                                    // AI Narrative Block
                                    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                        <div className="flex gap-6 md:gap-8">
                                            <div className="hidden md:flex flex-col items-center gap-2 pt-1 shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-indigo-900/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                                                    <Sparkles size={14} />
                                                </div>
                                                <div className="w-px h-full bg-gradient-to-b from-indigo-500/20 to-transparent min-h-[50px]" />
                                            </div>

                                            <div className="flex-1 space-y-4 pb-4 border-b border-white/5 md:border-none md:pb-0">
                                                <div className="prose prose-invert prose-p:text-stone-300 prose-p:font-serif prose-p:text-lg prose-p:leading-loose prose-strong:text-white max-w-none">
                                                    {msg.content.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                                                        <p key={i} className="mb-4">
                                                            <HighlightText text={line} entities={entities} />
                                                        </p>
                                                    ))}
                                                </div>

                                                {/* Choices */}
                                                {msg.choices && msg.choices.length > 0 && idx === messages.length - 1 && !isLoading && (
                                                    <div className="pt-4 flex flex-wrap gap-3">
                                                        {msg.choices.map((choice, cIdx) => (
                                                            <button
                                                                key={cIdx}
                                                                onClick={() => submitAction(choice)}
                                                                className="group relative px-5 py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-indigo-500/50 text-stone-400 hover:text-indigo-200 text-sm font-medium rounded-lg transition-all duration-300 overflow-hidden shadow-md hover:shadow-indigo-500/10"
                                                            >
                                                                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                <span className="relative flex items-center gap-2">
                                                                    <Swords size={14} className="opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:ml-0 duration-300" />
                                                                    {choice}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading Indicator at bottom */}
                        {isLoading && messages.length > 0 && (
                            <div className="pl-16 flex items-center gap-3 text-stone-600">
                                <Loader2 className="animate-spin" size={18} />
                                <span className="text-xs tracking-widest uppercase">Forging destiny...</span>
                            </div>
                        )}

                        <div className="h-32" /> {/* Spacer for fixed input */}
                    </div>
                </div>

                {/* Input Deck */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-[#0c0a09] via-[#0c0a09] to-transparent z-20">
                    <div className="max-w-3xl mx-auto relative">
                        <form
                            onSubmit={(e) => { e.preventDefault(); submitAction(input); }}
                            className="relative group"
                        >
                            {/* Glow Effect */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 group-focus-within:opacity-50 blur transition duration-500" />

                            <div className="relative flex items-center bg-[#161412] rounded-full shadow-2xl border border-white/10 group-focus-within:border-white/20 transition-colors">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="What do you want to do?"
                                    className="w-full bg-transparent border-none text-white placeholder:text-stone-600 px-6 py-4 focus:ring-0 text-base font-medium"
                                    disabled={isLoading}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="mr-2 p-2.5 rounded-full bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white disabled:opacity-30 disabled:hover:bg-stone-800 transition-all"
                                >
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </form>
                        <div className="mt-3 flex justify-center">
                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em] shadow-sm backdrop-blur-sm">
                                Gemini 2.0 Engine Active
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}