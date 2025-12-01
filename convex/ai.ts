import { action, httpAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Type definitions for campaign entities
interface Location {
    _id: Id<"locations">;
    name: string;
    type: string;
    description: string;
}

interface NPC {
    _id: Id<"npcs">;
    name: string;
    description: string;
    role: string;
    attitude: string;
    locationId?: Id<"locations">;
    factionId?: Id<"factions">;
    isRecruitable?: boolean;
    isEssential?: boolean;
    isDead?: boolean;
    deathCause?: string;
    killedBy?: string;
}

interface Faction {
    _id: Id<"factions">;
    name: string;
    description: string;
    territory?: string;
}

interface Region {
    _id: Id<"regions">;
    name: string;
    description?: string;
    governingFactionId?: Id<"factions">;
}

interface Quest {
    _id: Id<"quests">;
    title: string;
    description: string;
    status: string;
    npcId?: Id<"npcs">;
    locationId?: Id<"locations">;
}

interface Monster {
    _id: Id<"monsters">;
    name: string;
    description: string;
}

interface Item {
    _id: Id<"items">;
    name: string;
    type: string;
    description?: string;
    effects: string;
    usable?: boolean;
    consumable?: boolean;
}

interface AbilitySystemConfig {
    abilityName?: string;  // "Spells", "Jutsu", "Powers", etc.
    energyName?: string;   // "Mana", "Chakra", "Stamina", etc.
    categories?: string[]; // ["Ninjutsu", "Taijutsu", "Genjutsu"]
}

interface Campaign {
    _id: Id<"campaigns">;
    title: string;
    description: string;
    rules: string;
    worldBible?: string;
    aiPersona?: string;
    terminology?: string;
    abilitySystemConfig?: AbilitySystemConfig;
    bountyEnabled?: boolean;
}

interface CampaignData {
    campaign: Campaign;
    locations: Location[];
    npcs: NPC[];
    deadNpcs?: NPC[];
    monsters: Monster[];
    items: Item[];
    quests: Quest[];
    factions?: Faction[];
    regions?: Region[];
    bountyEnabled?: boolean;
}

interface PlayerState {
    name: string;
    class: string;
    level: number;
    hp: number;
    maxHp: number;
    inventory?: string[];
    abilities?: string[];
    reputation?: Record<string, number>;
    stats?: {
        strength?: number;
        str?: number;
        dexterity?: number;
        dex?: number;
        constitution?: number;
        con?: number;
        intelligence?: number;
        int?: number;
        wisdom?: number;
        wis?: number;
        charisma?: number;
        cha?: number;
    };
}

interface Bounty {
    totalBounty: number;
    dangerLevel: string;
    activeBounties?: { regionName: string }[];
}

interface Rumor {
    type: string;
    content: string;
    isRecent?: boolean;
}

interface CampFollower {
    npc?: { name: string };
    role: string;
}

interface Camp {
    name: string;
    locationName?: string;
    followers?: CampFollower[];
    resources?: { gold?: number; food?: number };
}

interface Shop {
    name: string;
    type: string;
    description?: string;
    itemCount: number;
    isOpen?: boolean;
    shopkeeperName?: string;
}

interface ConditionSummary {
    blockedLocations?: { locationName: string; reason: string }[];
    activeRules?: string[];
    playerFlags?: { key: string; value: string }[];
}

// Story context from context optimization system
interface StoryEvent {
    type: string;
    title: string;
    description: string;
    importance: number;
}

interface StoryContext {
    storySummary?: string;         // Condensed summary of past events
    storyEvents?: StoryEvent[];    // Key plot points
    anchorMoments?: string[];      // Important moments that should always be remembered
}

interface WorldState {
    bounty?: Bounty;
    isJailed?: boolean;
    rumors?: Rumor[];
    npcsAtLocation?: NPC[];
    deadAtLocation?: NPC[];
    camp?: Camp;
    shopsAtLocation?: Shop[];
    conditions?: ConditionSummary;
    storyContext?: StoryContext;   // New: optimized story context
    currentLocationId?: string;    // New: for relevance filtering
}

interface ChatMessage {
    role: string;
    content: string;
}

// =============================================================================
// TIERED CONTEXT HELPERS - Filter and prioritize entities by relevance
// =============================================================================

// Filter NPCs by relevance to current situation
// IMPORTANT: Only include NPCs at current location to prevent cross-room NPC responses
function filterNpcsByRelevance(
  npcs: NPC[],
  locations: Location[],
  currentLocationId?: string,
  maxNpcs: number = 25
): { critical: NPC[]; relevant: NPC[]; background: NPC[] } {
  const critical: NPC[] = [];
  const relevant: NPC[] = [];
  // Background tier removed - was causing NPCs from other rooms to respond

  for (const npc of npcs) {
    // Skip dead NPCs for regular lists
    if (npc.isDead) {
      continue;
    }

    // Critical: ONLY NPCs at current location
    if (currentLocationId && npc.locationId?.toString() === currentLocationId) {
      critical.push(npc);
    }
    // Relevant: Essential NPCs that the player should always know about (story-critical)
    // These can be referenced but should not respond to dialogue in other rooms
    else if (npc.isEssential) {
      relevant.push(npc);
    }
    // All other NPCs are excluded - they're in different rooms and shouldn't respond
  }

  return {
    critical,
    relevant: relevant.slice(0, Math.max(0, maxNpcs - critical.length)),
    background: [], // Empty - no background NPCs to prevent cross-room responses
  };
}

// Filter locations by relevance
function filterLocationsByRelevance(
  locations: Location[],
  currentLocationId?: string,
  questLocationIds: string[] = [],
  maxLocations: number = 15
): { critical: Location[]; relevant: Location[]; background: Location[] } {
  const critical: Location[] = [];
  const relevant: Location[] = [];
  const background: Location[] = [];

  const questLocSet = new Set(questLocationIds);

  for (const loc of locations) {
    // Critical: Current location
    if (currentLocationId && loc._id.toString() === currentLocationId) {
      critical.push(loc);
    }
    // Relevant: Quest-related locations
    else if (questLocSet.has(loc._id.toString())) {
      relevant.push(loc);
    }
    // Background: Everything else
    else {
      background.push(loc);
    }
  }

  const maxBackground = Math.max(0, maxLocations - critical.length - relevant.length);

  return {
    critical,
    relevant,
    background: background.slice(0, maxBackground),
  };
}

// Filter quests - only include active ones
function filterQuestsByRelevance(
  quests: Quest[],
  maxQuests: number = 10
): { active: Quest[]; available: Quest[] } {
  const active = quests.filter((q) => q.status === "active");
  const available = quests.filter((q) => q.status === "available");

  return {
    active: active.slice(0, maxQuests),
    available: available.slice(0, Math.max(0, maxQuests - active.length)),
  };
}

// =============================================================================
// MAIN CONTEXT GENERATOR
// =============================================================================

// Helper to generate context
const generateWorldContext = (campaignData: CampaignData, playerState?: PlayerState, worldState?: WorldState) => {
    const { 
      campaign, 
      locations, 
      npcs,
      deadNpcs,
      monsters, 
      items,
      quests,
      factions,
      regions,
      bountyEnabled
    } = campaignData;

    // Parse terminology - prefer abilitySystemConfig, fall back to legacy terminology
    let terms = { spells: "Spells", mana: "Mana", class: "Class", level: "Level" };

    // Use abilitySystemConfig if available (new genre-agnostic system)
    if (campaign.abilitySystemConfig) {
        if (campaign.abilitySystemConfig.abilityName) {
            terms.spells = campaign.abilitySystemConfig.abilityName;
        }
        if (campaign.abilitySystemConfig.energyName) {
            terms.mana = campaign.abilitySystemConfig.energyName;
        }
    }

    // Fall back to legacy terminology for any remaining values
    if (campaign.terminology) {
        try {
            const customTerms = JSON.parse(campaign.terminology);
            terms = { ...terms, ...customTerms };
        } catch { /* ignore */ }
    }

    // Get ability categories for context
    const abilityCategories = campaign.abilitySystemConfig?.categories || [];

    // =============================================================================
    // TIERED CONTEXT FILTERING - Prioritize relevant information
    // =============================================================================

    const currentLocationId = worldState?.currentLocationId;

    // Filter NPCs by relevance
    const npcTiers = filterNpcsByRelevance(npcs, locations, currentLocationId);
    const allFilteredNpcs = [...npcTiers.critical, ...npcTiers.relevant, ...npcTiers.background];

    // Get quest location IDs for location filtering
    const questLocationIds = quests
      .filter((q) => q.status === "active" || q.status === "available")
      .map((q) => q.locationId?.toString())
      .filter((id): id is string => !!id);

    // Filter locations by relevance
    const locationTiers = filterLocationsByRelevance(locations, currentLocationId, questLocationIds);

    // Filter quests - only active/available
    const questTiers = filterQuestsByRelevance(quests);

    // Helper to format NPC
    const formatNpc = (n: NPC) => {
      const location = locations.find((l) => l._id === n.locationId);
      const faction = factions?.find((f) => f._id === n.factionId);
      return `- ${n.name} (${n.role}, ${n.attitude}): ${n.description} | Location: ${location?.name || 'Unknown'}${faction ? ` | Faction: ${faction.name}` : ''}${n.isRecruitable ? ' | [RECRUITABLE]' : ''}${n.isEssential ? ' | [ESSENTIAL - Cannot die]' : ''}`;
    };

    // Helper to format location
    const formatLocation = (l: Location, priority: string) => {
      return `- ${l.name} (${l.type})${priority ? ` [${priority}]` : ''}: ${l.description}`;
    };

    let context = `
    ROLE: ${campaign.aiPersona || "You are the Dungeon Master for a TTRPG campaign."}

    WORLD BIBLE (THE ABSOLUTE TRUTH):
    ${campaign.worldBible || campaign.description}

    STRICTLY ADHERE to the following world details.

    SYSTEM TERMINOLOGY:
    - Magic/Abilities are called: "${terms.spells}"
    - Energy/Resource is called: "${terms.mana}"
    - Character Archetype is called: "${terms.class}"${abilityCategories.length > 0 ? `
    - ${terms.spells} Categories: ${abilityCategories.join(", ")}` : ""}

    CRITICAL RULES:
    1. Do NOT invent new NPCs, Locations, or Quests unless absolutely necessary for the immediate narrative flow.
    2. PRIORITIZE using the provided Lists of NPCs, Locations, and Quests.
    3. If the user asks about a character or place not in the list, check if an existing one fits first.
    4. Only create new content if the user explicitly asks for something that doesn't exist, and even then, try to tie it to existing lore.
    5. DEAD NPCs CANNOT appear, speak, or interact - they are GONE FOREVER.
    6. NPCs only know about deaths/events if it makes sense (local knowledge, same faction, rumors spreading).

    CAMPAIGN: ${campaign.title}
    DESCRIPTION: ${campaign.description}
    RULES: ${campaign.rules}

    === LOCATIONS (Tiered by Relevance) ===
    ${locationTiers.critical.length > 0 ? `
    CURRENT LOCATION (HIGHEST PRIORITY):
    ${locationTiers.critical.map((l) => formatLocation(l, 'CURRENT')).join('\n')}
    ` : ''}
    ${locationTiers.relevant.length > 0 ? `
    QUEST-RELATED LOCATIONS:
    ${locationTiers.relevant.map((l) => formatLocation(l, 'QUEST')).join('\n')}
    ` : ''}
    ${locationTiers.background.length > 0 ? `
    OTHER KNOWN LOCATIONS:
    ${locationTiers.background.map((l) => formatLocation(l, '')).join('\n')}
    ` : ''}

    === NPCs ===
    ${npcTiers.critical.length > 0 ? `
    NPCs AT CURRENT LOCATION (can speak and interact):
    ${npcTiers.critical.map(formatNpc).join('\n')}
    ` : 'No NPCs at current location.'}
    ${npcTiers.relevant.length > 0 ? `

    ESSENTIAL NPCs (FOR REFERENCE ONLY - not present, cannot speak here):
    ${npcTiers.relevant.map(formatNpc).join('\n')}
    NOTE: These NPCs are NOT at the current location. They cannot speak, respond, or interact. Only mention them if the player specifically asks about them.
    ` : ''}

    ${deadNpcs && deadNpcs.length > 0 ? `
    DEAD NPCs (DO NOT USE - FOR REFERENCE ONLY):
    ${deadNpcs.slice(0, 10).map((n) => `- ${n.name} (${n.role}): Died from "${n.deathCause}" | Killed by: ${n.killedBy || 'Unknown'}`).join('\n')}
    IMPORTANT: These NPCs are DEAD. They cannot appear in scenes. Other NPCs may reference their deaths if they would realistically know.
    ` : ''}

    ${factions && factions.length > 0 ? `
    FACTIONS:
    ${factions.map((f) => `- ${f.name}: ${f.description}${f.territory ? ` | Territory: ${f.territory}` : ''}`).join('\n')}
    ` : ''}

    ${regions && regions.length > 0 ? `
    REGIONS:
    ${regions.map((r) => `- ${r.name}: ${r.description || 'No description'}${r.governingFactionId ? ` | Governed by faction` : ''}`).join('\n')}
    ` : ''}

    === QUESTS - YOUR PRIMARY STORYTELLING TOOL ===
    QUEST GUIDANCE RULES:
    - ACTIVELY guide players toward quest objectives through NPC dialogue, environmental hints, and narrative suggestions
    - When players seem lost, have NPCs mention rumors or point toward quest locations
    - Reference active quests naturally in NPC conversations and world descriptions
    - Track objective progress and celebrate milestone completions
    - When ALL objectives are complete, trigger the questComplete event

    ${questTiers.active.length > 0 ? `
    ★★★ ACTIVE QUESTS (HIGH PRIORITY - WEAVE INTO NARRATIVE) ★★★
    ${questTiers.active.map((q: any) => {
      const giver = allFilteredNpcs.find((n) => n._id === q.npcId)?.name || 'Unknown';
      const objectives = q.objectives?.map((obj: any, i: number) =>
        `      ${obj.isCompleted ? '✓' : '○'} ${i + 1}. ${obj.description}${obj.target ? ` (Target: ${obj.target})` : ''}${obj.targetCount ? ` [${obj.currentCount || 0}/${obj.targetCount}]` : ''}${obj.hint ? ` | Hint: ${obj.hint}` : ''}`
      ).join('\n') || '      (No specific objectives)';
      return `
    ─────────────────────────────────────
    QUEST: ${q.title} [${q.difficulty?.toUpperCase() || 'MEDIUM'}]
    Quest Giver: ${giver}
    Description: ${q.description}
    Rewards: ${q.xpReward || 50} XP, ${q.goldReward || 25} Gold
    OBJECTIVES:
${objectives}
    ─────────────────────────────────────`;
    }).join('\n')}
    ` : `
    ★ NO ACTIVE QUESTS - Guide the player to find one! ★
    Have NPCs mention problems, rumors, or opportunities nearby.
    `}
    ${questTiers.available.length > 0 ? `
    AVAILABLE QUESTS (Can be offered to player):
    ${questTiers.available.map((q) => `- "${q.title}" from ${allFilteredNpcs.find((n) => n._id === q.npcId)?.name || 'Unknown'}: ${q.description.substring(0, 100)}...`).join('\n')}
    ` : ''}

    MONSTERS (Known, limited):
    ${monsters.slice(0, 10).map((m) => `- ${m.name}: ${m.description}`).join('\n')}

    KEY ITEMS (Player-relevant):
    ${items.slice(0, 15).map((i) => `- ${i.name} (${i.type}): ${i.description || i.effects}${i.usable ? ' [USABLE]' : ''}${i.consumable ? ' [CONSUMABLE]' : ''}`).join('\n')}
    `;

    if (playerState) {
      context += `
    PLAYER CHARACTER:
    - Name: ${playerState.name}
    - ${terms.class}: ${playerState.class} (${terms.level} ${playerState.level})
    - Status: ${playerState.hp} / ${playerState.maxHp} HP
    - Inventory: ${playerState.inventory ? playerState.inventory.join(", ") : "Empty"}
    - ${terms.spells}: ${playerState.abilities ? playerState.abilities.join(", ") : "None"}
      `;

      if (playerState.reputation) {
        context += `
    FACTION REPUTATION:
    ${JSON.stringify(playerState.reputation, null, 2)}
    `;
      }
    }

    // Add world state context (bounties, rumors, camp)
    if (worldState) {
      if (worldState.bounty && bountyEnabled) {
        context += `
    BOUNTY STATUS:
    - Total Bounty: ${worldState.bounty.totalBounty} gold
    - Danger Level: ${worldState.bounty.dangerLevel}
    - Wanted in regions: ${worldState.bounty.activeBounties?.map((b) => b.regionName).join(', ') || 'None'}
    IMPORTANT: If bounty is high, guards will be hostile. Bounty hunters may ambush the player. NPCs may refuse service or report to guards.
    `;
      }

      if (worldState.isJailed) {
        context += `
    JAILED STATUS:
    - The player is currently IMPRISONED
    - They cannot freely explore until released or escape
    - Offer options: serve time, attempt escape (skill check), bribe guards
    `;
      }

      if (worldState.rumors && worldState.rumors.length > 0) {
        context += `
    LOCAL RUMORS (NPCs at this location know these):
    ${worldState.rumors.map((r) => `- [${r.type.toUpperCase()}] ${r.content}${r.isRecent ? ' (Recent news!)' : ''}`).join('\n')}
    IMPORTANT: NPCs should organically mention these rumors when relevant. Don't info-dump them all at once.
    `;
      }

      if (worldState.npcsAtLocation && worldState.npcsAtLocation.length > 0) {
        context += `
    NPCs PRESENT AT CURRENT LOCATION:
    ${worldState.npcsAtLocation.map((n) => `- ${n.name} (${n.role}) - ${n.attitude}`).join('\n')}
    `;
      }

      if (worldState.deadAtLocation && worldState.deadAtLocation.length > 0) {
        context += `
    DEATHS AT THIS LOCATION (for atmosphere/reference):
    ${worldState.deadAtLocation.map((n) => `- ${n.name} was ${n.deathCause} by ${n.killedBy}`).join('\n')}
    NPCs here may reference these deaths sadly or fearfully.
    `;
      }

      if (worldState.camp) {
        context += `
    PLAYER'S CAMP - "${worldState.camp.name}":
    - Location: ${worldState.camp.locationName || 'Unknown'}
    - Followers: ${worldState.camp.followers?.map((f) => `${f.npc?.name} (${f.role})`).join(', ') || 'None'}
    - Resources: Gold: ${worldState.camp.resources?.gold || 0}, Food: ${worldState.camp.resources?.food || 0}
    The player can return to their camp to rest, manage followers, or store items.
    `;
      }

      if (worldState.shopsAtLocation && worldState.shopsAtLocation.length > 0) {
        context += `
    SHOPS AT CURRENT LOCATION:
    ${worldState.shopsAtLocation.map((s) => `- ${s.name} (${s.type}): ${s.description || 'No description'} | Items: ${s.itemCount}${!s.isOpen ? ' [CLOSED]' : ''}${s.shopkeeperName ? ` | Run by: ${s.shopkeeperName}` : ''}`).join('\n')}
    SHOP INTERACTION RULES:
    - Players can buy weapons, armor, potions, and other items from shops
    - Prices vary based on shop type and rarity
    - Players can sell items back to shops (at reduced price)
    - Items sold to shops can be bought back for a limited time
    - AI-managed shops may change inventory based on story events
    `;
      }

      // Conditional Logic System - Creator-defined rules
      if (worldState.conditions) {
        if (worldState.conditions.blockedLocations && worldState.conditions.blockedLocations.length > 0) {
          context += `
    LOCATION RESTRICTIONS (STRICTLY ENFORCE):
    ${worldState.conditions.blockedLocations.map((b) => `- BLOCKED: "${b.locationName}" - ${b.reason}`).join('\n')}
    IMPORTANT: The player CANNOT enter these locations. If they try, describe why they are blocked and offer alternatives.
    `;
        }

        if (worldState.conditions.activeRules && worldState.conditions.activeRules.length > 0) {
          context += `
    ACTIVE CONDITIONAL RULES (ENFORCE THESE):
    ${worldState.conditions.activeRules.map((r) => `- ${r}`).join('\n')}
    These are creator-defined rules that modify gameplay. Apply them when relevant.
    `;
        }

        if (worldState.conditions.playerFlags && worldState.conditions.playerFlags.length > 0) {
          context += `
    PLAYER FLAGS (Story State):
    ${worldState.conditions.playerFlags.map((f) => `- ${f.key}: ${f.value}`).join('\n')}
    These flags track player progress and choices. Reference them when narratively appropriate.
    `;
        }
      }

      // Story Context - Optimized narrative memory
      if (worldState.storyContext) {
        // Story summary from past sessions
        if (worldState.storyContext.storySummary) {
          context += `
    STORY SO FAR (Summary of past events):
    ${worldState.storyContext.storySummary}
    Use this summary to maintain narrative continuity. Reference past events naturally.
    `;
        }

        // Key story events/milestones
        if (worldState.storyContext.storyEvents && worldState.storyContext.storyEvents.length > 0) {
          context += `
    KEY STORY MILESTONES (Most important plot points):
    ${worldState.storyContext.storyEvents.map((e) => `- [${e.type.toUpperCase()}] ${e.title}: ${e.description}`).join('\n')}
    These are significant events the player has experienced. Reference them when relevant to current situations.
    `;
        }

        // Anchor moments - critical narrative beats
        if (worldState.storyContext.anchorMoments && worldState.storyContext.anchorMoments.length > 0) {
          context += `
    CRITICAL NARRATIVE MOMENTS (Never forget these):
    ${worldState.storyContext.anchorMoments.map((m) => `- ${m}`).join('\n')}
    These moments define the player's journey. They should influence NPC reactions and story development.
    `;
        }
      }
    }

    context += `
    IMPORTANT:
    - Maintain the tone defined in the WORLD BIBLE.
    - If the user asks to go to a location not in this list, guide them to a known nearby location or describe the travel based on the environment.
    - Use the defined Rules for any mechanics.
    - NEVER have dead NPCs appear or interact in any way.
    - NPCs should only know information they would realistically have access to (same location, same faction, rumors that have spread).
    ${bountyEnabled ? '- Track criminal actions. Theft, assault, and murder create bounties and have consequences.' : ''}
    `;

    return context;
};

export const generateNarrative = action({
  args: {
    prompt: v.string(),
    history: v.array(v.object({ role: v.string(), content: v.string() })),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in Convex environment variables.");
      return "The Dungeon Master is currently away (GEMINI_API_KEY missing). Please set it in your Convex dashboard.";
    }

    // Fetch campaign context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
    const campaignData = await ctx.runQuery((api as any).forge.getCampaignDetails, {
      campaignId: args.campaignId 
    });

    if (!campaignData) {
        return "Error: Campaign not found.";
    }

    // Dynamic Context Retrieval (RAG)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
    const dynamicContext: string = await ctx.runAction((api as any).lib.context.retrieveRelevantContext, {
      campaignId: args.campaignId,
      query: args.prompt,
    });

    // Note: generateNarrative doesn't support playerState yet as it's a simpler action. 
    // Use chatStream for full features.
    const worldContext = generateWorldContext(campaignData);

    const contents = [
      {
        role: "user",
        parts: [{ text: worldContext + "\n\nRELEVANT MEMORIES & LORE:\n" + dynamicContext }] // Preload context as the first message
      },
      ...args.history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      {
        role: "user",
        parts: [{ text: args.prompt + "\n\nIMPORTANT: Respond in valid JSON format with these fields:\n1. 'content' (narrative text)\n2. 'choices' (array of 2-4 actions)\n3. 'rewards' (optional object with 'items': string[] and 'quests': string[])\n4. 'current_location' (optional string: the exact name of the location the player is currently in, e.g. 'Riverwood', only if changed or relevant).\nDo not wrap the JSON in markdown code blocks." }],
      }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1000,
            responseMimeType: "application/json"
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error: ${errorText}`);
      return JSON.stringify({ content: `The magic fizzles... (API Error: ${response.status})`, choices: [] });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    try {
       const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
       const parsed = JSON.parse(cleanText);

       // Validate and sanitize numeric fields
       if (typeof parsed.hp === 'number') {
           parsed.hp = Math.max(0, Math.min(parsed.hp, 999)); // Clamp HP to reasonable bounds
       }
       if (typeof parsed.gold === 'number') {
           parsed.gold = Math.max(0, Math.floor(parsed.gold)); // Gold must be non-negative integer
       }
       if (typeof parsed.energy === 'number') {
           parsed.energy = Math.max(0, Math.min(parsed.energy, 999)); // Clamp energy
       }
       if (typeof parsed.xpGained === 'number') {
           parsed.xpGained = Math.max(0, Math.min(parsed.xpGained, 10000)); // Cap XP gain
       }

       // Validate choices array
       if (Array.isArray(parsed.choices)) {
           parsed.choices = parsed.choices
               .map((c: unknown) => {
                   if (typeof c === 'string') return c;
                   if (typeof c === 'object' && c !== null) {
                       const choice = c as Record<string, unknown>;
                       return choice.action || choice.text || choice.label || JSON.stringify(c);
                   }
                   return String(c);
               })
               .filter((c: string) => c && c.trim().length > 0)
               .slice(0, 6); // Limit to 6 choices max
       }

       // Validate context
       if (parsed.context && !['explore', 'combat', 'social', 'rest'].includes(parsed.context)) {
           delete parsed.context; // Remove invalid context
       }

       return JSON.stringify(parsed);
    } catch (e) {
       console.error("[AI:ResponseParse] Failed to parse AI response:", e, "Raw:", rawText.substring(0, 200));
       return JSON.stringify({ content: rawText, choices: [], parseError: true });
    }
  },
});

export const chatStream = httpAction(async (ctx, request) => {
  const { prompt, history, campaignId, playerState, currentLocationId, playerId } = await request.json();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("GEMINI_API_KEY not set", { status: 500, headers: corsHeaders });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
  const campaignData = await ctx.runQuery((api as any).forge.getCampaignDetails, {
    campaignId: campaignId
  });

  if (!campaignData) {
      return new Response("Campaign not found", { status: 404, headers: corsHeaders });
  }

  // Dynamic Context Retrieval (RAG)
  // We need to run this as a query/action before streaming
  // Since this is an httpAction, we can call runAction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
  const dynamicContext: string = await ctx.runAction((api as any).lib.context.retrieveRelevantContext, {
      campaignId: campaignId,
      query: prompt,
  });

  // Automatic Memory Summarization
  // Trigger every 10 turns (20 messages) to keep memories fresh
  if (history.length > 0 && history.length % 20 === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
      await ctx.scheduler.runAfter(0, (api as any).lib.memory.summarizeSession, {
          campaignId: campaignId,
          chatHistory: history.slice(-20), // Summarize the last 20 messages
      });
  }

  // Fetch additional world state for enhanced AI context
  const worldState: WorldState = {};
  
  try {
    // Get bounty status if bounty system is enabled and player ID provided
    if (campaignData.bountyEnabled && playerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
      const bountyStatus = await ctx.runQuery((api as any).bounty.getBountyStatus, {
        campaignId: campaignId,
        playerId: playerId,
      });
      worldState.bounty = bountyStatus;

      // Check jail status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
      const jailStatus = await ctx.runQuery((api as any).bounty.checkJailStatus, {
        campaignId: campaignId,
        playerId: playerId,
      });
      worldState.isJailed = jailStatus.isJailed;
    }
    
    // Get location-based context (NPCs present, rumors)
    if (currentLocationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
      const knowledgeContext = await ctx.runQuery((api as any).world.getNPCKnowledgeContext, {
        campaignId: campaignId,
        currentLocationId: currentLocationId,
      });
      worldState.npcsAtLocation = knowledgeContext.npcsAtLocation;
      worldState.rumors = knowledgeContext.rumorsHere;
      worldState.deadAtLocation = knowledgeContext.deadAtLocation;

      // Get shops at current location
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
        const shopsAtLocation = await ctx.runQuery((api as any).shops.getShopsAtLocation, {
          campaignId: campaignId,
          locationId: currentLocationId,
        });
        worldState.shopsAtLocation = shopsAtLocation;
      } catch (error) {
        console.warn("[AI:WorldState] Shops query failed (may not be set up yet):", error);
      }
    }
    
    // Get player camp if exists
    if (playerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
      const camp = await ctx.runQuery((api as any).camp.getCampDetails, {
        campaignId: campaignId,
        playerId: playerId,
      });
      if (camp) {
        worldState.camp = camp;
      }
    }

    // Get active conditions for AI context
    if (playerId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
        const conditionsSummary = await ctx.runQuery((api as any).conditions.getActiveConditionsSummary, {
          campaignId: campaignId,
          playerId: playerId,
        });

        if (conditionsSummary) {
          // Parse conditions to find blocked locations
          const blockedLocations: { locationName: string; reason: string }[] = [];
          const activeRules: string[] = [];

          for (const condition of conditionsSummary.conditions || []) {
            if (condition.description) {
              activeRules.push(condition.description);
            }
          }

          // Parse summary for blocked locations
          if (conditionsSummary.summary) {
            const lines = conditionsSummary.summary.split('\n');
            for (const line of lines) {
              if (line.startsWith('BLOCKED:')) {
                const match = line.match(/BLOCKED: Player cannot enter "(.+)" - (.+)/);
                if (match) {
                  blockedLocations.push({ locationName: match[1], reason: match[2] });
                }
              }
            }
          }

          worldState.conditions = {
            blockedLocations: blockedLocations.length > 0 ? blockedLocations : undefined,
            activeRules: activeRules.length > 0 ? activeRules : undefined,
            playerFlags: conditionsSummary.flags?.map((f: { key: string; value: string }) => ({
              key: f.key,
              value: f.value,
            })),
          };
        }
      } catch (error) {
        console.warn("[AI:WorldState] Conditions system query failed (may not be set up yet):", error);
      }

      // Fetch optimized story context (summaries, events, anchors)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
        const optimizedContext = await ctx.runQuery((api as any).contextOptimization.getOptimizedContext, {
          campaignId: campaignId,
          playerId: playerId,
          currentLocationId: currentLocationId || undefined, // Convex validators reject null, use undefined
        });

        if (optimizedContext) {
          worldState.storyContext = {
            storySummary: optimizedContext.storySummary || undefined,
            storyEvents: optimizedContext.storyEvents || [],
            anchorMoments: optimizedContext.anchorMessages
              ?.filter((m: { reason?: string }) => m.reason)
              .map((m: { content: string; reason?: string }) => m.content.substring(0, 200)) || [],
          };
        }
      } catch (error) {
        console.warn("[AI:WorldState] Context optimization query failed (may not be set up yet):", error);
      }

      // Trigger auto-summarization if history is getting long (every 50 messages)
      if (history.length > 0 && history.length % 50 === 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
          await ctx.scheduler.runAfter(0, (api as any).contextOptimization.summarizeOldMessages, {
            campaignId: campaignId,
            playerId: playerId,
            maxMessagesToSummarize: 40,
          });
          console.log("[AI:Summarization] Scheduled auto-summarization for campaign", campaignId);
        } catch (error) {
          console.warn("[AI:Summarization] Failed to schedule summarization:", error);
        }
      }
    }
  } catch (e) {
    // Log but continue - world state is optional context enhancement
    console.error("[AI:WorldState] Failed to fetch world state:", e);
  }

  // Set current location for relevance filtering
  worldState.currentLocationId = currentLocationId;

  const worldContext = generateWorldContext(campaignData, playerState, worldState);

  // Enhanced prompt for game events with dice rolling
  const bountyEnabled = campaignData.bountyEnabled;

  // Get player stats for dice rolling context
  const playerStats = playerState ? `
PLAYER STATS (for dice roll modifiers):
- Strength: ${playerState.stats?.strength || playerState.stats?.str || 10} (Modifier: ${Math.floor(((playerState.stats?.strength || playerState.stats?.str || 10) - 10) / 2)})
- Dexterity: ${playerState.stats?.dexterity || playerState.stats?.dex || 10} (Modifier: ${Math.floor(((playerState.stats?.dexterity || playerState.stats?.dex || 10) - 10) / 2)})
- Constitution: ${playerState.stats?.constitution || playerState.stats?.con || 10} (Modifier: ${Math.floor(((playerState.stats?.constitution || playerState.stats?.con || 10) - 10) / 2)})
- Intelligence: ${playerState.stats?.intelligence || playerState.stats?.int || 10} (Modifier: ${Math.floor(((playerState.stats?.intelligence || playerState.stats?.int || 10) - 10) / 2)})
- Wisdom: ${playerState.stats?.wisdom || playerState.stats?.wis || 10} (Modifier: ${Math.floor(((playerState.stats?.wisdom || playerState.stats?.wis || 10) - 10) / 2)})
- Charisma: ${playerState.stats?.charisma || playerState.stats?.cha || 10} (Modifier: ${Math.floor(((playerState.stats?.charisma || playerState.stats?.cha || 10) - 10) / 2)})
- Level: ${playerState.level || 1} (Proficiency Bonus: +${Math.ceil((playerState.level || 1) / 4) + 1})
` : '';

  const gameEventInstructions = `
IMPORTANT: Respond in this EXACT format:

<narrative>
[Write vivid, immersive DESCRIPTIVE text here. This is for environmental descriptions, action narration, and scene-setting. NO dialogue here - just describe what happens, what the player sees, hears, and feels. Be dramatic and engaging.]
</narrative>

<dialogue>
{
  "lines": [
    { "speaker": "NPC Name", "text": "What the NPC says in quotes", "emotion": "neutral" },
    { "speaker": null, "text": "Narration between dialogue lines", "emotion": null }
  ],
  "activeNpc": "NPC Name if in conversation"
}
</dialogue>

<data>
{
  "choices": [
    { "id": "c1", "text": "Simple action choice" },
    { "id": "c2", "text": "Ask about the quest", "skillCheck": { "skill": "Persuasion", "dc": 15 } },
    { "id": "c3", "text": "Attack the merchant", "consequence": "This will turn the town hostile" }
  ],
  "context": "explore|combat|social|rest",
  "notifications": [
    { "type": "quest", "title": "Quest Updated", "message": "New objective received" },
    { "type": "discovery", "title": "Found: Ancient Sword", "message": "Added to inventory" }
  ],
  "gameEvent": {
    "type": "exploration|combat|social|skillCheck|reward|npcDeath|crime|recruitment|questProgress|questComplete",
    "combat": { "enemyName": "Enemy Name", "enemyHP": 20, "enemyMaxHP": 20, "isPlayerTurn": true },
    "skillCheck": {
      "skill": "Perception|Stealth|Athletics|Persuasion|etc",
      "roll": 15,
      "modifier": 3,
      "target": 12,
      "success": true,
      "attribute": "wisdom|dexterity|strength|etc",
      "isCritical": false,
      "degree": "critical_success|success|failure|critical_failure"
    },
    "reward": { "item": "Item Name", "rarity": "common|uncommon|rare|epic|legendary", "xp": 50 },
    "npcDeath": { "npcName": "NPC Name", "npcId": "npc_id_if_known", "cause": "How they died", "killedBy": "player|npc_name" },
    "crime": { "type": "murder|theft|assault|trespassing", "description": "What happened", "bountyAmount": 100 },
    "recruitment": { "npcName": "NPC Name", "npcId": "npc_id", "cost": 100, "role": "companion|guard|worker" },
    "questProgress": { "questTitle": "Quest Name", "objectiveId": "obj_1", "objectiveDescription": "What was completed", "incrementCount": 1 },
    "questComplete": { "questTitle": "Quest Name", "xpReward": 50, "goldReward": 25, "itemRewards": ["Item Name"] }
  },
  "hp": ${playerState?.hp || 20},
  "xpGained": 0,
  "current_location": "Location Name"
}
</data>

${playerStats}

DICE ROLLING SYSTEM - CRITICAL RULES:
1. WHEN TO ROLL DICE - Trigger a skillCheck for these actions:
   - TRAVEL: Roll Survival (WIS) or Athletics (STR) when traveling to new locations (DC 10-15)
   - COMBAT: Roll Attack (STR/DEX) vs enemy AC, or ability checks during combat
   - STEALTH/SNEAKING: Roll Stealth (DEX) vs passive Perception (DC 10-20)
   - STEALING/PICKPOCKETING: Roll Sleight of Hand (DEX) vs DC 15-25 depending on difficulty
   - LOCKPICKING: Roll Sleight of Hand or Thieves' Tools (DEX) vs lock DC
   - PERSUASION/DECEPTION: Roll Charisma-based skills vs NPC's insight
   - SEARCHING: Roll Investigation (INT) or Perception (WIS) to find hidden things
   - CLIMBING/JUMPING: Roll Athletics (STR) or Acrobatics (DEX)
   - TRACKING: Roll Survival (WIS) to follow trails
   - IDENTIFYING ITEMS/MAGIC: Roll Arcana (INT)
   - SENSING MOTIVES: Roll Insight (WIS) vs NPC's Deception
   - CALMING ANIMALS: Roll Animal Handling (WIS)

2. HOW TO CALCULATE ROLLS:
   - Roll 1d20 (generate a random number 1-20)
   - Add the appropriate ability modifier based on the skill
   - Add proficiency bonus (+2 at level 1-4, +3 at level 5-8, etc.)
   - Compare to Difficulty Class (DC): Easy=10, Medium=15, Hard=20, Very Hard=25

3. SKILL TO ATTRIBUTE MAPPING:
   - STR: Athletics
   - DEX: Acrobatics, Sleight of Hand, Stealth
   - INT: Arcana, History, Investigation, Nature, Religion
   - WIS: Animal Handling, Insight, Medicine, Perception, Survival
   - CHA: Deception, Intimidation, Performance, Persuasion

4. CRITICAL ROLLS:
   - Natural 20 (roll=20): Always succeeds, describe an exceptional outcome
   - Natural 1 (roll=1): Always fails, describe a comical or dramatic failure
   - Critical Success (10+ over DC): Exceptional result with bonus effects
   - Critical Failure (10+ under DC): Bad result with negative consequences

5. DEGREE OF SUCCESS affects narrative:
   - critical_success: The player exceeds expectations spectacularly
   - success: The player accomplishes their goal
   - failure: The player fails but may try again or face minor setback
   - critical_failure: Something goes wrong - alerting guards, breaking tools, etc.

6. ALWAYS include skillCheck in gameEvent when dice are rolled. Include the attribute used so the UI can show the correct modifier.

GAME EVENT RULES:
1. Set "context" based on the current situation:
   - "explore" = wandering, investigating, traveling
   - "combat" = fighting enemies (MUST include combat object)
   - "social" = talking to NPCs
   - "rest" = camping, recovering, downtime

2. Include "gameEvent" when something significant happens:
   - Combat starts/continues: type="combat" with enemy stats
   - Skill check needed: type="skillCheck" with roll results (roll a d20 + modifier vs target)
   - Player finds loot: type="reward" with item details
   - NPC dies: type="npcDeath" - ONLY use for named NPCs from the NPC list, not random enemies
   - Player commits a crime: type="crime" ${bountyEnabled ? '(ACTIVE - track all crimes!)' : '(disabled for this realm)'}
   - Player can recruit an NPC: type="recruitment" - only if NPC is marked [RECRUITABLE]
   - Quest objective completed: type="questProgress" - when player completes a step (kills target, talks to NPC, reaches location, etc.)
   - Quest fully completed: type="questComplete" - when ALL objectives are done, celebrate and grant rewards!
   
3. Rarity levels: "common" (gray), "uncommon" (green), "rare" (blue), "epic" (purple), "legendary" (gold)

4. Award XP for: defeating enemies (10-50), completing objectives (25-100), good roleplay (5-15)

5. Adjust player HP when they take damage or heal

6. Choices should be 2-4 contextual actions the player can take

SPECIAL RULES:
- If an NPC marked [ESSENTIAL] would die, they instead fall unconscious and recover later
- NPCs marked [RECRUITABLE] can be invited to join the player's camp for a gold cost
- If the player kills a named NPC, ALWAYS include an npcDeath event so it's tracked
${bountyEnabled ? '- Criminal actions (murder, theft, assault) should trigger a crime event with appropriate bounty' : ''}
${worldState.isJailed ? '- The player is JAILED. Limit actions to jail-appropriate choices: wait, attempt escape, bribe, serve time' : ''}

★★★ DIALOGUE SYSTEM RULES ★★★
The game uses an RPG-style dialogue box, NOT a chat interface. Structure your responses accordingly:

1. NARRATIVE vs DIALOGUE SEPARATION:
   - <narrative> = Environmental descriptions, action results, scene-setting. NO quoted speech here.
   - <dialogue> = All NPC speech and conversation-related narration

2. DIALOGUE FORMAT:
   - Use "lines" array for all speech and conversation narration
   - Each line needs: speaker (NPC name or null for narration), text, emotion
   - Emotions: "neutral", "happy", "angry", "sad", "surprised", "thinking"
   - Set "activeNpc" when in an active conversation

3. CHOICE FORMAT:
   - Each choice needs an "id" (c1, c2, etc.) and "text"
   - Add "skillCheck" object for choices requiring rolls: { "skill": "Persuasion", "dc": 15 }
   - Add "consequence" string to warn of dangerous choices: "This will anger the guards"
   - NEVER just use string arrays for choices - ALWAYS use the object format

4. NOTIFICATIONS:
   - Use "notifications" array for game events the player should see
   - Types: "quest" (quest updates), "discovery" (found items/locations), "achievement", "warning"
   - Each needs: type, title, message

5. WHEN TO USE DIALOGUE:
   - When NPCs speak, put their words in dialogue.lines
   - For reactions like "The merchant frowns" - use dialogue with emotion
   - For location arrivals, use narrative only (no dialogue unless NPC speaks)

6. EMPTY DIALOGUE:
   - If no one speaks, use: { "lines": [], "activeNpc": null }
   - This is fine for exploration without conversation

★★★ QUEST & STORY GUIDANCE - MOST IMPORTANT ★★★
Your PRIMARY job is to guide players through the story and help them complete quests. DO NOT just react - ACTIVELY GUIDE:

1. WEAVE QUESTS INTO EVERY RESPONSE:
   - If there's an active quest, ALWAYS reference it somehow (NPC mentions it, environment shows clues, etc.)
   - Have NPCs naturally bring up quest-related information
   - Describe environments in ways that hint toward objectives

2. WHEN PLAYER SEEMS LOST:
   - Have an NPC approach them with news or rumors
   - Describe environmental details that point toward quest locations
   - Use choices to suggest quest-relevant actions

3. CELEBRATE PROGRESS:
   - When an objective is completed, make it feel rewarding in the narrative
   - Have NPCs react positively to the player's achievements
   - Build toward the climactic quest completion

4. USE THE CREATOR'S WORLD:
   - Reference the WORLD BIBLE and LORE constantly
   - Use NPC personalities and attitudes from the lists
   - Make locations feel alive with the details provided
   - The creator built this world - HONOR IT by using their content

5. PROVIDE CLEAR DIRECTION:
   - Always give 2-4 choices that include at least one quest-relevant option
   - If no active quest, make choices lead toward discovering available quests
   - Never leave the player wondering what to do next

★★★ AI-DRIVEN MAP SYSTEM - VISUAL DUNGEON GENERATION ★★★
You control a 2D visual tilemap that renders in real-time. Generate map events to create immersive visuals.

TILE ID REFERENCE:
- TERRAIN (0-49): VOID=0, FLOOR_STONE=1, FLOOR_WOOD=2, FLOOR_DIRT=3, FLOOR_GRASS=4, FLOOR_SAND=5, FLOOR_COBBLE=6, WALL_STONE=10, WALL_BRICK=11, WALL_CAVE=12, WALL_WOOD=13, WATER_SHALLOW=20, WATER_DEEP=21, LAVA=22, ICE=23, DOOR_CLOSED=30, DOOR_OPEN=31, DOOR_LOCKED=32, GATE_CLOSED=33, GATE_OPEN=34, STAIRS_DOWN=40, STAIRS_UP=41, PIT=42, BRIDGE=43
- ENTITIES (100-199): PLAYER_WARRIOR=100, PLAYER_MAGE=101, PLAYER_ROGUE=102, GOBLIN=110, GOBLIN_ARCHER=111, ORC=115, ORC_BERSERKER=116, SKELETON=120, SKELETON_WARRIOR=121, ZOMBIE=125, RAT=130, GIANT_RAT=131, SPIDER=132, GIANT_SPIDER=133, BAT=134, WOLF=135, VILLAGER=140, MERCHANT=141, GUARD=142, BOSS_DEMON=150, BOSS_DRAGON=151, BOSS_LICH=152
- OBJECTS (200-299): CHEST_CLOSED=200, CHEST_OPEN=201, CHEST_LOCKED=202, BARREL=203, CRATE=204, TABLE=210, CHAIR=211, BED=212, TORCH_WALL=220, TORCH_GROUND=221, CAMPFIRE=222, BRAZIER=223, LANTERN=224, ALTAR=230, FOUNTAIN=231, LEVER=232, GOLD_PILE=240, POTION=242, TRAP_SPIKE=250, TRAP_FIRE=252

MAP EVENT TYPES (include in <mapEvents> tags):

1. GENERATE ROOM - When player enters a new area:
<mapEvents>
[{"type":"generateRoom","generateRoom":{"width":12,"height":10,"tiles":[[10,10,10,10,10,10,10,10,10,10,10,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,31,1,1,1,1,1,10],[10,10,10,10,10,10,10,10,10,10,10,10]],"entities":[{"id":"goblin_1","type":110,"x":8,"y":4,"name":"Sneaky Goblin","hostile":true,"hp":15,"maxHp":15}],"objects":[{"id":"chest_1","type":200,"x":6,"y":2,"interactable":true,"state":"closed"},{"id":"torch_1","type":220,"x":2,"y":2,"interactable":false}],"lighting":"dim","ambience":"dungeon","playerSpawn":{"x":5,"y":8}}}]
</mapEvents>

2. MOVE ENTITY - When player or NPCs move:
<mapEvents>
[{"type":"moveEntity","moveEntity":{"entityId":"player","path":[{"x":5,"y":7},{"x":5,"y":6},{"x":6,"y":6}],"speed":"normal"}}]
</mapEvents>

3. SPAWN ENTITY - When enemies appear:
<mapEvents>
[{"type":"spawnEntity","spawnEntity":{"id":"skeleton_1","type":120,"x":3,"y":4,"name":"Risen Skeleton","hostile":true,"animation":"emerge"}}]
</mapEvents>

4. REMOVE ENTITY - When enemies die:
<mapEvents>
[{"type":"removeEntity","removeEntity":{"entityId":"goblin_1","animation":"dissolve"}}]
</mapEvents>

5. INTERACT OBJECT - When player uses something:
<mapEvents>
[{"type":"interactObject","interactObject":{"objectId":"chest_1","action":"open","result":{"items":["Gold Coins"],"gold":50}}}]
</mapEvents>

6. COMBAT EFFECT - During combat:
<mapEvents>
[{"type":"combatEffect","combatEffect":{"attackerId":"player","targetId":"goblin_1","effectType":"slash","damage":8,"isCritical":false}}]
</mapEvents>

7. UPDATE TILE - When environment changes:
<mapEvents>
[{"type":"updateTile","updateTile":{"x":5,"y":8,"oldTile":30,"newTile":31,"animation":"instant"}}]
</mapEvents>

8. CAMERA EFFECT - For dramatic moments:
<mapEvents>
[{"type":"cameraEffect","cameraEffect":{"effectType":"shake","intensity":"medium"}}]
</mapEvents>

MAP GENERATION RULES:
1. Generate a room (8x8 to 16x16) when player enters a NEW area
2. Use walls (10-13) around edges, floors (1-6) inside
3. Place doors (30-34) for exits, stairs (40-41) for level changes
4. Include 2-4 entities (enemies, NPCs) relevant to the narrative
5. Add objects (chests, torches, furniture) for atmosphere
6. Set lighting: "dark", "dim", or "bright"
7. Set ambience: "dungeon", "cave", "crypt", "forest", "castle", "swamp"

MOVEMENT RULES:
1. ALWAYS move the player when they describe movement
2. Use paths with 2-5 waypoints for smooth animation
3. Move enemies toward player during combat
4. Speed: "slow" for cautious, "normal" for walking, "fast" for running

COMBAT VISUALIZATION:
1. Show attack effects with combatEffect events
2. Remove dead enemies with removeEntity (animation: "dissolve" or "explode")
3. Shake camera on critical hits or boss attacks

The map enhances the narrative - every room should feel unique and atmospheric!`;

  const contents = [
    {
      role: "user",
      parts: [{ text: worldContext + "\n\nRELEVANT MEMORIES & LORE:\n" + dynamicContext }]
    },
    ...history.map((msg: ChatMessage) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    {
      role: "user",
      parts: [{ text: prompt + "\n\n" + gameEventInstructions }],
    }
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status, headers: corsHeaders });
  }

  return new Response(response.body, {
      headers: {
          "Content-Type": "application/json",
          ...corsHeaders
      }
  });
});

// =============================================================================
// DEDICATED MAP GENERATION AI - Handles spatial reasoning and movement
// =============================================================================

export const generateMapEvents = action({
  args: {
    campaignId: v.id("campaigns"),
    playerAction: v.string(),
    currentLocationName: v.string(),
    currentLocationDescription: v.optional(v.string()),
    locationType: v.optional(v.string()),
    currentRoomState: v.optional(v.object({
      width: v.number(),
      height: v.number(),
      playerPosition: v.object({ x: v.number(), y: v.number() }),
      entities: v.array(v.object({
        id: v.string(),
        type: v.number(),
        x: v.number(),
        y: v.number(),
        name: v.string(),
        hostile: v.boolean(),
      })),
      objects: v.array(v.object({
        id: v.string(),
        type: v.number(),
        x: v.number(),
        y: v.number(),
        state: v.optional(v.string()),
      })),
    })),
    needsNewRoom: v.boolean(),
    narrativeContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set");
      return { events: [], error: "API key missing" };
    }

    // Build the map-focused prompt
    const mapPrompt = `You are a MAP GENERATION AI for a 2D dungeon crawler game. Your ONLY job is to generate visual map events.

CURRENT LOCATION: ${args.currentLocationName}
TYPE: ${args.locationType || 'dungeon'}
DESCRIPTION: ${args.currentLocationDescription || 'A mysterious area'}

PLAYER ACTION: "${args.playerAction}"

${args.narrativeContext ? `NARRATIVE CONTEXT: ${args.narrativeContext}` : ''}

${args.currentRoomState ? `
CURRENT ROOM STATE:
- Size: ${args.currentRoomState.width}x${args.currentRoomState.height}
- Player at: (${args.currentRoomState.playerPosition.x}, ${args.currentRoomState.playerPosition.y})
- Entities: ${args.currentRoomState.entities.map(e => `${e.name} at (${e.x},${e.y})${e.hostile ? ' [HOSTILE]' : ''}`).join(', ') || 'None'}
- Objects: ${args.currentRoomState.objects.map(o => `Object at (${o.x},${o.y})`).join(', ') || 'None'}
` : 'NO EXISTING ROOM - Generate a new one!'}

${args.needsNewRoom ? 'TASK: Generate a NEW ROOM for this location.' : 'TASK: Generate movement/interaction events based on the player action.'}

TILE ID REFERENCE:
TERRAIN: VOID=0, FLOOR_STONE=1, FLOOR_WOOD=2, FLOOR_DIRT=3, FLOOR_GRASS=4, FLOOR_SAND=5, FLOOR_COBBLE=6, WALL_STONE=10, WALL_BRICK=11, WALL_CAVE=12, WALL_WOOD=13, WATER_SHALLOW=20, WATER_DEEP=21, LAVA=22, ICE=23, DOOR_CLOSED=30, DOOR_OPEN=31, DOOR_LOCKED=32, STAIRS_DOWN=40, STAIRS_UP=41, PIT=42, BRIDGE=43
ENTITIES: PLAYER_WARRIOR=100, GOBLIN=110, ORC=115, SKELETON=120, ZOMBIE=125, RAT=130, SPIDER=132, WOLF=135, VILLAGER=140, MERCHANT=141, GUARD=142, BOSS_DEMON=150
OBJECTS: CHEST_CLOSED=200, CHEST_OPEN=201, BARREL=203, TABLE=210, TORCH_WALL=220, CAMPFIRE=222, ALTAR=230, FOUNTAIN=231, GOLD_PILE=240, POTION=242, TRAP_SPIKE=250

MOVEMENT DETECTION - If the player action mentions ANY of these, generate a moveEntity event:
- "walk", "go", "move", "head", "travel", "run", "approach", "step"
- "to the", "toward", "towards", "over to", "up to"
- Direction words: "north", "south", "east", "west", "left", "right", "up", "down", "forward", "back"
- Object references: "chest", "door", "table", "enemy", "NPC name", etc.

RESPONSE FORMAT - Return ONLY a JSON array of events:
[
  {"type": "generateRoom", "generateRoom": { ... }},
  {"type": "moveEntity", "moveEntity": { ... }},
  etc.
]

EVENT EXAMPLES:

1. NEW ROOM (when needsNewRoom=true or entering new area):
{"type":"generateRoom","generateRoom":{"width":12,"height":10,"tiles":[[10,10,10,10,10,10,10,10,10,10,10,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,1,1,1,1,1,1,10],[10,1,1,1,1,31,1,1,1,1,1,10],[10,10,10,10,10,10,10,10,10,10,10,10]],"entities":[{"id":"goblin_1","type":110,"x":8,"y":4,"name":"Goblin Scout","hostile":true,"hp":15,"maxHp":15}],"objects":[{"id":"chest_1","type":200,"x":6,"y":2,"interactable":true,"state":"closed"},{"id":"torch_1","type":220,"x":2,"y":2,"interactable":false}],"lighting":"dim","ambience":"dungeon","playerSpawn":{"x":5,"y":8}}}

2. PLAYER MOVEMENT (when player says "I walk to X"):
{"type":"moveEntity","moveEntity":{"entityId":"player","path":[{"x":5,"y":7},{"x":5,"y":6},{"x":6,"y":5}],"speed":"normal"}}

3. ENEMY MOVEMENT (during combat or patrol):
{"type":"moveEntity","moveEntity":{"entityId":"goblin_1","path":[{"x":7,"y":4},{"x":6,"y":4}],"speed":"slow"}}

4. OPEN CHEST/INTERACT:
{"type":"interactObject","interactObject":{"objectId":"chest_1","action":"open","result":{"items":["Health Potion"],"gold":25}}}

5. COMBAT EFFECT:
{"type":"combatEffect","combatEffect":{"attackerId":"player","targetId":"goblin_1","effectType":"slash","damage":8}}

6. SPAWN ENEMY:
{"type":"spawnEntity","spawnEntity":{"id":"skeleton_1","type":120,"x":3,"y":5,"name":"Skeleton Warrior","hostile":true,"animation":"emerge"}}

7. REMOVE DEAD ENEMY:
{"type":"removeEntity","removeEntity":{"entityId":"goblin_1","animation":"dissolve"}}

RULES:
1. If needsNewRoom=true, ALWAYS include a generateRoom event first
2. DETECT MOVEMENT INTENT - if player mentions moving, walking, going somewhere, create a moveEntity event
3. Calculate reasonable paths (2-5 waypoints) from current position to target
4. During combat, move enemies toward player
5. Match the location type with appropriate tiles (dungeon=stone, forest=grass, etc.)
6. Add atmospheric objects (torches, furniture, decorations)
7. Place doors at logical exit points

RESPOND WITH ONLY A JSON ARRAY - NO OTHER TEXT:`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: mapPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[MapAI] API Error:", errorText);
        return { events: [], error: `API Error: ${response.status}` };
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

      // Clean and parse the response
      let cleanedJson = rawText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/:\s*True\b/g, ': true')
        .replace(/:\s*False\b/g, ': false')
        .replace(/:\s*None\b/g, ': null')
        .replace(/,\s*([}\]])/g, '$1')
        .trim();

      // If it's wrapped in an object, extract the array
      if (cleanedJson.startsWith('{')) {
        const parsed = JSON.parse(cleanedJson);
        if (parsed.events) {
          return { events: parsed.events };
        }
      }

      const events = JSON.parse(cleanedJson);
      return { events: Array.isArray(events) ? events : [events] };
    } catch (e) {
      console.error("[MapAI] Failed to generate map events:", e);
      return { events: [], error: String(e) };
    }
  },
});

// =============================================================================
// WORLD-AWARE MAP GENERATION AI - Uses creator's template for dynamic worlds
// =============================================================================

// Location type to terrain mapping
const LOCATION_TERRAIN_MAP: Record<string, { floor: number; wall: number; ambience: string; lighting: string }> = {
  // Natural environments
  forest: { floor: 4, wall: 12, ambience: "forest", lighting: "bright" },      // FLOOR_GRASS, WALL_CAVE (trees)
  woods: { floor: 4, wall: 12, ambience: "forest", lighting: "dim" },
  jungle: { floor: 4, wall: 12, ambience: "forest", lighting: "dim" },
  swamp: { floor: 3, wall: 12, ambience: "swamp", lighting: "dim" },           // FLOOR_DIRT
  marsh: { floor: 3, wall: 20, ambience: "swamp", lighting: "dim" },           // WATER_SHALLOW
  desert: { floor: 5, wall: 10, ambience: "desert", lighting: "bright" },      // FLOOR_SAND
  beach: { floor: 5, wall: 20, ambience: "coast", lighting: "bright" },
  mountain: { floor: 1, wall: 12, ambience: "cave", lighting: "dim" },         // FLOOR_STONE, WALL_CAVE
  hills: { floor: 4, wall: 10, ambience: "plains", lighting: "bright" },
  plains: { floor: 4, wall: 10, ambience: "plains", lighting: "bright" },
  grassland: { floor: 4, wall: 10, ambience: "plains", lighting: "bright" },
  tundra: { floor: 23, wall: 10, ambience: "frozen", lighting: "bright" },     // ICE
  snow: { floor: 23, wall: 12, ambience: "frozen", lighting: "bright" },

  // Water
  lake: { floor: 20, wall: 21, ambience: "water", lighting: "bright" },        // WATER_SHALLOW, WATER_DEEP
  river: { floor: 20, wall: 4, ambience: "water", lighting: "bright" },
  ocean: { floor: 21, wall: 21, ambience: "water", lighting: "bright" },
  coast: { floor: 5, wall: 20, ambience: "coast", lighting: "bright" },

  // Civilization
  town: { floor: 6, wall: 11, ambience: "town", lighting: "bright" },          // FLOOR_COBBLE, WALL_BRICK
  village: { floor: 3, wall: 13, ambience: "town", lighting: "bright" },       // FLOOR_DIRT, WALL_WOOD
  city: { floor: 6, wall: 11, ambience: "city", lighting: "bright" },
  castle: { floor: 1, wall: 10, ambience: "castle", lighting: "dim" },         // FLOOR_STONE, WALL_STONE
  fortress: { floor: 1, wall: 10, ambience: "castle", lighting: "dim" },
  palace: { floor: 1, wall: 11, ambience: "castle", lighting: "bright" },
  temple: { floor: 1, wall: 10, ambience: "temple", lighting: "dim" },
  shrine: { floor: 1, wall: 10, ambience: "temple", lighting: "dim" },
  inn: { floor: 2, wall: 13, ambience: "inn", lighting: "bright" },            // FLOOR_WOOD, WALL_WOOD
  tavern: { floor: 2, wall: 13, ambience: "inn", lighting: "dim" },
  shop: { floor: 2, wall: 13, ambience: "town", lighting: "bright" },
  market: { floor: 6, wall: 13, ambience: "town", lighting: "bright" },
  guild: { floor: 1, wall: 11, ambience: "guild", lighting: "dim" },
  academy: { floor: 1, wall: 11, ambience: "library", lighting: "bright" },
  library: { floor: 2, wall: 13, ambience: "library", lighting: "dim" },

  // Underground/Dark
  dungeon: { floor: 1, wall: 10, ambience: "dungeon", lighting: "dark" },
  cave: { floor: 1, wall: 12, ambience: "cave", lighting: "dark" },
  cavern: { floor: 1, wall: 12, ambience: "cave", lighting: "dark" },
  mine: { floor: 1, wall: 12, ambience: "mine", lighting: "dark" },
  crypt: { floor: 1, wall: 10, ambience: "crypt", lighting: "dark" },
  tomb: { floor: 1, wall: 10, ambience: "crypt", lighting: "dark" },
  catacomb: { floor: 1, wall: 10, ambience: "crypt", lighting: "dark" },
  sewer: { floor: 1, wall: 11, ambience: "sewer", lighting: "dark" },

  // Special
  ruins: { floor: 1, wall: 10, ambience: "ruins", lighting: "dim" },
  tower: { floor: 1, wall: 10, ambience: "tower", lighting: "dim" },
  camp: { floor: 3, wall: 0, ambience: "camp", lighting: "dim" },              // No walls for camps
  outpost: { floor: 3, wall: 13, ambience: "camp", lighting: "dim" },
  bridge: { floor: 43, wall: 20, ambience: "bridge", lighting: "bright" },     // BRIDGE
  road: { floor: 6, wall: 4, ambience: "road", lighting: "bright" },
  path: { floor: 3, wall: 4, ambience: "road", lighting: "bright" },

  // Default
  default: { floor: 1, wall: 10, ambience: "dungeon", lighting: "dim" },
};

// NPC role to entity type mapping
const NPC_ROLE_ENTITY_MAP: Record<string, number> = {
  merchant: 141,
  shopkeeper: 141,
  trader: 141,
  vendor: 141,
  guard: 142,
  soldier: 142,
  knight: 142,
  warrior: 142,
  villager: 140,
  peasant: 140,
  farmer: 140,
  citizen: 140,
  commoner: 140,
  innkeeper: 140,
  bartender: 140,
  // Hostile types
  bandit: 115,      // ORC as bandit
  thief: 102,       // PLAYER_ROGUE repurposed
  assassin: 102,
  goblin: 110,
  orc: 115,
  skeleton: 120,
  zombie: 125,
  // Default
  default: 140,
};

// Calculate distance between two locations
function calculateDistance(loc1: { mapX?: number; mapY?: number }, loc2: { mapX?: number; mapY?: number }): number {
  const x1 = loc1.mapX ?? 500;
  const y1 = loc1.mapY ?? 500;
  const x2 = loc2.mapX ?? 500;
  const y2 = loc2.mapY ?? 500;
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Get terrain config for a location type
function getTerrainForLocation(locationType: string): { floor: number; wall: number; ambience: string; lighting: string } {
  const normalizedType = locationType.toLowerCase().trim();

  // Check for partial matches
  for (const [key, value] of Object.entries(LOCATION_TERRAIN_MAP)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return value;
    }
  }

  return LOCATION_TERRAIN_MAP.default;
}

// Get entity type for NPC role
function getEntityTypeForNPC(role: string, isHostile: boolean): number {
  if (isHostile) {
    return NPC_ROLE_ENTITY_MAP.bandit; // Default hostile
  }

  const normalizedRole = role.toLowerCase().trim();

  for (const [key, value] of Object.entries(NPC_ROLE_ENTITY_MAP)) {
    if (normalizedRole.includes(key) || key.includes(normalizedRole)) {
      return value;
    }
  }

  return NPC_ROLE_ENTITY_MAP.default;
}

// HTTP streaming version for real-time map updates - WORLD AWARE
export const mapStream = httpAction(async (ctx, request) => {
  const {
    campaignId,
    playerAction,
    currentLocationName,
    currentLocationDescription,
    locationType,
    currentRoomState,
    needsNewRoom,
    narrativeContext,
  } = await request.json();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ events: [], error: "API key missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // =========================================================================
  // FETCH CAMPAIGN TEMPLATE DATA - This is the key enhancement!
  // =========================================================================

  // Extend Location type for mapX/mapY
  interface LocationWithMap extends Location {
    mapX?: number;
    mapY?: number;
    environment?: string;
    neighbors?: Id<"locations">[];
  }

  // Extend NPC type for grid positions
  interface NPCWithGrid extends NPC {
    gridX?: number;
    gridY?: number;
    spriteColor?: string;
    isHostile?: boolean;
    health?: number;
    maxHealth?: number;
  }

  let worldContext = "";
  let locationsData: LocationWithMap[] = [];
  let npcsAtLocation: NPCWithGrid[] = [];
  let nearbyLocations: { name: string; type: string; distance: number; direction: string }[] = [];
  let currentLocation: LocationWithMap | null = null;
  let terrain = LOCATION_TERRAIN_MAP.default;

  // Quest context for map generation
  interface QuestObjective {
    id: string;
    description: string;
    type: string;
    target?: string;
    targetCount?: number;
    currentCount?: number;
    isCompleted: boolean;
    isOptional?: boolean;
    hint?: string;
  }
  interface ActiveQuest {
    _id: string;
    title: string;
    description: string;
    locationId?: string;
    npcId?: string;
    objectives?: QuestObjective[];
    difficulty?: string;
    hint?: string;
  }
  let activeQuests: ActiveQuest[] = [];
  let questContext = "";

  try {
    // Fetch full campaign data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaignData = await ctx.runQuery((api as any).forge.getCampaignDetails, {
      campaignId: campaignId
    });

    if (campaignData) {
      locationsData = campaignData.locations as LocationWithMap[];
      const allNpcs = campaignData.npcs as NPCWithGrid[];

      // Find current location
      currentLocation = locationsData.find(
        (loc: LocationWithMap) => loc.name.toLowerCase() === currentLocationName?.toLowerCase()
      ) || null;

      // Get terrain for this location
      if (currentLocation) {
        terrain = getTerrainForLocation(currentLocation.type || locationType || "dungeon");
      } else if (locationType) {
        terrain = getTerrainForLocation(locationType);
      }

      // Find NPCs at current location
      if (currentLocation) {
        npcsAtLocation = allNpcs.filter(
          (npc: NPCWithGrid) => npc.locationId?.toString() === currentLocation!._id.toString() && !npc.isDead
        );
      }

      // Calculate nearby locations with distances and directions
      if (currentLocation && currentLocation.mapX !== undefined && currentLocation.mapY !== undefined) {
        nearbyLocations = locationsData
          .filter((loc: LocationWithMap) => loc._id !== currentLocation!._id)
          .map((loc: LocationWithMap) => {
            const dist = calculateDistance(currentLocation!, loc);
            // Calculate direction
            const dx = (loc.mapX ?? 500) - (currentLocation!.mapX ?? 500);
            const dy = (loc.mapY ?? 500) - (currentLocation!.mapY ?? 500);
            let direction = "";
            if (Math.abs(dy) > Math.abs(dx) * 0.5) direction += dy < 0 ? "north" : "south";
            if (Math.abs(dx) > Math.abs(dy) * 0.5) direction += dx > 0 ? "east" : "west";
            if (!direction) direction = "nearby";

            return {
              name: loc.name,
              type: loc.type,
              distance: Math.round(dist),
              direction,
            };
          })
          .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance)
          .slice(0, 8); // Top 8 nearest locations
      }

      // Build quest context from active quests FIRST (before worldContext uses it)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeQuests = (campaignData.activeQuests || []) as ActiveQuest[];
      const allNpcsForQuests = campaignData.npcs as NPCWithGrid[];

      if (activeQuests.length > 0) {
        questContext = `
=== ACTIVE QUESTS - USE FOR MAP GENERATION ===
The player has ${activeQuests.length} active quest(s). Generate maps that help guide them toward objectives!

${activeQuests.map((quest: ActiveQuest) => {
  // Find quest giver NPC
  const questGiver = quest.npcId ? allNpcsForQuests.find(n => n._id.toString() === quest.npcId?.toString()) : null;
  // Find quest location
  const questLocation = quest.locationId ? locationsData.find(l => l._id.toString() === quest.locationId?.toString()) : null;
  // Check if this quest is relevant to current location
  const isAtQuestLocation = questLocation && currentLocation && questLocation._id.toString() === currentLocation._id.toString();

  // Get incomplete objectives
  const incompleteObjectives = (quest.objectives || []).filter(obj => !obj.isCompleted);

  return `
QUEST: "${quest.title}" ${quest.difficulty ? `[${quest.difficulty.toUpperCase()}]` : ''}
${quest.description}
${questGiver ? `Quest Giver: ${questGiver.name} (${questGiver.role})` : ''}
${questLocation ? `Quest Location: ${questLocation.name}${isAtQuestLocation ? ' [PLAYER IS HERE!]' : ''}` : ''}

${incompleteObjectives.length > 0 ? `OBJECTIVES TO COMPLETE:
${incompleteObjectives.map(obj => {
  const progress = obj.targetCount ? ` (${obj.currentCount || 0}/${obj.targetCount})` : '';
  return `  ${obj.isOptional ? '[OPTIONAL] ' : ''}○ ${obj.description}${progress}
    Type: ${obj.type}${obj.target ? `, Target: ${obj.target}` : ''}
    ${obj.hint ? `Hint: ${obj.hint}` : ''}`;
}).join('\n')}` : 'All objectives complete - return to quest giver!'}
`;
}).join('\n')}

=== QUEST-AWARE MAP GENERATION RULES ===
1. If player is at a QUEST LOCATION, include quest-relevant elements:
   - Place QUEST TARGETS (NPCs to talk to, enemies to defeat, items to collect)
   - Add environmental hints pointing toward objectives
   - Include SIGNPOST(234) with quest hints

2. For KILL quests: Place the target enemy type in the map
3. For COLLECT quests: Place CHEST_CLOSED(200) or the item visually on the map
4. For TALK quests: Ensure the target NPC is placed prominently
5. For EXPLORE quests: Add discoverable areas, hidden paths, or points of interest

6. Add QUEST MARKERS:
   - Use SIGNPOST(234) with labels like "Quest: ${activeQuests[0]?.title || 'Unknown'}"
   - Place quest-related objects near quest targets
`;
      }

      // NOW build world context (which includes questContext)
      worldContext = `
WORLD BIBLE: ${campaignData.campaign.worldBible || campaignData.campaign.description || "A vast fantasy world"}

THIS CAMPAIGN HAS ${locationsData.length} LOCATIONS:
${locationsData.slice(0, 15).map((loc: LocationWithMap) =>
  `- ${loc.name} (${loc.type}): ${loc.description?.substring(0, 80) || 'No description'}... ${loc.mapX !== undefined ? `[Map: ${loc.mapX},${loc.mapY}]` : ''}`
).join('\n')}
${locationsData.length > 15 ? `... and ${locationsData.length - 15} more locations` : ''}

${nearbyLocations.length > 0 ? `
NEARBY LOCATIONS FROM ${currentLocationName} (for world-scale room generation):
${nearbyLocations.map(loc =>
  `- ${loc.name} (${loc.type}): ${loc.distance} units ${loc.direction}`
).join('\n')}

When generating OUTDOOR or OVERWORLD rooms, include PATHS and SIGNS pointing to these nearby locations.
The farther the distance, the more travel required (100 units ≈ 1 day travel).
` : ''}

${npcsAtLocation.length > 0 ? `
NPCs AT ${currentLocationName.toUpperCase()} - INCLUDE THESE IN THE MAP:
${npcsAtLocation.map((npc: NPCWithGrid) => {
  const entityType = getEntityTypeForNPC(npc.role, npc.isHostile || npc.attitude === "Hostile");
  return `- ${npc.name} (${npc.role}, ${npc.attitude}): Entity type ${entityType}${npc.gridX !== undefined ? ` at (${npc.gridX},${npc.gridY})` : ''} - ${npc.description?.substring(0, 50) || ''}...`;
}).join('\n')}
` : ''}

${questContext}`;
    }
  } catch (e) {
    console.error("[MapStream] Failed to fetch campaign data:", e);
    // Continue with basic generation if fetch fails
  }

  // Build the world-aware map prompt
  const mapPrompt = `You are a WORLD-AWARE MAP GENERATION AI for a 2D tilemap RPG. Your job is to create DYNAMIC, LIVING maps based on the creator's world template.

=== WORLD CONTEXT ===
${worldContext || 'No world data available - generate a generic dungeon.'}

=== CURRENT LOCATION ===
LOCATION: ${currentLocationName} (${locationType || currentLocation?.type || 'dungeon'})
${currentLocationDescription || currentLocation?.description ? `DESCRIPTION: ${currentLocationDescription || currentLocation?.description}` : ''}
${currentLocation?.environment ? `ENVIRONMENT: ${currentLocation.environment}` : ''}

=== TERRAIN FOR THIS LOCATION TYPE ===
Floor Tile: ${terrain.floor} (${Object.entries(LOCATION_TERRAIN_MAP).find(([, v]) => v.floor === terrain.floor)?.[0] || 'stone'})
Wall Tile: ${terrain.wall}
Ambience: ${terrain.ambience}
Lighting: ${terrain.lighting}

=== PLAYER ACTION ===
"${playerAction}"
${narrativeContext ? `NARRATIVE CONTEXT: ${narrativeContext}` : ''}

=== CURRENT ROOM STATE ===
${currentRoomState ? `
Room: ${currentRoomState.width}x${currentRoomState.height}
Player at: (${currentRoomState.playerPosition?.x || 5}, ${currentRoomState.playerPosition?.y || 8})
Entities: ${currentRoomState.entities?.map((e: { name: string; x: number; y: number }) => `${e.name}@(${e.x},${e.y})`).join(', ') || 'none'}
Objects: ${currentRoomState.objects?.length || 0} objects
` : 'NO ROOM EXISTS - Must generate a new one!'}

=== TASK ===
${needsNewRoom ? `
GENERATE A NEW ROOM that represents "${currentLocationName}".

**CRITICAL ROOM DESIGN RULES:**
1. DO NOT generate simple rectangular box rooms!
2. Create INTERESTING, VARIED shapes:
   - L-shaped rooms, T-junctions, irregular natural caves
   - Multiple connected chambers with corridors
   - Open outdoor areas with winding paths
   - Buildings with alcoves, corners, and features

3. ALWAYS include EXITS to nearby locations:
   - Place DOOR_CLOSED(30) or GATE_CLOSED(33) tiles at exits
   - Each exit should have a corresponding object with "exit" metadata
   - Outdoor areas: use PATH tiles (44) leading off the edge
   - Include at least 2-4 exits for towns/villages

4. Size based on location type:
   - Towns/Villages: 16-20 tiles, open layout with streets/paths
   - Dungeons/Caves: 12-16 tiles, corridors connecting chambers
   - Buildings/Shops: 8-12 tiles, interior furniture
   - Forests/Outdoors: 14-18 tiles, organic shapes with trees

5. POPULATE richly:
   - Add NPCs from the template at this location
   - Include environmental objects (torches, furniture, trees)
   - Place interactable objects (chests, doors, signs)
` : `
GENERATE EVENTS based on "${playerAction}".

If player wants to TRAVEL to another location (mentions going to a place, leaving, exiting):
- Generate a "transitionLocation" event: {"type":"transitionLocation","transitionLocation":{"toLocation":"LocationName"}}

If player wants to MOVE within the room:
- Generate moveEntity with path to target

If player wants to INTERACT (open chest, talk to NPC, etc.):
- Generate appropriate interaction events
`}

=== TILE ID REFERENCE ===
TERRAIN (use for this location type):
VOID=0, FLOOR_STONE=1, FLOOR_WOOD=2, FLOOR_DIRT=3, FLOOR_GRASS=4, FLOOR_SAND=5, FLOOR_COBBLE=6
WALL_STONE=10, WALL_BRICK=11, WALL_CAVE=12, WALL_WOOD=13
WATER_SHALLOW=20, WATER_DEEP=21, LAVA=22, ICE=23
DOOR_CLOSED=30, DOOR_OPEN=31, DOOR_LOCKED=32, GATE_CLOSED=33, GATE_OPEN=34
STAIRS_DOWN=40, STAIRS_UP=41, PIT=42, BRIDGE=43, PATH=44

ENTITIES (match to NPC roles):
PLAYER_WARRIOR=100, PLAYER_MAGE=101, PLAYER_ROGUE=102
GOBLIN=110, GOBLIN_ARCHER=111, ORC=115, ORC_BERSERKER=116
SKELETON=120, SKELETON_WARRIOR=121, ZOMBIE=125
RAT=130, GIANT_RAT=131, SPIDER=132, GIANT_SPIDER=133, BAT=134, WOLF=135
VILLAGER=140, MERCHANT=141, GUARD=142, ELDER=143, CHILD=144
BOSS_DEMON=150, BOSS_DRAGON=151, BOSS_LICH=152

OBJECTS (environmental decoration):
CHEST_CLOSED=200, CHEST_OPEN=201, CHEST_LOCKED=202, BARREL=203, CRATE=204
TABLE=210, CHAIR=211, BED=212, BOOKSHELF=213, CABINET=214
TORCH_WALL=220, TORCH_GROUND=221, CAMPFIRE=222, BRAZIER=223, LANTERN=224, STREETLAMP=225
ALTAR=230, FOUNTAIN=231, WELL=232, STATUE=233, SIGNPOST=234
TREE=235, BUSH=236, FLOWER=237, ROCK=238, FENCE=239
GOLD_PILE=240, GEM=241, POTION=242, SCROLL=243
ANVIL=244, FORGE=245, CAULDRON=246
TRAP_SPIKE=250, TRAP_ARROW=251, TRAP_FIRE=252

=== WORLD-BUILDING RULES ===

1. TOWN/VILLAGE GENERATION:
   - Use FLOOR_COBBLE(6) or FLOOR_DIRT(3) for streets
   - Add SIGNPOST(234) pointing to nearby locations
   - Include MERCHANT(141), GUARD(142), VILLAGER(140) NPCs
   - Add WELL(232), FOUNTAIN(231), STREETLAMP(225) decorations
   - Place buildings with DOOR_CLOSED(30) as entrances
   - Leave open areas for markets/plazas

2. DUNGEON/CAVE GENERATION:
   - Use FLOOR_STONE(1) and WALL_CAVE(12) or WALL_STONE(10)
   - Add TORCH_WALL(220) for sparse lighting
   - Include hostile entities: GOBLIN, SKELETON, etc.
   - Place CHEST_CLOSED(200), BARREL(203) for loot
   - Create corridors connecting chambers
   - Add STAIRS_DOWN(40) for deeper levels

3. FOREST/OUTDOOR GENERATION:
   - Use FLOOR_GRASS(4) with TREE(235), BUSH(236)
   - Create winding FLOOR_DIRT(3) paths
   - Add natural features: ROCK(238), WATER_SHALLOW(20)
   - Include wildlife: WOLF(135), RAT(130), BAT(134)
   - Place SIGNPOST(234) at path intersections

4. BUILDING INTERIORS:
   - Use FLOOR_WOOD(2) and WALL_WOOD(13)
   - Add furniture: TABLE(210), CHAIR(211), BED(212)
   - Include appropriate NPCs (MERCHANT in shops, etc.)
   - Smaller room sizes (8-12 tiles)

5. MOVEMENT DETECTION - Generate moveEntity when player says:
   - "walk to", "go to", "approach", "head toward"
   - Direction words: north, south, east, west, left, right
   - Object targets: "the chest", "the door", "the merchant"

=== OUTPUT FORMAT ===
Return ONLY a JSON array of events.

**ROOM GENERATION EXAMPLE (village with exits):**
[{"type":"generateRoom","generateRoom":{
  "width":18,"height":16,
  "tiles":[
    [0,0,0,0,4,4,44,44,44,4,4,0,0,0,0,0,0,0],
    [0,4,4,4,4,4,44,4,44,4,4,4,4,4,0,0,0,0],
    [4,4,4,4,4,4,44,4,44,4,4,4,4,4,4,0,0,0],
    [4,4,13,13,13,30,13,4,44,4,4,4,4,4,4,4,0,0],
    [4,4,13,2,2,2,13,4,44,4,4,13,13,30,13,4,4,0],
    [4,4,13,2,2,2,13,4,44,44,44,13,2,2,13,4,4,4],
    [4,4,13,13,13,13,13,4,4,4,44,13,2,2,13,4,4,4],
    [4,4,4,4,4,4,4,4,4,4,44,13,13,13,13,4,4,4],
    [4,4,4,4,6,6,6,6,6,44,44,4,4,4,4,4,4,4],
    [4,4,4,6,6,6,6,6,6,44,4,4,4,4,4,4,4,4],
    [4,4,4,6,6,6,6,6,6,44,44,44,44,44,44,4,4,4],
    [4,4,4,4,6,6,6,6,4,4,4,4,4,4,44,4,4,0],
    [4,4,4,4,4,4,4,4,4,4,4,4,4,4,44,4,0,0],
    [0,4,4,4,4,4,4,4,4,4,4,4,4,4,44,0,0,0],
    [0,0,4,4,4,4,4,4,4,4,4,4,4,44,44,0,0,0],
    [0,0,0,0,0,4,4,4,4,4,4,44,44,44,0,0,0,0]
  ],
  "entities":[
    {"id":"guard_1","type":142,"x":7,"y":9,"name":"Village Guard","hostile":false,"hp":30,"maxHp":30},
    {"id":"merchant_1","type":141,"x":4,"y":5,"name":"Trader Mira","hostile":false,"hp":20,"maxHp":20}
  ],
  "objects":[
    {"id":"well_1","type":232,"x":6,"y":9,"interactable":true},
    {"id":"sign_north","type":234,"x":7,"y":1,"interactable":true,"label":"To Dark Forest","exit":{"toLocation":"Dark Forest"}},
    {"id":"sign_east","type":234,"x":14,"y":10,"interactable":true,"label":"To Mountain Pass","exit":{"toLocation":"Mountain Pass"}},
    {"id":"door_shop","type":30,"x":5,"y":3,"interactable":true,"label":"General Store"},
    {"id":"door_inn","type":30,"x":13,"y":4,"interactable":true,"label":"The Rusty Tankard"}
  ],
  "lighting":"bright",
  "ambience":"village",
  "playerSpawn":{"x":9,"y":9}
}}]

**LOCATION TRANSITION (when player uses an exit):**
[{"type":"transitionLocation","transitionLocation":{"toLocation":"Dark Forest","direction":"north"}}]

**MOVEMENT:**
[{"type":"moveEntity","moveEntity":{"entityId":"player","path":[{"x":6,"y":6},{"x":7,"y":5}],"speed":"normal"}}]

IMPORTANT:
- Tiles array must have exactly height rows, each with exactly width columns
- Use 0 (VOID) for areas outside the walkable map
- Use 44 (PATH) for roads/trails that lead to exits
- Objects with "exit" property trigger location transitions when interacted

RESPOND WITH ONLY THE JSON ARRAY - NO EXPLANATION TEXT:`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: mapPrompt }] }],
        generationConfig: {
          temperature: 0.8, // Slightly higher for more creative world generation
          maxOutputTokens: 3000, // More tokens for larger rooms
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[MapStream] API Error:", errorText);
    return new Response(JSON.stringify({ events: [], error: "API Error" }), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  try {
    let cleanedJson = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/:\s*True\b/g, ': true')
      .replace(/:\s*False\b/g, ': false')
      .replace(/:\s*None\b/g, ': null')
      .replace(/,\s*([}\]])/g, '$1')
      .trim();

    if (cleanedJson.startsWith('{')) {
      const parsed = JSON.parse(cleanedJson);
      if (parsed.events) {
        return new Response(JSON.stringify({ events: parsed.events }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const events = JSON.parse(cleanedJson);
    console.log("[MapStream] Generated events for", currentLocationName, ":", events.length, "events");
    return new Response(JSON.stringify({ events: Array.isArray(events) ? events : [events] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("[MapStream] Parse error:", e, "Raw:", rawText.substring(0, 200));
    return new Response(JSON.stringify({ events: [], error: "Parse error", raw: rawText.substring(0, 500) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

export const generateQuest = action({
  args: {
    campaignId: v.id("campaigns"),
    locationId: v.id("locations"),
    locationName: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
    const campaignData = await ctx.runQuery((api as any).forge.getCampaignDetails, {
      campaignId: args.campaignId
    });

    if (!campaignData) {
        throw new Error("Campaign not found");
    }

    const worldContext = generateWorldContext(campaignData);

    const prompt = `
    Generate a unique, engaging quest located in or near "${args.locationName}".

    The quest should:
    - Fit the campaign tone and lore
    - Have clear, achievable objectives
    - Reference NPCs, locations, or factions from the world
    - Feel integrated into the world (not generic fetch quests)

    Create a quest with 2-4 specific objectives. Objective types:
    - "talk": Speak to a specific NPC
    - "explore": Visit a specific location
    - "collect": Gather items or information
    - "kill": Defeat enemies
    - "deliver": Bring something to someone
    - "escort": Protect someone
    - "custom": Other unique objectives

    Respond in this STRICT JSON format:
    {
      "title": "Quest Title (compelling, evocative)",
      "description": "Full quest description with hook, context, and stakes. Make the player care about WHY they should do this.",
      "difficulty": "easy|medium|hard|legendary",
      "xpReward": 50,
      "goldReward": 25,
      "objectives": [
        {
          "id": "obj_1",
          "description": "What the player needs to do",
          "type": "talk|explore|collect|kill|deliver|escort|custom",
          "target": "Target name (NPC, location, item, etc)",
          "targetCount": 1,
          "isCompleted": false,
          "isOptional": false,
          "hint": "A subtle hint if player gets stuck"
        }
      ],
      "rewards": [
        {
          "name": "Item Name",
          "type": "Weapon/Armor/Potion/etc",
          "rarity": "Common/Rare/Legendary",
          "effects": "Short effect description",
          "description": "Flavor text that fits the world"
        }
      ]
    }
    Do not wrap in markdown. Make the quest feel unique to this world.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: worldContext }] },
            { role: "user", parts: [{ text: prompt }] }
          ],
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );

    if (!response.ok) throw new Error("AI Request Failed");

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    try {
        const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const questData = JSON.parse(cleanText);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- api cast avoids circular type inference
        await ctx.runMutation((api as any).forge.saveGeneratedQuest, {
            campaignId: args.campaignId,
            locationId: args.locationId,
            title: questData.title,
            description: questData.description,
            rewards: questData.rewards || [],
            source: "ai",
            objectives: questData.objectives || [],
            difficulty: questData.difficulty || "medium",
            xpReward: questData.xpReward || 50,
            goldReward: questData.goldReward || 25,
        });

        return questData;
    } catch (e) {
        console.error("Failed to parse/save quest", e);
        throw new Error("Failed to generate quest");
    }
  }
});