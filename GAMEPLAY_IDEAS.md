# Gameplay Improvements (Ideas + Next Steps)

This doc captures ideas to make gameplay feel more “alive” and make player actions cause visible, persistent change.

## 1) “World State” (Big Win)

Goal: player actions should permanently change what exists, where it is, and how it behaves.

- **Persistent world facts**
  - NPCs: alive/dead, attitude, faction, location, relationship to player.
  - Locations: discovered, visited, locked/unlocked, hazards, ownership, rumors.
  - Objects: opened/closed, looted, broken, trapped, moved.
  - Encounters: cleared, escalated, patrol routes, reinforcements.
- **Reactive simulation**
  - After each player action (or on a timer), run a small “world tick”:
    - NPCs move, guard shifts, patrols change, rumors spread, factions react.
  - Store these changes in Convex so they remain across sessions.
- **Readable consequences**
  - Show small UI notifications (“Town Guard: +Bounty”, “Villager: Fear +1”).
  - Update the map/canvas (entities move, doors open, new hazards appear).

## 2) Make Actions Cause Visible Change Immediately

Even before AI finishes streaming narrative, something should move or react.

- On **Talk/Examine/Use/Attack**, emit *instant* game events:
  - `moveEntity`, `combatEffect`, `spawnEntity`, `removeEntity`, `updateObjectState`.
- Add **simple idles** (ambient motion) so the world isn’t frozen:
  - pacing, turning to face player, stepping back when threatened.

## 3) Turn-Based Combat (JRPG / TRPG Feel)

Core goals:
- Intuitive: always clear whose turn, what actions are possible, what will happen.
- Fast: minimal clicks to do basic actions.
- Satisfying: hit feedback (shake, damage pop, combat log), clear outcomes.

Recommended pillars:
- **Single combat system** (avoid multiple overlays/engines drifting out of sync).
- **State machine**: `explore → combat_start → player_turn → enemy_turn → resolution → explore`.
- **Readable enemy AI**: simple rules + intent indicators (who they target, why).
- **Tactical choices**: movement matters (range, cover/terrain bonuses, AoE).
- **Abilities (Spells/Jutsu/etc.)**:
  - cooldowns + resource costs (energy/mana) + target types.
  - quick previews: damage range, hit chance (optional), AoE footprint.

## 4) Feedback & “Feel”

Small touches that make everything feel alive:
- Subtle **screen shake** on impact (heavier on crit, tiny on hit).
- Flash/outline on hit targets, floating damage numbers, brief slow-mo on crit (very short).
- Snappy combat log entries (“Goblin takes 7”, “Critical!”).
- Short turn delays (200–500ms) so AI actions animate rather than “teleport”.

## 5) Player-Created Abilities + Future “Effects Layer”

Already supported: creators can add abilities/spells in the Forge campaign editor.

Next step: add an “effects layer” placeholder to abilities:
- Each ability can carry `effects` metadata (initially empty).
- Later, creators can define reusable “Effect Presets” (status effects, buffs, DOTs, knockback, etc.)
  and attach them to abilities without changing core combat logic.

## 6) Practical Near-Term Roadmap

1. Make tactical turn-based combat the single source of truth.
2. Add screen shake + hit feedback.
3. Ensure spells/abilities are usable from combat UI (cooldowns, costs, targeting).
4. Introduce persistent world state mutations for: deaths, bounties, relationships, objects.
5. Add “effects layer” fields and UI scaffold (no behavior yet).

