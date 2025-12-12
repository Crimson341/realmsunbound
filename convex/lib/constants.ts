/**
 * Genre definitions for the platform.
 * Used for categorizing and filtering realms/campaigns.
 */
export const REALM_GENRES = [
    { key: "fantasy", label: "Fantasy", icon: "🏰", description: "Magic, dragons, and medieval adventures" },
    { key: "sci-fi", label: "Sci-Fi", icon: "🚀", description: "Space exploration and future tech" },
    { key: "anime", label: "Anime", icon: "⚔️", description: "Anime-inspired worlds and storylines" },
    { key: "realism", label: "Realism", icon: "🌍", description: "Grounded, realistic settings" },
    { key: "historical", label: "Historical", icon: "📜", description: "Adventures through history" },
    { key: "horror", label: "Horror", icon: "👻", description: "Dark, terrifying experiences" },
    { key: "mythology", label: "Mythology", icon: "⚡", description: "Gods, legends, and ancient myths" },
    { key: "cyberpunk", label: "Cyberpunk", icon: "🤖", description: "High tech, low life dystopias" },
    { key: "steampunk", label: "Steampunk", icon: "⚙️", description: "Victorian-era steam technology" },
    { key: "post-apocalyptic", label: "Post-Apocalyptic", icon: "☢️", description: "Survival after the end" },
] as const;

export type RealmGenreKey = (typeof REALM_GENRES)[number]["key"];

/**
 * Default character classes when campaign doesn't define custom ones.
 */
export const DEFAULT_CHARACTER_CLASSES = [
    { name: "Warrior", description: "A skilled fighter with strength and combat prowess" },
    { name: "Mage", description: "A wielder of arcane magic and mystical arts" },
    { name: "Rogue", description: "A cunning trickster skilled in stealth and agility" },
    { name: "Cleric", description: "A divine healer blessed with holy magic" },
    { name: "Ranger", description: "A wilderness expert with bow and blade" },
] as const;

/**
 * Default character races when campaign doesn't define custom ones.
 */
export const DEFAULT_CHARACTER_RACES = [
    { name: "Human", description: "Versatile and adaptable, humans excel in all fields" },
    { name: "Elf", description: "Graceful beings with keen senses and magical affinity" },
    { name: "Dwarf", description: "Stout and sturdy folk with great resilience" },
    { name: "Orc", description: "Powerful warriors with incredible strength" },
    { name: "Halfling", description: "Small but nimble, with remarkable luck" },
] as const;

/**
 * Default character stats.
 */
export const DEFAULT_CHARACTER_STATS = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
} as const;

/**
 * Pagination defaults.
 */
export const PAGINATION = {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

/**
 * Memory types for the campaign memory system.
 */
export const MEMORY_TYPES = {
    SUMMARY: "summary",
    EVENT: "event",
    CHARACTER: "character",
} as const;

export type MemoryType = (typeof MEMORY_TYPES)[keyof typeof MEMORY_TYPES];

/**
 * Player game state defaults.
 */
export const PLAYER_DEFAULTS = {
    ENERGY: 100,
    MAX_ENERGY: 100,
    HP: 100,
    MAX_HP: 100,
    GOLD: 0,
} as const;

/**
 * Damage dice regex pattern.
 * Matches formats like "2d6", "1d20+5", "3d8-2"
 */
export const DAMAGE_DICE_PATTERN = /^(\d+)d(\d+)([+-]\d+)?$/;
