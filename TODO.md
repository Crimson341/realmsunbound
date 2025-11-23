# Realms - Development To-Do List

## 🚀 Features to Implement
- [ ] **Combat System**: A more structured turn-based or real-time combat interface, possibly using the AI to manage enemy turns.
- [ ] **Merchant Interface**: specialized UI for trading with NPCs tagged as "Merchant", allowing gold exchange for items.
- [x] **Character Sheet**: A detailed view of stats (STR, DEX, etc.), skills, and spell slots in the sidebar that are only for that users campaigns.
- [ ] **Save/Load States**: Enhanced persistence for campaigns, allowing multiple save slots per user per campaign.

## 🛠️ Forge & Creator Tools
- [x] **Creator Attribution**:
    - Display "Created by [Name]" on campaign cards in the global dashboard.
    - Allow creators to set a custom "Studio Name" or alias for their profile.
- [ ] **Campaign Chaining (Sagas)**:
    - **Sequel Linking**: Allow creators to link a campaign as a "Sequel" to an existing one.
    - **Save Transfer**: Implement "New Game+" functionality where users can import their character (stats, inventory, spells) from a finished campaign into its sequel. **(Creator Toggle: "Allow Character Import" - disabled by default)**.
    - **Legacy Items**: Tag specific items as "Heirlooms" that are guaranteed to carry over.
- [ ] **Dungeon Constraints**:
    - **Level Caps/Floors**: Add settings for Locations to enforce "Min Level" (to enter) and "Max Level" (scaling cap).
    - **Key Gating**: Allow creators to lock specific dungeons behind required items (e.g., "Requires: Rusty Key").

## 👤 User Dashboard Enhancements
- [ ] **Saga Tracking**: Visual timeline showing the user's progress through a chain of linked campaigns.
- [ ] **Hall of Heroes**: A section to view retired characters from completed campaigns and their final stats/loadout.
- [ ] **Creator Following**: Button to "Follow" a creator and get notified when they release a new campaign or sequel.

## 💡 Ideas & Concepts
- **Voice Mode**: Integrate speech-to-text and text-to-speech for a hands-free D&D experience.
- **Multiplayer Parties**: Allow multiple users to join the same campaign ID and adventure together in the same narrative stream.
- **Image Generation**: Use an image generation API to create unique visuals for items and locations on the fly as they are discovered.
- **Lore Wiki**: A searchable database of all discovered entities (NPCs, Locations, Items) that grows as the player explores.

## 🗣️ Suggestions / Polish
- **Mobile UI Improvements**: The current sidebar is hidden on mobile; consider a better bottom-sheet or drawer navigation for easier access to inventory/stats on phones.
- **Rich Text Parsing**: Improve the `HighlightText` component to handle markdown formatting (bold, italic) from the AI response better.
- **Loading States**: Add skeleton loaders for the sidebars while data is being fetched.
- **Error Handling**: More robust error boundaries for AI timeouts or API limits.

## 🐛 Known Issues / Bugs to Watch
- **AI Formatting**: Occasionally the AI might return JSON wrapped in markdown code blocks (mitigated, but keep an eye on it).
- **Context Limit**: Long campaigns might hit the token limit for the AI history context window. Need a summarization strategy.
