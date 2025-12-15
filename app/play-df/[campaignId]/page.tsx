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
import { CharacterCreationModal } from '../../../components/CharacterCreationModal';
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
    // New Player State UI
    PlayerHUD,
    PlayerState,
    CharacterInfo,
    InventoryItem,
    PlayerStats,
    // Dialogue System
    DialogueManager,
    NotificationQueue,
    DialogueLine,
    DialogueChoice,
    DialogueState,
    NotificationType,
    // Full Combat System
    FullCombatOverlay,
    FullCombatState,
    CombatRoll,
    CombatLogEntry,
    CombatAbility,
    // Persuasion System
    PersuasionPanel,
    PersuasionState,
    PersuasionApproach,
    // Tactical Battle System
    TacticalBattleOverlay,
    TacticalBattleState,
    TacticalBattleEntity,
} from '../../../components/GameUI';
import { AIGameCanvas, AIGameCanvasHandle, parseAIGameEvents, createEventProcessor } from '../../../game/ai-canvas/AIGameCanvas';
import { HoverInfo } from '../../../game/ai-canvas/AIGameEngine';
import { AIGameEvent, RoomEntity, RoomObject } from '../../../game/ai-canvas/types';
import {
    initializeCombat as initCombatEngine,
    processPlayerAttack,
    processPlayerDefend,
    processPlayerFlee,
    processEnemyTurn,
    getStatModifier,
    CombatState as EngineCombatState,
    DiceType,
    // Tactical combat
    initializeTacticalCombat,
    processTacticalAttack,
    processTacticalAbility,
    processTacticalDefend,
    processTacticalMove,
    advanceTacticalTurn,
    getCurrentCombatant,
    determineTacticalAIAction,
    getValidTargets,
    TacticalCombatState,
    TacticalCombatant,
} from '../../../game/combat/CombatEngine';

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

type MapAIResponse = {
    events?: AIGameEvent[];
    error?: string;
    raw?: string;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Cache + in-flight dedupe so we don't spam the provider (which causes 429s).
// IMPORTANT: This file imports `Map` from `lucide-react`, so use `globalThis.Map` to avoid shadowing.
const mapAIRoomCache = new globalThis.Map<string, { ts: number; events: AIGameEvent[] }>();
const mapAIInFlight = new globalThis.Map<string, Promise<AIGameEvent[]>>();
let mapAISequential: Promise<AIGameEvent[]> = Promise.resolve([]);
let mapAICooldownUntil = 0;

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
    if (Date.now() < mapAICooldownUntil) {
        // Gemini quota exhausted / rate-limited: don't hammer the endpoint.
        return [];
    }
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    if (!convexUrl) {
        console.error("[MapAI] NEXT_PUBLIC_CONVEX_URL not set");
        return [];
    }
    const httpUrl = convexUrl.includes("convex.cloud")
        ? convexUrl.replace("convex.cloud", "convex.site")
        : convexUrl;

    const roomCacheKey = needsNewRoom
        ? [
            'room',
            campaignId,
            (currentLocationName || '').toLowerCase(),
            (locationType || '').toLowerCase(),
            (currentLocationDescription || '').slice(0, 80),
        ].join('|')
        : null;

    // Short TTL cache for room generation to avoid repeated startup/return calls.
    if (roomCacheKey) {
        const cached = mapAIRoomCache.get(roomCacheKey);
        if (cached && Date.now() - cached.ts < 60_000) {
            return cached.events;
        }
    }

    const requestKey = [
        campaignId,
        needsNewRoom ? 'new' : 'update',
        (currentLocationName || '').toLowerCase(),
        (locationType || '').toLowerCase(),
        (playerAction || '').slice(0, 120),
    ].join('|');

    const existing = mapAIInFlight.get(requestKey);
    if (existing) return existing;

    const run = async (): Promise<AIGameEvent[]> => {
        const MAX_RETRIES = 3;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log('[MapAI] Calling map AI with:', {
                    campaignId,
                    currentLocationName,
                    locationType,
                    needsNewRoom,
                    hasRoomState: !!currentRoomState,
                    attempt: attempt + 1,
                });

                const response = await fetch(`${httpUrl}/api/map-events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        campaignId,
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
                    const status = response.status;
                    const retryAfterHeader = response.headers.get('retry-after');
                    const retryAfterMs = retryAfterHeader ? Math.max(0, parseInt(retryAfterHeader, 10) * 1000) : 0;
                    const errorText = await response.text();

                    // Retry on rate limit / transient errors.
                    if ((status === 429 || status === 408 || status >= 500) && attempt < MAX_RETRIES) {
                        const backoffMs = retryAfterMs || Math.min(8000, 500 * 2 ** attempt);
                        if (status === 429) {
                            mapAICooldownUntil = Date.now() + backoffMs;
                        }
                        console.warn('[MapAI] Rate limited/transient error, retrying...', { status, backoffMs });
                        await sleep(backoffMs);
                        continue;
                    }

                    if (status === 429) {
                        // Quota exhausted (often "limit: 0") — treat as expected and avoid noisy errors.
                        const backoffMs = retryAfterMs || 40_000;
                        mapAICooldownUntil = Date.now() + backoffMs;
                        console.warn('[MapAI] Quota/rate limited. Pausing MapAI requests.', { status, backoffMs });
                        return [];
                    }
                    console.error('[MapAI] HTTP Error:', status, errorText);
                    return [];
                }

                const data = (await response.json()) as MapAIResponse;
                if (data.error) {
                    // If backend returns an error payload, treat it as retryable for common rate-limit phrasing.
                    const isRetryable = /rate|quota|429/i.test(data.error);
                    if (isRetryable && attempt < MAX_RETRIES) {
                        const backoffMs = Math.min(8000, 500 * 2 ** attempt);
                        console.warn('[MapAI] Backend error, retrying...', { error: data.error, backoffMs });
                        await sleep(backoffMs);
                        continue;
                    }
                    console.error('[MapAI] API returned error:', data.error);
                    if (data.raw) console.error('[MapAI] Raw AI output:', data.raw);
                    return [];
                }

                if (!data.events || !Array.isArray(data.events)) {
                    console.warn('[MapAI] No events array in response:', data);
                    return [];
                }

                if (roomCacheKey) {
                    mapAIRoomCache.set(roomCacheKey, { ts: Date.now(), events: data.events });
                }
                return data.events;
            } catch (e) {
                if (attempt < MAX_RETRIES) {
                    const backoffMs = Math.min(8000, 500 * 2 ** attempt);
                    console.warn('[MapAI] Exception, retrying...', { backoffMs, error: e });
                    await sleep(backoffMs);
                    continue;
                }
                console.error('[MapAI] Exception:', e);
                return [];
            }
        }
        return [];
    };

    // Avoid concurrent "new room" generations, since they’re the most expensive and most likely to hit 429.
    const promise = needsNewRoom ? (mapAISequential = mapAISequential.then(run, run)) : run();
    mapAIInFlight.set(requestKey, promise);
    try {
        return await promise;
    } finally {
        mapAIInFlight.delete(requestKey);
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

// Helper to detect attack intent and extract target
const detectsAttackIntent = (message: string): { isAttack: boolean; targetName?: string } => {
    const attackPatterns = [
        /\bI attack (?:the )?(.+)/i,
        /\bI strike (?:at )?(?:the )?(.+)/i,
        /\bI hit (?:the )?(.+)/i,
        /\bI swing (?:at )?(?:the )?(.+)/i,
        /\bI fight (?:the )?(.+)/i,
        /\battack (?:the )?(.+)/i,
    ];
    for (const pattern of attackPatterns) {
        const match = message.match(pattern);
        if (match) {
            return { isAttack: true, targetName: match[1]?.trim() };
        }
    }
    return { isAttack: false };
};

// --- STREAMING HELPER WITH MAP EVENTS ---

const streamNarrative = async (
    payload: any,
    onContent: (delta: string) => void,
    onData: (data: any) => void,
    onMapEvents: (events: AIGameEvent[]) => void,
    onDialogue: (dialogue: { lines: Array<{ speaker?: string; text: string; emotion?: string }>; activeNpc?: string }) => void,
    onError: (err: any) => void,
    onSlowStream?: () => void,
    controllerRef?: { current: AbortController | null }
) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    if (!convexUrl) {
        onError(new Error("NEXT_PUBLIC_CONVEX_URL not set"));
        return;
    }
    const httpUrl = convexUrl.includes("convex.cloud")
        ? convexUrl.replace("convex.cloud", "convex.site")
        : convexUrl;

    let slowStreamTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setInterval> | null = null;
    let hardStallTimer: ReturnType<typeof setTimeout> | null = null;
    let errored = false;

    try {
        const controller = new AbortController();
        if (controllerRef) {
            controllerRef.current = controller;
        }
        let finished = false;
        let sawAnyDelta = false;
        let lastDeltaAt = Date.now();
        let lastNetworkActivityAt = Date.now();
        let emittedAnything = false;

        // Progress signal: after 8-12s without first token, signal "still thinking" (don't abort)
        const SLOW_STREAM_SIGNAL_MS = 10_000;
        // Hard abort: only for true stalls (no network bytes for 60-90s) or user cancellation
        const HARD_STALL_TIMEOUT_MS = 75_000;
        // Idle timeout: if we got tokens but then nothing for 20s, consider it stalled
        const IDLE_TIMEOUT_MS = 20_000;

        const fail = (err: Error) => {
            if (errored) return;
            errored = true;
            finished = true;
            if (slowStreamTimer) clearTimeout(slowStreamTimer);
            if (idleTimer) clearInterval(idleTimer);
            if (hardStallTimer) clearTimeout(hardStallTimer);
            try { controller.abort(); } catch { /* ignore */ }
            if (controllerRef) {
                controllerRef.current = null;
            }
            onError(err);
        };

        // Signal slow stream (don't abort, just notify UI)
        slowStreamTimer = setTimeout(() => {
            if (finished || sawAnyDelta) return;
            if (onSlowStream) {
                onSlowStream();
            }
        }, SLOW_STREAM_SIGNAL_MS);

        // Hard stall detection: no network activity for a very long time
        hardStallTimer = setTimeout(() => {
            if (finished) return;
            const timeSinceActivity = Date.now() - lastNetworkActivityAt;
            if (timeSinceActivity > HARD_STALL_TIMEOUT_MS) {
                fail(new Error("AI connection stalled. Please try again."));
            }
        }, HARD_STALL_TIMEOUT_MS);

        // Idle timeout: got tokens but then nothing for a while
        idleTimer = setInterval(() => {
            if (finished) return;
            if (sawAnyDelta && Date.now() - lastDeltaAt > IDLE_TIMEOUT_MS) {
                fail(new Error("AI stream stalled. Please try again."));
            }
        }, 1000);

        const response = await fetch(`${httpUrl}/api/stream-narrative`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        lastNetworkActivityAt = Date.now();

        if (!response.ok) {
            const status = response.status;
            const retryAfterHeader = response.headers.get('retry-after');
            const retryAfterMs = retryAfterHeader ? Math.max(0, parseInt(retryAfterHeader, 10) * 1000) : 0;
            const text = await response.text();

            // OpenRouter quota errors can come through as 429. Don’t spam the console or keep retrying.
            if (status === 429) {
                const backoffMs = retryAfterMs || 40_000;
                mapAICooldownUntil = Date.now() + backoffMs;
                onError(new Error("AI quota exceeded. The game will run in limited (non-AI) mode for a bit."));
                return;
            }

            throw new Error(text);
        }
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let internalTextBuffer = "";
        let rawText = "";
        const RAW_TEXT_CAP = 80_000;

        const parseJsonLoose = (raw: string) => {
            const cleaned = raw
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .replace(/:\s*True\b/g, ': true')
                .replace(/:\s*False\b/g, ': false')
                .replace(/:\s*None\b/g, ': null')
                .replace(/,\s*([}\]])/g, '$1')
                .trim();

            const tryParse = (text: string) => {
                try {
                    return JSON.parse(text);
                } catch {
                    return null;
                }
            };

            const direct = tryParse(cleaned);
            if (direct !== null) return direct;

            const objStart = cleaned.indexOf('{');
            const objEnd = cleaned.lastIndexOf('}');
            if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
                const sliced = tryParse(cleaned.slice(objStart, objEnd + 1));
                if (sliced !== null) return sliced;
            }

            const arrStart = cleaned.indexOf('[');
            const arrEnd = cleaned.lastIndexOf(']');
            if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
                const sliced = tryParse(cleaned.slice(arrStart, arrEnd + 1));
                if (sliced !== null) return sliced;
            }

            return null;
        };

        let inNarrative = false;
        let inData = false;
        let inMapEvents = false;
        let inDialogue = false;
        let dataString = "";
        let mapEventsString = "";
        let dialogueString = "";
        let emittedNarrative = false;
        let emittedData = false;
        let emittedMapEvents = false;
        let emittedDialogue = false;
        let emittedContent = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Track network activity for hard stall detection
            if (value && value.length > 0) {
                lastNetworkActivityAt = Date.now();
            }

            buffer += decoder.decode(value, { stream: true });

            // OpenRouter streams as Server-Sent Events (SSE):
            //   data: { "choices":[{"delta":{"content":"..."}}] }
            //   data: [DONE]
            //
            // We read SSE lines and append delta content into `internalTextBuffer`,
            // then reuse the existing <narrative>/<dialogue>/<data>/<mapEvents> tag parser.
            while (true) {
                const lineEnd = buffer.indexOf('\n');
                if (lineEnd === -1) break;

                const line = buffer.slice(0, lineEnd);
                buffer = buffer.slice(lineEnd + 1);

                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith('data:')) {
                    const data = trimmed.slice(5).trim();
                    if (data === '[DONE]') {
                        // Stream complete.
                        buffer = "";
                        break;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed?.error) {
                            const msg = parsed?.error?.message || parsed?.error?.toString?.() || "AI stream error";
                            fail(new Error(String(msg)));
                            break;
                        }
                        const delta = parsed?.choices?.[0]?.delta?.content;
                        if (typeof delta === 'string' && delta.length > 0) {
                            sawAnyDelta = true;
                            lastDeltaAt = Date.now();
                            internalTextBuffer += delta;
                            rawText += delta;
                            if (rawText.length > RAW_TEXT_CAP) {
                                rawText = rawText.slice(-RAW_TEXT_CAP);
                            }
                        }
                    } catch (parseErr) {
                        // Ignore non-JSON data lines.
                        void parseErr;
                    }
                }
            }

            while (internalTextBuffer.length > 0) {
                if (!inNarrative && !inData && !inMapEvents && !inDialogue) {
                    const navStart = internalTextBuffer.indexOf("<narrative>");
                    const dataStart = internalTextBuffer.indexOf("<data>");
                    const mapStart = internalTextBuffer.indexOf("<mapEvents>");
                    const dialogueStart = internalTextBuffer.indexOf("<dialogue>");

                    // Find the earliest tag
                    const positions = [
                        { pos: navStart, type: 'narrative' },
                        { pos: dataStart, type: 'data' },
                        { pos: mapStart, type: 'map' },
                        { pos: dialogueStart, type: 'dialogue' }
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
                        } else if (first.type === 'dialogue') {
                            inDialogue = true;
                            internalTextBuffer = internalTextBuffer.substring(dialogueStart + 10);
                        }
                    } else {
                        break;
                    }
                } else if (inNarrative) {
                    const navEnd = internalTextBuffer.indexOf("</narrative>");
                    if (navEnd !== -1) {
                        const content = internalTextBuffer.substring(0, navEnd);
                        if (content) {
                            emittedAnything = true;
                            emittedNarrative = true;
                            emittedContent = true;
                            onContent(content);
                        }
                        inNarrative = false;
                        internalTextBuffer = internalTextBuffer.substring(navEnd + 12);
                    } else {
                        // Stream narrative progressively, but keep a small tail so tags
                        // like </narrative> aren't lost if they arrive split across chunks.
                        const KEEP_TAIL = 32;
                        if (internalTextBuffer.length > KEEP_TAIL) {
                            const emit = internalTextBuffer.slice(0, internalTextBuffer.length - KEEP_TAIL);
                            if (emit) {
                                emittedAnything = true;
                                emittedNarrative = true;
                                emittedContent = true;
                                onContent(emit);
                            }
                            internalTextBuffer = internalTextBuffer.slice(-KEEP_TAIL);
                        } else {
                            break;
                        }
                    }
                } else if (inData) {
                    const dataEnd = internalTextBuffer.indexOf("</data>");
                    if (dataEnd !== -1) {
                        dataString += internalTextBuffer.substring(0, dataEnd);
                        try {
                            const json = parseJsonLoose(dataString);
                            if (json === null) throw new Error("Failed to parse <data> JSON");
                            emittedAnything = true;
                            emittedData = true;
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
                            emittedAnything = true;
                            emittedMapEvents = true;
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
                } else if (inDialogue) {
                    const dialogueEnd = internalTextBuffer.indexOf("</dialogue>");
                    if (dialogueEnd !== -1) {
                        dialogueString += internalTextBuffer.substring(0, dialogueEnd);
                        try {
                            const dialogueData = parseJsonLoose(dialogueString);
                            if (dialogueData === null) throw new Error("Failed to parse <dialogue> JSON");
                            emittedAnything = true;
                            emittedDialogue = true;
                            onDialogue(dialogueData);
                        } catch (e) {
                            console.error("Dialogue Parse Error:", e, "Raw:", dialogueString);
                        }
                        inDialogue = false;
                        dialogueString = "";
                        internalTextBuffer = internalTextBuffer.substring(dialogueEnd + 11);
                    } else {
                        dialogueString += internalTextBuffer;
                        internalTextBuffer = "";
                        break;
                    }
                }
            }
        }

        // If the stream ended without any content deltas, treat it as an error so callers can retry.
        finished = true;
        if (slowStreamTimer) clearTimeout(slowStreamTimer);
        if (idleTimer) clearInterval(idleTimer);
        if (hardStallTimer) clearTimeout(hardStallTimer);
        if (controllerRef) {
            controllerRef.current = null;
        }

        // End-of-stream flush: if we were mid-narrative and never saw </narrative>,
        // emit what's left so the player still sees text.
        if (inNarrative) {
            const leftoverNarrative = internalTextBuffer.trim();
            if (leftoverNarrative.length > 0) {
                emittedAnything = true;
                emittedNarrative = true;
                emittedContent = true;
                onContent(leftoverNarrative);
            }
        }

        // Post-pass fallback: if the stream included <data> but the UI never got any narrative,
        // attempt to extract it from the raw stream text, and if still missing, show a minimal
        // message so the player isn't stuck staring at nothing.
        if (!emittedContent && rawText.length > 0) {
            const start = rawText.indexOf("<narrative>");
            const end = rawText.indexOf("</narrative>");
            if (start !== -1 && end !== -1 && end > start) {
                const content = rawText.slice(start + 11, end);
                if (content.trim().length > 0) {
                    emittedAnything = true;
                    emittedNarrative = true;
                    emittedContent = true;
                    onContent(content);
                }
            }
        }

        // If we still didn't emit *any* content, surface something visible no matter what.
        // (This prevents "AI responded but nothing appears".)
        if (!emittedContent && !errored) {
            if (emittedData) {
                emittedAnything = true;
                emittedContent = true;
                onContent("Choose an action below.");
            } else {
                const rawVisible = rawText
                    .replace(/<\/?(narrative|data|dialogue|mapEvents)>/g, "")
                    .trim();
                if (rawVisible.length > 0) {
                    emittedAnything = true;
                    emittedContent = true;
                    onContent(rawVisible);
                }
            }
        }

        // Fallback: if we received deltas but never saw expected tags, flush raw text so the user sees something.
        if (!emittedAnything) {
            const leftover = internalTextBuffer.trim();
            if (leftover.length > 0) {
                emittedAnything = true;
                emittedContent = true;
                onContent(leftover);
            }
        }

        if (!errored && (!sawAnyDelta || !emittedAnything)) {
            fail(new Error("AI returned an empty response. Please try again."));
        }
    } catch (e) {
        // Ensure timers are cleared on any thrown error.
        if (slowStreamTimer) clearTimeout(slowStreamTimer);
        if (idleTimer) clearInterval(idleTimer);
        if (hardStallTimer) clearTimeout(hardStallTimer);
        if (controllerRef) {
            controllerRef.current = null;
        }
        if (!errored) onError(e);
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

    // --- AI GAME CANVAS REF ---
    const canvasRef = useRef<AIGameCanvasHandle>(null);

    // --- PLAYER ID for queries ---
    const playerIdForAbilities = data?.character?.userId || "";

    // --- CHARACTER CREATION STATE ---
    // Show modal if user is authenticated but has no character for this campaign
    const needsCharacterCreation = isAuthenticated && !isAuthLoading && data && !data.character;
    const [characterCreated, setCharacterCreated] = useState(false);

    // Build character creation config from campaign data
    const characterCreationConfig = useMemo(() => {
        if (!data?.campaign) return null;
        const campaign = data.campaign;

        // Parse JSON fields safely
        const parseJsonField = <T,>(field: string | undefined, fallback: T): T => {
            if (!field) return fallback;
            try {
                return JSON.parse(field) as T;
            } catch {
                return fallback;
            }
        };

        return {
            availableClasses: parseJsonField(campaign.availableClasses, [
                { name: "Warrior", description: "A skilled fighter trained in combat" },
                { name: "Mage", description: "A wielder of arcane magic" },
                { name: "Rogue", description: "A stealthy and cunning adventurer" },
            ]),
            availableRaces: parseJsonField(campaign.availableRaces, [
                { name: "Human", description: "Versatile and adaptable" },
                { name: "Elf", description: "Graceful and long-lived" },
                { name: "Dwarf", description: "Hardy and resilient" },
            ]),
            statAllocationMethod: campaign.statAllocationMethod || "standard_array",
            startingStatPoints: 27,
            allowCustomNames: true,
            terminology: parseJsonField(campaign.terminology, {}),
            statConfig: parseJsonField(campaign.statConfig, null),
            theme: campaign.theme,
        };
    }, [data?.campaign]);

    // World system mutations
    const killNPC = useMutation(api.forge.killNPC);
    const updateQuestProgress = useMutation(api.forge.updateQuestProgress);
    const completeQuest = useMutation(api.forge.completeQuest);
    const saveMessage = useMutation(api.messages.saveMessage);

    // Player game state
    const playerGameState = useQuery(api.world.getPlayerGameState, { campaignId });
    const updatePlayerGameState = useMutation(api.world.updatePlayerGameState);
    const handlePlayerDeathMutation = useMutation(api.world.handlePlayerDeath);

    const playerId = data?.character?.userId || "";

    // Player inventory
    const playerInventory = useQuery(
        api.inventory.getPlayerInventory,
        playerId ? { campaignId, playerId } : "skip"
    );

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
    // AI availability banner (quota/rate limit)
    const [aiOfflineUntil, setAiOfflineUntil] = useState<number>(0);
    // Slow stream feedback
    const [isSlowStream, setIsSlowStream] = useState(false);
    const streamAbortControllerRef = useRef<AbortController | null>(null);
    // Stores the current request's <narrative> content so we can surface it in the dialogue UI.
    const lastNarrativeRef = useRef<string>("");
    const [isCharacterSheetOpen, setCharacterSheetOpen] = useState(false);
    const [selectedQuest, setSelectedQuest] = useState<any>(null);
    const [showPlayerHUD, setShowPlayerHUD] = useState(false);
    const aiOffline = Date.now() < aiOfflineUntil;
    const aiOfflineSeconds = aiOffline ? Math.max(1, Math.ceil((aiOfflineUntil - Date.now()) / 1000)) : 0;

    // --- DIALOGUE SYSTEM STATE ---
    const [dialogueState, setDialogueState] = useState<DialogueState | null>(null);
    const [activeNpc, setActiveNpc] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Array<{ id: string; type: NotificationType; title: string; message?: string }>>([]);

    // --- ADD NOTIFICATION (must be defined early, used by processAITurnIfNeeded) ---
    const addNotification = useCallback((type: NotificationType, title: string, message?: string) => {
        const id = generateId();
        setNotifications(prev => [...prev, { id, type, title, message }]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

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
    const [energy, setEnergy] = useState(100);
    const [maxEnergy, setMaxEnergy] = useState(100);
    const [xp, setXp] = useState(0);
    const [xpToLevel, setXpToLevel] = useState(100);
    const [level, setLevel] = useState(1);
    const [gameContext, setGameContext] = useState<GameContext>('explore');
    const [gold, setGold] = useState(0);
    const [showDeathOverlay, setShowDeathOverlay] = useState(false);
    const [deathXpLost, setDeathXpLost] = useState(0);

    // --- LOAD GAME STATE FROM DATABASE ---
    useEffect(() => {
        if (playerGameState && !gameStateInitialized) {
            setHp(playerGameState.hp);
            setMaxHp(playerGameState.maxHp);
            setEnergy(playerGameState.energy ?? 100);
            setMaxEnergy(playerGameState.maxEnergy ?? 100);
            setXp(playerGameState.xp);
            setLevel(playerGameState.level);
            setGold(playerGameState.gold ?? 0);
            try {
                const parsed = JSON.parse(playerGameState.activeCooldowns || "{}");
                if (parsed && typeof parsed === 'object') {
                    setActiveCooldowns(parsed as Record<string, number>);
                }
            } catch {
                setActiveCooldowns({});
            }
            if (playerGameState.currentLocationId) {
                setCurrentLocationId(playerGameState.currentLocationId);
            }
            setXpToLevel(Math.floor(100 * Math.pow(1.5, playerGameState.level - 1)));
            setGameStateInitialized(true);
        }
    }, [playerGameState, gameStateInitialized]);

    // --- HOVER & CONTEXT MENU STATE ---
    const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [chatInputTarget, setChatInputTarget] = useState<{ name: string; x: number; y: number } | null>(null);

    // --- STATE SAVING ---
    const saveGameState = useCallback(async (updates: {
        hp?: number;
        maxHp?: number;
        energy?: number;
        maxEnergy?: number;
        xp?: number;
        level?: number;
        gold?: number;
        currentLocationId?: Id<"locations">;
        activeCooldowns?: string;
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

    // --- FULL COMBAT STATE (Algorithmic - No AI) ---
    const [combatState, setCombatState] = useState<FullCombatState | null>(null);
    const [engineState, setEngineState] = useState<EngineCombatState | null>(null);
    const [isProcessingCombat, setIsProcessingCombat] = useState(false);
    const [activeDiceRoll, setActiveDiceRoll] = useState<CombatRoll | null>(null);

    // --- TACTICAL BATTLE STATE (Multi-combatant) ---
    const [tacticalBattleState, setTacticalBattleState] = useState<TacticalCombatState | null>(null);
    const [tacticalUIState, setTacticalUIState] = useState<TacticalBattleState | null>(null);
    const [selectedTacticalAbilityId, setSelectedTacticalAbilityId] = useState<string | null>(null);
    const [activeCooldowns, setActiveCooldowns] = useState<Record<string, number>>({});

    // --- PERSUASION STATE ---
    const [persuasionState, setPersuasionState] = useState<PersuasionState | null>(null);
    const [persuasionTargetNpc, setPersuasionTargetNpc] = useState<any>(null);

    // Persuasion mutation
    const attemptPersuasionMutation = useMutation(api.camp.attemptPersuasion);
    const getPersuasionStatus = useQuery(
        api.camp.getPersuasionStatus,
        persuasionTargetNpc ? { npcId: persuasionTargetNpc._id } : "skip"
    );

    // Convert engine state to UI state for display
    const syncCombatUIState = useCallback((engine: EngineCombatState, abilities: CombatAbility[]) => {
        const uiState: FullCombatState = {
            isActive: engine.isActive,
            turn: engine.turn,
            isPlayerTurn: engine.isPlayerTurn,
            initiative: { player: 10, enemy: 5 },
            player: {
                name: engine.player.name,
                hp: engine.player.hp,
                maxHp: engine.player.maxHp,
                mp: engine.player.mp,
                maxMp: engine.player.maxMp,
                ac: engine.player.ac,
                stats: {
                    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, // Will be updated below
                },
                abilities,
                equippedWeapon: 'Weapon',
                statusEffects: engine.player.statusEffects?.map(e => ({
                    name: e.name,
                    duration: e.duration,
                    type: 'buff' as const,
                })) || [],
            },
            enemy: {
                name: engine.enemy.name,
                hp: engine.enemy.hp,
                maxHp: engine.enemy.maxHp,
                ac: engine.enemy.ac,
                statusEffects: [],
            },
            combatLog: engine.log.map(entry => ({
                id: entry.id,
                type: entry.type === 'crit' ? 'damage' : entry.type as any,
                actor: entry.actor,
                actorName: entry.actor === 'player' ? engine.player.name : entry.actor === 'enemy' ? engine.enemy.name : undefined,
                text: entry.text,
                roll: entry.roll ? {
                    id: `roll_${entry.timestamp}`,
                    type: 'attack' as const,
                    roller: entry.actor as 'player' | 'enemy',
                    diceType: 'd20' as const,
                    baseRoll: entry.roll.rolls[0],
                    modifier: 0,
                    total: entry.roll.total,
                    isNatural20: entry.roll.isNat20,
                    isNatural1: entry.roll.isNat1,
                    timestamp: entry.timestamp,
                } : undefined,
                damage: entry.damage,
                timestamp: entry.timestamp,
            })),
            // currentRoll is managed separately via activeDiceRoll state
            currentRoll: undefined,
        };
        return uiState;
    }, []);

    // Convert tactical combat engine state to UI state
    const syncTacticalUIState = useCallback((engine: TacticalCombatState) => {
        const currentCombatant = engine.combatants[engine.currentCombatantIndex];
        const uiState: TacticalBattleState = {
            entities: engine.combatants.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                hp: c.stats.hp,
                maxHp: c.stats.maxHp,
                ac: c.stats.ac,
                initiative: c.initiative,
                gridX: c.gridX,
                gridY: c.gridY,
                isCurrentTurn: c.id === currentCombatant?.id,
                portrait: c.portrait,
                hasMoved: c.hasMoved,
                hasActed: c.hasActed,
                isDefending: c.isDefending,
            })),
            currentEntityIndex: engine.currentCombatantIndex,
            turn: engine.turn,
            phase: currentCombatant?.type === 'player' ? 'selectAction' :
                   currentCombatant?.type === 'follower' ? 'enemyTurn' : 'enemyTurn',
            combatLog: engine.log.map(entry => ({
                id: entry.id,
                text: entry.text,
                type: entry.type as any,
                timestamp: entry.timestamp,
            })),
        };
        setTacticalUIState(uiState);
    }, []);

    const parseAbilityRange = useCallback((range: unknown): number => {
        const r = typeof range === 'string' ? range.trim().toLowerCase() : '';
        if (!r) return 2;
        if (/^\d+$/.test(r)) return Math.max(1, parseInt(r, 10));
        if (r === 'melee') return 1;
        if (r === 'short') return 2;
        if (r === 'medium') return 4;
        if (r === 'long') return 6;
        if (r === 'unlimited') return 999;
        return 2;
    }, []);

    const tacticalAbilities = useMemo(() => {
        const spells = (data as any)?.spells as any[] | undefined;
        if (!spells || spells.length === 0) return [];
        return spells.map((s) => ({
            id: String(s._id),
            name: String(s.name || 'Ability'),
            icon: s.iconEmoji ?? null,
            description: s.description ?? null,
            energyCost: typeof s.energyCost === 'number' ? s.energyCost : 0,
            cooldownRemaining: activeCooldowns[String(s._id)] ?? 0,
            range: parseAbilityRange(s.range),
            damage: typeof s.damage === 'number' ? s.damage : null,
            healing: typeof s.healing === 'number' ? s.healing : null,
            effectName: s.statusEffect ?? null,
        }));
    }, [data, activeCooldowns, parseAbilityRange]);

    // Ref for AI turn processing (needed for circular dependency)
    const processAITurnIfNeededRef = useRef<((state: TacticalCombatState) => void) | null>(null);

    // Initialize combat - TACTICAL TURN-BASED SYSTEM
    const initiateCombat = useCallback((enemyData: {
        name: string;
        hp: number;
        maxHp: number;
        ac: number;
        type?: string;
        entityId?: string;
    }) => {
        // Clear dialogue when combat starts
        setDialogueState(null);
        setCurrentChoices([]);
        setGameContext('combat');

        // Get player stats (stored as JSON string)
        const character = data?.character;
        let parsedStats = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
        try {
            if (character?.stats) {
                const parsed = JSON.parse(character.stats);
                parsedStats = {
                    strength: parsed.strength || parsed.STR || 10,
                    dexterity: parsed.dexterity || parsed.DEX || 10,
                    constitution: parsed.constitution || parsed.CON || 10,
                    intelligence: parsed.intelligence || parsed.INT || 10,
                    wisdom: parsed.wisdom || parsed.WIS || 10,
                    charisma: parsed.charisma || parsed.CHA || 10,
                };
            }
        } catch { /* use defaults */ }

        const stats = {
            str: parsedStats.strength,
            dex: parsedStats.dexterity,
            con: parsedStats.constitution,
            int: parsedStats.intelligence,
            wis: parsedStats.wisdom,
            cha: parsedStats.charisma,
        };

        // Calculate AC (10 + DEX mod + armor bonuses from equipped items)
        const dexMod = getStatModifier(stats.dex);
        const armorItem = (playerInventory || []).find((i: any) => i.equippedSlot === 'armor') as any;
        const armorBonus = armorItem?.armorBonus || armorItem?.defense || 0;
        const playerAC = 10 + dexMod + armorBonus;

        // Find equipped weapon and determine damage dice
        const weapon = (playerInventory || []).find((i: any) => i.equippedSlot === 'weapon') as any;
        const weaponDamage: DiceType = weapon?.damageDice || 'd6';

        // Get player position from canvas
        const playerPos = canvasRef.current?.getPlayerPosition() || { x: 5, y: 5 };

        // Position enemy adjacent to player (1 tile away)
        const enemyGridX = playerPos.x + 2;
        const enemyGridY = playerPos.y;
        const resolvedEnemyId = enemyData.entityId || `enemy_${Date.now()}`;

        // Initialize tactical combat with the new system
        const tacticalState = initializeTacticalCombat(
            {
                id: 'player',
                name: character?.name || 'Hero',
                hp,
                maxHp,
                ac: playerAC,
                stats,
                weaponDamage,
                gridX: playerPos.x,
                gridY: playerPos.y,
            },
            [], // No followers for now (can add later from camp data)
            [
                {
                    id: resolvedEnemyId,
                    name: enemyData.name,
                    hp: enemyData.hp,
                    maxHp: enemyData.maxHp,
                    ac: enemyData.ac,
                    attackBonus: Math.floor(enemyData.hp / 10) + 2,
                    damageBonus: Math.floor(enemyData.hp / 15) + 1,
                    damageDice: 'd6',
                    dexMod: 1,
                    behavior: 'balanced',
                    gridX: enemyGridX,
                    gridY: enemyGridY,
                },
            ],
            { x: playerPos.x, y: playerPos.y },
            9 // Arena size
        );

        // Set the tactical combat state
        setTacticalBattleState(tacticalState);
        syncTacticalUIState(tacticalState);

        // Enter battle mode on the canvas (visual effects)
        const playerCombatant = tacticalState.combatants.find(c => c.id === 'player');
        const enemyCombatant = tacticalState.combatants.find(c => c.id === resolvedEnemyId);
        canvasRef.current?.enterBattleMode({
            enemies: [{
                entityId: resolvedEnemyId,
                name: enemyData.name,
                hp: enemyData.hp,
                maxHp: enemyData.maxHp,
                ac: enemyData.ac,
                damage: Math.floor(enemyData.hp / 15) + 1,
                gridX: enemyGridX,
                gridY: enemyGridY,
                initiative: enemyCombatant?.initiative,
            }],
            player: {
                name: character?.name || 'Hero',
                hp,
                maxHp,
                ac: playerAC,
                damage: Math.max(1, Math.floor((weaponDamage === 'd12' ? 7 : weaponDamage === 'd10' ? 6 : weaponDamage === 'd8' ? 5 : weaponDamage === 'd6' ? 4 : weaponDamage === 'd4' ? 3 : 4) + getStatModifier(stats.str))),
                initiative: playerCombatant?.initiative,
            },
            playerMovementRange: 3,
            playerAttackRange: 1,
        });

        console.log('[PlayDF] Tactical combat initialized:', tacticalState);

        // Check if enemy goes first (higher initiative)
        const firstCombatant = getCurrentCombatant(tacticalState);
        if (firstCombatant && firstCombatant.type !== 'player') {
            // Enemy goes first - process AI turn after a short delay
            setTimeout(() => {
                processAITurnIfNeededRef.current?.(tacticalState);
            }, 500);
        }
    }, [data, hp, maxHp, playerInventory, syncTacticalUIState]);

    // Ref for tactical combat end handler (defined later when addXp is available)
    const handleTacticalCombatEndRef = useRef<((outcome: 'victory' | 'defeat' | 'fled') => void) | null>(null);

    // Process AI turn for enemies/followers
    const processAITurnIfNeeded = useCallback((state: TacticalCombatState) => {
        const current = getCurrentCombatant(state);
        if (!current) return;

        // Only process AI for non-player controlled entities
        if (current.type === 'player') {
            // Player's turn - update phase to select action
            setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAction' } : null);
            return;
        }

        // Mark as enemy/follower turn
        setTacticalUIState(prev => prev ? { ...prev, phase: 'enemyTurn' } : null);
        setIsProcessingCombat(true);

        // Process AI turn with a delay for visual effect
        setTimeout(() => {
            const aiAction = determineTacticalAIAction(state, current.id, 3, 1);
            let newState = state;

            if (aiAction.action === 'attack' && aiAction.targetId) {
                const result = processTacticalAttack(state, current.id, aiAction.targetId);
                newState = result.newState;
                const hpAfter = newState.combatants.find(c => c.id === aiAction.targetId)?.stats.hp ?? 0;
                canvasRef.current?.processEvent({
                    type: 'battleAttack',
                    battleAttack: {
                        attackerId: current.id,
                        targetId: aiAction.targetId,
                        damage: result.result.totalDamage ?? 0,
                        hit: result.result.hit,
                        isCritical: result.result.isCritical,
                        targetHpAfter: hpAfter,
                    },
                });
                if (result.result.hit) {
                    setScreenEffect(result.result.isCritical ? 'critical' : 'shake');
                }
                addNotification(result.result.hit ? 'warning' : 'info', current.name, result.narration);
            } else if (aiAction.action === 'move' && aiAction.moveToX !== undefined && aiAction.moveToY !== undefined) {
                const result = processTacticalMove(state, current.id, aiAction.moveToX, aiAction.moveToY);
                newState = result.newState;
                // Animate movement on canvas
                canvasRef.current?.battleMoveEntity(current.id, aiAction.moveToX, aiAction.moveToY);
            } else if (aiAction.action === 'defend') {
                const result = processTacticalDefend(state, current.id);
                newState = result.newState;
            }

            // Check for combat end
            if (newState.outcome) {
                setIsProcessingCombat(false);
                handleTacticalCombatEndRef.current?.(newState.outcome);
                return;
            }

            // Advance to next turn
            canvasRef.current?.endBattleTurn?.();
            const advancedState = advanceTacticalTurn(newState);
            setTacticalBattleState(advancedState);
            syncTacticalUIState(advancedState);
            setIsProcessingCombat(false);

            const playerCombatant = advancedState.combatants.find(c => c.type === 'player');
            if (playerCombatant) {
                setHp(playerCombatant.stats.hp);
                saveGameState({ hp: playerCombatant.stats.hp });
            }

            // Recursively process if next combatant is also AI
            const nextCombatant = getCurrentCombatant(advancedState);
            if (nextCombatant && nextCombatant.type !== 'player') {
                processAITurnIfNeeded(advancedState);
            } else {
                setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAction' } : null);
            }
        }, 800);
    }, [addNotification, syncTacticalUIState, saveGameState]);

    const advanceTacticalFrom = useCallback((state: TacticalCombatState) => {
        if (state.outcome) {
            handleTacticalCombatEndRef.current?.(state.outcome);
            return;
        }
        canvasRef.current?.endBattleTurn?.();
        const advancedState = advanceTacticalTurn(state);
        setTacticalBattleState(advancedState);
        syncTacticalUIState(advancedState);
        const playerCombatant = advancedState.combatants.find(c => c.type === 'player');
        if (playerCombatant) {
            setHp(playerCombatant.stats.hp);
            saveGameState({ hp: playerCombatant.stats.hp });
        }
        processAITurnIfNeeded(advancedState);
    }, [processAITurnIfNeeded, syncTacticalUIState, saveGameState]);

    // Assign to ref for use in initiateCombat
    processAITurnIfNeededRef.current = processAITurnIfNeeded;

    // Ref to hold handleCombatEnd (defined later) - avoids circular dependency
    const handleCombatEndRef = useRef<((outcome: 'victory' | 'defeat' | 'fled', finalPlayerHp: number) => void) | null>(null);

    // Helper to create a CombatRoll from engine roll data
    const createCombatRoll = useCallback((
        roll: { rolls: number[]; total: number; isNat20?: boolean; isNat1?: boolean },
        roller: 'player' | 'enemy',
        hit: boolean,
        modifier: number = 0,
        targetAC?: number
    ): CombatRoll => ({
        id: `roll_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: 'attack',
        roller,
        diceType: 'd20',
        baseRoll: roll.rolls[0],
        modifier,
        total: roll.total + modifier,
        isNatural20: roll.isNat20,
        isNatural1: roll.isNat1,
        target: targetAC,
        success: hit,
        timestamp: Date.now(),
    }), []);

    // Process enemy turn after delay
    const processEnemyTurnWithDelay = useCallback((currentEngine: EngineCombatState, abilities: CombatAbility[]) => {
        setIsProcessingCombat(true);

        // Short delay before enemy attacks
        setTimeout(() => {
            const { newState, action, narration } = processEnemyTurn(currentEngine);
            console.log('[Combat] Enemy turn:', action.type, narration);

            // If enemy attacked, show their dice roll
            if (action.type === 'attack' && newState.lastRoll) {
                const enemyDiceRoll = createCombatRoll(
                    newState.lastRoll,
                    'enemy',
                    newState.player.hp < currentEngine.player.hp, // Hit if player took damage
                    currentEngine.enemy.attackBonus,
                    currentEngine.player.ac
                );
                setActiveDiceRoll(enemyDiceRoll);

                // After dice animation, update state
                setTimeout(() => {
                    setActiveDiceRoll(null);
                    setEngineState(newState);
                    setCombatState(syncCombatUIState(newState, abilities));
                    setIsProcessingCombat(false);

                    // Check for combat end
                    if (newState.outcome) {
                        handleCombatEndRef.current?.(newState.outcome, newState.player.hp);
                    }
                }, 2000); // Wait for dice animation
            } else {
                // Non-attack action (defend, flee) - no dice animation needed
                setEngineState(newState);
                setCombatState(syncCombatUIState(newState, abilities));
                setIsProcessingCombat(false);

                // Check for combat end
                if (newState.outcome) {
                    handleCombatEndRef.current?.(newState.outcome, newState.player.hp);
                }
            }
        }, 800); // Short delay before enemy acts
    }, [syncCombatUIState, createCombatRoll]);

    // Handle combat actions - ALGORITHMIC (no AI calls!)
    const handleCombatAction = useCallback((action: CombatAction) => {
        if (!engineState || !engineState.isPlayerTurn || isProcessingCombat) return;

        const abilities: CombatAbility[] = combatState?.player.abilities || [];
        setIsProcessingCombat(true);

        switch (action.type) {
            case 'attack': {
                const { newState, result, narration } = processPlayerAttack(engineState);
                console.log('[Combat] Player attack:', narration, result);

                // Show dice roll animation for player attack
                const diceRoll = createCombatRoll(
                    result.attackRoll,
                    'player',
                    result.hit,
                    engineState.player.attackBonus,
                    engineState.enemy.ac
                );
                setActiveDiceRoll(diceRoll);

                // After dice animation completes, update state
                setTimeout(() => {
                    setActiveDiceRoll(null);
                    setEngineState(newState);
                    setCombatState(syncCombatUIState(newState, abilities));
                    setIsProcessingCombat(false);

                    // Check for combat end
                    if (newState.outcome) {
                        handleCombatEndRef.current?.(newState.outcome, newState.player.hp);
                        return;
                    }

                    // If not player's turn anymore, process enemy turn after delay
                    if (!newState.isPlayerTurn) {
                        setTimeout(() => {
                            processEnemyTurnWithDelay(newState, abilities);
                        }, 500);
                    }
                }, 2000); // Wait for dice animation
                break;
            }
            case 'defend': {
                const { newState, narration } = processPlayerDefend(engineState);
                console.log('[Combat] Player defend:', narration);
                setEngineState(newState);
                setCombatState(syncCombatUIState(newState, abilities));
                setIsProcessingCombat(false);

                // Process enemy turn after defend
                if (!newState.isPlayerTurn) {
                    setTimeout(() => {
                        processEnemyTurnWithDelay(newState, abilities);
                    }, 500);
                }
                break;
            }
            case 'flee': {
                const { newState, result, narration } = processPlayerFlee(engineState);
                console.log('[Combat] Player flee:', narration, result);

                // Show dice roll for flee attempt
                const diceRoll = createCombatRoll(
                    result.roll,
                    'player',
                    result.success,
                    0,
                    result.dc
                );
                setActiveDiceRoll(diceRoll);

                setTimeout(() => {
                    setActiveDiceRoll(null);
                    setEngineState(newState);
                    setCombatState(syncCombatUIState(newState, abilities));
                    setIsProcessingCombat(false);

                    if (newState.outcome) {
                        handleCombatEndRef.current?.(newState.outcome, newState.player.hp);
                        return;
                    }

                    // If failed to flee, enemy gets a turn
                    if (!newState.isPlayerTurn) {
                        setTimeout(() => {
                            processEnemyTurnWithDelay(newState, abilities);
                        }, 500);
                    }
                }, 2000);
                break;
            }
            default:
                // For abilities, treat as attack for now
                const { newState } = processPlayerAttack(engineState);
                setEngineState(newState);
                setCombatState(syncCombatUIState(newState, abilities));
                setIsProcessingCombat(false);
        }
    }, [engineState, combatState, isProcessingCombat, syncCombatUIState, processEnemyTurnWithDelay, createCombatRoll]);

    // Handle ability use in combat
    const handleCombatAbilityUse = useCallback((ability: CombatAbility) => {
        // For now, abilities act like attacks with potentially different damage
        handleCombatAction({
            type: 'ability',
            data: { abilityName: ability.name }
        });
    }, [handleCombatAction]);

    // End combat manually (e.g., close button)
    const endCombat = useCallback((reason: 'victory' | 'defeat' | 'flee') => {
        // Convert 'flee' to 'fled' for handleCombatEndRef
        const outcome = reason === 'flee' ? 'fled' : reason;
        handleCombatEndRef.current?.(outcome, hp);
    }, [hp]);

    // --- LOCATION TRANSITION HANDLER ---
    const handleLocationTransition = useCallback(async (toLocationName: string) => {
        if (!data) return;

        console.log('[PlayDF] Transitioning to location:', toLocationName);

        // Clear stale dialogue/choices when changing locations
        setDialogueState(null);
        setCurrentChoices([]);

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

    // --- DIALOGUE HANDLER ---
    const handleDialogue = useCallback((dialogueData: {
        lines?: Array<{ speaker?: string; text: string; emotion?: string }>;
        activeNpc?: string
    }) => {
        const narrative = lastNarrativeRef.current.trim();
        const narrativeLines: DialogueLine[] = narrative
            ? [{ text: narrative, emotion: 'neutral' }]
            : [];

        if (dialogueData.lines && dialogueData.lines.length > 0) {
            // Convert to DialogueLine format and create DialogueState
            const lines: DialogueLine[] = [
                ...narrativeLines,
                ...dialogueData.lines.map(line => ({
                speaker: line.speaker || undefined,
                text: line.text,
                emotion: (line.emotion as DialogueLine['emotion']) || 'neutral'
                }))
            ].filter(l => typeof l.text === 'string' && l.text.trim().length > 0);
            setDialogueState({
                lines,
                currentLineIndex: 0,
                isComplete: false
            });
        } else if (narrativeLines.length > 0) {
            setDialogueState({
                lines: narrativeLines,
                currentLineIndex: 0,
                isComplete: false
            });
        } else {
            setDialogueState(null);
        }
        setActiveNpc(dialogueData.activeNpc || null);
    }, []);

    // --- TACTICAL COMBAT END HANDLER (must be after addXp and addNotification) ---
    const handleTacticalCombatEnd = useCallback((outcome: 'victory' | 'defeat' | 'fled') => {
        // Exit battle mode on canvas
        canvasRef.current?.exitBattleMode(outcome);

        // Clear tactical state
        setTacticalBattleState(null);
        setTacticalUIState(null);
        setGameContext('explore');

        if (outcome === 'victory') {
            // Award XP and loot
            addXp(50); // Base XP for victory
            addNotification('achievement', 'Victory!', 'Gained 50 XP');
            setScreenEffect('levelup');
        } else if (outcome === 'defeat') {
            // Player died
            setShowDeathOverlay(true);
            const xpLost = Math.floor(xp * 0.1);
            setDeathXpLost(xpLost);
            setHp(Math.floor(maxHp * 0.5)); // Respawn with 50% HP
            if (xpLost > 0) addXp(-xpLost);

            setTimeout(() => {
                setShowDeathOverlay(false);
            }, 3000);
        }
    }, [addXp, addNotification, xp, maxHp]);

    // Assign to ref for use in processAITurnIfNeeded
    handleTacticalCombatEndRef.current = handleTacticalCombatEnd;

    // --- COMBAT END HANDLER (must be after addXp and addNotification) ---
    const handleCombatEnd = useCallback(async (outcome: 'victory' | 'defeat' | 'fled', finalPlayerHp: number) => {
        // Update player HP from combat
        setHp(finalPlayerHp);
        saveGameState({ hp: finalPlayerHp });

        if (outcome === 'victory') {
            // Grant XP based on enemy
            const xpGained = Math.floor((engineState?.enemy.maxHp || 30) * 2);
            addXp(xpGained);
            addNotification('achievement', 'Victory!', `Gained ${xpGained} XP`);
            setScreenEffect('levelup');

            // Clear combat after delay
            setTimeout(() => {
                setCombatState(null);
                setEngineState(null);
                setGameContext('explore');
            }, 2000);
        } else if (outcome === 'defeat') {
            // Player died - show death overlay and apply XP penalty
            setScreenEffect('damage');
            setShowDeathOverlay(true);

            try {
                // Call death mutation to deduct XP and get spawn point
                const result = await handlePlayerDeathMutation({ campaignId });
                setDeathXpLost(result.xpLost);
                setXp(result.newXp);
                setHp(maxHp); // Reset HP to full

                // After showing death overlay, respawn player
                setTimeout(() => {
                    // Teleport to spawn point
                    canvasRef.current?.setPlayerPosition(result.spawnX, result.spawnY);
                    setShowDeathOverlay(false);
                    setCombatState(null);
                    setEngineState(null);
                    setGameContext('explore');
                    addNotification('info', 'Respawned', `You lost ${result.xpLost} XP`);
                }, 3000);
            } catch (error) {
                console.error('Failed to handle death:', error);
                // Fallback: just reset state
                setTimeout(() => {
                    setShowDeathOverlay(false);
                    setCombatState(null);
                    setEngineState(null);
                    setGameContext('explore');
                }, 3000);
            }
        } else {
            addNotification('info', 'Escaped!', 'You fled from combat');

            // Clear combat after delay
            setTimeout(() => {
                setCombatState(null);
                setEngineState(null);
                setGameContext('explore');
            }, 2000);
        }
    }, [engineState, saveGameState, addXp, addNotification, handlePlayerDeathMutation, campaignId, maxHp]);

    // Assign handleCombatEnd to ref for use in earlier callbacks
    useEffect(() => {
        handleCombatEndRef.current = handleCombatEnd;
    }, [handleCombatEnd]);

    // --- GAME DATA HANDLER ---
    const handleGameData = useCallback((gameData: any) => {
        const stateUpdates: Parameters<typeof saveGameState>[0] = {};

        if (typeof gameData.hp === 'number') {
            setHp(gameData.hp);
            stateUpdates.hp = gameData.hp;

            // Check for death outside of combat
            if (gameData.hp <= 0 && !combatState?.isActive) {
                handleCombatEnd('defeat', 0);
            }
        }

        if (typeof gameData.gold === 'number') {
            setGold(gameData.gold);
            stateUpdates.gold = gameData.gold;
        }

        if (gameData.context && ['explore', 'combat', 'social', 'rest'].includes(gameData.context)) {
            setGameContext(gameData.context as GameContext);
        }

        if (gameData.choices && Array.isArray(gameData.choices)) {
            // Support both old string format and new object format
            const normalizedChoices = gameData.choices
                .map((c: any) => typeof c === 'string' ? c : c.text || c.action || c.label || '')
                .filter((c: string) => c && c.trim().length > 0);
            setCurrentChoices(normalizedChoices);

            // Also set structured dialogue choices for the new UI
            // ALWAYS use index-based IDs to guarantee uniqueness (AI IDs can be duplicated)
            const batchId = Date.now(); // Single timestamp for this batch
            const structuredChoices: DialogueChoice[] = gameData.choices
                .map((c: any, i: number) => {
                    const text = typeof c === 'string' ? c : (c.text || c.action || c.label || '');
                    return {
                        id: `choice_${batchId}_${i}`, // Unique: timestamp + index
                        text,
                        skillCheck: typeof c === 'object' ? c.skillCheck : undefined,
                        consequence: typeof c === 'object' ? c.consequence : undefined,
                        disabled: typeof c === 'object' ? c.disabled : undefined,
                        disabledReason: typeof c === 'object' ? c.disabledReason : undefined
                    };
                })
                .filter((c: DialogueChoice) => c.text && c.text.trim().length > 0);

            // Update dialogueState with choices
            setDialogueState(prev => {
                if (prev) {
                    return { ...prev, choices: structuredChoices };
                }
                // If no dialogue lines, create a choice-only dialogue state
                const narrative = lastNarrativeRef.current.trim();
                return {
                    lines: narrative ? [{ text: narrative, emotion: 'neutral' }] : [],
                    currentLineIndex: 0,
                    choices: structuredChoices,
                    isComplete: false
                };
            });
        }

        // Handle notifications from AI
        if (gameData.notifications && Array.isArray(gameData.notifications)) {
            gameData.notifications.forEach((n: any) => {
                if (n.type && n.title) {
                    addNotification(n.type as NotificationType, n.title, n.message);
                }
            });
        }

        // Handle combat initiation from AI
        if (gameData.combatStart || gameData.initiiateCombat) {
            const enemy = gameData.combatStart || gameData.initiiateCombat;
            initiateCombat({
                name: enemy.name || enemy.enemyName || 'Enemy',
                hp: enemy.hp || enemy.enemyHp || 30,
                maxHp: enemy.maxHp || enemy.enemyMaxHp || enemy.hp || 30,
                ac: enemy.ac || enemy.enemyAc || 12,
                type: enemy.type || enemy.enemyType,
            });
            setGameContext('combat');
        }

        // Handle combat updates (dice rolls, damage, turn changes)
        if (gameData.combatUpdate && combatState) {
            const update = gameData.combatUpdate;

            setCombatState(prev => {
                if (!prev) return null;

                const newLog: CombatLogEntry[] = [...prev.combatLog];

                // Add dice roll to log if present
                if (update.roll) {
                    const roll = update.roll;
                    newLog.push({
                        id: `log_${Date.now()}_roll`,
                        type: 'roll',
                        actor: roll.roller || 'system',
                        actorName: roll.roller === 'player' ? prev.player.name : prev.enemy.name,
                        text: `${roll.type} roll: ${roll.baseRoll} + ${roll.modifier} = ${roll.total}`,
                        roll: {
                            id: `roll_${Date.now()}`,
                            type: roll.type || 'attack',
                            roller: roll.roller || 'player',
                            diceType: roll.diceType || 'd20',
                            baseRoll: roll.baseRoll || roll.roll || 10,
                            modifier: roll.modifier || 0,
                            modifierSource: roll.modifierSource || roll.stat,
                            total: roll.total || (roll.baseRoll + roll.modifier),
                            isNatural20: roll.baseRoll === 20,
                            isNatural1: roll.baseRoll === 1,
                            target: roll.target || roll.ac || roll.dc,
                            success: roll.success,
                            timestamp: Date.now(),
                        },
                        timestamp: Date.now(),
                    });
                }

                // Add damage to log if present
                if (update.damage) {
                    newLog.push({
                        id: `log_${Date.now()}_dmg`,
                        type: 'damage',
                        actor: update.damageDealer || 'player',
                        actorName: update.damageDealer === 'player' ? prev.player.name : prev.enemy.name,
                        text: `dealt ${update.damage} ${update.damageType || ''} damage`,
                        damage: update.damage,
                        damageType: update.damageType,
                        isCritical: update.isCritical,
                        timestamp: Date.now(),
                    });
                }

                // Add narration if present
                if (update.narration) {
                    newLog.push({
                        id: `log_${Date.now()}_narr`,
                        type: 'narration',
                        actor: 'system',
                        text: update.narration,
                        timestamp: Date.now(),
                    });
                }

                return {
                    ...prev,
                    turn: update.turn || prev.turn,
                    isPlayerTurn: update.isPlayerTurn ?? prev.isPlayerTurn,
                    player: {
                        ...prev.player,
                        hp: update.playerHp ?? prev.player.hp,
                        mp: update.playerMp ?? prev.player.mp,
                    },
                    enemy: {
                        ...prev.enemy,
                        hp: update.enemyHp ?? prev.enemy.hp,
                    },
                    combatLog: newLog,
                    currentRoll: update.roll ? {
                        id: `roll_${Date.now()}`,
                        type: update.roll.type || 'attack',
                        roller: update.roll.roller || 'player',
                        diceType: update.roll.diceType || 'd20',
                        baseRoll: update.roll.baseRoll || 10,
                        modifier: update.roll.modifier || 0,
                        modifierSource: update.roll.modifierSource,
                        total: update.roll.total,
                        isNatural20: update.roll.baseRoll === 20,
                        isNatural1: update.roll.baseRoll === 1,
                        target: update.roll.target,
                        success: update.roll.success,
                        timestamp: Date.now(),
                    } : undefined,
                };
            });
        }

        // Handle combat end
        if (gameData.combatEnd) {
            const result = gameData.combatEnd;
            endCombat(result.result || (result.victory ? 'victory' : result.fled ? 'flee' : 'defeat'));
        }

        // Handle game events (legacy format)
        if (gameData.gameEvent) {
            const event = gameData.gameEvent;

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
    }, [addReward, addXp, saveGameState, addNotification, initiateCombat, combatState, endCombat, handleCombatEnd]);


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

        let aiQuotaLimited = false;
        setIsSlowStream(false);
        lastNarrativeRef.current = "";
        await streamNarrative(
            payload,
            (delta) => {
                setIsSlowStream(false); // Clear slow stream indicator once we get content
                aiResponseContent += delta;
                lastNarrativeRef.current = aiResponseContent;
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'model') {
                        return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                    }
                    return [...prev, { role: 'model', content: delta }];
                });
            },
            (gameData) => {
                setIsSlowStream(false); // Clear slow stream indicator once we get data
                handleGameData(gameData);
                // Extract just text strings for database storage (validator expects string[])
                if (gameData.choices) {
                    aiChoices = gameData.choices.map((c: any) => typeof c === 'string' ? c : c.text || c.action || c.label || '').filter(Boolean);
                }
            },
            (events) => {
                setIsSlowStream(false); // Clear slow stream indicator once we get events
                // Narrative AI might also send map events - handle them
                if (events.length > 0) {
                    handleMapEvents(events);
                    setIsGeneratingMap(false);
                }
            },
            (dialogueData) => {
                setIsSlowStream(false); // Clear slow stream indicator once we get dialogue
                // Handle dialogue data from AI
                handleDialogue(dialogueData);
            },
            (err) => {
                setIsSlowStream(false);
                const msg = (err && typeof err === 'object' && 'message' in err) ? String((err as any).message) : String(err);
                const isQuota = /quota exceeded|resource_exhausted|retry in|429/i.test(msg);
                if (isQuota) {
                    aiQuotaLimited = true;
                    // Show a friendly banner for ~40s (or whatever streamNarrative picked).
                    const backoffMs = 40_000;
                    setAiOfflineUntil(Date.now() + backoffMs);

                    // Provide a non-AI intro so the player isn’t blocked.
                    setMessages(prev => [
                        ...prev,
                        {
                            role: 'model',
                            content:
                                `AI is temporarily offline (quota exhausted). You can still explore the room and use the UI.\n\n` +
                                `Try again in ~${Math.ceil(backoffMs / 1000)} seconds, or switch to a Gemini API key with active quota.`,
                        },
                    ]);
                    setCurrentChoices([
                        "Look around carefully.",
                        "Check my inventory.",
                        "Move forward and explore.",
                    ]);
                } else {
                    console.error("AI Error:", err);
                    setMessages(prev => [...prev, {
                        role: 'model',
                        content: "The magic fizzles... Something went wrong connecting to the realm."
                    }]);
                }
                setIsLoading(false);
                setIsGeneratingMap(false);
            },
            () => {
                // onSlowStream callback
                setIsSlowStream(true);
            },
            streamAbortControllerRef
        );

        // Absolute fallback: ensure something appears in the dialogue UI even if <dialogue>/<data> parsing failed.
        if (aiResponseContent && aiResponseContent.trim().length > 0) {
            const narrative = aiResponseContent.trim();
            setDialogueState(prev => prev ?? ({
                lines: [{ text: narrative, emotion: 'neutral' }],
                currentLineIndex: 0,
                isComplete: false
            }));
        }

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

        // Clear stale dialogue/choices before sending new message
        setCurrentChoices([]);
        setDialogueState(null);
        lastNarrativeRef.current = "";

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

        // Check if attack is implied - start combat immediately (NO AI NEEDED)
        const attackIntent = detectsAttackIntent(contentToSend);
        if (attackIntent.isAttack && attackIntent.targetName && !combatState) {
            // Try to find the entity in the current room
            const room = canvasRef.current?.getCurrentRoom();
            const targetEntity = room?.entities.find(e =>
                e.name.toLowerCase().includes(attackIntent.targetName!.toLowerCase()) ||
                attackIntent.targetName!.toLowerCase().includes(e.name.toLowerCase())
            );

            if (targetEntity) {
                initiateCombat({
                    name: targetEntity.name,
                    hp: targetEntity.hp || 30,
                    maxHp: targetEntity.maxHp || targetEntity.hp || 30,
                    ac: targetEntity.ac || 12,
                    type: targetEntity.hostile ? 'hostile' : 'neutral',
                });
            } else {
                // Fallback - create enemy from the target name
                initiateCombat({
                    name: attackIntent.targetName,
                    hp: 30,
                    maxHp: 30,
                    ac: 12,
                    type: 'unknown',
                });
            }

            // Combat is algorithmic - no AI needed, return early
            setIsLoading(false);
            return;
        }

        // If already in combat, don't send to AI - combat is handled algorithmically
        if (combatState) {
            setIsLoading(false);
            return;
        }

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

        // Retry logic for AI calls
        const MAX_RETRIES = 3;
        let retryCount = 0;
        let lastError: Error | null = null;

        const attemptAICall = async (): Promise<boolean> => {
            return new Promise((resolve) => {
                let callSucceeded = true;
                setIsSlowStream(false);

                streamNarrative(
                    payload,
                    (delta) => {
                        setIsSlowStream(false); // Clear slow stream indicator once we get content
                        aiResponseContent += delta;
                        lastNarrativeRef.current = aiResponseContent;
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.role === 'model') {
                                return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                            }
                            return [...prev, { role: 'model', content: delta }];
                        });
                    },
                    (gameData) => {
                        setIsSlowStream(false); // Clear slow stream indicator once we get data
                        handleGameData(gameData);
                        // Extract just text strings for database storage (validator expects string[])
                        if (gameData.choices) {
                            aiChoices = gameData.choices.map((c: any) => typeof c === 'string' ? c : c.text || c.action || c.label || '').filter(Boolean);
                        }
                    },
                    (events) => {
                        setIsSlowStream(false); // Clear slow stream indicator once we get events
                        handleMapEvents(events);
                    },
                    (dialogueData) => {
                        setIsSlowStream(false); // Clear slow stream indicator once we get dialogue
                        // Handle dialogue data from AI
                        handleDialogue(dialogueData);
                    },
                    (err) => {
                        setIsSlowStream(false);
                        console.error(`AI Error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err);
                        lastError = err;
                        callSucceeded = false;
                    },
                    () => {
                        // onSlowStream callback
                        setIsSlowStream(true);
                    },
                    streamAbortControllerRef
                ).then(() => {
                    resolve(callSucceeded);
                }).catch((err) => {
                    console.error(`AI stream error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err);
                    lastError = err;
                    resolve(false);
                });
            });
        };

        // Retry loop
        while (retryCount < MAX_RETRIES) {
            const success = await attemptAICall();
            if (success && aiResponseContent.length > 0) {
                break; // Success, exit loop
            }

            retryCount++;
            if (retryCount < MAX_RETRIES) {
                console.log(`[PlayDF] Retrying AI call (${retryCount}/${MAX_RETRIES})...`);
                // Reset response content for retry
                aiResponseContent = "";
                // Remove any partial model message
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'model' && !last.content.trim()) {
                        return prev.slice(0, -1);
                    }
                    return prev;
                });
                // Small delay before retry
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // If all retries failed, show error message
        if (retryCount >= MAX_RETRIES && (!aiResponseContent || aiResponseContent.length === 0)) {
            console.error("All AI retries failed:", lastError);
            setMessages(prev => [...prev, {
                role: 'model',
                content: "The realm grows silent... The magic falters. Please try again."
            }]);
        }

        // Absolute fallback: if we got narrative text but never surfaced any dialogue UI,
        // show the narrative as a single dialogue line so the player sees something.
        if (aiResponseContent && aiResponseContent.trim().length > 0) {
            const narrative = aiResponseContent.trim();
            setDialogueState(prev => prev ?? ({
                lines: [{ text: narrative, emotion: 'neutral' }],
                currentLineIndex: 0,
                isComplete: false
            }));
        }

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
    const handleTileClick = useCallback((x: number, y: number) => {
        setContextMenu(null); // Close any open context menu

        if (!tacticalBattleState || !tacticalUIState) return;
        const current = getCurrentCombatant(tacticalBattleState);
        if (!current || current.type !== 'player') return;

        if (tacticalUIState.phase === 'selectMove') {
            const click = canvasRef.current?.handleBattleClick(x, y);
            if (click?.action === 'move' && click.toX !== undefined && click.toY !== undefined) {
                const moved = processTacticalMove(tacticalBattleState, current.id, click.toX, click.toY);
                setTacticalBattleState(moved.newState);
                syncTacticalUIState(moved.newState);
                canvasRef.current?.battleMoveEntity(current.id, click.toX, click.toY);
                canvasRef.current?.cancelBattleSelection?.();
                setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAction', selectedAction: undefined } : null);
            }
            return;
        }

        if (tacticalUIState.phase === 'selectAttack' && tacticalUIState.selectedAction === 'attack') {
            const click = canvasRef.current?.handleBattleClick(x, y);
            if (click?.action === 'attack' && click.targetId) {
                const result = processTacticalAttack(tacticalBattleState, current.id, click.targetId);
                const hpAfter = result.newState.combatants.find(c => c.id === click.targetId)?.stats.hp ?? 0;
                canvasRef.current?.processEvent({
                    type: 'battleAttack',
                    battleAttack: {
                        attackerId: current.id,
                        targetId: click.targetId,
                        damage: result.result.totalDamage ?? 0,
                        hit: result.result.hit,
                        isCritical: result.result.isCritical,
                        targetHpAfter: hpAfter,
                    },
                });
                if (result.result.hit) {
                    setScreenEffect(result.result.isCritical ? 'critical' : 'shake');
                }
                canvasRef.current?.cancelBattleSelection?.();
                setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAction', selectedAction: undefined } : null);
                advanceTacticalFrom(result.newState);
            }
        }
    }, [tacticalBattleState, tacticalUIState, syncTacticalUIState, advanceTacticalFrom]);

    // Entity click: show action context menu
    const handleEntityClick = useCallback((entityId: string, entity: RoomEntity, screenPos?: { x: number; y: number }) => {
        // In tactical combat, entity clicks can be used to pick targets.
        if (tacticalBattleState && tacticalUIState) {
            const current = getCurrentCombatant(tacticalBattleState);
            if (current && current.type === 'player') {
                // Ability target selection
                if (tacticalUIState.phase === 'selectAbility' && selectedTacticalAbilityId) {
                    const ability = tacticalAbilities.find(a => a.id === selectedTacticalAbilityId);
                    if (!ability) {
                        addNotification('warning', 'Ability not found');
                        return;
                    }
                    const cooldownRemaining = activeCooldowns[ability.id] ?? 0;
                    if (cooldownRemaining > 0) {
                        addNotification('warning', `${ability.name} is on cooldown`, `${cooldownRemaining} turns remaining`);
                        return;
                    }
                    if (ability.energyCost > energy) {
                        addNotification('warning', 'Not enough energy', `Need ${ability.energyCost}, have ${energy}`);
                        return;
                    }

                    // Range check against tactical state
                    const validTargets = getValidTargets(tacticalBattleState, current.id, ability.range);
                    const inRange = validTargets.some(t => t.id === entityId);
                    if (!inRange) {
                        addNotification('warning', 'Out of range');
                        return;
                    }

                    // Spend energy + set cooldowns
                    const nextEnergy = Math.max(0, energy - ability.energyCost);
                    setEnergy(nextEnergy);
                    const nextCooldowns = { ...activeCooldowns };
                    const cd = (data as any)?.spells?.find((s: any) => String(s._id) === ability.id)?.cooldown;
                    if (typeof cd === 'number' && cd > 0) nextCooldowns[ability.id] = cd;
                    setActiveCooldowns(nextCooldowns);
                    saveGameState({ energy: nextEnergy, activeCooldowns: JSON.stringify(nextCooldowns) });

                    const cast = processTacticalAbility(tacticalBattleState, current.id, entityId, {
                        name: ability.name,
                        baseDamage: ability.damage ?? 0,
                        damageDice: (data as any)?.spells?.find((s: any) => String(s._id) === ability.id)?.damageDice,
                        healing: ability.healing ?? 0,
                    });

                    const hpAfter = cast.newState.combatants.find(c => c.id === entityId)?.stats.hp ?? 0;
                    canvasRef.current?.processEvent({
                        type: 'battleAttack',
                        battleAttack: {
                            attackerId: current.id,
                            targetId: entityId,
                            damage: cast.result.totalDamage ?? 0,
                            hit: !!cast.result.hit,
                            isCritical: cast.result.isCritical,
                            targetHpAfter: hpAfter,
                        },
                    });

                    if (cast.result.hit) {
                        setScreenEffect(cast.result.isCritical ? 'critical' : 'shake');
                    }

                    canvasRef.current?.cancelBattleSelection?.();
                    setSelectedTacticalAbilityId(null);
                    setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAction', selectedAction: undefined, selectedAbilityId: undefined } : null);
                    advanceTacticalFrom(cast.newState);
                    return;
                }

                // Basic attack target selection (use canvas click helper if possible)
                if (tacticalUIState.phase === 'selectAttack' && tacticalUIState.selectedAction === 'attack') {
                    const validTargets = getValidTargets(tacticalBattleState, current.id, 1);
                    if (!validTargets.some(t => t.id === entityId)) {
                        addNotification('warning', 'No target in range');
                        return;
                    }
                    const result = processTacticalAttack(tacticalBattleState, current.id, entityId);
                    const hpAfter = result.newState.combatants.find(c => c.id === entityId)?.stats.hp ?? 0;
                    canvasRef.current?.processEvent({
                        type: 'battleAttack',
                        battleAttack: {
                            attackerId: current.id,
                            targetId: entityId,
                            damage: result.result.totalDamage ?? 0,
                            hit: result.result.hit,
                            isCritical: result.result.isCritical,
                            targetHpAfter: hpAfter,
                        },
                    });
                    if (result.result.hit) {
                        setScreenEffect(result.result.isCritical ? 'critical' : 'shake');
                    }
                    canvasRef.current?.cancelBattleSelection?.();
                    setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAction', selectedAction: undefined } : null);
                    advanceTacticalFrom(result.newState);
                    return;
                }
            }
        }

        // Use actual screen click position if available, otherwise fallback to calculation
        let screenX: number, screenY: number;
        if (screenPos) {
            screenX = screenPos.x;
            screenY = screenPos.y;
        } else {
            const pos = canvasRef.current?.getPlayerPosition() || { x: 0, y: 0 };
            screenX = (entity.x - pos.x + 10) * 32 + 100;
            screenY = (entity.y - pos.y + 8) * 32 + 50;
        }

        // Clamp to screen bounds with some padding
        const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1920) - 200;
        const maxY = (typeof window !== 'undefined' ? window.innerHeight : 1080) - 200;

        setContextMenu({
            show: true,
            x: Math.max(10, Math.min(screenX, maxX)),
            y: Math.max(10, Math.min(screenY, maxY)),
            type: 'entity',
            id: entityId,
            name: entity.name,
            hostile: entity.hostile,
        });
    }, [tacticalBattleState, tacticalUIState, selectedTacticalAbilityId, tacticalAbilities, activeCooldowns, energy, saveGameState, data, addNotification, advanceTacticalFrom]);

    // Object click: show action context menu or handle exit directly
    const handleObjectClick = useCallback((objectId: string, object: RoomObject, screenPos?: { x: number; y: number }) => {
        // Check if this is an exit object
        if (object.exit?.toLocation) {
            // Direct transition - no menu needed
            handleLocationTransition(object.exit.toLocation);
            return;
        }

        // Use actual screen click position if available
        let screenX: number, screenY: number;
        if (screenPos) {
            screenX = screenPos.x;
            screenY = screenPos.y;
        } else {
            const pos = canvasRef.current?.getPlayerPosition() || { x: 0, y: 0 };
            screenX = (object.x - pos.x + 10) * 32 + 100;
            screenY = (object.y - pos.y + 8) * 32 + 50;
        }

        // Check if object ID suggests an exit
        const exitPatterns = /^(sign|exit|door|gate|path)_?(to_?)?(.+)$/i;
        const match = objectId.match(exitPatterns);
        const isExit = !!(match && match[3]);
        const exitLocation = isExit ? match[3].replace(/_/g, ' ') : undefined;

        // Clamp to screen bounds with some padding
        const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1920) - 200;
        const maxY = (typeof window !== 'undefined' ? window.innerHeight : 1080) - 200;

        setContextMenu({
            show: true,
            x: Math.max(10, Math.min(screenX, maxX)),
            y: Math.max(10, Math.min(screenY, maxY)),
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
                // Immediately trigger combat UI - ALGORITHMIC (no AI)
                if (type === 'entity') {
                    const entity = canvasRef.current?.getEntity(id);
                    if (entity) {
                        initiateCombat({
                            name: entity.name || name,
                            hp: entity.hp || 30,
                            maxHp: entity.maxHp || entity.hp || 30,
                            ac: entity.ac || 12,
                            type: entity.hostile ? 'hostile' : 'neutral',
                        });
                    } else {
                        // Fallback if entity not found in canvas
                        initiateCombat({
                            name: name,
                            hp: 30,
                            maxHp: 30,
                            ac: 12,
                            type: hostile ? 'hostile' : 'neutral',
                        });
                    }
                }
                // Combat is algorithmic - no AI call needed!
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
    }, [contextMenu, handleLocationTransition, initiateCombat]);

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
        <div className="relative h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden">

            {/* === CHARACTER CREATION MODAL === */}
            {characterCreationConfig && (
                <CharacterCreationModal
                    isOpen={!!needsCharacterCreation && !characterCreated}
                    campaignId={campaignId}
                    config={characterCreationConfig}
                    onComplete={() => setCharacterCreated(true)}
                />
            )}

            {/* === FULL SCREEN GAME CANVAS === */}
            <div className="absolute inset-0">
                <AIGameCanvas
                    ref={canvasRef}
                    width={typeof window !== 'undefined' ? window.innerWidth : 1920}
                    height={typeof window !== 'undefined' ? window.innerHeight : 1080}
                    tileSize={32}
                    className="w-full h-full"
                    onTileClick={handleTileClick}
                    onEntityClick={handleEntityClick}
                    onObjectClick={handleObjectClick}
                    onHover={handleHover}
                    onReady={() => {
                        console.log('[PlayDF] Canvas ready - waiting for Map AI to generate room');
                    }}
                />
            </div>

            {/* === TOP BAR OVERLAY === */}
            <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
                <div className="flex items-start justify-between p-4">
                    {/* Left: Location & Back */}
                    <div className="pointer-events-auto">
                        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-sm rounded-xl p-3 border border-purple-500/20">
                            <Link href="/realms" className="p-2 hover:bg-purple-500/20 rounded-lg transition-all">
                                <ArrowLeft size={18} className="text-slate-400" />
                            </Link>
                            <div>
                                <h1 className="font-serif font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">
                                    {data.campaign.title}
                                </h1>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <MapPin size={10} className="text-cyan-400" />
                                    {data.locations?.find(l => l._id === currentLocationId)?.name || "Unknown"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Context & Actions */}
                    <div className="flex items-center gap-3 pointer-events-auto">
                        {aiOffline && (
                            <div className="px-3 py-2 rounded-xl text-xs font-bold tracking-wide uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                                AI offline (quota) • retry in ~{aiOfflineSeconds}s
                            </div>
                        )}
                        {/* Game Context Badge */}
                        <div className={cn(
                            "px-3 py-2 rounded-xl text-sm font-medium capitalize backdrop-blur-sm border",
                            gameContext === 'combat' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            gameContext === 'social' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            gameContext === 'rest' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        )}>
                            {gameContext === 'combat' && <Swords size={14} className="inline mr-2" />}
                            {gameContext}
                        </div>

                        {/* Character Sheet Button */}
                        <button
                            onClick={() => setCharacterSheetOpen(true)}
                            className="p-3 bg-slate-950/80 backdrop-blur-sm hover:bg-amber-500/20 rounded-xl text-slate-400 hover:text-amber-400 transition-all border border-purple-500/20 hover:border-amber-500/30"
                        >
                            <UserCircle size={20} />
                        </button>

                        {/* Inventory/Menu Toggle */}
                        <button
                            onClick={() => setShowPlayerHUD(prev => !prev)}
                            className="p-3 bg-slate-950/80 backdrop-blur-sm hover:bg-cyan-500/20 rounded-xl text-slate-400 hover:text-cyan-400 transition-all border border-purple-500/20 hover:border-cyan-500/30"
                        >
                            <Backpack size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* === BOTTOM STATS BAR === */}
            <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                <div className="p-4">
                    <div className="flex items-end justify-between">
                        {/* Left: Player Stats */}
                        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                            <div className="flex items-center gap-6">
                                {/* HP Bar */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20">
                                        <Heart size={16} className="text-red-400" />
                                    </div>
                                    <div>
                                        <div className="w-32 h-3 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                                animate={{ width: `${(hp / maxHp) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">{hp}/{maxHp}</span>
                                    </div>
                                </div>

                                {/* XP Bar */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20">
                                        <Trophy size={16} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="w-24 h-3 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                                                animate={{ width: `${(xp / xpToLevel) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-amber-400 font-mono font-bold">Level {level}</span>
                                    </div>
                                </div>

                                {/* Gold */}
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-lg">
                                    <Coins size={16} className="text-amber-400" />
                                    <span className="text-sm text-amber-400 font-mono font-bold">{gold}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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

                {/* === DEATH OVERLAY === */}
                {showDeathOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
                    >
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            >
                                <Skull className="w-24 h-24 mx-auto text-red-500 mb-4" />
                            </motion.div>
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-4xl font-bold text-red-500 mb-2"
                            >
                                YOU DIED
                            </motion.h1>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-slate-400 text-lg"
                            >
                                {deathXpLost > 0 ? `Lost ${deathXpLost} XP` : 'Respawning...'}
                            </motion.p>
                        </div>
                    </motion.div>
                )}

                {/* === FULL COMBAT OVERLAY === */}
                {combatState && combatState.isActive && (
                    <FullCombatOverlay
                        combat={combatState}
                        onAction={handleCombatAction}
                        onAbilityUse={handleCombatAbilityUse}
                        isLoading={isLoading}
                        onClose={() => setCombatState(null)}
                        activeDiceRoll={activeDiceRoll}
                    />
                )}

                {/* === TACTICAL BATTLE OVERLAY (Multi-combatant) === */}
                {tacticalUIState && (
                    <TacticalBattleOverlay
                        state={tacticalUIState}
                        onAction={(action) => {
                            if (!tacticalBattleState) return;

                            if (action === 'move') {
                                setSelectedTacticalAbilityId(null);
                                canvasRef.current?.showBattleMovementRange();
                                setTacticalUIState(prev => prev ? { ...prev, phase: 'selectMove', selectedAction: 'move', selectedAbilityId: undefined } : null);
                            } else if (action === 'attack') {
                                setSelectedTacticalAbilityId(null);
                                canvasRef.current?.showBattleAttackRange();
                                setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAttack', selectedAction: 'attack', selectedAbilityId: undefined } : null);
                            } else if (action === 'defend') {
                                // Process defend action
                                const current = getCurrentCombatant(tacticalBattleState);
                                if (current) {
                                    const { newState } = processTacticalDefend(tacticalBattleState, current.id);
                                    canvasRef.current?.cancelBattleSelection?.();
                                    canvasRef.current?.endBattleTurn?.();
                                    setSelectedTacticalAbilityId(null);
                                    setTacticalUIState(prev => prev ? { ...prev, phase: 'animating', selectedAction: undefined, selectedAbilityId: undefined } : null);
                                    // Advance turn and process AI if needed
                                    const advancedState = advanceTacticalTurn(newState);
                                    setTacticalBattleState(advancedState);
                                    syncTacticalUIState(advancedState);
                                    // Process AI turn if next combatant is enemy
                                    processAITurnIfNeeded(advancedState);
                                }
                            } else if (action === 'ability') {
                                canvasRef.current?.cancelBattleSelection?.();
                                setSelectedTacticalAbilityId(null);
                                setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAbility', selectedAction: 'ability', selectedAbilityId: undefined } : null);
                            } else if (action === 'flee') {
                                canvasRef.current?.exitBattleMode('fled');
                                setTacticalBattleState(null);
                                setTacticalUIState(null);
                                setSelectedTacticalAbilityId(null);
                                setGameContext('explore');
                            }
                        }}
                        onAbilitySelect={(abilityId) => {
                            setSelectedTacticalAbilityId(abilityId);
                            setTacticalUIState(prev => prev ? { ...prev, selectedAbilityId: abilityId } : null);
                        }}
                        onCancelSelection={() => {
                            canvasRef.current?.cancelBattleSelection?.();
                            setSelectedTacticalAbilityId(null);
                            setTacticalUIState(prev => prev ? { ...prev, phase: 'selectAction', selectedAction: undefined, selectedAbilityId: undefined } : null);
                        }}
                        onEndTurn={() => {
                            if (!tacticalBattleState) return;
                            canvasRef.current?.cancelBattleSelection?.();
                            canvasRef.current?.endBattleTurn?.();
                            setSelectedTacticalAbilityId(null);
                            const advancedState = advanceTacticalTurn(tacticalBattleState);
                            setTacticalBattleState(advancedState);
                            syncTacticalUIState(advancedState);
                            processAITurnIfNeeded(advancedState);
                        }}
                        onFlee={() => {
                            // Handle flee from tactical combat
                            canvasRef.current?.exitBattleMode('fled');
                            setTacticalBattleState(null);
                            setTacticalUIState(null);
                            setSelectedTacticalAbilityId(null);
                            setGameContext('explore');
                        }}
                        isLoading={isProcessingCombat}
                        movementRange={3}
                        attackRange={1}
                        abilities={tacticalAbilities}
                        playerEnergy={energy}
                        maxEnergy={maxEnergy}
                    />
                )}

                {/* === PERSUASION PANEL === */}
                {persuasionState && (
                    <PersuasionPanel
                        state={persuasionState}
                        charisma={(() => {
                            try {
                                const parsed = JSON.parse(data?.character?.stats || '{}');
                                return parsed.charisma || parsed.CHA || 10;
                            } catch {
                                return 10;
                            }
                        })()}
                        onAttempt={async (approach: PersuasionApproach) => {
                            if (!persuasionTargetNpc || !playerId) return;

                            // Get player charisma
                            let playerCharisma = 10;
                            try {
                                const parsed = JSON.parse(data?.character?.stats || '{}');
                                playerCharisma = parsed.charisma || parsed.CHA || 10;
                            } catch { /* use default */ }

                            try {
                                const result = await attemptPersuasionMutation({
                                    campaignId,
                                    playerId,
                                    npcId: persuasionTargetNpc._id,
                                    playerCharisma,
                                    approach,
                                });

                                if (!result.success) {
                                    // Handle error or exhausted attempts
                                    if (result.exhausted) {
                                        setPersuasionState(prev => prev ? {
                                            ...prev,
                                            attempts: 5,
                                            goldCost: result.goldCost ?? prev.goldCost,
                                        } : null);
                                    }
                                    return;
                                }

                                // Update persuasion state with result
                                setPersuasionState(prev => prev ? {
                                    ...prev,
                                    progress: result.newProgress ?? prev.progress,
                                    attempts: result.attemptsUsed ?? prev.attempts,
                                    cooldownRemaining: 30, // 30 second cooldown
                                    lastRollResult: {
                                        roll: result.roll ?? 0,
                                        modifier: (result.charismaMod ?? 0) + (result.approachMod ?? 0),
                                        total: result.totalScore ?? 0,
                                        success: result.progressGained ? result.progressGained > 15 : false,
                                        progressGained: result.progressGained ?? 0,
                                    },
                                } : null);

                                // Check if persuasion succeeded
                                if (result.persuaded) {
                                    addNotification('achievement', 'Follower Recruited!', `${persuasionTargetNpc.name} has joined your party!`);
                                    setTimeout(() => {
                                        setPersuasionState(null);
                                        setPersuasionTargetNpc(null);
                                    }, 2000);
                                }
                            } catch (err) {
                                console.error('[Persuasion] Error:', err);
                            }
                        }}
                        onGoldRecruit={() => {
                            // Gold recruitment is handled separately via existing recruit mutation
                            setPersuasionState(null);
                            setPersuasionTargetNpc(null);
                        }}
                        onClose={() => {
                            setPersuasionState(null);
                            setPersuasionTargetNpc(null);
                        }}
                        isLoading={isLoading}
                        playerGold={gold}
                    />
                )}

                {rewardQueue.map((reward, index) => (
                    <motion.div
                        key={reward.id || `reward_${index}`}
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

                {/* === DIALOGUE SYSTEM OVERLAYS === */}
                {/* Notification Queue - top right corner */}
                <NotificationQueue
                    notifications={notifications.map(n => ({
                        id: n.id,
                        type: n.type,
                        title: n.title,
                        description: n.message
                    }))}
                    onDismiss={removeNotification}
                />

                {/* Dialogue Manager - handles dialogue box and choices */}
                {dialogueState && (
                    <DialogueManager
                        dialogue={dialogueState}
                        onDialogueAdvance={() => {
                            setDialogueState(prev => {
                                if (!prev) return null;
                                if (prev.isComplete) return prev; // Choices are showing
                                const nextIndex = prev.currentLineIndex + 1;
                                if (nextIndex >= prev.lines.length) {
                                    // If no more lines but has choices, keep showing choices
                                    if (prev.choices && prev.choices.length > 0) {
                                        return {
                                            ...prev,
                                            currentLineIndex: Math.max(prev.lines.length - 1, 0),
                                            isComplete: true
                                        };
                                    }
                                    return null; // No more dialogue
                                }
                                return { ...prev, currentLineIndex: nextIndex };
                            });
                        }}
                        onDialogueComplete={() => {
                            setDialogueState(null);
                        }}
                        onChoiceSelect={(choiceId) => {
                            const choice = dialogueState.choices?.find(c => c.id === choiceId);
                            if (choice) {
                                handleSendMessage(choice.text);
                                setDialogueState(null);
                            }
                        }}
                    />
                )}

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

            {/* === PLAYER HUD (Inventory Panel - toggle) === */}
            <AnimatePresence>
                {showPlayerHUD && data?.character && (
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        className="fixed right-0 top-0 bottom-0 z-30"
                    >
                        <PlayerHUD
                            character={{
                                name: data.character.name,
                                class: data.character.class,
                                race: data.character.race,
                                level: level,
                                stats: (() => {
                                    try {
                                        const parsed = JSON.parse(data.character.stats || '{}');
                                        return {
                                            strength: parsed.strength || parsed.STR || 10,
                                            dexterity: parsed.dexterity || parsed.DEX || 10,
                                            constitution: parsed.constitution || parsed.CON || 10,
                                            intelligence: parsed.intelligence || parsed.INT || 10,
                                            wisdom: parsed.wisdom || parsed.WIS || 10,
                                            charisma: parsed.charisma || parsed.CHA || 10,
                                        };
                                    } catch {
                                        return { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
                                    }
                                })(),
                                imageUrl: null,
                            }}
                            playerState={{
                                hp,
                                maxHp,
                                energy,
                                maxEnergy,
                                xp,
                                level,
                                gold,
                                activeBuffs: playerGameState?.activeBuffs ? (() => {
                                    try {
                                        return JSON.parse(playerGameState.activeBuffs);
                                    } catch {
                                        return [];
                                    }
                                })() : [],
                            }}
                            inventory={(playerInventory || []).map((item: any, idx: number) => ({
                                id: item.inventoryId || item.itemId || `inv_${idx}`,
                                itemId: item.itemId,
                                name: item.name,
                                type: item.type,
                                rarity: (item.rarity?.toLowerCase() || 'common') as Rarity,
                                category: item.type?.toLowerCase(),
                                effects: item.effects,
                                description: item.description,
                                quantity: item.quantity,
                                equippedSlot: item.equippedSlot,
                                usable: item.usable,
                                consumable: item.consumable,
                            }))}
                            xpToNextLevel={xpToLevel}
                            equippedSlots={{
                                weapon: (playerInventory || []).find((i: any) => i.equippedSlot === 'weapon') ? {
                                    id: (playerInventory || []).find((i: any) => i.equippedSlot === 'weapon')!.inventoryId,
                                    itemId: (playerInventory || []).find((i: any) => i.equippedSlot === 'weapon')!.itemId,
                                    name: (playerInventory || []).find((i: any) => i.equippedSlot === 'weapon')!.name,
                                    type: (playerInventory || []).find((i: any) => i.equippedSlot === 'weapon')!.type,
                                    rarity: ((playerInventory || []).find((i: any) => i.equippedSlot === 'weapon')!.rarity?.toLowerCase() || 'common') as Rarity,
                                    quantity: 1,
                                } : null,
                                armor: (playerInventory || []).find((i: any) => i.equippedSlot === 'armor') ? {
                                    id: (playerInventory || []).find((i: any) => i.equippedSlot === 'armor')!.inventoryId,
                                    itemId: (playerInventory || []).find((i: any) => i.equippedSlot === 'armor')!.itemId,
                                    name: (playerInventory || []).find((i: any) => i.equippedSlot === 'armor')!.name,
                                    type: (playerInventory || []).find((i: any) => i.equippedSlot === 'armor')!.type,
                                    rarity: ((playerInventory || []).find((i: any) => i.equippedSlot === 'armor')!.rarity?.toLowerCase() || 'common') as Rarity,
                                    quantity: 1,
                                } : null,
                                accessory: (playerInventory || []).find((i: any) => i.equippedSlot === 'accessory') ? {
                                    id: (playerInventory || []).find((i: any) => i.equippedSlot === 'accessory')!.inventoryId,
                                    itemId: (playerInventory || []).find((i: any) => i.equippedSlot === 'accessory')!.itemId,
                                    name: (playerInventory || []).find((i: any) => i.equippedSlot === 'accessory')!.name,
                                    type: (playerInventory || []).find((i: any) => i.equippedSlot === 'accessory')!.type,
                                    rarity: ((playerInventory || []).find((i: any) => i.equippedSlot === 'accessory')!.rarity?.toLowerCase() || 'common') as Rarity,
                                    quantity: 1,
                                } : null,
                            }}
                            onUseItem={async (itemId) => {
                                // Find the item name
                                const item = (playerInventory || []).find((i: any) =>
                                    i.inventoryId === itemId || i.itemId === itemId
                                );
                                if (item) {
                                    // Clear any stale dialogue choices
                                    setDialogueState(null);
                                    setCurrentChoices([]);
                                    // Send action to AI
                                    handleSendMessage(`I use ${item.name}`);
                                }
                            }}
                            onEquipItem={async (itemId, slot) => {
                                const item = (playerInventory || []).find((i: any) =>
                                    i.inventoryId === itemId || i.itemId === itemId
                                );
                                if (item) {
                                    setDialogueState(null);
                                    setCurrentChoices([]);
                                    handleSendMessage(`I equip ${item.name}`);
                                }
                            }}
                            onDropItem={async (itemId) => {
                                const item = (playerInventory || []).find((i: any) =>
                                    i.inventoryId === itemId || i.itemId === itemId
                                );
                                if (item) {
                                    setDialogueState(null);
                                    setCurrentChoices([]);
                                    handleSendMessage(`I drop ${item.name}`);
                                }
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === HOVER TOOLTIP === */}
            {hoverInfo && (
                <div
                    className="fixed pointer-events-none z-50 px-3 py-2 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl"
                    style={{
                        left: hoverInfo.screenX + 15,
                        top: hoverInfo.screenY - 10,
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

            {/* === CONTEXT MENU === */}
            {contextMenu?.show && (
                <div
                    className="fixed z-50 min-w-[160px] bg-slate-900/98 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                        <span className="font-medium text-amber-400">{contextMenu.name}</span>
                    </div>
                    <div className="py-2">
                        {contextMenu.type === 'entity' && (
                            <>
                                {!contextMenu.hostile && (
                                    <>
                                        <button
                                            onClick={() => handleContextMenuAction('talk')}
                                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-500/20 text-slate-200 flex items-center gap-3 transition-colors"
                                        >
                                            <MessageSquare size={16} className="text-cyan-400" />
                                            Talk
                                        </button>
                                        <button
                                            onClick={() => {
                                                setChatInputTarget({ name: contextMenu.name, x: contextMenu.x, y: contextMenu.y });
                                                setContextMenu(null);
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-green-500/20 text-slate-200 flex items-center gap-3 transition-colors"
                                        >
                                            <Send size={16} className="text-green-400" />
                                            Say something...
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => handleContextMenuAction('attack')}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/20 text-slate-200 flex items-center gap-3 transition-colors"
                                >
                                    <Sword size={16} className="text-red-400" />
                                    Attack
                                </button>
                                <button
                                    onClick={() => handleContextMenuAction('examine')}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-500/20 text-slate-200 flex items-center gap-3 transition-colors"
                                >
                                    <Eye size={16} className="text-purple-400" />
                                    Examine
                                </button>
                            </>
                        )}
                        {contextMenu.type === 'object' && (
                            <>
                                {contextMenu.isExit ? (
                                    <button
                                        onClick={() => handleContextMenuAction('exit')}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-green-500/20 text-slate-200 flex items-center gap-3 transition-colors"
                                    >
                                        <ArrowRight size={16} className="text-green-400" />
                                        Go to {contextMenu.exitLocation}
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleContextMenuAction('use')}
                                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-500/20 text-slate-200 flex items-center gap-3 transition-colors"
                                        >
                                            <Hand size={16} className="text-amber-400" />
                                            Use
                                        </button>
                                        <button
                                            onClick={() => handleContextMenuAction('examine')}
                                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-500/20 text-slate-200 flex items-center gap-3 transition-colors"
                                        >
                                            <Eye size={16} className="text-purple-400" />
                                            Examine
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    <div className="px-4 py-2 border-t border-slate-700">
                        <button
                            onClick={() => setContextMenu(null)}
                            className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* === CHAT INPUT POPUP (appears during interactions) === */}
            {chatInputTarget && (
                <div
                    className="fixed z-50 bg-slate-900/98 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
                    style={{ left: chatInputTarget.x, top: chatInputTarget.y }}
                >
                    <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                        <span className="font-medium text-amber-400">Say to {chatInputTarget.name}</span>
                        <button
                            onClick={() => setChatInputTarget(null)}
                            className="text-slate-500 hover:text-slate-300"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="p-3 flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && input.trim()) {
                                    handleSendMessage(`I say to ${chatInputTarget.name}: "${input}"`);
                                    setInput('');
                                    setChatInputTarget(null);
                                } else if (e.key === 'Escape') {
                                    setChatInputTarget(null);
                                }
                            }}
                            placeholder="What do you say?"
                            className="w-64 bg-slate-800/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-transparent focus:border-purple-500/30"
                            disabled={isLoading}
                            autoFocus
                        />
                        <motion.button
                            onClick={() => {
                                if (input.trim()) {
                                    handleSendMessage(`I say to ${chatInputTarget.name}: "${input}"`);
                                    setInput('');
                                    setChatInputTarget(null);
                                }
                            }}
                            disabled={isLoading || !input.trim()}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                        </motion.button>
                    </div>
                </div>
            )}

            {/* === LOADING INDICATOR === */}
            {isLoading && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 px-4 py-3 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-purple-500/30 min-w-[280px]">
                    <div className="flex items-center gap-3 w-full">
                        <Loader2 size={18} className="text-purple-400 animate-spin" />
                        <span className="text-sm text-slate-300">
                            {isSlowStream ? "Still thinking..." : "The narrator is thinking..."}
                        </span>
                    </div>
                    {isSlowStream && (
                        <div className="flex items-center gap-2 w-full pt-2 border-t border-slate-700/50">
                            <span className="text-xs text-slate-400 flex-1">
                                OpenRouter can be slow. You can cancel or wait.
                            </span>
                            <button
                                onClick={() => {
                                    if (streamAbortControllerRef.current) {
                                        streamAbortControllerRef.current.abort();
                                        streamAbortControllerRef.current = null;
                                    }
                                    setIsLoading(false);
                                    setIsSlowStream(false);
                                    setMessages(prev => [...prev, {
                                        role: 'model',
                                        content: "Request cancelled."
                                    }]);
                                }}
                                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}

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
