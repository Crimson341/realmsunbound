'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ArrowLeft, Loader2, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Import game components (dynamic import for SSR safety)
const GameCanvas = dynamic(() => import('../../../game/ui/GameCanvas'), { ssr: false });
import { GameHUD } from '../../../game/ui/GameHUD';
import { DialogueBox } from '../../../game/ui/DialogueBox';
import { GameEngine } from '../../../game/engine/GameEngine';
import { WorldManager } from '../../../game/world/WorldManager';
import { NPC } from '../../../game/entities/NPC';

// Import existing UI components
import { InventoryPanel } from '../../../components/InventoryPanel';
import { AbilitiesBar } from '../../../components/AbilitiesBar';
import CharacterSheetModal from '../../../components/CharacterSheetModal';

export default function Play2DPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as Id<"campaigns">;

  // Convex queries
  const data = useQuery(api.forge.getCampaignDetails, { campaignId });
  const playerIdForAbilities = data?.character?.userId || "";

  // Engine refs
  const engineRef = useRef<GameEngine | null>(null);
  const worldManagerRef = useRef<WorldManager | null>(null);

  // Game state
  const [isReady, setIsReady] = useState(false);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [hp, setHp] = useState(20);
  const [maxHp] = useState(20);
  const [energy, setEnergy] = useState(100);
  const [maxEnergy] = useState(100);
  const [gold, setGold] = useState(0);
  const [level, setLevel] = useState(1);

  // UI state
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isInventoryOpen, setInventoryOpen] = useState(false);
  const [isCharacterSheetOpen, setCharacterSheetOpen] = useState(false);

  // Dialogue state
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [dialogueNPC, setDialogueNPC] = useState<{ name: string; role: string } | null>(null);
  const [dialogueText, setDialogueText] = useState('');
  const [dialogueChoices, setDialogueChoices] = useState<Array<{ text: string; action?: string }>>([]);
  const [isDialogueLoading, setIsDialogueLoading] = useState(false);

  // Engine ready callback
  const handleEngineReady = useCallback((engine: GameEngine) => {
    engineRef.current = engine;
    worldManagerRef.current = new WorldManager(engine);
    setIsReady(true);
  }, []);

  // Load initial location when data and engine are ready
  useEffect(() => {
    if (!isReady || !data || !worldManagerRef.current) return;
    if (data.locations && data.locations.length > 0) {
      const startLocation = data.locations[0];
      const npcsAtLocation = data.npcs?.filter((n: any) =>
        n.locationId === startLocation._id && !n.isDead
      ) || [];

      worldManagerRef.current.loadLocation(
        {
          _id: startLocation._id,
          name: startLocation.name,
          type: startLocation.type || 'town',
          description: startLocation.description || '',
          tilemapData: startLocation.tilemapData,
          tilemapWidth: startLocation.tilemapWidth,
          tilemapHeight: startLocation.tilemapHeight,
          collisionMask: startLocation.collisionMask,
          spawnPoints: startLocation.spawnPoints,
          transitions: startLocation.transitions,
        },
        npcsAtLocation.map((n: any) => ({
          _id: n._id,
          name: n.name,
          description: n.description || '',
          role: n.role || 'villager',
          isHostile: n.isHostile || false,
          isDead: n.isDead || false,
          gridX: n.gridX,
          gridY: n.gridY,
          spriteColor: n.spriteColor,
        }))
      );

      setCurrentLocationId(startLocation._id);
    }
  }, [isReady, data]);

  // Handle NPC interaction
  const handleInteract = useCallback(async (npc: NPC) => {
    if (!data) return;

    // Pause game
    engineRef.current?.pause();

    // Find NPC data
    const npcData = data.npcs?.find((n: any) => n._id === npc.id);

    setDialogueNPC({
      name: npc.name,
      role: npcData?.role || npc.role || 'villager',
    });
    setDialogueOpen(true);
    setIsDialogueLoading(true);
    setDialogueText('');
    setDialogueChoices([]);

    // Call AI for dialogue
    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
      const httpUrl = convexUrl.includes("convex.cloud")
        ? convexUrl.replace("convex.cloud", "convex.site")
        : convexUrl;

      const response = await fetch(`${httpUrl}/api/stream-narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `I approach ${npc.name} and greet them.`,
          history: [],
          campaignId: data.campaign._id,
          currentLocationId,
          playerId: playerIdForAbilities,
          playerState: {
            name: data.character?.name || "Traveler",
            class: data.character?.class || "Unknown",
            level,
            hp,
            maxHp,
          },
          isNPCDialogue: true,
          targetNPCId: npc.id,
        }),
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      let choices: Array<{ text: string }> = [];

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Parse narrative content - handle both XML and markdown formats
        // XML format: <narrative>...</narrative>
        const xmlNarrativeMatch = buffer.match(/<narrative>([\s\S]*?)<\/narrative>/);
        // Markdown format: ```narrative ... ```
        const mdNarrativeMatch = buffer.match(/```narrative\s*([\s\S]*?)```/);

        const narrativeMatch = xmlNarrativeMatch || mdNarrativeMatch;
        if (narrativeMatch) {
          fullText = narrativeMatch[1].trim();
          setDialogueText(fullText);
        } else {
          // Look for streaming text fragments
          const textMatches = chunk.matchAll(/"text":\s*"((?:[^"\\]|\\.)*)"/g);
          for (const match of textMatches) {
            try {
              const textContent = JSON.parse(`"${match[1]}"`);
              // Filter out XML/markdown tags
              const cleanText = textContent
                .replace(/<narrative>|<\/narrative>/g, '')
                .replace(/```narrative|```data|```/g, '')
                .replace(/<data>[\s\S]*?<\/data>/g, '');
              if (cleanText.trim()) {
                fullText += cleanText;
                setDialogueText(fullText);
              }
            } catch {}
          }
        }

        // Parse data/choices - handle both XML and markdown formats
        // XML format: <data>...</data>
        const xmlDataMatch = buffer.match(/<data>([\s\S]*?)<\/data>/);
        // Markdown format: ```data ... ```
        const mdDataMatch = buffer.match(/```data\s*([\s\S]*?)```/);

        const dataMatch = xmlDataMatch || mdDataMatch;
        if (dataMatch) {
          try {
            const jsonStr = dataMatch[1].replace(/```json|```/g, '').trim();
            const json = JSON.parse(jsonStr);
            if (json.choices) {
              choices = json.choices.map((c: any) =>
                typeof c === 'string' ? { text: c } : { text: c.text || c }
              );
            }
          } catch (e) {
            console.error('Failed to parse dialogue data:', e);
          }
        }
      }

      setDialogueChoices(choices);
    } catch (error) {
      console.error('Dialogue error:', error);
      setDialogueText("...");
      setDialogueChoices([{ text: "Leave" }]);
    } finally {
      setIsDialogueLoading(false);
    }
  }, [data, currentLocationId, playerIdForAbilities, level, hp, maxHp]);

  // Handle combat trigger
  const handleCombatTrigger = useCallback((enemy: NPC) => {
    // For MVP, just show a message - full combat system comes later
    engineRef.current?.pause();
    setDialogueNPC({ name: enemy.name, role: 'enemy' });
    setDialogueText(`${enemy.name} attacks! (Combat system coming soon)`);
    setDialogueChoices([{ text: 'Flee (return to safety)', action: 'flee' }]);
    setDialogueOpen(true);
  }, []);

  // Handle location transition
  const handleTransition = useCallback((toLocationId: string, spawnPoint: { x: number; y: number }) => {
    if (!data || !worldManagerRef.current) return;

    const newLocation = data.locations?.find((l: any) => l._id === toLocationId);
    if (!newLocation) return;

    const npcsAtLocation = data.npcs?.filter((n: any) =>
      n.locationId === toLocationId && !n.isDead
    ) || [];

    worldManagerRef.current.loadLocation(
      {
        _id: newLocation._id,
        name: newLocation.name,
        type: newLocation.type || 'town',
        description: newLocation.description || '',
        tilemapData: newLocation.tilemapData,
        tilemapWidth: newLocation.tilemapWidth,
        tilemapHeight: newLocation.tilemapHeight,
        collisionMask: newLocation.collisionMask,
        spawnPoints: newLocation.spawnPoints,
        transitions: newLocation.transitions,
      },
      npcsAtLocation.map((n: any) => ({
        _id: n._id,
        name: n.name,
        description: n.description || '',
        role: n.role || 'villager',
        isHostile: n.isHostile || false,
        isDead: n.isDead || false,
        gridX: n.gridX,
        gridY: n.gridY,
        spriteColor: n.spriteColor,
      })),
      spawnPoint
    );

    setCurrentLocationId(toLocationId);
  }, [data]);

  // Handle dialogue close
  const handleDialogueClose = useCallback(() => {
    setDialogueOpen(false);
    setDialogueNPC(null);
    setDialogueText('');
    setDialogueChoices([]);
    engineRef.current?.resume();
  }, []);

  // Handle dialogue choice
  const handleDialogueChoice = useCallback((choice: { text: string; action?: string }) => {
    if (choice.action === 'flee') {
      handleDialogueClose();
      return;
    }
    // For now, just close dialogue
    handleDialogueClose();
  }, [handleDialogueClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyI') {
        setInventoryOpen(prev => !prev);
      }
      if (e.code === 'KeyC') {
        setCharacterSheetOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Loading state
  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center bg-genshin-dark text-genshin-gold">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  const currentLocation = data.locations?.find((l: any) => l._id === currentLocationId);

  return (
    <div className="flex h-screen bg-genshin-dark text-stone-200 overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b border-genshin-gold/20 flex items-center justify-between px-4 bg-genshin-dark/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Link href="/realms" className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={18} className="text-stone-400 hover:text-genshin-gold" />
          </Link>
          <div>
            <h1 className="font-serif font-bold text-genshin-gold text-sm">{data.campaign.title}</h1>
            <p className="text-xs text-stone-500">2D Mode (Alpha)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/play/${campaignId}`)}
            className="text-xs text-stone-500 hover:text-genshin-gold px-3 py-1 border border-stone-700 rounded hover:border-genshin-gold/50 transition-colors"
          >
            Switch to Text Mode
          </button>
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-full text-stone-400 hover:text-genshin-gold"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex items-center justify-center pt-14">
        <div className="relative">
          {/* Game Canvas */}
          <GameCanvas
            width={1280}
            height={720}
            tileSize={32}
            onEngineReady={handleEngineReady}
            onInteract={handleInteract}
            onCombatTrigger={handleCombatTrigger}
            onTransition={handleTransition}
          />

          {/* HUD Overlay */}
          {isReady && (
            <GameHUD
              locationName={currentLocation?.name || 'Unknown'}
              hp={hp}
              maxHp={maxHp}
              energy={energy}
              maxEnergy={maxEnergy}
              gold={gold}
              level={level}
            />
          )}
        </div>
      </main>

      {/* Dialogue Box */}
      <DialogueBox
        isOpen={dialogueOpen}
        speakerName={dialogueNPC?.name || ''}
        speakerRole={dialogueNPC?.role}
        text={dialogueText}
        choices={dialogueChoices}
        isLoading={isDialogueLoading}
        onClose={handleDialogueClose}
        onChoiceSelect={handleDialogueChoice}
        onContinue={handleDialogueClose}
      />

      {/* Right Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <aside className="fixed top-14 right-0 bottom-0 w-72 bg-genshin-dark/95 border-l border-genshin-gold/20 p-4 z-10 overflow-y-auto">
            <div className="space-y-4">
              {/* Inventory Button */}
              <button
                onClick={() => setInventoryOpen(true)}
                className="w-full text-left px-4 py-3 bg-stone-800/50 hover:bg-genshin-gold/10 border border-stone-700 hover:border-genshin-gold/50 rounded-lg transition-colors"
              >
                <span className="text-sm text-stone-300">Inventory</span>
                <span className="block text-xs text-stone-500 mt-0.5">Press I</span>
              </button>

              {/* Character Sheet Button */}
              <button
                onClick={() => setCharacterSheetOpen(true)}
                className="w-full text-left px-4 py-3 bg-stone-800/50 hover:bg-genshin-gold/10 border border-stone-700 hover:border-genshin-gold/50 rounded-lg transition-colors"
              >
                <span className="text-sm text-stone-300">Character</span>
                <span className="block text-xs text-stone-500 mt-0.5">Press C</span>
              </button>

              {/* Quick Info */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-xs text-stone-500 uppercase tracking-wide mb-2">Location</h3>
                <p className="text-sm text-stone-300">{currentLocation?.name || 'Unknown'}</p>
                <p className="text-xs text-stone-500 mt-1 line-clamp-3">
                  {currentLocation?.description || 'No description available.'}
                </p>
              </div>
            </div>
          </aside>
        )}
      </AnimatePresence>

      {/* Inventory Modal */}
      <AnimatePresence>
        {isInventoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative bg-genshin-dark border border-genshin-gold/30 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-genshin-gold/20">
                <h2 className="font-serif text-genshin-gold font-bold">Inventory</h2>
                <button
                  onClick={() => setInventoryOpen(false)}
                  className="p-1 hover:bg-white/10 rounded text-stone-400 hover:text-genshin-gold transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <InventoryPanel
                  campaignId={campaignId}
                  playerId={playerIdForAbilities}
                  compact
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

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
