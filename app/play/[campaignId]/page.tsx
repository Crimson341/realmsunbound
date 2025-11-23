"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { useParams } from 'next/navigation';

import { useQuery, useAction, useMutation, useConvexAuth } from 'convex/react';

import { api } from '../../../convex/_generated/api';

import { Id } from '../../../convex/_generated/dataModel';

import {
    Send, Heart, MapPin, Package,
    Users, Menu, X, ArrowLeft,
    Loader2, Sparkles, Swords, Backpack, Crown, UserCircle
} from 'lucide-react';

import Link from 'next/link';

import CharacterSheetModal from '../../../components/CharacterSheetModal';

// --- TYPES ---

type Message = {
    role: 'user' | 'model';

    content: string;

    choices?: string[];

    questOffer?: string[];
};

// --- UTILS ---

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// --- COMPONENTS ---

const SmartTooltip = ({ children, content, className, color }: { children: React.ReactNode, content: React.ReactNode, className?: string, color?: string }) => {
    const [state, setState] = useState<'idle' | 'hovering' | 'locked'>('idle');

    const [position, setPosition] = useState<'top' | 'bottom'>('top');

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const ref = useRef<HTMLDivElement>(null);

    const handleEnter = () => {
        // Position logic

        if (ref.current) {
             const rect = ref.current.getBoundingClientRect();

             // If near top of viewport (less than 250px), flip to bottom

             setPosition(rect.top < 250 ? 'bottom' : 'top');
        }

        if (state === 'idle') {
            setState('hovering');

            timerRef.current = setTimeout(() => {
                setState('locked');
            }, 2000);
        }
    };

    const handleLeaveTrigger = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);

            timerRef.current = null;
        }

        if (state !== 'locked') {
            setState('idle');
        }
    };

    const handleLeaveTooltip = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);

            timerRef.current = null;
        }

        setState('idle');
    };

    return (
        <div ref={ref} className={cn("relative inline-block", className)} onMouseEnter={handleEnter} onMouseLeave={handleLeaveTrigger}> 

            {children}

            {(state !== 'idle') && (
                <div

                     className={cn(
                        "absolute left-1/2 -translate-x-1/2 w-64 bg-[#1a1918] text-stone-300 text-xs rounded-lg border border-white/10 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-200",
                        position === 'top' ? "bottom-full mb-2" : "top-full mt-2"
                     )}

                     onMouseLeave={handleLeaveTooltip}

                > 

                    {/* Progress Bar */}

                    <div className="h-0.5 bg-stone-800 w-full absolute top-0 left-0 rounded-t-lg overflow-hidden">

                         <div

                            className="h-full bg-indigo-500 ease-linear"

                            style={{
                                width: state === 'idle' ? '0%' : '100%',
                                transitionProperty: 'width',
                                transitionDuration: state === 'locked' ? '0s' : '2000ms',
                                transitionTimingFunction: 'linear'
                            }}

                         />

                    </div>

                    {/* Content */}

                    <div className="p-3 relative">

                        {content}

                        {/* Arrow */}

                        <div className={cn(
                            "absolute left-1/2 -translate-x-1/2 border-4 border-transparent w-0 h-0",
                            position === 'top' 

                                ? "top-full border-t-[#1a1918] -mt-0.5" 

                                : "bottom-full border-b-[#1a1918] -mb-0.5"
                        )} />

                    </div>

                </div>
            )}

        </div>
    )
};

const EntitySpan = ({ entity, text }: { entity: any, text: string }) => {
    const tooltipContent = (
        <>

            <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">

                <span className="font-bold text-white text-sm">{entity.name}</span>

                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 bg-white/5 px-2 py-0.5 rounded">{entity.type}</span>

            </div>

            <p className="leading-relaxed italic text-stone-400">{entity.description || "No details available."}</p>

        </>
    );

    return (
        <SmartTooltip content={tooltipContent}>

             <span

                className="font-semibold border-b border-dotted border-white/40 hover:border-indigo-400 cursor-help transition-colors"

                style={{ color: entity.color }}

            >

                {text}

            </span>

        </SmartTooltip>
    );
};

const HighlightText = ({ text, entities }: { text: string, entities: { name: string, type: string, color?: string, description?: string }[] }) => {
    const sortedEntities = useMemo(() => {
        return [...entities].sort((a, b) => b.name.length - a.name.length);
    }, [entities]);

    const parts = useMemo(() => {
        if (sortedEntities.length === 0) return [text];

        const pattern = new RegExp(`(${sortedEntities.map(e => e.name.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&')).join('|')})`, 'gi');

        return text.split(pattern);
    }, [text, sortedEntities]);

    return (
        <>

            {parts.map((part, i) => {
                const entity = sortedEntities.find(e => e.name.toLowerCase() === part.toLowerCase());

                if (entity) {
                    return <EntitySpan key={i} entity={entity} text={part} />; 
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

        const grantRewards = useMutation(api.forge.grantRewards);

        const resolveQuest = useMutation(api.forge.resolveQuest);

        const { isAuthenticated } = useConvexAuth();

        const [messages, setMessages] = useState<Message[]>([]);

        const [input, setInput] = useState("");

        const [isLoading, setIsLoading] = useState(false);

        const [isSidebarOpen, setSidebarOpen] = useState(false);

        const [isCharacterSheetOpen, setCharacterSheetOpen] = useState(false);

        const scrollRef = useRef<HTMLDivElement>(null);

        // Game State

        const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);

        const [hp, setHp] = useState(18);

        const [maxHp, setMaxHp] = useState(20);

        const entities = useMemo(() => {
            if (!data) return [];

            return [
                ...(data.locations?.map(l => ({ name: l.name, type: 'Location', color: '#a7f3d0', description: l.description })) || []), // Emerald-200
                ...(data.npcs?.map(n => ({ name: n.name, type: 'NPC', color: '#fbcfe8', description: n.description })) || []), // Pink-200
                ...(data.items?.map(i => ({ name: i.name, type: 'Item', color: i.textColor || '#fde68a', description: i.description })) || []), // Amber-200
                ...(data.monsters?.map(m => ({ name: m.name, type: 'Monster', color: '#fca5a5', description: m.description })) || []) // Red-300
            ];
        }, [data]);

        // Derived State for Local Context

        const localNPCs = useMemo(() => {
            if (!data || !currentLocationId) return [];

            return data.npcs?.filter(n => n.locationId === currentLocationId) || [];
        }, [data, currentLocationId]);

        const availableQuests = useMemo(() => {
            if (!data || !currentLocationId) return [];

            // Get quests located here

            const local = data.quests?.filter(q => q.locationId === currentLocationId) || [];

            // Filter out ones we already have active

            return local.filter(q => !data.activeQuests?.some((aq: any) => aq.title === q.title));
        }, [data, currentLocationId, data?.activeQuests]);

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
                                    history: [{ role: "user", content: systemContext }],
                                    campaignId: campaignId
                                });

                const parsed = JSON.parse(response);

                setMessages([{ role: 'model', content: parsed.content, choices: parsed.choices }]);
            } catch (error) {
                setMessages([{ role: 'model', content: "The mists of time obscure your vision... (Network Error)" }]);
            } finally {
                setIsLoading(false);
            }
        };

        const handleAcceptQuest = async (questTitle: string, messageIndex: number) => {
            if (!isAuthenticated) return;

            try {
                await grantRewards({
                    campaignId,
                    questTitles: [questTitle]
                });

                // Remove from offer list in UI to show it's accepted

                setMessages(prev => prev.map((msg, idx) => {
                    if (idx === messageIndex && msg.questOffer) {
                        return {
                            ...msg,
                            questOffer: msg.questOffer.filter(t => t !== questTitle)
                        };
                    }

                    return msg;
                }));
            } catch (e) {
                console.error("Failed to accept quest", e);
            }
        };

            const submitAction = async (actionText: string) => {
                if (!actionText.trim() || isLoading) return;

                setMessages(prev => [...prev, { role: 'user', content: actionText }]);

                setInput("");

                setIsLoading(true);

                const currentLocation = data?.locations.find(l => l._id === currentLocationId);

                // Construct Context

                const activeQuestList = data?.activeQuests?.filter((q: any) => q.status === 'Active').map((q: any) => `${q.title}: ${q.description}`).join("; ") || "None";

                const inventoryList = data?.inventory?.map((i: any) => i.name).join(", ") || "None";

                const characterInfo = data?.character ? `Level ${data.character.level} ${data.character.class}` : "Unknown";

                // Format available quests and NPCs for context

                const availableQuestContext = availableQuests.map(q => `"${q.title}": ${q.description} (Giver: ${localNPCs.find(n => n._id === q.npcId)?.name || "Unknown"})`).join("; ") || "None";

                const npcContext = localNPCs.map(n => `${n.name} (${n.role}): ${n.description}`).join("; ") || "None";

                const contextReminder = `

                [Strict Game State - Do Not Hallucinate]

                Current Location: ${currentLocation?.name} (${currentLocation?.type}).

                Description: ${currentLocation?.description}

                [Visible Entities]

                NPCs Here: ${npcContext}

                Available Quests Here: ${availableQuestContext}

                [Player State]

                HP: ${hp}/${maxHp}.

                Character: ${characterInfo}.

                Inventory: ${inventoryList}.

                Active Quests: ${activeQuestList}.

                [Strict Rules]

                1. You are the Dungeon Master engine. You MUST NOT invent new quests, items, or NPCs. Only use the entities listed above or from previous history.

                2. If the player interacts with an NPC, use their defined personality.

                3. Only offer the "Available Quests" listed above. Do not make up random tasks.

                4. If the user's action completes an ACTIVE quest (check Inventory vs Quest requirements), acknowledge it, describe the reward, and include the quest title in a 'completed_quests' array in your JSON response.

                5. If a quest is ready to be turned in, include "Turn in [Quest Name]" as a choice.

                `.trim();

                try {
                    const history = messages.map(m => ({ role: m.role, content: m.content })).slice(-10);

                                const response = await generateNarrative({
                                    prompt: actionText + " " + contextReminder,
                                    history: history,
                                    campaignId: campaignId
                                });

                const parsed = JSON.parse(response);

                // Update Location

                if (parsed.current_location && data?.locations) {
                    const newLoc = data.locations.find((l: any) => l.name.toLowerCase() === parsed.current_location.toLowerCase());

                    if (newLoc) {
                        setCurrentLocationId(newLoc._id);
                    }
                }

                // Handle Quest Completion

                if (parsed.completed_quests && Array.isArray(parsed.completed_quests)) {
                    for (const questTitle of parsed.completed_quests) {
                        await resolveQuest({
                            campaignId,
                            questTitle: questTitle
                        });
                    }
                }

                let questOffers: string[] = [];

                // Handle Rewards

                if (parsed.rewards && isAuthenticated) {
                    const { items, quests } = parsed.rewards;

                    // Auto-grant items (Loot)

                    if (items && items.length > 0) {
                        await grantRewards({
                            campaignId,
                            itemNames: items
                        });
                    }

                    // Hold quests for manual acceptance

                    if (quests && quests.length > 0) {
                        questOffers = quests;
                    }
                }

                setMessages(prev => [...prev, { 
                    role: 'model', 
                    content: parsed.content, 
                    choices: parsed.choices,
                    questOffer: questOffers
                }]);
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

    const { campaign, items, inventory, activeQuests, character } = data;

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
                "lg:relative lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>

                {/* Header */}

                <div className="p-6 border-b border-white/5">

                    <div className="flex items-center justify-between mb-6">

                        <Link href="/features" className="group flex items-center gap-2 text-stone-500 hover:text-white transition-colors">

                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />

                            <span className="text-[10px] uppercase tracking-widest font-bold">Exit</span>

                        </Link>

                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-stone-500">

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

                    {/* Character Sheet Button */}

                    <button 

                        onClick={() => setCharacterSheetOpen(true)}

                        className="w-full group relative p-4 bg-stone-900/40 rounded-xl overflow-hidden hover:bg-stone-800/60 transition-all duration-300 border border-white/5 hover:border-white/10"

                    >

                         <div className="absolute inset-0 p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                         <div className="relative flex items-center gap-4">

                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">

                                <UserCircle size={20} />

                            </div>

                            <div className="text-left">

                                <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-0.5">Character Sheet</div>

                                <div className="text-sm font-bold text-white group-hover:text-indigo-100 transition-colors">{character?.name || "Hero"}</div>

                            </div>

                         </div>

                    </button>

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

                                        {/* Quest Log */}

                                        <div>

                                            <div className="flex items-center justify-between mb-4">

                                                <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-500">Active Quests</h3>

                                                <Sparkles size={14} className="text-stone-600" />

                                            </div>

                                            <div className="space-y-6">

                                                {activeQuests?.length === 0 ? (
                                                    <div className="p-4 border border-dashed border-stone-800 rounded-lg text-center">

                                                        <p className="text-xs text-stone-600 italic">No active quests.</p>

                                                    </div>
                                                ) : (
                                                    <>

                                                        {/* Main Quests */}

                                                        {activeQuests?.filter((q: any) => q.source === 'creator').length > 0 && (
                                                            <div className="space-y-2">

                                                                <h4 className="text-[9px] uppercase tracking-widest font-bold text-indigo-500/70 pl-1">Main Story</h4>

                                                                <div className="space-y-2">

                                                                    {activeQuests.filter((q: any) => q.source === 'creator').map((quest: any) => {
                                                                        const tooltipContent = (
                                                                            <>

                                                                                <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">

                                                                                    <span className="font-bold text-amber-500 text-sm">{quest.title}</span>

                                                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 bg-white/5 px-2 py-0.5 rounded">Main Quest</span>

                                                                                </div>

                                                                                <p className="leading-relaxed text-stone-400 mb-3">{quest.description}</p>

                                                                                {quest.rewardItemIds && quest.rewardItemIds.length > 0 && (
                                                                                    <div className="bg-black/20 rounded p-2 border border-white/5">

                                                                                        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-1">Rewards</p>

                                                                                        <div className="flex flex-wrap gap-1">

                                                                                            <span className="text-xs text-emerald-400 italic">{quest.rewards || "Mystery Loot"}</span>

                                                                                        </div>

                                                                                    </div>
                                                                                )}

                                                                            </>
                                                                        );

                                                                        return (
                                                                            <SmartTooltip key={quest._id} content={tooltipContent} className="w-full block">

                                                                                <div className="bg-stone-900/40 border border-white/5 border-l-2 border-l-indigo-500 rounded-r-lg p-3 hover:bg-stone-800/40 transition-colors group cursor-help w-full text-left">

                                                                                    <div className="flex items-start justify-between gap-2 mb-1">

                                                                                        <h4 className="text-sm font-bold text-stone-300 group-hover:text-indigo-300 transition-colors leading-tight">{quest.title}</h4>

                                                                                        {quest.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />}

                                                                                    </div>

                                                                                    <p className="text-xs text-stone-500 line-clamp-2 group-hover:text-stone-400 transition-colors">{quest.description}</p>

                                                                                </div>

                                                                            </SmartTooltip>
                                                                        );
                                                                    })}

                                                                </div>

                                                            </div>
                                                        )}

                                                        {/* Side Adventures */}

                                                        {activeQuests?.filter((q: any) => q.source !== 'creator').length > 0 && (
                                                            <div className="space-y-2">

                                                                <h4 className="text-[9px] uppercase tracking-widest font-bold text-emerald-500/70 pl-1">Side Adventures</h4>

                                                                <div className="space-y-2">

                                                                    {activeQuests.filter((q: any) => q.source !== 'creator').map((quest: any) => {
                                                                        const tooltipContent = (
                                                                            <>

                                                                                <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">

                                                                                    <span className="font-bold text-emerald-500 text-sm">{quest.title}</span>

                                                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 bg-white/5 px-2 py-0.5 rounded">Side Quest</span>

                                                                                </div>

                                                                                <p className="leading-relaxed text-stone-400 mb-3">{quest.description}</p>

                                                                            </>
                                                                        );

                                                                        return (
                                                                            <SmartTooltip key={quest._id} content={tooltipContent} className="w-full block">

                                                                                <div className="bg-stone-900/40 border border-white/5 border-l-2 border-l-emerald-500 rounded-r-lg p-3 hover:bg-stone-800/40 transition-colors group cursor-help w-full text-left">

                                                                                    <div className="flex items-start justify-between gap-2 mb-1">

                                                                                        <h4 className="text-sm font-bold text-stone-300 group-hover:text-emerald-300 transition-colors leading-tight">{quest.title}</h4>

                                                                                        {quest.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />}

                                                                                    </div>

                                                                                    <p className="text-xs text-stone-500 line-clamp-2 group-hover:text-stone-400 transition-colors">{quest.description}</p>

                                                                                </div>

                                                                            </SmartTooltip>
                                                                        );
                                                                    })}

                                                                </div>

                                                            </div>
                                                        )}

                                                    </>
                                                )}

                                            </div>

                                        </div>

                    {/* Inventory Grid System */}

                    <div>

                        <div className="flex items-center justify-between mb-4">

                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-500">Backpack</h3>

                            <Backpack size={14} className="text-stone-600" />

                        </div>

                        <div className="grid grid-cols-4 gap-2">

                            {inventory?.slice(0, 12).map((item: any) => (
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

                            {Array.from({ length: Math.max(0, 8 - (inventory?.length || 0)) }).map((_, i) => (
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

                <header className="lg:hidden p-4 flex items-center justify-between border-b border-white/5 bg-[#0c0a09]/80 backdrop-blur">

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
                                                        <div key={i} className="mb-4 text-lg leading-loose font-serif text-stone-300">

                                                            <HighlightText text={line} entities={entities} />

                                                        </div>
                                                    ))}

                                                </div>

                                                {/* Quest Offers */}

                                                {msg.questOffer && msg.questOffer.length > 0 && (
                                                    <div className="space-y-2 mt-4">

                                                        {msg.questOffer.map((questTitle, qIdx) => (
                                                            <div key={qIdx} className="bg-stone-900/60 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in duration-500">

                                                                <div>

                                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">New Quest Available</p>

                                                                    <h4 className="font-bold text-white">{questTitle}</h4>

                                                                </div>

                                                                <button 

                                                                    onClick={() => handleAcceptQuest(questTitle, idx)}

                                                                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-amber-900/20"

                                                                >

                                                                    Accept

                                                                </button>

                                                            </div>
                                                        ))}

                                                    </div>
                                                )}

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

            {/* --- RIGHT SIDEBAR (CONTEXT) --- */}

            <aside className="hidden lg:flex w-72 bg-[#12100e]/90 backdrop-blur-2xl border-l border-white/5 flex-col relative z-20">

                <div className="p-6 border-b border-white/5">

                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Local Context</h3>

                    <p className="text-sm font-bold text-white">{currentLocation?.name || "Unknown Region"}</p>

                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">

                    {/* In the Area (NPCs) */}

                    <div>

                        <div className="flex items-center justify-between mb-4">

                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-500">In the Area</h3>

                            <Users size={14} className="text-stone-600" />

                        </div>

                        <div className="space-y-3">

                            {localNPCs.length === 0 ? (
                                <p className="text-xs text-stone-600 italic">It's quiet here.</p>
                            ) : (
                                localNPCs.map((npc: any) => {
                                    // Detect shop roles

                                    const isShop = /merchant|blacksmith|innkeeper|alchemist|trader/i.test(npc.role);

                                    return (
                                        <div key={npc._id} className="flex items-center gap-3 group cursor-help">

                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                                                isShop ? "bg-amber-900/20 text-amber-500 border border-amber-500/30 group-hover:border-amber-500" : "bg-stone-800 text-stone-400 border border-white/5 group-hover:border-white/20"
                                            )}>

                                                {npc.name[0]}

                                            </div>

                                            <div>

                                                <p className="text-sm font-bold text-stone-300 group-hover:text-white transition-colors">{npc.name}</p>

                                                <p className="text-[10px] text-stone-500 uppercase tracking-wide flex items-center gap-1">

                                                    {npc.role}

                                                    {isShop && <Package size={10} className="text-amber-500" />}

                                                </p>

                                            </div>

                                        </div>
                                    )
                                })
                            )}

                        </div>

                    </div>

                    {/* Bulletin Board (Available Quests) */}

                    <div>

                        <div className="flex items-center justify-between mb-4">

                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-500">Bulletin Board</h3>

                            <MapPin size={14} className="text-stone-600" />

                        </div>

                        <div className="space-y-3">

                            {availableQuests.length === 0 ? (
                                <div className="p-4 border border-dashed border-stone-800 rounded-lg text-center">

                                    <p className="text-xs text-stone-600 italic">No new notices.</p>

                                </div>
                            ) : (
                                availableQuests.map((quest: any) => (
                                    <div key={quest._id} className="bg-stone-900/40 border border-white/5 rounded-lg p-3 hover:bg-stone-800/40 transition-colors group cursor-help">

                                        <div className="mb-1">

                                            <h4 className="text-sm font-bold text-stone-300 group-hover:text-indigo-300 transition-colors leading-tight">{quest.title}</h4>

                                        </div>

                                        <p className="text-xs text-stone-500 line-clamp-2 mb-2">{quest.description}</p>

                                        <div className="flex items-center gap-2">

                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-stone-400 uppercase font-bold">Available</span>

                                        </div>

                                    </div>
                                ))
                            )}

                        </div>

                    </div>

                </div>

            </aside>

            <CharacterSheetModal 

                isOpen={isCharacterSheetOpen} 

                onClose={() => setCharacterSheetOpen(false)} 

                character={character} 

            />

        </div>
    );
}
