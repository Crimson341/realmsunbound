# Realms Unbound

A fantasy world-building platform where creators forge realms and adventurers explore them. Built with AI-powered storytelling, visual world editors, and real-time multiplayer.

## Features

**World Forge** - Design entire worlds with our visual campaign editor. Create maps, populate them with NPCs, and craft branching narratives.

**Play Anywhere** - Explore community-created realms or your own. Traverse dungeons, complete quests, and discover secrets.

**AI Dungeon Master** - Dynamic storytelling powered by AI that adapts to your choices and keeps adventures fresh.

**Visual Experience** - Immersive graphics with Three.js and Pixi.js bring your worlds to life.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Backend:** Convex (real-time database & functions)
- **Auth:** WorkOS AuthKit
- **Graphics:** Three.js, Pixi.js, React Flow

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Start Convex backend
npx convex dev

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to explore.

## License

This project is licensed under the **Realms Unbound License Agreement**. See [LICENSE](LICENSE) for the full text.

### Summary of Terms

**Allowed:**
- **Build Anything** - Clone and use locally or in your organization to build any product (commercial or free)
- **Internal Use** - Use internally within your company without restriction
- **Modify** - Modify the code for internal use within your organization

**Restricted (No Monetization of the Tool):**
- **No Resale** - You cannot resell Realms Unbound itself
- **No SaaS** - You cannot host this as a service for others
- **No Monetizing Mods** - You cannot distribute modified versions for money

**Liability:**
- **Use at Own Risk** - This tool uses AI. We are not responsible for any damages. You assume all risk.

**Contributing:**
- By contributing, you grant Core Contributors full, irrevocable rights to your code (copyright assignment)
- Core Contributors (Cody Seibert, SuperComboGamer, Kacper Lachowicz, Ben Scott) are granted perpetual, royalty-free licenses for any use, including monetization
