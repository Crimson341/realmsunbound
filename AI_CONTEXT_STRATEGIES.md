# AI Context Management Strategies for Realms

*Date: November 24, 2025*

This document outlines strategies for maintaining high-quality AI context, memory, and narrative consistency in **Realms**, tailored to our tech stack (Next.js, Convex).

## 1. The Core Challenge: Context Window vs. Continuity
Large Language Models (LLMs) have a finite context window. As a game progresses, the history (chat logs, world state changes) quickly exceeds this limit. To maintain the illusion of a consistent "Dungeon Master" or living world, we must move from a simple "append-all-history" approach to a **Tiered Memory System**.

## 2. Tiered Memory Architecture

We should divide AI memory into three distinct tiers:

### Tier 1: Short-Term / Working Memory (The "Now")
*   **What it is:** The immediate conversation context (last 5-10 turns).
*   **Storage:** Direct array in the prompt.
*   **Purpose:** Handles immediate replies, follow-up questions, and current scene fluidity.
*   **Implementation:** Keep a sliding window of the most recent `messages` in the chat history.

### Tier 2: Episodic Memory (The "Story So Far")
*   **What it is:** Summarized versions of past events, significant plot points, and completed quests.
*   **Storage:** Convex Database (Text/JSON).
*   **Purpose:** Provides narrative continuity without consuming massive tokens.
*   **Strategy:**
    *   **Auto-Summarization:** After every N turns (e.g., 20), trigger a background AI job to summarize the recent chunk of conversation into a paragraph.
    *   **Chapter System:** Group summaries into "Chapters" or "Sessions".

### Tier 3: Semantic Long-Term Memory (The "Lore")
*   **What it is:** Static world lore, character backstories, rules, and specific past details (e.g., "What was the name of that shopkeeper in town X?").
*   **Storage:** **Convex Vector Index**.
*   **Purpose:** On-demand retrieval of relevant facts based on the current context.
*   **Strategy (RAG - Retrieval Augmented Generation):**
    *   Chunk all static lore (markdown files, rulebooks) and dynamic significant memories into vectors.
    *   Before generating an AI response, embed the user's last query.
    *   Perform a `vectorSearch` in Convex to find the top 3-5 relevant chunks.
    *   Inject these chunks into the system prompt's "Context" section.

## 3. Leveraging Convex for Vector Search
Since we are using Convex, we have built-in vector search capabilities which are perfect for Tier 3 memory.

**Implementation Steps:**
1.  **Schema Update:** Add a `embeddings` field to our `lore` or `memory` tables in `convex/schema.ts`.
2.  **Vector Index:** Define a vector index on this field.
3.  **Ingestion:** Create a Convex action that takes text (lore/memory), calls an embedding API (e.g., OpenAI `text-embedding-3-small`), and stores the vector.
4.  **Retrieval:** In the `ai.ts` action, perform `ctx.vectorSearch` before calling the LLM to gather context.

## 4. Structured Knowledge (The "Graph")
LLMs struggle with consistent stats and relationships (e.g., remembering an NPC is "Dead" or "Hostile").

*   **State > Text:** Don't rely on chat history for game state.
*   **JSON State:** Maintain a structured JSON object for the current Scene, NPC Status, and Quest Log.
*   **Injection:** Always pass the strictly valid `GameState` JSON into the system prompt.
*   **Updates:** Force the AI to output structured tools/function calls to update this state (e.g., `updateQuestStatus({ id: 'q1', status: 'COMPLETED' })`) rather than just writing "You finished the quest."

## 5. Advanced Tactics

### "Atomic" Interaction
Instead of sending the whole history for every check, use specialized, smaller prompts for specific tasks:
*   *Is the player trying to cheat?* (Send only last action + rules)
*   *Does this action trigger a trap?* (Send only last action + trap logic)
*   *Generate Dialogue.* (Send history + personality profile)

### Entity Extraction
Background jobs can analyze conversation logs to extract new "Facts" (e.g., Player mentions they hate spiders) and save them to the User Profile or Knowledge Graph for future reference.

## 6. Action Plan for Realms

1.  **Enable Vector Search:** Set up Convex Vector Index for `lore` documents.
2.  **Summarization Service:** Create a Convex action `summarizeSession` that compacts chat logs.
3.  **Context Assembler:** Write a helper function `assembleContext(userId, currentInput)` that:
    *   Fetches recent chat (Tier 1).
    *   Fetches active quest state (Structured).
    *   Vector searches for relevant lore based on `currentInput` (Tier 3).
    *   Combines them into a robust System Prompt.
