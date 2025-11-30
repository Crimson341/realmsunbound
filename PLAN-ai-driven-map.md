# AI-Driven D&D Map System - Implementation Plan

## Vision
Transform the gameplay from text-only chat to a **hybrid visual experience** where:
- AI generates dungeon/room layouts dynamically
- Player describes actions → AI moves their token on the map
- Map reacts in real-time to AI narrative decisions (doors open, enemies spawn, treasures reveal)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Play Page (Hybrid)                       │
├─────────────────────┬───────────────────────────────────────┤
│                     │                                         │
│   2D MAP CANVAS     │        NARRATIVE CHAT                  │
│   (AI-Controlled)   │        (Text Input/Output)             │
│                     │                                         │
│  ┌───────────────┐  │   ┌─────────────────────────────────┐  │
│  │ Player Token  │  │   │ AI: You enter a dark chamber... │  │
│  │ NPC Tokens    │  │   │                                 │  │
│  │ Items/Objects │  │   │ [Move North] [Search] [Attack]  │  │
│  │ Fog of War    │  │   │                                 │  │
│  └───────────────┘  │   │ > I move toward the chest       │  │
│                     │   └─────────────────────────────────┘  │
└─────────────────────┴───────────────────────────────────────┘
```

## Core Features

### 1. AI Map Generation
AI generates room layouts as JSON within narrative responses:

```typescript
gameEvent: {
  type: 'mapUpdate',
  mapUpdate: {
    action: 'generate' | 'reveal' | 'modify',
    roomData?: {
      tiles: number[][],      // 2D tilemap (10x10 typical room)
      collision: number[][],  // Walkable areas
      entities: [{            // Objects in room
        type: 'door' | 'chest' | 'trap' | 'npc' | 'enemy',
        x: number, y: number,
        id: string,
        state: 'locked' | 'open' | 'hidden' | 'active'
      }],
      exits: [{              // Connections to other rooms
        direction: 'north' | 'south' | 'east' | 'west',
        x: number, y: number,
        leadsTo: 'unknown' | string  // Room ID or unknown
      }]
    },
    revealArea?: { x: number, y: number, radius: number },
    modifyEntity?: { id: string, newState: string }
  }
}
```

### 2. AI-Controlled Player Movement
When player describes movement, AI responds with movement commands:

```typescript
gameEvent: {
  type: 'playerMove',
  playerMove: {
    fromX: number, fromY: number,
    toX: number, toY: number,
    path?: Array<{x: number, y: number}>,  // For animated path
    blocked?: boolean,
    reason?: string  // "The door is locked"
  }
}
```

### 3. Entity Interactions
AI controls entity states based on narrative:

```typescript
gameEvent: {
  type: 'entityUpdate',
  entityUpdate: {
    entityId: string,
    action: 'spawn' | 'remove' | 'move' | 'changeState',
    newPosition?: { x: number, y: number },
    newState?: string,
    animation?: 'fadeIn' | 'fadeOut' | 'flash' | 'shake'
  }
}
```

## Implementation Tasks

### Phase 1: Core Map Component (3-4 hours)
1. **Create `AIMapCanvas.tsx`** - React component with Pixi.js
   - Renders current room tilemap
   - Shows player token (animated)
   - Shows entities (NPCs, items, doors)
   - Fog of war system
   - Smooth camera following

2. **Create `MapEventHandler.ts`** - Processes AI map events
   - Parses gameEvent.mapUpdate
   - Triggers animations
   - Updates entity states

### Phase 2: AI Integration (2-3 hours)
3. **Update AI Prompt** (`convex/ai.ts`)
   - Add map generation instructions
   - Define room templates/styles
   - Add movement command format
   - Add entity interaction format

4. **Add Map Event Types** to gameEvent structure
   - mapUpdate, playerMove, entityUpdate
   - Room generation schema

### Phase 3: Hybrid UI (2-3 hours)
5. **Create Hybrid Play Page** (`/play-hybrid/[campaignId]`)
   - Split view: Map (left) + Chat (right)
   - Map syncs with narrative
   - Click-to-move option (sends to AI as prompt)

6. **Visual Effects System**
   - Door opening animation
   - Chest opening
   - Enemy spawn effects
   - Combat visual indicators

### Phase 4: Dungeon System (3-4 hours)
7. **Dungeon State Management**
   - Track explored rooms
   - Save/load dungeon progress
   - Mini-map showing explored areas

8. **Room Templates**
   - Create base room layouts
   - AI modifies templates
   - Procedural room connections

## File Structure

```
/game/
├── ai-map/
│   ├── AIMapCanvas.tsx       # Main map component
│   ├── AIMapEngine.ts        # Pixi.js engine for AI map
│   ├── RoomRenderer.ts       # Renders room tiles
│   ├── EntityRenderer.ts     # Renders entities (player, NPCs, items)
│   ├── FogOfWar.ts          # Visibility system
│   ├── MapEventHandler.ts   # Processes AI events
│   └── types.ts             # Map-related types

/app/play-hybrid/[campaignId]/
└── page.tsx                  # Hybrid play page

/convex/
├── ai.ts                     # Add map generation prompts
└── schema.ts                 # Add dungeon state schema
```

## AI Prompt Additions

```
## MAP GENERATION RULES

When the player enters a new area, generate a room layout:

<mapUpdate>
{
  "action": "generate",
  "roomData": {
    "tiles": [
      [2,2,2,2,2,2,2,2],
      [2,1,1,1,1,1,1,2],
      [2,1,1,1,1,1,1,2],
      [2,1,1,8,1,1,1,2],  // 8 = treasure chest
      [2,1,1,1,1,1,1,2],
      [2,2,2,9,2,2,2,2]   // 9 = door/exit
    ],
    "entities": [
      {"type": "chest", "x": 3, "y": 3, "id": "chest-1", "state": "closed"}
    ],
    "exits": [
      {"direction": "south", "x": 3, "y": 5, "leadsTo": "unknown"}
    ]
  }
}
</mapUpdate>

When the player moves:
<playerMove>
{"fromX": 4, "fromY": 2, "toX": 3, "toY": 3}
</playerMove>

Tile Legend:
0 = void, 1 = floor, 2 = wall, 3 = grass, 4 = water
5 = sand, 6 = stone, 7 = wood, 8 = treasure, 9 = door/portal
```

## Data Flow

```
User Input: "I walk toward the chest"
       │
       ▼
┌──────────────────┐
│   AI Processing   │
│   - Narrative     │
│   - Map Events    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Stream Response  │
│  <narrative>...   │
│  <playerMove>...  │
│  <entityUpdate>.. │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│  Chat  │ │  Map   │
│ Update │ │ Update │
└────────┘ └────────┘
```

## Visual Design

### Map Style
- **Dark dungeon aesthetic** matching grimoire theme
- Purple/cyan glow for magical elements
- Amber highlights for treasures
- Red indicators for enemies
- Fog of war with purple tint

### Player Token
- Animated sprite or stylized icon
- Glow effect matching character class
- Facing direction indicator
- Movement trail effect

### Entities
- Doors: Wooden frame, glow when interactive
- Chests: Golden trim, sparkle effect
- NPCs: Colored based on attitude
- Enemies: Red glow, idle animation

## Success Criteria

1. AI generates coherent room layouts
2. Player movement is smooth and responsive
3. Map updates sync with narrative text
4. Fog of war reveals as player explores
5. Entities react to player actions
6. Combat triggers visual effects on map
7. Dungeon state persists across sessions
