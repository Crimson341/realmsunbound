import { action, httpAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Helper to generate context
const generateWorldContext = (campaignData: any) => {
    const { 
      campaign, 
      locations, 
      npcs, 
      monsters, 
      items,
      quests,
      rules 
    } = campaignData;

    return `
    You are the Dungeon Master for a TTRPG campaign.
    STRICTLY ADHERE to the following world details. 
    
    CRITICAL RULES:
    1. Do NOT invent new NPCs, Locations, or Quests unless absolutely necessary for the immediate narrative flow. 
    2. PRIORITIZE using the provided Lists of NPCs, Locations, and Quests.
    3. If the user asks about a character or place not in the list, check if an existing one fits first.
    4. Only create new content if the user explicitly asks for something that doesn't exist, and even then, try to tie it to existing lore.
    
    CAMPAIGN: ${campaign.title}
    DESCRIPTION: ${campaign.description}
    RULES: ${campaign.rules}
    
    LOCATIONS:
    ${locations.map((l: any) => `- ${l.name} (${l.type}): ${l.description}`).join('\n')}
    
    NPCs (USE THESE FIRST):
    ${npcs.map((n: any) => `- ${n.name} (${n.role}, ${n.attitude}): ${n.description} (Location: ${locations.find((l: any) => l._id === n.locationId)?.name || 'Unknown'})`).join('\n')}
    
    QUESTS (ACTIVE/AVAILABLE):
    ${quests.map((q: any) => `- ${q.title}: ${q.description} (Giver: ${npcs.find((n: any) => n._id === q.npcId)?.name || 'Unknown'}, Status: ${q.status})`).join('\n')}

    MONSTERS (Known):
    ${monsters.map((m: any) => `- ${m.name}: ${m.description}`).join('\n')}
    
    ITEMS (Key):
    ${items.slice(0, 20).map((i: any) => `- ${i.name} (${i.type}): ${i.description}`).join('\n')}
    
    IMPORTANT:
    - Maintain the tone of the campaign.
    - If the user asks to go to a location not in this list, guide them to a known nearby location or describe the travel based on the environment.
    - Use the defined Rules for any mechanics.
    `;
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

    const worldContext = generateWorldContext(campaignData);

    const contents = [
      {
        role: "user",
        parts: [{ text: worldContext }] // Preload context as the first message
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
  const { prompt, history, campaignId } = await request.json();

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

  const worldContext = generateWorldContext(campaignData);

  const contents = [
    {
      role: "user",
      parts: [{ text: worldContext }]
    },
    ...history.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    {
      role: "user",
      parts: [{ text: prompt + "\n\nIMPORTANT: Respond in this EXACT format:\n<narrative>\n[Write the narrative text here...]\n</narrative>\n<data>\n[JSON object with 'choices', 'rewards', 'current_location', 'completed_quests']\n</data>" }],
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