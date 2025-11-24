/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import {
    Send, Heart, MapPin,
    Menu, X, ArrowLeft,
    Loader2, Swords, Backpack, UserCircle, Compass, Search
} from 'lucide-react';
import Link from 'next/link';
import CharacterSheetModal from '../../../components/CharacterSheetModal';
import QuestDetailModal from '../../../components/QuestDetailModal';

// --- TYPES ---

type Message = {
    role: 'user' | 'model';
    content: string;
    choices?: string[];
    questOffer?: string[];
};

// --- UTILS ---

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// --- STREAMING HELPER ---

const streamNarrative = async (
    payload: any,
    onContent: (delta: string) => void,
    onData: (data: any) => void,
    onError: (err: any) => void
) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    if (!convexUrl) {
        onError(new Error("NEXT_PUBLIC_CONVEX_URL not set"));
        return;
    }
    const httpUrl = convexUrl.includes("convex.cloud") 
        ? convexUrl.replace("convex.cloud", "convex.site") 
        : convexUrl;

    try {
        const response = await fetch(`${httpUrl}/api/stream-narrative`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(await response.text());
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let processedIndex = 0;
        let buffer = "";
        let internalTextBuffer = "";
        
        let inNarrative = false;
        let inData = false;
        let dataString = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            const textRegex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
            textRegex.lastIndex = processedIndex;
            
            let match;
            while ((match = textRegex.exec(buffer)) !== null) {
                processedIndex = textRegex.lastIndex;
                let textContent = match[1];
                try {
                    textContent = JSON.parse(`"${match[1]}"`);
                } catch (e) {
                    // fallback
                    console.error(e);
                }
                internalTextBuffer += textContent;
            }

            while (internalTextBuffer.length > 0) {
                if (!inNarrative && !inData) {
                    const navStart = internalTextBuffer.indexOf("<narrative>");
                    const dataStart = internalTextBuffer.indexOf("<data>");
                    
                    if (navStart !== -1 && (dataStart === -1 || navStart < dataStart)) {
                        inNarrative = true;
                        internalTextBuffer = internalTextBuffer.substring(navStart + 11);
                    } else if (dataStart !== -1) {
                         inData = true;
                         internalTextBuffer = internalTextBuffer.substring(dataStart + 6);
                    } else {
                        break; 
                    }
                } else if (inNarrative) {
                    const navEnd = internalTextBuffer.indexOf("</narrative>");
                    if (navEnd !== -1) {
                        const content = internalTextBuffer.substring(0, navEnd);
                        if (content) onContent(content);
                        inNarrative = false;
                        internalTextBuffer = internalTextBuffer.substring(navEnd + 12);
                    } else {
                        onContent(internalTextBuffer);
                        internalTextBuffer = "";
                        break;
                    }
                } else if (inData) {
                    const dataEnd = internalTextBuffer.indexOf("</data>");
                    if (dataEnd !== -1) {
                        dataString += internalTextBuffer.substring(0, dataEnd);
                        try {
                            // Clean markdown code blocks if present
                            const cleanJson = dataString.replace(/```json/g, '').replace(/```/g, '').trim();
                            const json = JSON.parse(cleanJson);
                            onData(json);

                            // Attach choices to the last message if available
                            if (json.choices && Array.isArray(json.choices)) {
                                onContent("", json.choices); // Pass choices via onContent or a new callback?
                                // Actually, onData is better for state updates, but we need to attach to message history.
                                // Let's update the onData callback in handleSendMessage/handleStartGame/handleAskQuest to handle this.
                            }
                        } catch (e) {
                            console.error("JSON Parse Error in Stream", e);
                        }
                        inData = false;
                        dataString = "";
                        internalTextBuffer = internalTextBuffer.substring(dataEnd + 7);
                    } else {
                        dataString += internalTextBuffer;
                        internalTextBuffer = "";
                        break;
                    }
                }
            }
        }
    } catch (e) {
        onError(e);
    }
};

// --- COMPONENTS ---

const SmartTooltip = ({ children, content, className }: { children: React.ReactNode, content: React.ReactNode, className?: string }) => {
    const [state, setState] = useState<'idle' | 'hovering' | 'locked'>('idle');
    const [position, setPosition] = useState<'top' | 'bottom'>('top');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const handleEnter = () => {
        if (ref.current) {
             const rect = ref.current.getBoundingClientRect();
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
                        "absolute left-1/2 -translate-x-1/2 w-64 bg-genshin-dark text-stone-300 text-xs rounded-sm border border-genshin-gold/30 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-200",
                        position === 'top' ? "bottom-full mb-2" : "top-full mt-2"
                     )}
                     onMouseLeave={handleLeaveTooltip}
                > 
                    <div className="h-0.5 bg-stone-800 w-full absolute top-0 left-0 rounded-t-sm overflow-hidden">
                         <div
                            className="h-full bg-genshin-gold ease-linear"
                            style={{
                                width: '100%',
                                transitionProperty: 'width',
                                transitionDuration: state === 'locked' ? '0s' : '2000ms',
                                transitionTimingFunction: 'linear'
                            }}
                         />
                    </div>
                    <div className="p-3 relative">
                        {content}
                        <div className={cn(
                            "absolute left-1/2 -translate-x-1/2 border-4 border-transparent w-0 h-0",
                            position === 'top' 
                                ? "top-full border-t-genshin-dark -mt-0.5" 
                                : "bottom-full border-b-genshin-dark -mb-0.5"
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
            <div className="flex items-center justify-between mb-2 border-b border-genshin-gold/20 pb-2">
                <span className="font-bold text-genshin-gold text-sm font-serif">{entity.name}</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 bg-white/5 px-2 py-0.5 rounded-sm border border-white/10">{entity.type}</span>
            </div>
            <p className="leading-relaxed italic text-stone-400 font-sans">{entity.description || "No details available."}</p>
        </>
    );

    return (
        <SmartTooltip content={tooltipContent}>
             <span
                className="font-semibold border-b border-dotted border-genshin-gold/40 hover:border-genshin-gold cursor-help transition-colors text-genshin-gold-light"
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
        const pattern = new RegExp(`(${sortedEntities.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
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
    const generateQuest = useAction(api.ai.generateQuest);

    const [messages, setMessages] = useState<Message[]>([]);
    const [currentChoices, setCurrentChoices] = useState<string[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCharacterSheetOpen, setCharacterSheetOpen] = useState(false);
    const [selectedQuest, setSelectedQuest] = useState<any>(null);
    const [isGeneratingQuest, setIsGeneratingQuest] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Game State
    const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
    const [hp, setHp] = useState(18);
    const [maxHp] = useState(20);

    const entities = useMemo(() => {
        if (!data) return [];
        return [
            ...(data.locations?.map(l => ({ name: l.name, type: 'Location', color: '#a7f3d0', description: l.description })) || []),
            ...(data.npcs?.map(n => ({ name: n.name, type: 'NPC', color: '#fbcfe8', description: n.description })) || []),
            ...(data.items?.map(i => ({ name: i.name, type: 'Item', color: i.textColor || '#fde68a', description: i.description })) || []),
            ...(data.monsters?.map(m => ({ name: m.name, type: 'Monster', color: '#fca5a5', description: m.description })) || [])
        ];
    }, [data]);

    const handleGenerateQuest = async () => {
        if (!data || isGeneratingQuest) return;
        
        // Determine location
        const location = data.locations?.find(l => l._id === currentLocationId) || data.locations?.[0];
        if (!location) return;

        setIsGeneratingQuest(true);
        try {
            await generateQuest({
                campaignId: data.campaign._id,
                locationId: location._id,
                locationName: location.name,
            });
            // The query 'getCampaignDetails' will auto-update the quest list via Convex reactivity
        } catch (error) {
            console.error("Failed to generate quest:", error);
        } finally {
            setIsGeneratingQuest(false);
        }
    };

        const handleAskQuest = async (questTitle: string) => {
            if (!data || !selectedQuest) return;

            setCurrentChoices([]); // Clear previous choices
    
            const currentLocation = data.locations?.find(l => l._id === currentLocationId);
            const questLocation = data.locations?.find(l => l._id === selectedQuest?.locationId);
            
            const currentLocationName = currentLocation?.name || "Unknown Wilds";
            const questLocationName = questLocation?.name || "Unknown Place";
            
            // Logic: If IDs match or strict equality check (assuming single area per quest for now)
            const isLocal = currentLocation?._id === questLocation?._id;
    
            const prompt = `I ask around about the quest "${questTitle}".
            
            [SYSTEM NOTE: The player is currently at "${currentLocationName}". The quest is located in "${questLocationName}". 
            ${isLocal 
                ? "Since they are in the same area, the locals should know specific details, rumors, or where to find the quest giver."
                : "Since they are far away from the quest location, the locals should barely know anything—maybe just a vague rumor or pointing the player to travel to " + questLocationName + "."}
            ]`;
    
            // Close modal is handled by the modal itself calling onAsk then onClose, 
            // or we can close it here: setSelectedQuest(null); (redundant but safe)
            setSelectedQuest(null);
    
            // Reuse message sending logic
            const userMsg: Message = { role: 'user', content: `I ask around about "${questTitle}"...` };
            setMessages(prev => [...prev, userMsg]);
            setIsLoading(true);
    
            const payload = {
                prompt: prompt,
                history: messages.map(m => ({ role: m.role, content: m.content })),
                campaignId: data.campaign._id,
                playerState: {
                    name: data.character?.name || "Traveler",
                    class: data.character?.class || "Unknown",
                    level: data.character?.level || 1,
                    hp: hp,
                    maxHp: maxHp,
                    inventory: data.inventory?.map((i: any) => i.name) || [],
                    abilities: data.spells?.map((s: any) => s.name) || []
                }
            };
    
            await streamNarrative(
                payload,
                (delta) => {
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role === 'model') {
                            return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                        }
                        return [...prev, { role: 'model', content: delta }];
                    });
                },
                (gameData) => {
                     if (gameData.hp) setHp(gameData.hp);
                     if (gameData.choices) {
                        const normalizedChoices = gameData.choices.map((c: any) => typeof c === 'string' ? c : c.text);
                        setCurrentChoices(normalizedChoices);
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.role === 'model') {
                                return [...prev.slice(0, -1), { ...last, choices: normalizedChoices }];
                            }
                            return prev;
                        });
                     }
                },
                (err) => {
                    console.error(err);
                    setIsLoading(false);
                }
            );
            setIsLoading(false);
        };
    
        useEffect(() => {
            if (scrollRef.current) {
                const { scrollHeight, clientHeight } = scrollRef.current;
                scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
            }
        }, [messages, isLoading]);
    
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
    
            const startPrompt = `
                Start the adventure at ${startLocation?.name || "Unknown"}.
                Describe the scene vividly (2 paragraphs). Address the player as "you".
            `;
    
            const payload = {
                prompt: startPrompt,
                history: [],
                campaignId: data.campaign._id,
                playerState: {
                    name: data.character?.name || "Traveler",
                    class: data.character?.class || "Unknown",
                    level: data.character?.level || 1,
                    hp: hp,
                    maxHp: maxHp,
                    inventory: data.inventory?.map((i: any) => i.name) || [],
                    abilities: data.spells?.map((s: any) => s.name) || []
                }
            };
    
            await streamNarrative(
                payload,
                (delta) => {
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role === 'model') {
                            return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                        }
                        return [...prev, { role: 'model', content: delta }];
                    });
                },
                (gameData) => {
                    if (gameData.hp) setHp(gameData.hp);
                    if (gameData.locationId) setCurrentLocationId(gameData.locationId);
                    if (gameData.choices) {
                        const normalizedChoices = gameData.choices.map((c: any) => typeof c === 'string' ? c : c.text);
                        setCurrentChoices(normalizedChoices);
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.role === 'model') {
                                return [...prev.slice(0, -1), { ...last, choices: normalizedChoices }];
                            }
                            return prev;
                        });
                     }
                },
                (err) => console.error(err)
            );
            setIsLoading(false);
        };
    
        const handleSendMessage = async (manualContent?: string) => {
            const contentToSend = typeof manualContent === 'string' ? manualContent : input;
            if (!contentToSend.trim() || isLoading || !data) return;
            
            setCurrentChoices([]); // Clear choices on action
    
            const userMsg: Message = { role: 'user', content: contentToSend };
            setMessages(prev => [...prev, userMsg]);
            setInput("");
            setIsLoading(true);
    
            const payload = {
                prompt: contentToSend,
                history: messages.map(m => ({ role: m.role, content: m.content })),
                campaignId: data.campaign._id,
                playerState: {
                    name: data.character?.name || "Traveler",
                    class: data.character?.class || "Unknown",
                    level: data.character?.level || 1,
                    hp: hp,
                    maxHp: maxHp,
                    inventory: data.inventory?.map((i: any) => i.name) || [],
                    abilities: data.spells?.map((s: any) => s.name) || []
                }
            };
    
            await streamNarrative(
                payload,
                (delta) => {
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role === 'model') {
                            return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                        }
                        return [...prev, { role: 'model', content: delta }];
                    });
                },
                (gameData) => {
                     if (gameData.hp) setHp(gameData.hp);
                     if (gameData.choices) {
                        const normalizedChoices = gameData.choices.map((c: any) => typeof c === 'string' ? c : c.text);
                        setCurrentChoices(normalizedChoices);
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.role === 'model') {
                                return [...prev.slice(0, -1), { ...last, choices: normalizedChoices }];
                            }
                            return prev;
                        });
                     }
                },
                (err) => {
                    console.error(err);
                    setIsLoading(false);
                }
            );
            setIsLoading(false);
        };
    if (!data) {
        return (
            <div className="h-screen flex items-center justify-center bg-genshin-dark text-genshin-gold">
                <Loader2 className="animate-spin w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-genshin-dark text-stone-200 font-sans overflow-hidden selection:bg-genshin-gold selection:text-genshin-dark">
            {/* LEFT SIDEBAR (Quests) */}
            <div className="hidden lg:flex w-72 bg-[#131520] border-r border-genshin-gold/10 flex-col z-20 shadow-[10px_0_30px_-10px_rgba(0,0,0,0.5)]">
                <div className="p-6 border-b border-genshin-gold/10 bg-genshin-dark/50 flex items-center justify-between">
                    <h2 className="font-serif font-bold text-genshin-gold tracking-wider flex items-center gap-2">
                        <Swords size={18} />
                        Quest Log
                    </h2>
                    <button 
                        onClick={handleGenerateQuest}
                        disabled={isGeneratingQuest}
                        className="p-1.5 rounded hover:bg-white/10 text-stone-400 hover:text-genshin-gold transition-all disabled:opacity-50 group relative"
                    >
                        {isGeneratingQuest ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                            Find Quest in Area
                        </span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {data.activeQuests && data.activeQuests.length > 0 ? (
                        <div className="space-y-4">
                            {data.activeQuests.map((quest: any, i: number) => (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedQuest(quest)}
                                    className="bg-genshin-dark/50 rounded-sm p-4 border border-genshin-gold/10 hover:border-genshin-gold/30 transition-all group cursor-pointer shadow-sm hover:bg-white/5 active:scale-95"
                                >
                                    <div className="font-bold text-genshin-gold mb-2 font-serif group-hover:text-white transition-colors text-sm flex justify-between">
                                        {quest.title}
                                        {quest.source === 'ai' && <span className="text-[8px] uppercase tracking-widest border border-genshin-gold/20 px-1 rounded bg-genshin-gold/5">Dynamic</span>}
                                    </div>
                                    <div className="text-stone-500 text-xs leading-relaxed line-clamp-2 group-hover:text-stone-400">{quest.description}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-stone-600 italic text-sm border border-dashed border-stone-800 p-6 rounded-sm text-center">
                            No active quests.
                            <br/>
                            <span className="text-xs text-stone-700 mt-2 block">
                                Explore or click the loupe to find rumors.
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col relative">
                {/* Header */}
                <header className="h-16 border-b border-genshin-gold/20 flex items-center justify-between px-6 bg-genshin-dark/90 backdrop-blur-md z-10 shadow-lg">
                    <div className="flex items-center gap-4">
                        <Link href="/realms" className="p-2 hover:bg-white/5 rounded-full transition-colors group">
                            <ArrowLeft size={20} className="text-stone-400 group-hover:text-genshin-gold transition-colors" />
                        </Link>
                        <div>
                            <h1 className="font-serif font-bold text-lg leading-none text-genshin-gold text-shadow-sm">{data.campaign.title}</h1>
                            <SmartTooltip 
                                content={
                                    <p className="text-xs italic text-stone-400 max-w-[200px]">
                                        {data.locations?.find(l => l._id === currentLocationId)?.description || "No description available."}
                                    </p>
                                }
                            >
                                <div className="flex items-center gap-2 text-xs text-stone-400 mt-1 font-bold tracking-wide uppercase hover:text-genshin-gold cursor-help transition-colors">
                                    <MapPin size={12} className="text-genshin-gold" />
                                    <span className="border-b border-dashed border-genshin-gold/30 pb-0.5">
                                        {data.locations?.find(l => l._id === currentLocationId)?.name || "Unknown Location"}
                                    </span>
                                </div>
                            </SmartTooltip>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => setCharacterSheetOpen(true)} className="p-2 hover:bg-white/5 rounded-full text-stone-400 hover:text-genshin-gold transition-colors">
                            <UserCircle size={20} />
                         </button>
                         <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-full text-stone-400 hover:text-genshin-gold transition-colors lg:hidden">
                            <Menu size={20} />
                         </button>
                    </div>
                </header>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-90">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={cn(
                            "max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500",
                            msg.role === 'user' ? "flex justify-end" : "flex justify-start"
                        )}>
                            <div className={cn(
                                "rounded-sm px-6 py-4 text-base leading-relaxed shadow-md max-w-[85%]",
                                msg.role === 'user' 
                                    ? "bg-genshin-gold text-genshin-dark font-medium rounded-br-none" 
                                    : "bg-[#1f2235]/90 border border-genshin-gold/10 text-stone-300 rounded-bl-none backdrop-blur-sm"
                            )}>
                                {msg.role === 'model' ? (
                                    <HighlightText text={msg.content} entities={entities} />
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="max-w-3xl mx-auto flex gap-2 px-6">
                            <div className="w-2 h-2 rounded-full bg-genshin-gold animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-genshin-gold animate-bounce delay-100" />
                            <div className="w-2 h-2 rounded-full bg-genshin-gold animate-bounce delay-200" />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-6 bg-gradient-to-t from-genshin-dark via-genshin-dark to-transparent">
                    <div className="max-w-3xl mx-auto relative">
                        {/* Floating Action Buttons */}
                        {currentChoices.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4 justify-center">
                                {currentChoices.map((choice, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSendMessage(choice)}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-genshin-dark/80 backdrop-blur-sm border border-genshin-gold/30 rounded-full text-xs font-bold text-genshin-gold hover:bg-genshin-gold hover:text-genshin-dark transition-all shadow-lg hover:shadow-genshin-gold/30 active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-300"
                                        style={{ animationDelay: `${i * 50}ms` }}
                                    >
                                        {choice}
                                    </button>
                                ))}
                            </div>
                        )}

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                onKeyDown={() => {
                    // Optional: Handle Arrows/Enter for suggestions
                }}
                            placeholder="What do you do?"
                            className="w-full bg-[#1f2235] border border-genshin-gold/30 rounded-sm pl-6 pr-14 py-4 focus:outline-none focus:border-genshin-gold focus:ring-1 focus:ring-genshin-gold/20 transition-all shadow-xl placeholder:text-stone-600 text-stone-200"
                            disabled={isLoading}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-genshin-gold hover:bg-[#eac88f] text-genshin-dark rounded-sm transition-all disabled:opacity-0 disabled:scale-75"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className={cn(
                "w-80 bg-[#131520] border-l border-genshin-gold/10 flex flex-col z-20 shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.5)]",
                "fixed inset-y-0 right-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-genshin-gold/10 flex items-center justify-between bg-genshin-dark/50">
                        <h2 className="font-serif font-bold text-genshin-gold tracking-wider">Adventurer&apos;s Log</h2>
                        <button onClick={() => setSidebarOpen(false)} className="text-stone-500 hover:text-genshin-gold lg:hidden">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* Vitals */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2 font-serif">
                                <Heart size={12} /> Vitals
                            </h3>
                            <div className="bg-genshin-dark rounded-sm p-4 border border-genshin-gold/10 shadow-inner">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-stone-400 font-serif text-xs uppercase tracking-wide">Health Points</span>
                                    <span className="font-bold text-genshin-gold">{hp} / {maxHp}</span>
                                </div>
                                <div className="h-2 bg-stone-800 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-500 relative" 
                                        style={{ width: `${(hp / maxHp) * 100}%` }}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[shine_1s_linear_infinite]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quests - Moved to Left Sidebar */}
                        
                        {/* Inventory */}
                         <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2 font-serif">
                                <Backpack size={12} /> Inventory
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="aspect-square rounded-sm bg-genshin-dark/50 border border-genshin-gold/10 flex items-center justify-center hover:border-genshin-gold transition-colors cursor-pointer group relative">
                                        <div className="w-1 h-1 bg-stone-700 rounded-full group-hover:bg-genshin-gold transition-colors" />
                                        {/* Placeholder for item icon */}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Character Sheet Modal */}
            {isCharacterSheetOpen && (
                <CharacterSheetModal 
                    isOpen={isCharacterSheetOpen} 
                    onClose={() => setCharacterSheetOpen(false)} 
                    character={data.character} 
                />
            )}

            {/* Quest Detail Modal */}
            <QuestDetailModal
                isOpen={!!selectedQuest}
                onClose={() => setSelectedQuest(null)}
                onAsk={handleAskQuest}
                quest={selectedQuest}
                locationName={data.locations?.find(l => l._id === selectedQuest?.locationId)?.name}
            />
        </div>
    );
}