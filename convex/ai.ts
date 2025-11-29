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
function filterNpcsByRelevance(
  npcs: NPC[],
  locations: Location[],
  currentLocationId?: string,
  maxNpcs: number = 25
): { critical: NPC[]; relevant: NPC[]; background: NPC[] } {
  const critical: NPC[] = [];
  const relevant: NPC[] = [];
  const background: NPC[] = [];

  // Get current location's neighbor IDs for "nearby" filtering
  const currentLocation = currentLocationId
    ? locations.find((l) => l._id.toString() === currentLocationId)
    : null;
  const neighborIds = new Set<string>();
  // Note: neighbors not in Location interface yet, would need to be added

  for (const npc of npcs) {
    // Skip dead NPCs for regular lists
    if (npc.isDead) {
      continue;
    }

    // Critical: At current location OR essential
    if (
      (currentLocationId && npc.locationId?.toString() === currentLocationId) ||
      npc.isEssential
    ) {
      critical.push(npc);
    }
    // Relevant: Nearby locations or recruitable
    else if (
      npc.isRecruitable ||
      (npc.locationId && neighborIds.has(npc.locationId.toString()))
    ) {
      relevant.push(npc);
    }
    // Background: Everything else
    else {
      background.push(npc);
    }
  }

  // Limit background to prevent context bloat
  const maxBackground = Math.max(0, maxNpcs - critical.length - relevant.length);

  return {
    critical,
    relevant,
    background: background.slice(0, maxBackground),
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

    === NPCs (Tiered by Relevance) ===
    ${npcTiers.critical.length > 0 ? `
    NPCs AT CURRENT LOCATION / ESSENTIAL (HIGHEST PRIORITY):
    ${npcTiers.critical.map(formatNpc).join('\n')}
    ` : ''}
    ${npcTiers.relevant.length > 0 ? `
    NEARBY / RECRUITABLE NPCs:
    ${npcTiers.relevant.map(formatNpc).join('\n')}
    ` : ''}
    ${npcTiers.background.length > 0 ? `
    OTHER KNOWN NPCs:
    ${npcTiers.background.map(formatNpc).join('\n')}
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

    === QUESTS (Prioritized) ===
    ${questTiers.active.length > 0 ? `
    ACTIVE QUESTS (CURRENT OBJECTIVES):
    ${questTiers.active.map((q) => `- [ACTIVE] ${q.title}: ${q.description} (Giver: ${allFilteredNpcs.find((n) => n._id === q.npcId)?.name || 'Unknown'})`).join('\n')}
    ` : ''}
    ${questTiers.available.length > 0 ? `
    AVAILABLE QUESTS:
    ${questTiers.available.map((q) => `- [AVAILABLE] ${q.title}: ${q.description} (Giver: ${allFilteredNpcs.find((n) => n._id === q.npcId)?.name || 'Unknown'})`).join('\n')}
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
          currentLocationId: currentLocationId,
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
[Write vivid, immersive narrative text here. Describe what happens, what the player sees, hears, and feels. Be dramatic and engaging. If a dice roll occurred, describe the outcome dramatically - a fumble, a lucky break, a clutch success, etc.]
</narrative>

<data>
{
  "choices": ["Action 1", "Action 2", "Action 3"],
  "context": "explore|combat|social|rest",
  "gameEvent": {
    "type": "exploration|combat|social|skillCheck|reward|npcDeath|crime|recruitment",
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
    "recruitment": { "npcName": "NPC Name", "npcId": "npc_id", "cost": 100, "role": "companion|guard|worker" }
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
   
3. Rarity levels: "common" (gray), "uncommon" (green), "rare" (blue), "epic" (purple), "legendary" (gold)

4. Award XP for: defeating enemies (10-50), completing objectives (25-100), good roleplay (5-15)

5. Adjust player HP when they take damage or heal

6. Choices should be 2-4 contextual actions the player can take

SPECIAL RULES:
- If an NPC marked [ESSENTIAL] would die, they instead fall unconscious and recover later
- NPCs marked [RECRUITABLE] can be invited to join the player's camp for a gold cost
- If the player kills a named NPC, ALWAYS include an npcDeath event so it's tracked
${bountyEnabled ? '- Criminal actions (murder, theft, assault) should trigger a crime event with appropriate bounty' : ''}
${worldState.isJailed ? '- The player is JAILED. Limit actions to jail-appropriate choices: wait, attempt escape, bribe, serve time' : ''}`;

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
    
    The quest should fit the campaign tone.
    Include:
    1. Title
    2. Description (hook + objective)
    3. A reward item (Name, Type, Rarity, Effects, Description).
    
    Respond in this STRICT JSON format:
    {
      "title": "Quest Title",
      "description": "Full quest description...",
      "rewards": [
        {
          "name": "Item Name",
          "type": "Weapon/Armor/Potion/etc",
          "rarity": "Common/Rare/Legendary",
          "effects": "Short effect description",
          "description": "Flavor text"
        }
      ]
    }
    Do not wrap in markdown.
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
            source: "ai"
        });

        return questData;
    } catch (e) {
        console.error("Failed to parse/save quest", e);
        throw new Error("Failed to generate quest");
    }
  }
});