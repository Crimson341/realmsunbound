import { action, httpAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Helper to generate context
const generateWorldContext = (campaignData: any, playerState?: any, worldState?: any) => {
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

    // Parse terminology if it exists
    let terms = { spells: "Spells", mana: "Mana", class: "Class", level: "Level" };
    if (campaign.terminology) {
        try {
            const customTerms = JSON.parse(campaign.terminology);
            terms = { ...terms, ...customTerms };
        } catch { /* ignore */ }
    }

    let context = `
    ROLE: ${campaign.aiPersona || "You are the Dungeon Master for a TTRPG campaign."}
    
    WORLD BIBLE (THE ABSOLUTE TRUTH):
    ${campaign.worldBible || campaign.description}
    
    STRICTLY ADHERE to the following world details. 
    
    SYSTEM TERMINOLOGY:
    - Magic/Abilities are called: "${terms.spells}"
    - Energy/Resource is called: "${terms.mana}"
    - Character Archetype is called: "${terms.class}"
    
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
    
    LOCATIONS:
    ${locations.map((l: any) => `- ${l.name} (${l.type}): ${l.description}`).join('\n')}
    
    NPCs (LIVING - USE THESE):
    ${npcs.map((n: any) => {
        const location = locations.find((l: any) => l._id === n.locationId);
        const faction = factions?.find((f: any) => f._id === n.factionId);
        return `- ${n.name} (${n.role}, ${n.attitude}): ${n.description} | Location: ${location?.name || 'Unknown'}${faction ? ` | Faction: ${faction.name}` : ''}${n.isRecruitable ? ' | [RECRUITABLE]' : ''}${n.isEssential ? ' | [ESSENTIAL - Cannot die]' : ''}`;
    }).join('\n')}
    
    ${deadNpcs && deadNpcs.length > 0 ? `
    DEAD NPCs (DO NOT USE - FOR REFERENCE ONLY):
    ${deadNpcs.map((n: any) => `- ${n.name} (${n.role}): Died from "${n.deathCause}" | Killed by: ${n.killedBy || 'Unknown'}`).join('\n')}
    IMPORTANT: These NPCs are DEAD. They cannot appear in scenes. Other NPCs may reference their deaths if they would realistically know.
    ` : ''}

    ${factions && factions.length > 0 ? `
    FACTIONS:
    ${factions.map((f: any) => `- ${f.name}: ${f.description}${f.territory ? ` | Territory: ${f.territory}` : ''}`).join('\n')}
    ` : ''}

    ${regions && regions.length > 0 ? `
    REGIONS:
    ${regions.map((r: any) => `- ${r.name}: ${r.description || 'No description'}${r.governingFactionId ? ` | Governed by faction` : ''}`).join('\n')}
    ` : ''}
    
    QUESTS (ACTIVE/AVAILABLE):
    ${quests.map((q: any) => `- ${q.title}: ${q.description} (Giver: ${npcs.find((n: any) => n._id === q.npcId)?.name || 'Unknown'}, Status: ${q.status})`).join('\n')}

    MONSTERS (Known):
    ${monsters.map((m: any) => `- ${m.name}: ${m.description}`).join('\n')}
    
    ITEMS (Key):
    ${items.slice(0, 20).map((i: any) => `- ${i.name} (${i.type}): ${i.description || i.effects}${i.usable ? ' [USABLE]' : ''}${i.consumable ? ' [CONSUMABLE]' : ''}`).join('\n')}
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
    - Wanted in regions: ${worldState.bounty.activeBounties?.map((b: any) => b.regionName).join(', ') || 'None'}
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
    ${worldState.rumors.map((r: any) => `- [${r.type.toUpperCase()}] ${r.content}${r.isRecent ? ' (Recent news!)' : ''}`).join('\n')}
    IMPORTANT: NPCs should organically mention these rumors when relevant. Don't info-dump them all at once.
    `;
      }

      if (worldState.npcsAtLocation && worldState.npcsAtLocation.length > 0) {
        context += `
    NPCs PRESENT AT CURRENT LOCATION:
    ${worldState.npcsAtLocation.map((n: any) => `- ${n.name} (${n.role}) - ${n.attitude}`).join('\n')}
    `;
      }

      if (worldState.deadAtLocation && worldState.deadAtLocation.length > 0) {
        context += `
    DEATHS AT THIS LOCATION (for atmosphere/reference):
    ${worldState.deadAtLocation.map((n: any) => `- ${n.name} was ${n.deathCause} by ${n.killedBy}`).join('\n')}
    NPCs here may reference these deaths sadly or fearfully.
    `;
      }

      if (worldState.camp) {
        context += `
    PLAYER'S CAMP - "${worldState.camp.name}":
    - Location: ${worldState.camp.locationName || 'Unknown'}
    - Followers: ${worldState.camp.followers?.map((f: any) => `${f.npc?.name} (${f.role})`).join(', ') || 'None'}
    - Resources: Gold: ${worldState.camp.resources?.gold || 0}, Food: ${worldState.camp.resources?.food || 0}
    The player can return to their camp to rest, manage followers, or store items.
    `;
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
    // Use explicit 'any' cast for api to avoid circular type inference issues
    const campaignData = await ctx.runQuery((api as any).forge.getCampaignDetails, {
      campaignId: args.campaignId 
    });

    if (!campaignData) {
        return "Error: Campaign not found.";
    }

    // Dynamic Context Retrieval (RAG)
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
       
       if (Array.isArray(parsed.choices)) {
           parsed.choices = parsed.choices.map((c: any) => {
               if (typeof c === 'string') return c;
               if (typeof c === 'object' && c !== null) {
                   return c.action || c.text || c.label || JSON.stringify(c);
               }
               return String(c);
           });
       }
       
       return JSON.stringify(parsed);
    } catch (e) {
       console.error("Failed to parse AI response", e);
       return JSON.stringify({ content: rawText, choices: [] });
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

  const campaignData = await ctx.runQuery((api as any).forge.getCampaignDetails, {
    campaignId: campaignId 
  });

  if (!campaignData) {
      return new Response("Campaign not found", { status: 404, headers: corsHeaders });
  }

  // Dynamic Context Retrieval (RAG)
  // We need to run this as a query/action before streaming
  // Since this is an httpAction, we can call runAction
  const dynamicContext: string = await ctx.runAction((api as any).lib.context.retrieveRelevantContext, {
      campaignId: campaignId,
      query: prompt,
  });

  // Automatic Memory Summarization
  // Trigger every 10 turns (20 messages) to keep memories fresh
  if (history.length > 0 && history.length % 20 === 0) {
      await ctx.scheduler.runAfter(0, (api as any).lib.memory.summarizeSession, {
          campaignId: campaignId,
          chatHistory: history.slice(-20), // Summarize the last 20 messages
      });
  }

  // Fetch additional world state for enhanced AI context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worldState: any = {};
  
  try {
    // Get bounty status if bounty system is enabled and player ID provided
    if (campaignData.bountyEnabled && playerId) {
      const bountyStatus = await ctx.runQuery((api as any).bounty.getBountyStatus, {
        campaignId: campaignId,
        playerId: playerId,
      });
      worldState.bounty = bountyStatus;
      
      // Check jail status
      const jailStatus = await ctx.runQuery((api as any).bounty.checkJailStatus, {
        campaignId: campaignId,
        playerId: playerId,
      });
      worldState.isJailed = jailStatus.isJailed;
    }
    
    // Get location-based context (NPCs present, rumors)
    if (currentLocationId) {
      const knowledgeContext = await ctx.runQuery((api as any).world.getNPCKnowledgeContext, {
        campaignId: campaignId,
        currentLocationId: currentLocationId,
      });
      worldState.npcsAtLocation = knowledgeContext.npcsAtLocation;
      worldState.rumors = knowledgeContext.rumorsHere;
      worldState.deadAtLocation = knowledgeContext.deadAtLocation;
    }
    
    // Get player camp if exists
    if (playerId) {
      const camp = await ctx.runQuery((api as any).camp.getCampDetails, {
        campaignId: campaignId,
        playerId: playerId,
      });
      if (camp) {
        worldState.camp = camp;
      }
    }
  } catch (e) {
    // Silently continue if any world state queries fail
    console.error("Failed to fetch world state:", e);
  }

  const worldContext = generateWorldContext(campaignData, playerState, worldState);

  // Enhanced prompt for game events
  const bountyEnabled = campaignData.bountyEnabled;
  const gameEventInstructions = `
IMPORTANT: Respond in this EXACT format:

<narrative>
[Write vivid, immersive narrative text here. Describe what happens, what the player sees, hears, and feels. Be dramatic and engaging.]
</narrative>

<data>
{
  "choices": ["Action 1", "Action 2", "Action 3"],
  "context": "explore|combat|social|rest",
  "gameEvent": {
    "type": "exploration|combat|social|skillCheck|reward|npcDeath|crime|recruitment",
    "combat": { "enemyName": "Enemy Name", "enemyHP": 20, "enemyMaxHP": 20, "isPlayerTurn": true },
    "skillCheck": { "skill": "Perception", "roll": 15, "modifier": 3, "target": 12, "success": true },
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
    ...history.map((msg: any) => ({
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