// ============================================
// COMBAT ENGINE - Pure Algorithmic Combat System
// No AI involved - all dice rolls and calculations
// ============================================

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface CombatantStats {
    name: string;
    hp: number;
    maxHp: number;
    ac: number;
    // Attack stats
    attackBonus: number; // Total modifier to hit (STR/DEX + proficiency)
    damageBonus: number; // Modifier to damage (usually STR or DEX)
    damageDice: DiceType; // Weapon damage die
    damageDiceCount: number; // Number of dice (usually 1)
    // Defense stats
    dexMod: number; // For dodge calculations
    // Optional
    critRange?: number; // Default 20, some weapons crit on 19-20
    resistances?: string[];
    vulnerabilities?: string[];
}

export interface DiceRollResult {
    dice: DiceType;
    rolls: number[];
    total: number;
    isNat20?: boolean;
    isNat1?: boolean;
}

export interface AttackResult {
    attackRoll: DiceRollResult;
    totalAttack: number;
    targetAC: number;
    hit: boolean;
    isCritical: boolean;
    isCriticalMiss: boolean;
    damageRoll?: DiceRollResult;
    totalDamage?: number;
    isDodged?: boolean;
}

export interface CombatAction {
    type: 'attack' | 'defend' | 'ability' | 'item' | 'flee';
    actor: 'player' | 'enemy';
    result: AttackResult | DefendResult | AbilityResult | FleeResult;
    narration: string;
}

export interface DefendResult {
    acBonus: number;
    duration: number; // turns
}

export interface AbilityResult {
    abilityName: string;
    attackRoll?: DiceRollResult;
    damageRoll?: DiceRollResult;
    hit?: boolean;
    totalDamage?: number;
    effect?: string;
    healAmount?: number;
}

export interface FleeResult {
    roll: DiceRollResult;
    dc: number;
    success: boolean;
}

// ============================================
// DICE ROLLING FUNCTIONS
// ============================================

/**
 * Roll a single die of the specified type
 */
export function rollDie(dice: DiceType): number {
    const max = parseInt(dice.substring(1));
    return Math.floor(Math.random() * max) + 1;
}

/**
 * Roll multiple dice and return detailed result
 */
export function rollDice(dice: DiceType, count: number = 1): DiceRollResult {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(rollDie(dice));
    }
    const total = rolls.reduce((sum, r) => sum + r, 0);

    return {
        dice,
        rolls,
        total,
        isNat20: dice === 'd20' && count === 1 && rolls[0] === 20,
        isNat1: dice === 'd20' && count === 1 && rolls[0] === 1,
    };
}

/**
 * Roll a d20 for attack/check
 */
export function rollD20(): DiceRollResult {
    return rollDice('d20', 1);
}

/**
 * Roll with advantage (roll twice, take higher)
 */
export function rollWithAdvantage(): DiceRollResult {
    const roll1 = rollDie('d20');
    const roll2 = rollDie('d20');
    const best = Math.max(roll1, roll2);
    return {
        dice: 'd20',
        rolls: [roll1, roll2],
        total: best,
        isNat20: best === 20,
        isNat1: best === 1 && roll1 === 1 && roll2 === 1, // Both must be 1
    };
}

/**
 * Roll with disadvantage (roll twice, take lower)
 */
export function rollWithDisadvantage(): DiceRollResult {
    const roll1 = rollDie('d20');
    const roll2 = rollDie('d20');
    const worst = Math.min(roll1, roll2);
    return {
        dice: 'd20',
        rolls: [roll1, roll2],
        total: worst,
        isNat20: worst === 20 && roll1 === 20 && roll2 === 20, // Both must be 20
        isNat1: worst === 1,
    };
}

// ============================================
// COMBAT CALCULATIONS
// ============================================

/**
 * Calculate stat modifier (D&D 5e style)
 */
export function getStatModifier(stat: number): number {
    return Math.floor((stat - 10) / 2);
}

/**
 * Perform an attack roll against a target
 */
export function performAttack(
    attacker: CombatantStats,
    defender: CombatantStats,
    hasAdvantage: boolean = false,
    hasDisadvantage: boolean = false
): AttackResult {
    // Roll to hit
    let attackRoll: DiceRollResult;
    if (hasAdvantage && !hasDisadvantage) {
        attackRoll = rollWithAdvantage();
    } else if (hasDisadvantage && !hasAdvantage) {
        attackRoll = rollWithDisadvantage();
    } else {
        attackRoll = rollD20();
    }

    const critRange = attacker.critRange || 20;
    const isCritical = attackRoll.rolls[0] >= critRange || attackRoll.isNat20 === true;
    const isCriticalMiss = attackRoll.isNat1 === true;

    const totalAttack = attackRoll.total + attacker.attackBonus;
    const hit = !isCriticalMiss && (isCritical || totalAttack >= defender.ac);

    // Check for dodge (if defender has high DEX, small chance to dodge even on hit)
    let isDodged = false;
    if (hit && !isCritical && defender.dexMod >= 3) {
        // 5% base dodge chance + 2% per DEX mod above 2
        const dodgeChance = 5 + (defender.dexMod - 2) * 2;
        isDodged = Math.random() * 100 < dodgeChance;
    }

    const result: AttackResult = {
        attackRoll,
        totalAttack,
        targetAC: defender.ac,
        hit: hit && !isDodged,
        isCritical,
        isCriticalMiss,
        isDodged,
    };

    // If hit, roll damage
    if (result.hit) {
        const damageCount = isCritical
            ? attacker.damageDiceCount * 2 // Critical doubles dice
            : attacker.damageDiceCount;

        const damageRoll = rollDice(attacker.damageDice, damageCount);
        let totalDamage = damageRoll.total + attacker.damageBonus;

        // Apply resistances/vulnerabilities
        if (defender.resistances?.length) {
            // Simplified: just halve damage if any resistance
            totalDamage = Math.floor(totalDamage / 2);
        }
        if (defender.vulnerabilities?.length) {
            totalDamage *= 2;
        }

        result.damageRoll = damageRoll;
        result.totalDamage = Math.max(1, totalDamage); // Minimum 1 damage on hit
    }

    return result;
}

/**
 * Generate narration for an attack result
 */
export function generateAttackNarration(
    attackerName: string,
    defenderName: string,
    result: AttackResult,
    weaponName: string = 'weapon'
): string {
    if (result.isCriticalMiss) {
        const misses = [
            `${attackerName} swings wildly and completely misses!`,
            `${attackerName}'s attack goes wide - a critical fumble!`,
            `${attackerName} stumbles, the attack missing entirely!`,
        ];
        return misses[Math.floor(Math.random() * misses.length)];
    }

    if (result.isDodged) {
        const dodges = [
            `${defenderName} nimbly dodges the attack!`,
            `${defenderName} ducks under ${attackerName}'s swing!`,
            `${defenderName} sidesteps at the last moment!`,
        ];
        return dodges[Math.floor(Math.random() * dodges.length)];
    }

    if (!result.hit) {
        const misses = [
            `${attackerName}'s attack misses ${defenderName}.`,
            `${defenderName}'s armor deflects the blow.`,
            `${attackerName} strikes but fails to connect.`,
        ];
        return misses[Math.floor(Math.random() * misses.length)];
    }

    if (result.isCritical) {
        const crits = [
            `CRITICAL HIT! ${attackerName} lands a devastating blow with ${weaponName} for ${result.totalDamage} damage!`,
            `${attackerName} finds a weak spot! Critical strike deals ${result.totalDamage} damage!`,
            `A perfect strike! ${attackerName} crits for ${result.totalDamage} damage!`,
        ];
        return crits[Math.floor(Math.random() * crits.length)];
    }

    const hits = [
        `${attackerName} hits ${defenderName} with ${weaponName} for ${result.totalDamage} damage.`,
        `${attackerName}'s ${weaponName} connects, dealing ${result.totalDamage} damage.`,
        `${defenderName} takes ${result.totalDamage} damage from ${attackerName}'s attack.`,
    ];
    return hits[Math.floor(Math.random() * hits.length)];
}

/**
 * Attempt to flee from combat
 */
export function attemptFlee(
    fleerDexMod: number,
    pursuerDexMod: number
): FleeResult {
    const roll = rollD20();
    const dc = 10 + pursuerDexMod - fleerDexMod;
    const success = roll.total + fleerDexMod >= dc;

    return {
        roll,
        dc,
        success,
    };
}

/**
 * Defend action - grants AC bonus until next turn
 */
export function performDefend(): DefendResult {
    return {
        acBonus: 2, // +2 AC for defending
        duration: 1, // Lasts 1 turn
    };
}

// ============================================
// ENEMY AI - Simple behavioral patterns
// ============================================

export type EnemyBehavior = 'aggressive' | 'defensive' | 'balanced' | 'cowardly';

export interface EnemyAction {
    type: 'attack' | 'defend' | 'flee' | 'ability';
    targetId?: string;
    abilityName?: string;
}

/**
 * Determine what action an enemy should take
 */
export function determineEnemyAction(
    enemy: CombatantStats & { behavior?: EnemyBehavior },
    enemyHpPercent: number,
    playerHpPercent: number
): EnemyAction {
    const behavior = enemy.behavior || 'balanced';
    const random = Math.random();

    // Cowardly enemies flee when hurt
    if (behavior === 'cowardly' && enemyHpPercent < 30) {
        if (random < 0.7) return { type: 'flee' };
    }

    // Defensive enemies defend more often when hurt
    if (behavior === 'defensive' && enemyHpPercent < 50) {
        if (random < 0.4) return { type: 'defend' };
    }

    // Aggressive enemies always attack
    if (behavior === 'aggressive') {
        return { type: 'attack' };
    }

    // Balanced behavior
    if (enemyHpPercent < 25 && random < 0.3) {
        return { type: 'defend' };
    }

    // Default: attack
    return { type: 'attack' };
}

// ============================================
// COMBAT STATE MANAGEMENT
// ============================================

export interface CombatState {
    isActive: boolean;
    turn: number;
    isPlayerTurn: boolean;
    player: CombatantStats & {
        mp?: number;
        maxMp?: number;
        defendingBonus?: number;
        statusEffects?: Array<{ name: string; duration: number; effect: string }>;
    };
    enemy: CombatantStats & {
        behavior?: EnemyBehavior;
        defendingBonus?: number;
    };
    log: CombatLogEntry[];
    lastRoll?: DiceRollResult;
    outcome?: 'victory' | 'defeat' | 'fled';
}

export interface CombatLogEntry {
    id: string;
    turn: number;
    actor: 'player' | 'enemy' | 'system';
    type: 'attack' | 'damage' | 'miss' | 'crit' | 'dodge' | 'defend' | 'flee' | 'effect' | 'narration';
    text: string;
    roll?: DiceRollResult;
    damage?: number;
    timestamp: number;
}

/**
 * Process a player attack action
 */
export function processPlayerAttack(state: CombatState): {
    newState: CombatState;
    result: AttackResult;
    narration: string;
} {
    const defender = {
        ...state.enemy,
        ac: state.enemy.ac + (state.enemy.defendingBonus || 0),
    };

    const result = performAttack(state.player, defender);
    const narration = generateAttackNarration(
        state.player.name,
        state.enemy.name,
        result,
        'their weapon'
    );

    const newLog: CombatLogEntry[] = [
        ...state.log,
        {
            id: `log_${Date.now()}`,
            turn: state.turn,
            actor: 'player',
            type: result.isCritical ? 'crit' : result.hit ? 'attack' : result.isDodged ? 'dodge' : 'miss',
            text: narration,
            roll: result.attackRoll,
            damage: result.totalDamage,
            timestamp: Date.now(),
        },
    ];

    const newEnemyHp = result.hit
        ? Math.max(0, state.enemy.hp - (result.totalDamage || 0))
        : state.enemy.hp;

    const newState: CombatState = {
        ...state,
        enemy: {
            ...state.enemy,
            hp: newEnemyHp,
            defendingBonus: 0, // Clear defending bonus after being attacked
        },
        log: newLog,
        lastRoll: result.attackRoll,
        isPlayerTurn: false,
        outcome: newEnemyHp <= 0 ? 'victory' : undefined,
    };

    return { newState, result, narration };
}

/**
 * Process an enemy attack action
 */
export function processEnemyAttack(state: CombatState): {
    newState: CombatState;
    result: AttackResult;
    narration: string;
} {
    const defender = {
        ...state.player,
        ac: state.player.ac + (state.player.defendingBonus || 0),
    };

    const result = performAttack(state.enemy, defender);
    const narration = generateAttackNarration(
        state.enemy.name,
        state.player.name,
        result,
        'its weapon'
    );

    const newLog: CombatLogEntry[] = [
        ...state.log,
        {
            id: `log_${Date.now()}`,
            turn: state.turn,
            actor: 'enemy',
            type: result.isCritical ? 'crit' : result.hit ? 'attack' : result.isDodged ? 'dodge' : 'miss',
            text: narration,
            roll: result.attackRoll,
            damage: result.totalDamage,
            timestamp: Date.now(),
        },
    ];

    const newPlayerHp = result.hit
        ? Math.max(0, state.player.hp - (result.totalDamage || 0))
        : state.player.hp;

    const newState: CombatState = {
        ...state,
        player: {
            ...state.player,
            hp: newPlayerHp,
            defendingBonus: 0, // Clear defending bonus
        },
        log: newLog,
        lastRoll: result.attackRoll,
        isPlayerTurn: true,
        turn: state.turn + 1,
        outcome: newPlayerHp <= 0 ? 'defeat' : undefined,
    };

    return { newState, result, narration };
}

/**
 * Process player defend action
 */
export function processPlayerDefend(state: CombatState): {
    newState: CombatState;
    narration: string;
} {
    const narration = `${state.player.name} takes a defensive stance, bracing for the enemy's attack.`;

    const newLog: CombatLogEntry[] = [
        ...state.log,
        {
            id: `log_${Date.now()}`,
            turn: state.turn,
            actor: 'player',
            type: 'defend',
            text: narration,
            timestamp: Date.now(),
        },
    ];

    const newState: CombatState = {
        ...state,
        player: {
            ...state.player,
            defendingBonus: 2,
        },
        log: newLog,
        isPlayerTurn: false,
    };

    return { newState, narration };
}

/**
 * Process player flee attempt
 */
export function processPlayerFlee(state: CombatState): {
    newState: CombatState;
    result: FleeResult;
    narration: string;
} {
    const result = attemptFlee(state.player.dexMod, state.enemy.dexMod);

    const narration = result.success
        ? `${state.player.name} successfully escapes from combat!`
        : `${state.player.name} tries to flee but ${state.enemy.name} blocks the escape!`;

    const newLog: CombatLogEntry[] = [
        ...state.log,
        {
            id: `log_${Date.now()}`,
            turn: state.turn,
            actor: 'player',
            type: 'flee',
            text: narration,
            roll: result.roll,
            timestamp: Date.now(),
        },
    ];

    const newState: CombatState = {
        ...state,
        log: newLog,
        lastRoll: result.roll,
        isPlayerTurn: !result.success, // If failed, enemy gets a turn
        outcome: result.success ? 'fled' : undefined,
    };

    return { newState, result, narration };
}

/**
 * Process enemy turn (automated)
 */
export function processEnemyTurn(state: CombatState): {
    newState: CombatState;
    action: EnemyAction;
    narration: string;
} {
    const enemyHpPercent = (state.enemy.hp / state.enemy.maxHp) * 100;
    const playerHpPercent = (state.player.hp / state.player.maxHp) * 100;

    const action = determineEnemyAction(state.enemy, enemyHpPercent, playerHpPercent);

    switch (action.type) {
        case 'attack': {
            const { newState, narration } = processEnemyAttack(state);
            return { newState, action, narration };
        }
        case 'defend': {
            const narration = `${state.enemy.name} takes a defensive stance.`;
            const newState: CombatState = {
                ...state,
                enemy: {
                    ...state.enemy,
                    defendingBonus: 2,
                },
                log: [
                    ...state.log,
                    {
                        id: `log_${Date.now()}`,
                        turn: state.turn,
                        actor: 'enemy',
                        type: 'defend',
                        text: narration,
                        timestamp: Date.now(),
                    },
                ],
                isPlayerTurn: true,
                turn: state.turn + 1,
            };
            return { newState, action, narration };
        }
        case 'flee': {
            const fleeResult = attemptFlee(state.enemy.dexMod, state.player.dexMod);
            const narration = fleeResult.success
                ? `${state.enemy.name} flees from combat!`
                : `${state.enemy.name} tries to escape but fails!`;
            const newState: CombatState = {
                ...state,
                log: [
                    ...state.log,
                    {
                        id: `log_${Date.now()}`,
                        turn: state.turn,
                        actor: 'enemy',
                        type: 'flee',
                        text: narration,
                        roll: fleeResult.roll,
                        timestamp: Date.now(),
                    },
                ],
                isPlayerTurn: true,
                turn: state.turn + 1,
                outcome: fleeResult.success ? 'victory' : undefined, // Enemy fleeing = player victory
            };
            return { newState, action, narration };
        }
        default:
            // Default to attack
            const { newState, narration } = processEnemyAttack(state);
            return { newState, action: { type: 'attack' }, narration };
    }
}

/**
 * Initialize combat state from entity data
 */
export function initializeCombat(
    playerData: {
        name: string;
        hp: number;
        maxHp: number;
        mp?: number;
        maxMp?: number;
        stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
        ac: number;
        weaponDamage?: DiceType;
        weaponDamageCount?: number;
        equippedWeapon?: string;
    },
    enemyData: {
        name: string;
        hp: number;
        maxHp: number;
        ac: number;
        attackBonus?: number;
        damageBonus?: number;
        damageDice?: DiceType;
        behavior?: EnemyBehavior;
    }
): CombatState {
    const strMod = getStatModifier(playerData.stats.str);
    const dexMod = getStatModifier(playerData.stats.dex);

    // Use STR for melee, could add DEX for ranged later
    const playerAttackMod = strMod + 2; // +2 proficiency bonus base

    return {
        isActive: true,
        turn: 1,
        isPlayerTurn: true, // Player goes first (could roll initiative)
        player: {
            name: playerData.name,
            hp: playerData.hp,
            maxHp: playerData.maxHp,
            mp: playerData.mp,
            maxMp: playerData.maxMp,
            ac: playerData.ac,
            attackBonus: playerAttackMod,
            damageBonus: strMod,
            damageDice: playerData.weaponDamage || 'd6',
            damageDiceCount: playerData.weaponDamageCount || 1,
            dexMod,
            statusEffects: [],
        },
        enemy: {
            name: enemyData.name,
            hp: enemyData.hp,
            maxHp: enemyData.maxHp,
            ac: enemyData.ac,
            attackBonus: enemyData.attackBonus ?? 3,
            damageBonus: enemyData.damageBonus ?? 2,
            damageDice: enemyData.damageDice || 'd6',
            damageDiceCount: 1,
            dexMod: 1, // Default enemy DEX mod
            behavior: enemyData.behavior || 'balanced',
        },
        log: [
            {
                id: `log_${Date.now()}`,
                turn: 0,
                actor: 'system',
                type: 'narration',
                text: `Combat begins! ${playerData.name} vs ${enemyData.name}!`,
                timestamp: Date.now(),
            },
        ],
    };
}
