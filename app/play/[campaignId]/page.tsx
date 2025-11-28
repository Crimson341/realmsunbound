/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import {
    Send, Heart, MapPin, Map,
    Menu, X, ArrowLeft,
    Loader2, Swords, Backpack, UserCircle, Search, Trophy,
    Tent, AlertTriangle, Skull, Coins, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import CharacterSheetModal from '../../../components/CharacterSheetModal';
import QuestDetailModal from '../../../components/QuestDetailModal';
import {
    QuickActionBar,
    DiceRollOverlay,
    RewardToast,
    XPBar,
    LevelUpOverlay,
    CombatHUD,
    ScreenEffect,
    GameContext,
    CombatState,
    SkillCheckData,
    RewardData,
    Rarity,
    ScreenEffectType,
} from '../../../components/GameUI';
import { LootableBodiesList, TradingNPCsList } from '../../../components/NPCInteraction';
import { ShopsAtLocation } from '../../../components/ShopsAtLocation';
import { AbilitiesBar } from '../../../components/AbilitiesBar';
import { WorldMapModal } from '../../../components/WorldMapModal';

// --- TYPES ---

type Message = {
    role: 'user' | 'model';
    content: string;
    choices?: string[];
    questOffer?: string[];
};

interface QueuedReward extends RewardData {
    id: string;
}

// --- UTILS ---

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const generateId = () => Math.random().toString(36).substring(2, 9);

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
                            const cleanJson = dataString.replace(/```json/g, '').replace(/```/g, '').trim();
                            const json = JSON.parse(cleanJson);
                            onData(json);
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
        // Use word boundaries \b to avoid matching substrings (e.g., "cat" in "suffocating")
        const pattern = new RegExp(`\\b(${sortedEntities.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
        return text.split(pattern);
    }, [text, sortedEntities]);

    return (
        <>
            {parts.map((part, i) => {
                const entity = sortedEntities.find(e => e.name.toLowerCase() === part.toLowerCase());
                if (entity) {
                    return <EntitySpan key={`entity-${i}-${part.slice(0, 10)}`} entity={entity} text={part} />; 
                }
                return <span key={`text-${i}`}>{part}</span>;
            })}
        </>
    );
};

export default function PlayPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.campaignId as Id<"campaigns">;

    const data = useQuery(api.forge.getCampaignDetails, { campaignId });
    const generateQuest = useAction(api.ai.generateQuest);
    const ensureCharacter = useMutation(api.forge.ensureCharacterForCampaign);

    // --- PLAYER ID for queries ---
    const playerIdForAbilities = data?.character?.userId || "";

    // Ensure character exists for this campaign and has stats initialized
    const [characterEnsured, setCharacterEnsured] = useState(false);
    const [statsInitialized, setStatsInitialized] = useState(false);
    useEffect(() => {
        if (campaignId && !characterEnsured) {
            ensureCharacter({ campaignId })
                .then(() => setCharacterEnsured(true))
                .catch(console.error);
        }
    }, [campaignId, characterEnsured, ensureCharacter]);

    // --- ABILITIES QUERY ---
    const abilities = useQuery(
        api.abilities.getPlayerAbilities,
        playerIdForAbilities ? { campaignId, playerId: playerIdForAbilities } : "skip"
    );
    const executeAbility = useMutation(api.abilities.useAbility);

    // --- CHARACTER STATS (for dice rolling) ---
    const playerAttributes = useQuery(
        api.dice.getPlayerAttributes,
        playerIdForAbilities ? { campaignId, playerId: playerIdForAbilities } : "skip"
    );
    const initializeStats = useMutation(api.dice.initializeCharacterStats);
    
    // Parse campaign terminology (for custom names like "Chakra" instead of "Energy")
    const terminology = useMemo(() => {
        if (!data?.campaign?.terminology) return null;
        try {
            return JSON.parse(data.campaign.terminology);
        } catch {
            return null;
        }
    }, [data?.campaign?.terminology]);

    // Initialize character stats if they don't have them yet
    useEffect(() => {
        if (characterEnsured && playerIdForAbilities && playerAttributes && !statsInitialized) {
            // Check if stats are default (all 10s) - if so, initialize with random stats
            const hasDefaultStats =
                playerAttributes.strength === 10 &&
                playerAttributes.dexterity === 10 &&
                playerAttributes.constitution === 10 &&
                playerAttributes.intelligence === 10 &&
                playerAttributes.wisdom === 10 &&
                playerAttributes.charisma === 10;

            if (hasDefaultStats) {
                initializeStats({
                    campaignId,
                    playerId: playerIdForAbilities,
                    method: "random" // Roll 4d6 drop lowest for each stat
                })
                    .then(() => setStatsInitialized(true))
                    .catch(console.error);
            } else {
                setStatsInitialized(true);
            }
        }
    }, [characterEnsured, playerIdForAbilities, playerAttributes, statsInitialized, campaignId, initializeStats]);

    // World system mutations
    const killNPC = useMutation(api.forge.killNPC);
    const addBounty = useMutation(api.bounty.addBounty);
    const spreadRumor = useMutation(api.world.spreadRumor);
    const createDeathRumor = useMutation(api.world.createDeathRumor);

    // Message persistence
    const saveMessage = useMutation(api.messages.saveMessage);

    // Map system
    const mapData = useQuery(api.map.getMapData, { campaignId });
    const travelToLocation = useMutation(api.map.travelToLocation);

    // Get player ID from character data
    const playerId = data?.character?.userId || "";

    // Load existing messages from DB
    const savedMessages = useQuery(
        api.messages.getMessages,
        playerId ? { campaignId, playerId } : "skip"
    );

    // --- CORE STATE ---
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesInitialized, setMessagesInitialized] = useState(false);
    const [currentChoices, setCurrentChoices] = useState<string[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCharacterSheetOpen, setCharacterSheetOpen] = useState(false);
    const [selectedQuest, setSelectedQuest] = useState<any>(null);
    const [isGeneratingQuest, setIsGeneratingQuest] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- MAP STATE ---
    const [isMapOpen, setIsMapOpen] = useState(false);

    // --- LOAD MESSAGES FROM DB ---
    useEffect(() => {
        if (savedMessages && !messagesInitialized) {
            const loaded: Message[] = savedMessages.map(m => ({
                role: m.role as 'user' | 'model',
                content: m.content,
                choices: m.choices,
                questOffer: m.questOffer,
            }));
            if (loaded.length > 0) {
                setMessages(loaded);
                // Extract choices from last model message if any
                const lastModelMsg = loaded.filter(m => m.role === 'model').pop();
                if (lastModelMsg?.choices) {
                    setCurrentChoices(lastModelMsg.choices);
                }
            }
            setMessagesInitialized(true);
        }
    }, [savedMessages, messagesInitialized]);

    // --- GAME STATE ---
    const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
    const [hp, setHp] = useState(20);
    const [maxHp] = useState(20);
    const [xp, setXp] = useState(0);
    const [xpToLevel, setXpToLevel] = useState(100);
    const [level, setLevel] = useState(1);
    const [gameContext, setGameContext] = useState<GameContext>('explore');
    
    // --- WORLD SYSTEMS STATE ---
    const [bountyAmount, setBountyAmount] = useState(0);
    const [isJailed, setIsJailed] = useState(false);
    const [killedNpcs, setKilledNpcs] = useState<string[]>([]);
    const [gold, setGold] = useState(0);
    
    // --- ENERGY/ABILITY STATE ---
    const [energy, setEnergy] = useState(100);
    const [maxEnergy] = useState(100);
    
    // --- COMBAT STATE ---
    const [combatState, setCombatState] = useState<CombatState | null>(null);
    
    // --- UI EFFECT STATE ---
    const [skillCheckData, setSkillCheckData] = useState<SkillCheckData | null>(null);
    const [rewardQueue, setRewardQueue] = useState<QueuedReward[]>([]);
    const [screenEffect, setScreenEffect] = useState<ScreenEffectType | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [prevHp, setPrevHp] = useState(hp);

    // --- ENTITIES FOR HIGHLIGHTING ---
    const entities = useMemo(() => {
        if (!data) return [];
        return [
            ...(data.locations?.map(l => ({ name: l.name, type: 'Location', color: '#a7f3d0', description: l.description })) || []),
            ...(data.npcs?.map(n => ({ name: n.name, type: 'NPC', color: '#fbcfe8', description: n.description })) || []),
            ...(data.items?.map(i => ({ name: i.name, type: 'Item', color: i.textColor || '#fde68a', description: i.description })) || []),
            ...(data.monsters?.map(m => ({ name: m.name, type: 'Monster', color: '#fca5a5', description: m.description })) || [])
        ];
    }, [data]);

    // --- HP CHANGE DETECTION ---
    useEffect(() => {
        if (hp < prevHp) {
            // Took damage
            setScreenEffect('damage');
        } else if (hp > prevHp) {
            // Healed
            setScreenEffect('heal');
        }
        setPrevHp(hp);
    }, [hp]);

    // --- XP & LEVEL UP LOGIC ---
    const addXp = useCallback((amount: number) => {
        setXp(prev => {
            const newXp = prev + amount;
            if (newXp >= xpToLevel) {
                // Level up!
                setLevel(l => l + 1);
                setXpToLevel(t => Math.floor(t * 1.5));
                setShowLevelUp(true);
                setScreenEffect('levelup');
                return newXp - xpToLevel;
            }
            return newXp;
        });
    }, [xpToLevel]);

    // --- REWARD QUEUE MANAGEMENT ---
    const addReward = useCallback((reward: RewardData) => {
        const queuedReward: QueuedReward = { ...reward, id: generateId() };
        setRewardQueue(prev => [...prev, queuedReward]);
    }, []);

    const removeReward = useCallback((id: string) => {
        setRewardQueue(prev => prev.filter(r => r.id !== id));
    }, []);

    // --- GAME DATA HANDLER ---
    const handleGameData = useCallback((gameData: any) => {
        // Update HP
        if (typeof gameData.hp === 'number') {
            setHp(gameData.hp);
        }

        // Update context
        if (gameData.context && ['explore', 'combat', 'social', 'rest'].includes(gameData.context)) {
            setGameContext(gameData.context as GameContext);
        }

        // Handle choices
        if (gameData.choices && Array.isArray(gameData.choices)) {
            const normalizedChoices = gameData.choices
                .map((c: any) => 
                    typeof c === 'string' ? c : c.text || c.action || c.label || ''
                )
                .filter((c: string) => c && c.trim().length > 0); // Filter out empty choices
            setCurrentChoices(normalizedChoices);
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'model') {
                    return [...prev.slice(0, -1), { ...last, choices: normalizedChoices }];
                }
                return prev;
            }); }

        // Handle game events
        if (gameData.gameEvent) {
            const event = gameData.gameEvent;

            // Combat event
            if (event.type === 'combat' && event.combat) {
                setCombatState(event.combat);
                setGameContext('combat');
            }

            // Skill check event
            if (event.type === 'skillCheck' && event.skillCheck) {
                setSkillCheckData(event.skillCheck);
                // Show critical effect for nat 20
                if (event.skillCheck.roll === 20) {
                    setScreenEffect('critical');
                }
            }

            // Reward event
            if (event.type === 'reward' && event.reward) {
                addReward(event.reward);
                if (event.reward.xp) {
                    addXp(event.reward.xp);
                }
            }

            // NPC Death event - persist to database
            if (event.type === 'npcDeath' && event.npcDeath) {
                const { npcName, npcId, cause, killedBy } = event.npcDeath;
                setKilledNpcs(prev => [...prev, npcName]);
                
                // If we have an npcId, persist the death
                if (npcId && data) {
                    const npc = data.npcs?.find((n: any) => 
                        n._id === npcId || n.name.toLowerCase() === npcName.toLowerCase()
                    );
                    if (npc && !npc.isEssential) {
                        killNPC({
                            npcId: npc._id,
                            deathCause: cause || "Unknown",
                            killedBy: killedBy || "player",
                        }).catch(console.error);
                        
                        // Create death rumor if we have a location
                        if (currentLocationId) {
                            createDeathRumor({
                                campaignId,
                                npcId: npc._id,
                                killedBy: killedBy || "player",
                                locationId: currentLocationId as Id<"locations">,
                            }).catch(console.error);
                        }
                    }
                }
                
                // Screen effect for dramatic deaths
                setScreenEffect('damage');
            }

            // Crime event - add bounty
            if (event.type === 'crime' && event.crime && data?.bountyEnabled) {
                const { type: crimeType, description, bountyAmount: crimeAmount } = event.crime;
                
                // Find current region (or use first region as default)
                if (data.regions && data.regions.length > 0 && playerId) {
                    const currentRegion = data.regions.find((r: any) => 
                        currentLocationId && r.locationIds?.includes(currentLocationId)
                    ) || data.regions[0];
                    
                    if (currentRegion) {
                        addBounty({
                            campaignId,
                            playerId,
                            regionId: currentRegion._id,
                            crimeType,
                            description,
                        }).then(result => {
                            if (result.success && result.totalBounty) {
                                setBountyAmount(result.totalBounty);
                            }
                        }).catch(console.error);
                    }
                }
            }

            // Recruitment event - handled by showing UI prompt
            if (event.type === 'recruitment' && event.recruitment) {
                // For now, just show a toast. Full recruitment UI would open camp page
                addReward({
                    item: `${event.recruitment.npcName} can be recruited!`,
                    rarity: 'uncommon' as Rarity,
                    xp: 0,
                });
            }
        }

        // Direct XP gain
        if (typeof gameData.xpGained === 'number' && gameData.xpGained > 0) {
            addXp(gameData.xpGained);
        }

        // Location update
        if (gameData.current_location || gameData.locationId) {
            const locName = gameData.current_location;
            if (locName && data?.locations) {
                const loc = data.locations.find(l => 
                    l.name.toLowerCase() === locName.toLowerCase()
                );
                if (loc) {
                    setCurrentLocationId(loc._id);
                }
            }
        }

        // End combat if enemy HP is 0
        if (combatState && gameData.gameEvent?.combat?.enemyHP === 0) {
            setTimeout(() => {
                setCombatState(null);
                setGameContext('explore');
            }, 1500);
        }
    }, [data, combatState, addReward, addXp]);

    // --- QUEST GENERATION ---
    const handleGenerateQuest = async () => {
        if (!data || isGeneratingQuest) return;
        
        const location = data.locations?.find(l => l._id === currentLocationId) || data.locations?.[0];
        if (!location) return;

        setIsGeneratingQuest(true);
        try {
            await generateQuest({
                campaignId: data.campaign._id,
                locationId: location._id,
                locationName: location.name,
            });
        } catch (error) {
            console.error("Failed to generate quest:", error);
        } finally {
            setIsGeneratingQuest(false);
        }
    };

    // --- ASK ABOUT QUEST ---
    const handleAskQuest = async (questTitle: string) => {
        if (!data || !selectedQuest) return;

        setCurrentChoices([]);

        const currentLocation = data.locations?.find(l => l._id === currentLocationId);
        const questLocation = data.locations?.find(l => l._id === selectedQuest?.locationId);
        
        const currentLocationName = currentLocation?.name || "Unknown Wilds";
        const questLocationName = questLocation?.name || "Unknown Place";
        const isLocal = currentLocation?._id === questLocation?._id;

        const prompt = `I ask around about the quest "${questTitle}".
        
        [SYSTEM NOTE: The player is currently at "${currentLocationName}". The quest is located in "${questLocationName}". 
        ${isLocal 
            ? "Since they are in the same area, the locals should know specific details, rumors, or where to find the quest giver."
            : "Since they are far away from the quest location, the locals should barely know anything—maybe just a vague rumor or pointing the player to travel to " + questLocationName + "."}
        ]`;

        setSelectedQuest(null);

        const userMsg: Message = { role: 'user', content: `I ask around about "${questTitle}"...` };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        const payload = {
            prompt: prompt,
            history: messages.map(m => ({ role: m.role, content: m.content })),
            campaignId: data.campaign._id,
            currentLocationId: currentLocationId,
            playerId: playerId,
            playerState: {
                name: data.character?.name || "Traveler",
                class: data.character?.class || "Unknown",
                level: level,
                hp: hp,
                maxHp: maxHp,
                inventory: data.inventory?.map((i: any) => i.name) || [],
                abilities: data.spells?.map((s: any) => s.name) || [],
                bounty: bountyAmount,
                isJailed: isJailed,
                stats: playerAttributes || {
                    strength: 10,
                    dexterity: 10,
                    constitution: 10,
                    intelligence: 10,
                    wisdom: 10,
                    charisma: 10,
                },
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
            handleGameData,
            (err) => {
                console.error(err);
                setIsLoading(false);
            }
        );
        setIsLoading(false);
    };

    // --- MAP TRAVEL HANDLER ---
    const handleMapTravel = async (destination: any) => {
        if (!destination || !currentLocationId || !data || !playerId) return;

        // Execute travel mutation
        const result = await travelToLocation({
            campaignId,
            playerId,
            fromLocationId: currentLocationId as Id<"locations">,
            toLocationId: destination._id,
        });

        if (result.success) {
            // Update local state
            setCurrentLocationId(result.to._id);
            setIsMapOpen(false);

            // Send travel prompt to AI for narrative
            const fromLocation = data.locations?.find(l => l._id === currentLocationId);
            const travelPrompt = `I travel from ${fromLocation?.name || "my current location"} to ${result.to.name}.

[SYSTEM NOTE: The player has arrived at ${result.to.name} (${result.to.type}).
${result.to.description}
Describe the journey briefly and their arrival at the new location. Set the scene.]`;

            setCurrentChoices([]);
            const userMsg: Message = { role: 'user', content: `I travel to ${result.to.name}...` };
            setMessages(prev => [...prev, userMsg]);
            setIsLoading(true);

            // Save user message
            if (playerId) {
                saveMessage({
                    campaignId,
                    playerId,
                    role: 'user',
                    content: `I travel to ${result.to.name}...`,
                });
            }

            const payload = {
                prompt: travelPrompt,
                history: messages.map(m => ({ role: m.role, content: m.content })),
                campaignId: data.campaign._id,
                currentLocationId: result.to._id,
                playerId: playerId,
                playerState: {
                    name: data.character?.name || "Traveler",
                    class: data.character?.class || "Unknown",
                    level: level,
                    hp: hp,
                    maxHp: maxHp,
                    inventory: data.inventory?.map((i: any) => i.name) || [],
                    abilities: data.spells?.map((s: any) => s.name) || [],
                    bounty: bountyAmount,
                    isJailed: isJailed,
                }
            };

            let aiResponseContent = "";
            let aiChoices: string[] | undefined;

            await streamNarrative(
                payload,
                (delta) => {
                    aiResponseContent += delta;
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role === 'model') {
                            return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                        }
                        return [...prev, { role: 'model', content: delta }];
                    });
                },
                (gameData) => {
                    handleGameData(gameData);
                    if (gameData.choices) {
                        aiChoices = gameData.choices;
                    }
                },
                (err) => {
                    console.error(err);
                    setIsLoading(false);
                }
            );

            // Save AI response
            if (playerId && aiResponseContent) {
                saveMessage({
                    campaignId,
                    playerId,
                    role: 'model',
                    content: aiResponseContent,
                    choices: aiChoices,
                });
            }

            setIsLoading(false);
        }
    };

    // --- AUTO SCROLL ---
    useEffect(() => {
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    // --- INITIAL GAME START ---
    useEffect(() => {
        // Only start a new game if:
        // 1. Data is loaded
        // 2. Messages have been initialized from DB
        // 3. No messages exist (fresh game)
        // 4. Not currently loading
        if (data && messagesInitialized && messages.length === 0 && !isLoading) {
            const startLocation = data.locations[0];
            setCurrentLocationId(startLocation?._id || null);
            handleStartGame(startLocation);
        }
    }, [data, messagesInitialized]);

    // --- START GAME ---
    const handleStartGame = async (startLocation: any) => {
        if (!data) return;
        setIsLoading(true);

        const startPrompt = `
            Start the adventure at ${startLocation?.name || "Unknown"}.
            Describe the scene vividly (2 paragraphs). Address the player as "you".
            Set the context to "explore" and provide 3-4 initial action choices.
        `;

        const payload = {
            prompt: startPrompt,
            history: [],
            campaignId: data.campaign._id,
            currentLocationId: startLocation?._id,
            playerId: playerId,
            playerState: {
                name: data.character?.name || "Traveler",
                class: data.character?.class || "Unknown",
                level: level,
                hp: hp,
                maxHp: maxHp,
                inventory: data.inventory?.map((i: any) => i.name) || [],
                abilities: data.spells?.map((s: any) => s.name) || [],
                bounty: 0,
                isJailed: false,
                stats: playerAttributes || {
                    strength: 10,
                    dexterity: 10,
                    constitution: 10,
                    intelligence: 10,
                    wisdom: 10,
                    charisma: 10,
                },
            }
        };

        let aiResponseContent = "";
        let aiChoices: string[] | undefined;

        await streamNarrative(
            payload,
            (delta) => {
                aiResponseContent += delta;
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'model') {
                        return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                    }
                    return [...prev, { role: 'model', content: delta }];
                });
            },
            (gameData) => {
                handleGameData(gameData);
                if (gameData.choices) {
                    aiChoices = gameData.choices;
                }
            },
            (err) => console.error(err)
        );

        // Save initial AI response to DB
        if (playerId && aiResponseContent) {
            saveMessage({
                campaignId,
                playerId,
                role: 'model',
                content: aiResponseContent,
                choices: aiChoices,
            });
        }

        setIsLoading(false);
    };

    // --- SEND MESSAGE ---
    const handleSendMessage = async (manualContent?: string) => {
        const contentToSend = typeof manualContent === 'string' ? manualContent : input;
        if (!contentToSend.trim() || isLoading || !data) return;

        setCurrentChoices([]);

        const userMsg: Message = { role: 'user', content: contentToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        // Save user message to DB
        if (playerId) {
            saveMessage({
                campaignId,
                playerId,
                role: 'user',
                content: contentToSend,
            });
        }

        const payload = {
            prompt: contentToSend,
            history: messages.map(m => ({ role: m.role, content: m.content })),
            campaignId: data.campaign._id,
            currentLocationId: currentLocationId,
            playerId: playerId,
            playerState: {
                name: data.character?.name || "Traveler",
                class: data.character?.class || "Unknown",
                level: level,
                hp: hp,
                maxHp: maxHp,
                inventory: data.inventory?.map((i: any) => i.name) || [],
                abilities: data.spells?.map((s: any) => s.name) || [],
                bounty: bountyAmount,
                isJailed: isJailed,
                stats: playerAttributes || {
                    strength: 10,
                    dexterity: 10,
                    constitution: 10,
                    intelligence: 10,
                    wisdom: 10,
                    charisma: 10,
                },
            }
        };

        let aiResponseContent = "";
        let aiChoices: string[] | undefined;

        await streamNarrative(
            payload,
            (delta) => {
                aiResponseContent += delta;
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'model') {
                        return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                    }
                    return [...prev, { role: 'model', content: delta }];
                });
            },
            (gameData) => {
                handleGameData(gameData);
                // Capture choices for saving
                if (gameData.choices) {
                    aiChoices = gameData.choices;
                }
            },
            (err) => {
                console.error(err);
                setIsLoading(false);
            }
        );

        // Save AI response to DB after streaming completes
        if (playerId && aiResponseContent) {
            saveMessage({
                campaignId,
                playerId,
                role: 'model',
                content: aiResponseContent,
                choices: aiChoices,
            });
        }

        setIsLoading(false);
    };

    // --- HANDLE ENTER KEY ---
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // --- LOADING STATE ---
    if (!data) {
        return (
            <div className="h-screen flex items-center justify-center bg-genshin-dark text-genshin-gold">
                <Loader2 className="animate-spin w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-genshin-dark text-stone-200 font-sans overflow-hidden selection:bg-genshin-gold selection:text-genshin-dark">
            
            {/* === GAME UI OVERLAYS === */}
            <AnimatePresence>
                {/* Screen Effects */}
                {screenEffect && (
                    <ScreenEffect 
                        type={screenEffect} 
                        onComplete={() => setScreenEffect(null)} 
                    />
                )}

                {/* Combat HUD */}
                {combatState && (
                    <CombatHUD
                        playerName={data.character?.name || "Traveler"}
                        playerHP={hp}
                        playerMaxHP={maxHp}
                        enemyName={combatState.enemyName}
                        enemyHP={combatState.enemyHP}
                        enemyMaxHP={combatState.enemyMaxHP}
                        isPlayerTurn={combatState.isPlayerTurn}
                    />
                )}

                {/* Dice Roll Overlay */}
                {skillCheckData && (
                    <DiceRollOverlay
                        data={skillCheckData}
                        onComplete={() => setSkillCheckData(null)}
                    />
                )}

                {/* Level Up Overlay */}
                {showLevelUp && (
                    <LevelUpOverlay
                        newLevel={level}
                        onComplete={() => setShowLevelUp(false)}
                    />
                )}

                {/* Reward Toasts */}
                {rewardQueue.map((reward, index) => (
                    <motion.div
                        key={reward.id}
                        initial={{ y: 0 }}
                        animate={{ y: index * 100 }}
                        style={{ position: 'fixed', top: 96, right: 24, zIndex: 50 - index }}
                    >
                        <RewardToast
                            item={reward.item}
                            rarity={reward.rarity}
                            xp={reward.xp}
                            onComplete={() => removeReward(reward.id)}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>

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
                    <div className="flex items-center gap-3">
                        {/* XP Bar in header */}
                        <div className="hidden md:block w-32">
                            <XPBar currentXP={xp} maxXP={xpToLevel} level={level} compact />
                        </div>
                        <button
                            onClick={() => setIsMapOpen(true)}
                            className="p-2 hover:bg-white/5 rounded-full text-stone-400 hover:text-genshin-gold transition-colors group relative"
                            title="Open World Map"
                        >
                            <Map size={20} />
                        </button>
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

                {/* Input Area */}
                <div className="p-6 bg-gradient-to-t from-genshin-dark via-genshin-dark to-transparent">
                    <div className="max-w-3xl mx-auto relative">
                        {/* Quick Action Bar */}
                        <QuickActionBar
                            onAction={handleSendMessage}
                            isLoading={isLoading}
                            context={gameContext}
                        />

                        {/* AI Suggested Choices */}
                        {currentChoices.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4 justify-center">
                                {currentChoices.map((choice, i) => (
                                    <motion.button
                                        key={`choice-${i}-${choice.slice(0, 20)}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => handleSendMessage(choice)}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-genshin-dark/80 backdrop-blur-sm border border-genshin-gold/30 rounded-full text-xs font-bold text-genshin-gold hover:bg-genshin-gold hover:text-genshin-dark transition-all shadow-lg hover:shadow-genshin-gold/30 active:scale-95"
                                    >
                                        {choice}
                                    </motion.button>
                                ))}
                            </div>
                        )}

                        {/* Text Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="What do you do?"
                                className="w-full bg-[#1f2235] border border-genshin-gold/30 rounded-lg pl-6 pr-14 py-4 focus:outline-none focus:border-genshin-gold focus:ring-1 focus:ring-genshin-gold/20 transition-all shadow-xl placeholder:text-stone-600 text-stone-200"
                                disabled={isLoading}
                            />
                            <button 
                                onClick={() => handleSendMessage()}
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-genshin-gold hover:bg-[#eac88f] text-genshin-dark rounded-lg transition-all disabled:opacity-0 disabled:scale-75"
                            >
                                <Send size={18} />
                            </button>
                        </div>
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
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* XP Progress */}
                        <XPBar currentXP={xp} maxXP={xpToLevel} level={level} />

                        {/* Vitals */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2 font-serif">
                                <Heart size={12} /> Vitals
                            </h3>
                            <div className="bg-genshin-dark rounded-lg p-4 border border-genshin-gold/10 shadow-inner space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-stone-400 font-serif text-xs uppercase tracking-wide">Health Points</span>
                                        <span className={`font-bold ${hp / maxHp < 0.25 ? 'text-red-400' : 'text-genshin-gold'}`}>{hp} / {maxHp}</span>
                                    </div>
                                    <div className="h-3 bg-stone-800 rounded-full overflow-hidden border border-white/5">
                                        <motion.div 
                                            className={`h-full relative ${hp / maxHp < 0.25 ? 'bg-gradient-to-r from-red-600 to-red-400 animate-hp-danger' : 'bg-gradient-to-r from-green-600 to-emerald-400'}`}
                                            animate={{ width: `${(hp / maxHp) * 100}%` }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[shine_1s_linear_infinite]" />
                                        </motion.div>
                                    </div>
                                </div>
                                {/* Gold */}
                                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                    <span className="text-stone-400 font-serif text-xs uppercase tracking-wide flex items-center gap-1.5">
                                        <Coins size={12} className="text-amber-400" /> Gold
                                    </span>
                                    <span className="font-bold text-amber-400">{gold}</span>
                                </div>
                            </div>
                        </div>

                        {/* Character Attributes (D&D Stats) */}
                        {playerAttributes && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2 font-serif">
                                    <Swords size={12} /> Attributes
                                </h3>
                                <div className="bg-genshin-dark rounded-lg p-3 border border-genshin-gold/10 shadow-inner">
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { key: 'strength', abbr: 'STR', color: 'text-red-400' },
                                            { key: 'dexterity', abbr: 'DEX', color: 'text-green-400' },
                                            { key: 'constitution', abbr: 'CON', color: 'text-orange-400' },
                                            { key: 'intelligence', abbr: 'INT', color: 'text-blue-400' },
                                            { key: 'wisdom', abbr: 'WIS', color: 'text-purple-400' },
                                            { key: 'charisma', abbr: 'CHA', color: 'text-pink-400' },
                                        ].map((stat) => {
                                            const value = playerAttributes[stat.key as keyof typeof playerAttributes] as number || 10;
                                            const modifier = Math.floor((value - 10) / 2);
                                            return (
                                                <SmartTooltip
                                                    key={stat.key}
                                                    content={
                                                        <div className="text-center">
                                                            <p className="font-bold text-genshin-gold">{stat.key.charAt(0).toUpperCase() + stat.key.slice(1)}</p>
                                                            <p className="text-xs text-stone-400">Score: {value}</p>
                                                            <p className="text-xs text-stone-400">Modifier: {modifier >= 0 ? '+' : ''}{modifier}</p>
                                                        </div>
                                                    }
                                                >
                                                    <div className="bg-stone-800/50 rounded p-2 text-center cursor-help hover:bg-stone-700/50 transition-colors">
                                                        <p className={`text-[10px] uppercase font-bold ${stat.color}`}>{stat.abbr}</p>
                                                        <p className="text-lg font-bold text-white">{value}</p>
                                                        <p className={`text-xs ${modifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {modifier >= 0 ? '+' : ''}{modifier}
                                                        </p>
                                                    </div>
                                                </SmartTooltip>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Inventory */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2 font-serif">
                                <Backpack size={12} /> Inventory
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                                {data.inventory?.slice(0, 8).map((item: any, i: number) => (
                                    <SmartTooltip
                                        key={i}
                                        content={
                                            <>
                                                <p className="font-bold text-genshin-gold text-sm">{item.name}</p>
                                                <p className="text-[10px] text-stone-400 uppercase">{item.type} • {item.rarity}</p>
                                                <p className="text-xs text-stone-500 mt-1">{item.description || item.effects}</p>
                                            </>
                                        }
                                    >
                                        <div 
                                            className="aspect-square rounded-lg bg-genshin-dark/50 border border-genshin-gold/20 flex items-center justify-center hover:border-genshin-gold transition-colors cursor-pointer group relative overflow-hidden"
                                            style={{ borderColor: item.textColor ? `${item.textColor}40` : undefined }}
                                        >
                                            <span className="text-lg">{item.type === 'Weapon' ? '⚔️' : item.type === 'Armor' ? '🛡️' : item.type === 'Potion' ? '🧪' : '📦'}</span>
                                        </div>
                                    </SmartTooltip>
                                )) || [...Array(8)].map((_, i) => (
                                    <div key={i} className="aspect-square rounded-lg bg-genshin-dark/50 border border-genshin-gold/10 flex items-center justify-center">
                                        <div className="w-1 h-1 bg-stone-700 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Abilities / Jutsu */}
                        {abilities && abilities.length > 0 && (
                            <AbilitiesBar
                                abilities={abilities}
                                currentEnergy={energy}
                                maxEnergy={maxEnergy}
                                energyName={terminology?.mana || "Energy"}
                                onUseAbility={async (abilityId, abilityName) => {
                                    if (!playerIdForAbilities) return;
                                    
                                    const result = await executeAbility({
                                        campaignId,
                                        playerId: playerIdForAbilities,
                                        spellId: abilityId as Id<"spells">,
                                    });
                                    
                                    if (result.success) {
                                        // Update energy
                                        setEnergy(result.newEnergy ?? energy);
                                        
                                        // Update HP if healed
                                        if (result.newHp && result.newHp !== hp) {
                                            setHp(result.newHp);
                                        }
                                        
                                        // Show damage effect
                                        if (result.spell?.damage && result.spell.damage > 0) {
                                            setScreenEffect('critical');
                                            setTimeout(() => setScreenEffect(null), 300);
                                        }
                                        
                                        // Show healing effect
                                        if (result.spell?.healing && result.spell.healing > 0) {
                                            setScreenEffect('heal');
                                            setTimeout(() => setScreenEffect(null), 300);
                                        }
                                        
                                        // Send to AI for narrative
                                        const abilityMessage = combatState 
                                            ? `I use ${abilityName} on ${combatState.enemyName || 'the enemy'}!`
                                            : `I use ${abilityName}!`;
                                        handleSendMessage(abilityMessage);
                                    }
                                }}
                                disabled={isLoading}
                                inCombat={gameContext === 'combat'}
                            />
                        )}

                        {/* Game Context Indicator */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2 font-serif">
                                <Trophy size={12} /> Status
                            </h3>
                            <div className="bg-genshin-dark rounded-lg p-4 border border-genshin-gold/10 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        gameContext === 'combat' ? 'bg-red-400 animate-pulse' :
                                        gameContext === 'social' ? 'bg-blue-400' :
                                        gameContext === 'rest' ? 'bg-green-400' :
                                        'bg-genshin-gold'
                                    }`} />
                                    <span className="text-sm text-stone-400 capitalize">{gameContext} Mode</span>
                                </div>
                                
                                {/* Bounty Warning */}
                                {bountyAmount > 0 && (
                                    <div className="flex items-center gap-2 text-red-400 bg-red-900/20 rounded px-2 py-1">
                                        <ShieldAlert size={14} />
                                        <span className="text-xs">Bounty: {bountyAmount}g</span>
                                    </div>
                                )}
                                
                                {/* Jail Status */}
                                {isJailed && (
                                    <div className="flex items-center gap-2 text-amber-400 bg-amber-900/20 rounded px-2 py-1">
                                        <AlertTriangle size={14} />
                                        <span className="text-xs">JAILED</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lootable Bodies */}
                        {currentLocationId && (
                            <LootableBodiesList
                                campaignId={campaignId}
                                locationId={currentLocationId as Id<"locations">}
                                playerId={playerId}
                                onLootComplete={(items, lootedGold) => {
                                    // Add rewards to queue
                                    items.forEach(item => {
                                        addReward({
                                            item: item.name,
                                            rarity: item.rarity.toLowerCase() as Rarity,
                                            xp: 0,
                                        });
                                    });
                                    if (lootedGold > 0) {
                                        setGold(prev => prev + lootedGold);
                                    }
                                }}
                            />
                        )}

                        {/* Trading NPCs */}
                        {currentLocationId && (
                            <TradingNPCsList
                                campaignId={campaignId}
                                locationId={currentLocationId as Id<"locations">}
                                playerId={playerId}
                                playerGold={gold}
                                onTradeComplete={() => {
                                    // Refresh gold state would happen automatically via query
                                }}
                            />
                        )}

                        {/* Shops */}
                        {currentLocationId && (
                            <ShopsAtLocation
                                campaignId={campaignId}
                                locationId={currentLocationId as Id<"locations">}
                                playerId={playerId}
                                playerGold={gold}
                                onTransactionComplete={() => {
                                    // Gold updates automatically via Convex reactivity
                                }}
                            />
                        )}

                        {/* Camp Link */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2 font-serif">
                                <Tent size={12} /> Base
                            </h3>
                            <button
                                onClick={() => router.push(`/play/${campaignId}/camp`)}
                                className="w-full bg-genshin-dark rounded-lg p-4 border border-genshin-gold/10 hover:border-genshin-gold/30 transition-all group flex items-center gap-3"
                            >
                                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <Tent size={18} className="text-amber-500" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm text-stone-300 group-hover:text-genshin-gold transition-colors">Your Camp</div>
                                    <div className="text-xs text-stone-500">Manage followers</div>
                                </div>
                            </button>
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

            {/* World Map Modal */}
            {mapData && (
                <WorldMapModal
                    isOpen={isMapOpen}
                    onClose={() => setIsMapOpen(false)}
                    campaignId={campaignId}
                    locations={mapData}
                    currentLocationId={currentLocationId as Id<"locations"> | null}
                    onTravelRequest={handleMapTravel}
                />
            )}
        </div>
    );
}
