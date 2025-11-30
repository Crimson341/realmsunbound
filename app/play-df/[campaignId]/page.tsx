/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useAction, useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import {
    Send, Heart, MapPin, Map,
    Menu, X, ArrowLeft, ArrowRight,
    Loader2, Swords, Sword, Backpack, UserCircle, Search, Trophy,
    Tent, AlertTriangle, Skull, Coins, ShieldAlert, Users, Maximize2, Minimize2,
    Eye, Hand, MessageSquare
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
    CombatActionBar,
    CombatAction,
    ScreenEffect,
    GameContext,
    CombatState,
    SkillCheckData,
    RewardData,
    Rarity,
    ScreenEffectType,
} from '../../../components/GameUI';
import { AIGameCanvas, AIGameCanvasHandle, parseAIGameEvents, createEventProcessor } from '../../../game/ai-canvas/AIGameCanvas';
import { HoverInfo } from '../../../game/ai-canvas/AIGameEngine';
import { AIGameEvent, RoomEntity, RoomObject } from '../../../game/ai-canvas/types';

// --- TYPES ---

type Message = {
    role: 'user' | 'model';
    content: string;
    choices?: string[];
    questOffer?: string[];
};

interface ContextMenuState {
    show: boolean;
    x: number;
    y: number;
    type: 'entity' | 'object';
    id: string;
    name: string;
    hostile?: boolean;
    isExit?: boolean;
    exitLocation?: string;
}

interface QueuedReward extends RewardData {
    id: string;
}

// --- UTILS ---

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const generateId = () => Math.random().toString(36).substring(2, 9);

// --- DEDICATED MAP AI HELPER ---

const callMapAI = async (
    campaignId: string, // CRITICAL: Added campaign ID to fetch world data
    playerAction: string,
    currentLocationName: string,
    currentLocationDescription: string | undefined,
    locationType: string | undefined,
    currentRoomState: {
        width: number;
        height: number;
        playerPosition: { x: number; y: number };
        entities: { id: string; type: number; x: number; y: number; name: string; hostile: boolean }[];
        objects: { id: string; type: number; x: number; y: number; state?: string }[];
    } | null,
    needsNewRoom: boolean,
    narrativeContext?: string
): Promise<AIGameEvent[]> => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    if (!convexUrl) {
        console.error("[MapAI] NEXT_PUBLIC_CONVEX_URL not set");
        return [];
    }
    const httpUrl = convexUrl.includes("convex.cloud")
        ? convexUrl.replace("convex.cloud", "convex.site")
        : convexUrl;

    try {
        console.log('[MapAI] Calling map AI with:', {
            campaignId,
            playerAction,
            currentLocationName,
            locationType,
            needsNewRoom,
            hasRoomState: !!currentRoomState,
        });

        const response = await fetch(`${httpUrl}/api/map-events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                campaignId, // Include campaign ID for world-aware generation
                playerAction,
                currentLocationName,
                currentLocationDescription,
                locationType,
                currentRoomState,
                needsNewRoom,
                narrativeContext,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[MapAI] HTTP Error:', response.status, errorText);
            return [];
        }

        const data = await response.json();
        console.log('[MapAI] Raw response:', JSON.stringify(data).substring(0, 500));

        if (data.error) {
            console.error('[MapAI] API returned error:', data.error);
            if (data.raw) console.error('[MapAI] Raw AI output:', data.raw);
            return [];
        }

        if (!data.events || !Array.isArray(data.events)) {
            console.warn('[MapAI] No events array in response:', data);
            return [];
        }

        console.log('[MapAI] Received', data.events.length, 'events');
        data.events.forEach((evt: AIGameEvent, i: number) => {
            console.log(`[MapAI] Event ${i}:`, evt.type, evt);
        });

        return data.events;
    } catch (e) {
        console.error('[MapAI] Exception:', e);
        return [];
    }
};

// Helper to detect movement intent in player message
const detectsMovementIntent = (message: string): boolean => {
    const movementPatterns = [
        /\b(walk|go|move|head|travel|run|approach|step|venture|proceed|advance|make my way)\b/i,
        /\b(to the|toward|towards|over to|up to|into|through|across)\b/i,
        /\b(north|south|east|west|left|right|forward|back|up|down)\b/i,
        /\b(chest|door|table|enemy|exit|entrance|stairs|corner|room|area)\b/i,
        /\bI (go|walk|move|head|run|approach)\b/i,
    ];
    return movementPatterns.some(pattern => pattern.test(message));
};

// --- STREAMING HELPER WITH MAP EVENTS ---

const streamNarrative = async (
    payload: any,
    onContent: (delta: string) => void,
    onData: (data: any) => void,
    onMapEvents: (events: AIGameEvent[]) => void,
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
        let inMapEvents = false;
        let dataString = "";
        let mapEventsString = "";

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
                if (!inNarrative && !inData && !inMapEvents) {
                    const navStart = internalTextBuffer.indexOf("<narrative>");
                    const dataStart = internalTextBuffer.indexOf("<data>");
                    const mapStart = internalTextBuffer.indexOf("<mapEvents>");

                    // Find the earliest tag
                    const positions = [
                        { pos: navStart, type: 'narrative' },
                        { pos: dataStart, type: 'data' },
                        { pos: mapStart, type: 'map' }
                    ].filter(p => p.pos !== -1).sort((a, b) => a.pos - b.pos);

                    if (positions.length > 0) {
                        const first = positions[0];
                        if (first.type === 'narrative') {
                            inNarrative = true;
                            internalTextBuffer = internalTextBuffer.substring(navStart + 11);
                        } else if (first.type === 'data') {
                            inData = true;
                            internalTextBuffer = internalTextBuffer.substring(dataStart + 6);
                        } else if (first.type === 'map') {
                            inMapEvents = true;
                            internalTextBuffer = internalTextBuffer.substring(mapStart + 11);
                        }
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
                } else if (inMapEvents) {
                    const mapEnd = internalTextBuffer.indexOf("</mapEvents>");
                    if (mapEnd !== -1) {
                        mapEventsString += internalTextBuffer.substring(0, mapEnd);
                        try {
                            // Clean up common JSON issues (Python-style booleans, trailing commas, etc.)
                            const cleanedJson = mapEventsString
                                .replace(/:\s*True\b/g, ': true')
                                .replace(/:\s*False\b/g, ': false')
                                .replace(/:\s*None\b/g, ': null')
                                .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
                                .trim();
                            const events = JSON.parse(cleanedJson) as AIGameEvent[];
                            onMapEvents(events);
                        } catch (e) {
                            console.error("Map Events Parse Error:", e, "Raw:", mapEventsString);
                        }
                        inMapEvents = false;
                        mapEventsString = "";
                        internalTextBuffer = internalTextBuffer.substring(mapEnd + 12);
                    } else {
                        mapEventsString += internalTextBuffer;
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

export default function PlayDFPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.campaignId as Id<"campaigns">;

    // Auth state - wait for auth before calling mutations
    const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

    const data = useQuery(api.forge.getCampaignDetails, { campaignId });
    const generateQuest = useAction(api.ai.generateQuest);
    const ensureCharacter = useMutation(api.forge.ensureCharacterForCampaign);

    // --- AI GAME CANVAS REF ---
    const canvasRef = useRef<AIGameCanvasHandle>(null);
    const [isMapExpanded, setIsMapExpanded] = useState(false);

    // --- PLAYER ID for queries ---
    const playerIdForAbilities = data?.character?.userId || "";

    // Ensure character exists for this campaign - WAIT FOR AUTH TO BE READY
    const [characterEnsured, setCharacterEnsured] = useState(false);
    useEffect(() => {
        // Only call mutation when auth is ready and user is authenticated
        if (campaignId && !characterEnsured && isAuthenticated && !isAuthLoading) {
            console.log('[PlayDF] Auth ready, ensuring character...');
            ensureCharacter({ campaignId })
                .then(() => {
                    console.log('[PlayDF] Character ensured successfully');
                    setCharacterEnsured(true);
                })
                .catch((err) => {
                    console.error('[PlayDF] Failed to ensure character:', err);
                });
        }
    }, [campaignId, characterEnsured, ensureCharacter, isAuthenticated, isAuthLoading]);

    // World system mutations
    const killNPC = useMutation(api.forge.killNPC);
    const updateQuestProgress = useMutation(api.forge.updateQuestProgress);
    const completeQuest = useMutation(api.forge.completeQuest);
    const saveMessage = useMutation(api.messages.saveMessage);

    // Player game state
    const playerGameState = useQuery(api.world.getPlayerGameState, { campaignId });
    const updatePlayerGameState = useMutation(api.world.updatePlayerGameState);

    const playerId = data?.character?.userId || "";

    // Load existing messages
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
    const [isGeneratingMap, setIsGeneratingMap] = useState(false);
    const [mapGenerationStep, setMapGenerationStep] = useState("");
    const [isCharacterSheetOpen, setCharacterSheetOpen] = useState(false);
    const [selectedQuest, setSelectedQuest] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

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
                const lastModelMsg = loaded.filter(m => m.role === 'model').pop();
                if (lastModelMsg?.choices) {
                    setCurrentChoices(lastModelMsg.choices);
                }
            }
            setMessagesInitialized(true);
        }
    }, [savedMessages, messagesInitialized]);

    // --- GAME STATE ---
    const [gameStateInitialized, setGameStateInitialized] = useState(false);
    const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
    const [hp, setHp] = useState(20);
    const [maxHp, setMaxHp] = useState(20);
    const [xp, setXp] = useState(0);
    const [xpToLevel, setXpToLevel] = useState(100);
    const [level, setLevel] = useState(1);
    const [gameContext, setGameContext] = useState<GameContext>('explore');
    const [gold, setGold] = useState(0);

    // --- LOAD GAME STATE FROM DATABASE ---
    useEffect(() => {
        if (playerGameState && !gameStateInitialized) {
            setHp(playerGameState.hp);
            setMaxHp(playerGameState.maxHp);
            setXp(playerGameState.xp);
            setLevel(playerGameState.level);
            setGold(playerGameState.gold ?? 0);
            if (playerGameState.currentLocationId) {
                setCurrentLocationId(playerGameState.currentLocationId);
            }
            setXpToLevel(Math.floor(100 * Math.pow(1.5, playerGameState.level - 1)));
            setGameStateInitialized(true);
        }
    }, [playerGameState, gameStateInitialized]);

    // --- COMBAT STATE ---
    const [combatState, setCombatState] = useState<CombatState | null>(null);

    // --- HOVER & CONTEXT MENU STATE ---
    const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // --- STATE SAVING ---
    const saveGameState = useCallback(async (updates: {
        hp?: number;
        maxHp?: number;
        xp?: number;
        level?: number;
        gold?: number;
        currentLocationId?: Id<"locations">;
    }) => {
        if (!gameStateInitialized) return;
        try {
            await updatePlayerGameState({
                campaignId,
                ...updates,
            });
        } catch (error) {
            console.error("[GameState] Failed to save:", error);
        }
    }, [campaignId, updatePlayerGameState, gameStateInitialized]);

    // --- UI STATE ---
    const [skillCheckData, setSkillCheckData] = useState<SkillCheckData | null>(null);
    const [rewardQueue, setRewardQueue] = useState<QueuedReward[]>([]);
    const [screenEffect, setScreenEffect] = useState<ScreenEffectType | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);

    // --- LOCATION TRANSITION HANDLER ---
    const handleLocationTransition = useCallback(async (toLocationName: string) => {
        if (!data) return;

        console.log('[PlayDF] Transitioning to location:', toLocationName);
        setIsGeneratingMap(true);
        setMapGenerationStep(`Traveling to ${toLocationName}...`);

        // Find the target location in campaign data
        const targetLocation = data.locations?.find(
            (loc: any) => loc.name.toLowerCase() === toLocationName.toLowerCase()
        );

        if (!targetLocation) {
            console.warn('[PlayDF] Location not found:', toLocationName);
            setMapGenerationStep(`${toLocationName} doesn't exist in this world...`);
            setTimeout(() => setIsGeneratingMap(false), 2000);
            return;
        }

        // Update current location
        setCurrentLocationId(targetLocation._id);
        saveGameState({ currentLocationId: targetLocation._id });

        // Generate new room for the location
        const mapEvents = await callMapAI(
            data.campaign._id,
            `Arriving at ${targetLocation.name}. Generate the room for this location.`,
            targetLocation.name,
            targetLocation.description,
            targetLocation.type || "dungeon",
            null, // No existing room
            true, // needsNewRoom
            `Player just arrived at ${targetLocation.name} from another location.`
        );

        if (mapEvents.length > 0) {
            console.log('[PlayDF] Generated room for new location:', mapEvents);
            // Process events directly (not through handleMapEvents to avoid recursion)
            for (const event of mapEvents) {
                if (event.type !== 'transitionLocation') {
                    canvasRef.current?.processEvent(event);
                }
            }
        } else {
            console.warn('[PlayDF] No events for new location - loading demo room');
            canvasRef.current?.loadDemoRoom();
        }
        setIsGeneratingMap(false);
    }, [data, saveGameState]);

    // --- MAP EVENT HANDLER ---
    const handleMapEvents = useCallback((events: AIGameEvent[]) => {
        console.log('[PlayDF] Received map events:', events.length, events);
        for (const event of events) {
            console.log('[PlayDF] Processing map event:', event.type, event);

            // Handle location transitions specially
            if (event.type === 'transitionLocation') {
                const transitionEvent = event as { type: 'transitionLocation'; transitionLocation: { toLocation: string } };
                handleLocationTransition(transitionEvent.transitionLocation.toLocation);
                continue;
            }

            canvasRef.current?.processEvent(event);

            // Hide map generation overlay when first room is loaded
            if (event.type === 'generateRoom') {
                console.log('[PlayDF] Room generated, hiding loading overlay');
                setIsGeneratingMap(false);
            }
        }
    }, [handleLocationTransition]);

    // --- XP & LEVEL UP ---
    const addXp = useCallback((amount: number) => {
        setXp(prev => {
            const newXp = prev + amount;
            if (newXp >= xpToLevel) {
                const newLevel = level + 1;
                const newXpToLevel = Math.floor(xpToLevel * 1.5);
                const remainingXp = newXp - xpToLevel;

                setLevel(newLevel);
                setXpToLevel(newXpToLevel);
                setShowLevelUp(true);
                setScreenEffect('levelup');
                saveGameState({ level: newLevel, xp: remainingXp });

                return remainingXp;
            }
            if (amount >= 10) {
                saveGameState({ xp: newXp });
            }
            return newXp;
        });
    }, [xpToLevel, level, saveGameState]);

    // --- REWARD QUEUE ---
    const addReward = useCallback((reward: RewardData) => {
        const queuedReward: QueuedReward = { ...reward, id: generateId() };
        setRewardQueue(prev => [...prev, queuedReward]);
    }, []);

    const removeReward = useCallback((id: string) => {
        setRewardQueue(prev => prev.filter(r => r.id !== id));
    }, []);

    // --- GAME DATA HANDLER ---
    const handleGameData = useCallback((gameData: any) => {
        const stateUpdates: Parameters<typeof saveGameState>[0] = {};

        if (typeof gameData.hp === 'number') {
            setHp(gameData.hp);
            stateUpdates.hp = gameData.hp;
        }

        if (typeof gameData.gold === 'number') {
            setGold(gameData.gold);
            stateUpdates.gold = gameData.gold;
        }

        if (gameData.context && ['explore', 'combat', 'social', 'rest'].includes(gameData.context)) {
            setGameContext(gameData.context as GameContext);
        }

        if (gameData.choices && Array.isArray(gameData.choices)) {
            const normalizedChoices = gameData.choices
                .map((c: any) => typeof c === 'string' ? c : c.text || c.action || c.label || '')
                .filter((c: string) => c && c.trim().length > 0);
            setCurrentChoices(normalizedChoices);
        }

        // Handle game events
        if (gameData.gameEvent) {
            const event = gameData.gameEvent;

            if (event.type === 'combat' && event.combat) {
                setCombatState(event.combat);
                setGameContext('combat');
            }

            if (event.type === 'skillCheck' && event.skillCheck) {
                setSkillCheckData(event.skillCheck);
                if (event.skillCheck.roll === 20) {
                    setScreenEffect('critical');
                }
            }

            if (event.type === 'reward' && event.reward) {
                addReward(event.reward);
                if (event.reward.xp) addXp(event.reward.xp);
            }
        }

        if (typeof gameData.xpGained === 'number' && gameData.xpGained > 0) {
            addXp(gameData.xpGained);
        }

        if (Object.keys(stateUpdates).length > 0) {
            saveGameState(stateUpdates);
        }
    }, [addReward, addXp, saveGameState]);

    // --- AUTO SCROLL ---
    useEffect(() => {
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    // --- INITIAL GAME START ---
    const [gameStarted, setGameStarted] = useState(false);

    useEffect(() => {
        // Only start game once when data is ready
        if (data && messagesInitialized && !gameStarted && !isLoading) {
            setGameStarted(true);

            // Determine starting location
            const startLocation = currentLocationId
                ? data.locations?.find((l: any) => l._id === currentLocationId)
                : data.locations?.[0];

            if (!currentLocationId) {
                setCurrentLocationId(startLocation?._id || null);
            }

            if (messages.length === 0) {
                // New game - full intro sequence
                console.log('[PlayDF] New game - starting with intro');
                handleStartGame(startLocation);
            } else {
                // Returning player - just generate the room for current location
                console.log('[PlayDF] Returning player - generating room for current location');
                setIsGeneratingMap(true);
                setMapGenerationStep("Reconstructing your location...");

                callMapAI(
                    data.campaign._id,
                    "Player is returning to the game. Generate the room for their current location.",
                    startLocation?.name || "Unknown Location",
                    startLocation?.description,
                    startLocation?.type || "dungeon",
                    null,
                    true, // needsNewRoom
                    `Returning player at ${startLocation?.name || "unknown location"}`
                ).then(mapEvents => {
                    if (mapEvents.length > 0) {
                        console.log('[PlayDF] Generated room for returning player');
                        handleMapEvents(mapEvents);
                    } else {
                        console.warn('[PlayDF] No events - loading demo room');
                        canvasRef.current?.loadDemoRoom();
                    }
                    setIsGeneratingMap(false);
                }).catch(err => {
                    console.error('[PlayDF] Map AI error:', err);
                    canvasRef.current?.loadDemoRoom();
                    setIsGeneratingMap(false);
                });
            }
        }
    }, [data, messagesInitialized, gameStarted, currentLocationId]);

    // --- START GAME WITH DUAL AI ---
    const handleStartGame = async (startLocation: any) => {
        if (!data) return;
        setIsLoading(true);
        setIsGeneratingMap(true);
        setMapGenerationStep("Analyzing campaign world...");

        // Build comprehensive world context
        const locationDescriptions = data.locations?.map((loc: any) =>
            `- ${loc.name} (${loc.type}): ${loc.description || 'A mysterious place'}`
        ).join('\n') || '';

        const npcDescriptions = data.npcs?.slice(0, 5).map((npc: any) =>
            `- ${npc.name}: ${npc.role || 'Unknown'}, ${npc.attitude || 'neutral'} attitude`
        ).join('\n') || '';

        const questDescriptions = data.quests?.filter((q: any) => q.status !== 'completed').slice(0, 3).map((q: any) =>
            `- ${q.title}: ${q.description?.substring(0, 100) || 'A quest awaits'}...`
        ).join('\n') || '';

        setTimeout(() => setMapGenerationStep("Constructing dungeon layout..."), 1500);
        setTimeout(() => setMapGenerationStep("Populating with entities..."), 3000);
        setTimeout(() => setMapGenerationStep("Adding atmosphere and lighting..."), 4500);

        // DUAL AI SYSTEM: Call Map AI separately for room generation
        const mapContext = `Campaign: ${data.campaign.title}
Theme: ${data.campaign.theme || 'dark fantasy'}
Starting Location: ${startLocation?.name || 'Unknown'}
Location Type: ${startLocation?.type || 'dungeon'}
Description: ${startLocation?.description || 'A mysterious place'}
NPCs Nearby: ${npcDescriptions || 'Unknown strangers'}
Active Quests: ${questDescriptions || 'Adventures await'}`;

        // Fire off Map AI to generate the initial room with timeout fallback
        console.log('[PlayDF] Calling Map AI for initial room generation...');

        // Set a timeout to load demo room if Map AI takes too long
        const mapAITimeout = setTimeout(() => {
            console.warn('[PlayDF] Map AI timeout - loading demo room as fallback');
            canvasRef.current?.loadDemoRoom();
            setIsGeneratingMap(false);
        }, 15000); // 15 second timeout

        callMapAI(
            data.campaign._id, // Campaign ID for world-aware generation
            "Starting a new adventure. Generate a detailed starting room.",
            startLocation?.name || "Unknown Location",
            startLocation?.description,
            startLocation?.type || "dungeon",
            null, // No existing room
            true, // needsNewRoom = true
            mapContext
        ).then(mapEvents => {
            clearTimeout(mapAITimeout);
            if (mapEvents.length > 0) {
                console.log('[PlayDF] Map AI generated initial room:', mapEvents);
                handleMapEvents(mapEvents);
                setIsGeneratingMap(false);
            } else {
                console.warn('[PlayDF] Map AI returned no events - loading demo room');
                canvasRef.current?.loadDemoRoom();
                setIsGeneratingMap(false);
            }
        }).catch(err => {
            clearTimeout(mapAITimeout);
            console.error('[PlayDF] Map AI error on start:', err);
            // Fall back to demo room if Map AI fails
            canvasRef.current?.loadDemoRoom();
            setIsGeneratingMap(false);
        });

        // Meanwhile, call narrative AI for the intro text
        const startPrompt = `
You are starting a new adventure in "${data.campaign.title}".

STARTING LOCATION: ${startLocation?.name || "Unknown"}
Type: ${startLocation?.type || "dungeon"}
Description: ${startLocation?.description || "A mysterious place awaits exploration"}

CHARACTER: ${data.character?.name || "Traveler"} the ${data.character?.class || "Adventurer"} (Level ${level})

Write 2-3 atmospheric paragraphs describing:
- The visual scene (what the player sees, smells, hears)
- Initial tension or intrigue
- A hint at what adventures await

Provide 3-4 clear action choices.

NOTE: The map is being generated separately. Focus ONLY on narrative text.
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
                if (gameData.choices) aiChoices = gameData.choices;
            },
            (events) => {
                // Narrative AI might also send map events - handle them
                if (events.length > 0) {
                    handleMapEvents(events);
                    setIsGeneratingMap(false);
                }
            },
            (err) => {
                console.error("AI Error:", err);
                setMessages(prev => [...prev, {
                    role: 'model',
                    content: "The magic fizzles... Something went wrong connecting to the realm."
                }]);
                setIsLoading(false);
                setIsGeneratingMap(false);
            }
        );

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
        // Map generation overlay will hide when Map AI returns
    };

    // --- GET CURRENT ROOM STATE FOR MAP AI ---
    const getCurrentRoomState = useCallback(() => {
        const room = canvasRef.current?.getCurrentRoom();
        if (!room) return null;

        const playerPos = canvasRef.current?.getPlayerPosition() || { x: 5, y: 8 };
        return {
            width: room.width,
            height: room.height,
            playerPosition: playerPos,
            entities: room.entities.map(e => ({
                id: e.id,
                type: e.type,
                x: e.x,
                y: e.y,
                name: e.name,
                hostile: e.hostile,
            })),
            objects: room.objects.map(o => ({
                id: o.id,
                type: o.type,
                x: o.x,
                y: o.y,
                state: o.state,
            })),
        };
    }, []);

    // --- SEND MESSAGE WITH DUAL AI SYSTEM ---
    const handleSendMessage = async (manualContent?: string) => {
        const contentToSend = typeof manualContent === 'string' ? manualContent : input;
        if (!contentToSend.trim() || isLoading || !data) return;

        setCurrentChoices([]);

        const userMsg: Message = { role: 'user', content: contentToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        if (playerId) {
            saveMessage({
                campaignId,
                playerId,
                role: 'user',
                content: contentToSend,
            });
        }

        // Get current location info
        const currentLocation = data.locations?.find((l: any) => l._id === currentLocationId);
        const locationName = currentLocation?.name || "Unknown Location";
        const locationDesc = currentLocation?.description;
        const locationType = currentLocation?.type || "dungeon";

        // Check if movement is implied
        const hasMovementIntent = detectsMovementIntent(contentToSend);

        // Call dedicated Map AI in parallel if movement detected
        if (hasMovementIntent) {
            console.log('[PlayDF] Movement detected, calling Map AI...');
            const roomState = getCurrentRoomState();

            // Fire off Map AI call (don't await - let it run in parallel)
            callMapAI(
                data.campaign._id, // Campaign ID for world-aware generation
                contentToSend,
                locationName,
                locationDesc,
                locationType,
                roomState,
                false, // needsNewRoom
                undefined // narrativeContext will come from response
            ).then(mapEvents => {
                if (mapEvents.length > 0) {
                    console.log('[PlayDF] Map AI returned events:', mapEvents);
                    handleMapEvents(mapEvents);
                }
            }).catch(err => {
                console.error('[PlayDF] Map AI error:', err);
            });
        }

        // Continue with narrative AI as usual
        const promptWithMapNote = `${contentToSend}

[SYSTEM: The map AI is handling movement separately. Focus on narrative. If the narrative describes major room changes (entering new area), include a <mapEvents> block with generateRoom. For combat, include combat visualization events.]`;

        const payload = {
            prompt: promptWithMapNote,
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
                if (gameData.choices) aiChoices = gameData.choices;
            },
            handleMapEvents,
            (err) => {
                console.error("AI Error:", err);
                setMessages(prev => [...prev, {
                    role: 'model',
                    content: "The realm grows silent... Try again."
                }]);
                setIsLoading(false);
            }
        );

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

    // --- KEY HANDLER ---
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // --- HOVER HANDLER ---
    const handleHover = useCallback((info: HoverInfo | null) => {
        setHoverInfo(info);
    }, []);

    // --- TILE/ENTITY/OBJECT CLICK HANDLERS ---
    // Tile click: just close menu, movement is handled by engine's pathfinding
    const handleTileClick = useCallback((_x: number, _y: number) => {
        setContextMenu(null); // Close any open context menu
    }, []);

    // Entity click: show action context menu
    const handleEntityClick = useCallback((entityId: string, entity: RoomEntity) => {
        const pos = canvasRef.current?.getPlayerPosition() || { x: 0, y: 0 };
        const screenX = (entity.x - pos.x + 10) * 32 + 100; // Approximate screen position
        const screenY = (entity.y - pos.y + 8) * 32 + 50;

        setContextMenu({
            show: true,
            x: Math.min(screenX, 400),
            y: Math.min(screenY, 400),
            type: 'entity',
            id: entityId,
            name: entity.name,
            hostile: entity.hostile,
        });
    }, []);

    // Object click: show action context menu or handle exit directly
    const handleObjectClick = useCallback((objectId: string, object: RoomObject) => {
        // Check if this is an exit object
        if (object.exit?.toLocation) {
            // Direct transition - no menu needed
            handleLocationTransition(object.exit.toLocation);
            return;
        }

        const pos = canvasRef.current?.getPlayerPosition() || { x: 0, y: 0 };
        const screenX = (object.x - pos.x + 10) * 32 + 100;
        const screenY = (object.y - pos.y + 8) * 32 + 50;

        // Check if object ID suggests an exit
        const exitPatterns = /^(sign|exit|door|gate|path)_?(to_?)?(.+)$/i;
        const match = objectId.match(exitPatterns);
        const isExit = !!(match && match[3]);
        const exitLocation = isExit ? match[3].replace(/_/g, ' ') : undefined;

        setContextMenu({
            show: true,
            x: Math.min(screenX, 400),
            y: Math.min(screenY, 400),
            type: 'object',
            id: objectId,
            name: object.label || objectId.replace(/_/g, ' '),
            isExit,
            exitLocation,
        });
    }, [handleLocationTransition]);

    // Handle context menu actions - ONLY THESE CALL THE AI
    const handleContextMenuAction = useCallback((action: string) => {
        if (!contextMenu) return;

        const { type, id, name, hostile, exitLocation } = contextMenu;
        setContextMenu(null);

        switch (action) {
            case 'talk':
                handleSendMessage(`I talk to ${name}`);
                break;
            case 'attack':
                handleSendMessage(`I attack ${name}`);
                break;
            case 'examine':
                handleSendMessage(`I examine ${name}`);
                break;
            case 'use':
                handleSendMessage(`I use ${name}`);
                break;
            case 'open':
                handleSendMessage(`I open ${name}`);
                break;
            case 'exit':
                if (exitLocation) {
                    handleLocationTransition(exitLocation);
                }
                break;
        }
    }, [contextMenu, handleLocationTransition]);

    // --- LOADING STATE ---
    // Loading states
    if (isAuthLoading || !data) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950 text-amber-400">
                <div className="text-center">
                    <Loader2 className="animate-spin w-10 h-10 mx-auto mb-4" />
                    <p className="text-sm text-slate-400">
                        {isAuthLoading ? 'Authenticating...' : 'Loading campaign...'}
                    </p>
                </div>
            </div>
        );
    }

    // Not authenticated - redirect or show message
    if (!isAuthenticated) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950 text-amber-400">
                <div className="text-center">
                    <p className="text-lg mb-4">Please sign in to play</p>
                    <Link href="/signin" className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg">
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">

            {/* === GAME UI OVERLAYS === */}
            <AnimatePresence>
                {screenEffect && (
                    <ScreenEffect
                        type={screenEffect}
                        onComplete={() => setScreenEffect(null)}
                    />
                )}

                {skillCheckData && (
                    <DiceRollOverlay
                        data={skillCheckData}
                        onComplete={() => setSkillCheckData(null)}
                    />
                )}

                {showLevelUp && (
                    <LevelUpOverlay
                        newLevel={level}
                        onComplete={() => setShowLevelUp(false)}
                    />
                )}

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

                {/* Map Generation Loading Overlay */}
                {isGeneratingMap && (
                    <motion.div
                        key="map-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm"
                    >
                        <div className="text-center">
                            {/* Animated dungeon icon */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    rotateY: [0, 180, 360],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="mb-8"
                            >
                                <div className="relative">
                                    <Map size={80} className="text-purple-500" />
                                    <motion.div
                                        className="absolute inset-0"
                                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <Map size={80} className="text-cyan-400 blur-sm" />
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                className="text-2xl font-serif font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400"
                                animate={{
                                    backgroundPosition: ['0%', '100%', '0%'],
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                                style={{ backgroundSize: '200%' }}
                            >
                                Generating Dungeon
                            </motion.h2>

                            {/* Progress step */}
                            <motion.p
                                key={mapGenerationStep}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-slate-400 mb-6"
                            >
                                {mapGenerationStep}
                            </motion.p>

                            {/* Animated progress bar */}
                            <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mx-auto">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500"
                                    animate={{
                                        x: ['-100%', '100%'],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    style={{ width: '50%' }}
                                />
                            </div>

                            {/* Flavor text */}
                            <motion.p
                                className="text-xs text-slate-500 mt-6 max-w-xs mx-auto"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                The ancient stones shift and reform, revealing paths long forgotten...
                            </motion.p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === MAIN LAYOUT === */}
            <div className="flex-1 flex">

                {/* LEFT: GAME CANVAS */}
                <div className={cn(
                    "relative transition-all duration-300 bg-slate-900 border-r border-purple-500/20",
                    isMapExpanded ? "w-2/3" : "w-1/2"
                )}>
                    {/* Header */}
                    <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-slate-950 via-slate-950/90 to-transparent">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Link href="/realms" className="p-2 hover:bg-purple-500/10 rounded-lg transition-all border border-transparent hover:border-purple-500/30">
                                    <ArrowLeft size={18} className="text-slate-400" />
                                </Link>
                                <div>
                                    <h1 className="font-serif font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">
                                        {data.campaign.title}
                                    </h1>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <MapPin size={10} className="text-cyan-400" />
                                        {data.locations?.find(l => l._id === currentLocationId)?.name || "Unknown"}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMapExpanded(!isMapExpanded)}
                                className="p-2 hover:bg-purple-500/10 rounded-lg text-slate-400 hover:text-purple-400 border border-transparent hover:border-purple-500/30 transition-all"
                            >
                                {isMapExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Canvas */}
                    <AIGameCanvas
                        ref={canvasRef}
                        width={isMapExpanded ? 800 : 600}
                        height={600}
                        tileSize={32}
                        className="w-full h-full"
                        onTileClick={handleTileClick}
                        onEntityClick={handleEntityClick}
                        onObjectClick={handleObjectClick}
                        onHover={handleHover}
                        onReady={() => {
                            console.log('[PlayDF] Canvas ready - waiting for Map AI to generate room');
                            // DON'T load demo room automatically - let Map AI generate the real one
                            // Demo room is only loaded as fallback if Map AI fails
                        }}
                    />

                    {/* Hover Tooltip */}
                    {hoverInfo && (
                        <div
                            className="absolute pointer-events-none z-50 px-3 py-2 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl"
                            style={{
                                left: Math.min(hoverInfo.screenX + 15, 450),
                                top: Math.min(hoverInfo.screenY - 10, 550),
                            }}
                        >
                            <div className="flex items-center gap-2">
                                {hoverInfo.type === 'entity' && hoverInfo.hostile && (
                                    <Sword size={14} className="text-red-400" />
                                )}
                                <span className={cn(
                                    "font-medium",
                                    hoverInfo.type === 'entity' && hoverInfo.hostile ? 'text-red-400' : 'text-amber-400'
                                )}>
                                    {hoverInfo.name}
                                </span>
                            </div>
                            {hoverInfo.hp !== undefined && hoverInfo.maxHp !== undefined && (
                                <div className="mt-1 flex items-center gap-2">
                                    <Heart size={12} className="text-red-400" />
                                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500"
                                            style={{ width: `${(hoverInfo.hp / hoverInfo.maxHp) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400">{hoverInfo.hp}/{hoverInfo.maxHp}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Context Menu */}
                    {contextMenu?.show && (
                        <div
                            className="absolute z-50 min-w-[140px] bg-slate-900/98 border border-slate-700 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm"
                            style={{ left: contextMenu.x, top: contextMenu.y }}
                        >
                            <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50">
                                <span className="font-medium text-amber-400 text-sm">{contextMenu.name}</span>
                            </div>
                            <div className="py-1">
                                {contextMenu.type === 'entity' && (
                                    <>
                                        {!contextMenu.hostile && (
                                            <button
                                                onClick={() => handleContextMenuAction('talk')}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-purple-500/20 text-slate-200 flex items-center gap-2 transition-colors"
                                            >
                                                <MessageSquare size={14} className="text-cyan-400" />
                                                Talk
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleContextMenuAction('attack')}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/20 text-slate-200 flex items-center gap-2 transition-colors"
                                        >
                                            <Sword size={14} className="text-red-400" />
                                            Attack
                                        </button>
                                        <button
                                            onClick={() => handleContextMenuAction('examine')}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-purple-500/20 text-slate-200 flex items-center gap-2 transition-colors"
                                        >
                                            <Eye size={14} className="text-purple-400" />
                                            Examine
                                        </button>
                                    </>
                                )}
                                {contextMenu.type === 'object' && (
                                    <>
                                        {contextMenu.isExit ? (
                                            <button
                                                onClick={() => handleContextMenuAction('exit')}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-green-500/20 text-slate-200 flex items-center gap-2 transition-colors"
                                            >
                                                <ArrowRight size={14} className="text-green-400" />
                                                Go to {contextMenu.exitLocation}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleContextMenuAction('use')}
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-purple-500/20 text-slate-200 flex items-center gap-2 transition-colors"
                                                >
                                                    <Hand size={14} className="text-amber-400" />
                                                    Use
                                                </button>
                                                <button
                                                    onClick={() => handleContextMenuAction('examine')}
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-purple-500/20 text-slate-200 flex items-center gap-2 transition-colors"
                                                >
                                                    <Eye size={14} className="text-purple-400" />
                                                    Examine
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="px-3 py-1 border-t border-slate-700">
                                <button
                                    onClick={() => setContextMenu(null)}
                                    className="w-full py-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stats Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
                        <div className="flex items-center gap-6">
                            {/* HP */}
                            <div className="flex items-center gap-2">
                                <Heart size={16} className="text-red-400" />
                                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                        animate={{ width: `${(hp / maxHp) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-400 font-mono">{hp}/{maxHp}</span>
                            </div>

                            {/* XP */}
                            <div className="flex items-center gap-2">
                                <Trophy size={16} className="text-amber-400" />
                                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                                        animate={{ width: `${(xp / xpToLevel) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-400 font-mono">Lv.{level}</span>
                            </div>

                            {/* Gold */}
                            <div className="flex items-center gap-2">
                                <Coins size={16} className="text-amber-400" />
                                <span className="text-xs text-amber-400 font-mono">{gold}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: NARRATIVE CHAT */}
                <div className={cn(
                    "flex flex-col transition-all duration-300",
                    isMapExpanded ? "w-1/3" : "w-1/2"
                )}>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-purple-500/20 bg-slate-900/50">
                        <div className="flex items-center justify-between">
                            <h2 className="font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-200">
                                Narrative
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium capitalize",
                                    gameContext === 'combat' ? 'bg-red-500/20 text-red-400' :
                                    gameContext === 'social' ? 'bg-blue-500/20 text-blue-400' :
                                    gameContext === 'rest' ? 'bg-green-500/20 text-green-400' :
                                    'bg-purple-500/20 text-purple-400'
                                )}>
                                    {gameContext}
                                </span>
                                <button onClick={() => setCharacterSheetOpen(true)} className="p-2 hover:bg-amber-500/10 rounded-lg text-slate-400 hover:text-amber-400 transition-all">
                                    <UserCircle size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "max-w-full",
                                    msg.role === 'user' ? "flex justify-end" : "flex justify-start"
                                )}
                            >
                                <div className={cn(
                                    "rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[90%]",
                                    msg.role === 'user'
                                        ? "bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-900"
                                        : "bg-slate-800/80 border border-purple-500/20 text-slate-200"
                                )}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2 px-4 py-3">
                                <motion.div className="w-2 h-2 rounded-full bg-purple-500" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />
                                <motion.div className="w-2 h-2 rounded-full bg-purple-500" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }} />
                                <motion.div className="w-2 h-2 rounded-full bg-purple-500" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-purple-500/20 bg-slate-900/50">
                        {/* Choices */}
                        {currentChoices.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {currentChoices.map((choice, i) => (
                                    <motion.button
                                        key={`choice-${i}`}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => handleSendMessage(choice)}
                                        disabled={isLoading}
                                        className="px-3 py-1.5 bg-slate-800 border border-cyan-500/30 rounded-full text-xs text-cyan-300 hover:border-cyan-400/60 hover:text-cyan-200 transition-all"
                                    >
                                        {choice}
                                    </motion.button>
                                ))}
                            </div>
                        )}

                        {/* Text Input */}
                        <div className="relative flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="What do you do?"
                                className="flex-1 bg-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-purple-500/20"
                                disabled={isLoading}
                            />
                            <motion.button
                                onClick={() => handleSendMessage()}
                                disabled={isLoading || !input.trim()}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                            </motion.button>
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
        </div>
    );
}
