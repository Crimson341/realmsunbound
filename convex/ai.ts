import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateNarrative = action({
  args: {
    prompt: v.string(),
    history: v.array(v.object({ role: v.string(), content: v.string() })),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback for development if no key is set, to prevent crash but warn user
      console.error("GEMINI_API_KEY is not set in Convex environment variables.");
      return "The Dungeon Master is currently away (GEMINI_API_KEY missing). Please set it in your Convex dashboard.";
    }

    const contents = args.history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Add the current prompt as the last user message
    contents.push({
      role: "user",
      parts: [{ text: args.prompt + "\n\nIMPORTANT: Respond in valid JSON format with these fields:\n1. 'content' (narrative text)\n2. 'choices' (array of 2-4 actions)\n3. 'rewards' (optional object with 'items': string[] and 'quests': string[])\n4. 'current_location' (optional string: the exact name of the location the player is currently in, e.g. 'Riverwood', only if changed or relevant).\nDo not wrap the JSON in markdown code blocks." }],
    });

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
       // clean up potential markdown wrapping if the model ignores the instruction
       const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
       return cleanText;
    } catch (e) {
       console.error("Failed to parse AI response", e);
       return JSON.stringify({ content: rawText, choices: [] });
    }
  },
});
