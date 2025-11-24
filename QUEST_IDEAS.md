# Quest System Expansion Ideas

This document outlines potential features, mechanics, and creative concepts to expand the **Quest System** in the Forge. The goal is to move beyond simple "Fetch" or "Kill" quests and allow DMs (and the AI) to create complex, branching, and immersive narratives.

## 1. Advanced Quest Archetypes

Instead of just a title and description, quests could have specific **Sub-Types** with unique UI elements and tracking logic.

*   **🕵️ Mystery / Investigation**
    *   **Mechanic:** The player must find specific "Clues" (Items or Information) before the quest can be turned in.
    *   **UI:** A "Clue Board" or list of discovered facts within the Quest Detail modal.
    *   **AI Integration:** The AI generates 3-4 clues scattered across different NPCs in the area.

*   **🛡️ Escort / Protection**
    *   **Mechanic:** An NPC temporarily joins the player's party (displayed in the UI).
    *   **Condition:** If the NPC takes too much damage (narratively tracked), the quest fails.
    *   **Objective:** Travel from Location A to Location B.

*   **⚖️ Diplomacy / Negotiation**
    *   **Mechanic:** Non-combat resolution. The player must choose the right dialogue options with rival factions.
    *   **Branching:** Success leads to Peace (Shop discount), Failure leads to War (New Monster spawns).

*   **⚗️ Crafting / Gathering**
    *   **Mechanic:** Requires specific components (e.g., "3x Iron Ore", "1x Fire Essence").
    *   **UI:** A progress bar for gathered materials (0/3 Iron Ore).
    *   **Reward:** The player actually receives the item they crafted.

## 2. Narrative Structure & Logic

Enhance the *flow* of quests.

*   **⛓️ Quest Chains (Campaign Arcs)**
    *   Allow quests to have a `nextQuestId`.
    *   Completing "The Village Defender" automatically unlocks "The Goblin Camp".
    *   **Visual:** Show a simple flowchart or "Chapter" progress in the Forge.

*   **🌲 Branching Outcomes**
    *   Allow quests to have multiple "Resolution States".
    *   *Example:* "Deal with the Bandit"
        *   *Outcome A:* Kill him (Reward: Gold).
        *   *Outcome B:* Bribe him (Reward: Information/Map Reveal).
    *   The AI DM handles the narrative fallout based on the chosen outcome.

*   **⏳ Time-Sensitive Objectives**
    *   Quests that must be completed before a certain number of "turns" or narrative beats pass.
    *   *Failure Consequence:* The town is destroyed, or the reward is reduced.

## 3. Expanded Rewards

Rewards should feel meaningful and impact the world.

*   **Faction Reputation:** "+10 Favor with the Mages Guild" (unlocks new spells in the shop).
*   **World State Changes:** Completing a quest changes a Location's description (e.g., "Ruined Tower" becomes "Rebuilt Watchtower").
*   **Lore Entries:** Unlocks a page in the "Lore" section of the app.
*   **Followers:** Unlocks a specific NPC to be recruited.

## 4. AI-Powered Generation Ideas

Ways to utilize Gemini for richer quest generation.

*   **"Rumor Mill" Generation:**
    *   Instead of a direct quest, the AI generates "Rumors" at taverns.
    *   *Prompt:* "Generate 3 rumors about the local area. One is true (leads to a quest), one is exaggerated, one is false."

*   **Dynamic Loot Tables:**
    *   Instead of fixed items, the quest reward is "A chest containing [Rarity] loot."
    *   When opened, the AI generates the item on the fly based on the player's class (e.g., A Wizard finds a staff, a Fighter finds a shield).

*   **Nemic System (Rivals):**
    *   If a player fails a quest or creates an enemy, the AI generates a "Nemesis" NPC who actively tries to thwart future quests.

## 5. Forge UI Additions (For Implementation)

*   **Quest Step Builder:** A UI to add multiple steps (Go here -> Talk to X -> Kill Y).
*   **Condition Editor:** "Requires Level 5", "Requires Class: Rogue".
*   **Hidden Objectives:** Objectives that are only revealed after a certain trigger.
