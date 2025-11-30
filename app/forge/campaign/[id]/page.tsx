/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Map, Users, Scroll, Zap, Settings, Plus, Save, ArrowLeft, Loader2, Link as LinkIcon, Package, Skull, Palette, Sparkles, ChevronDown, Sword, Shield, Crown, Store, Trash2, GitBranch, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { MentionTextArea } from '@/components/MentionTextArea';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';

const StarPattern = () => (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
         style={{ 
             backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)', 
             backgroundSize: '32px 32px' 
         }} 
    />
);

export default function CampaignManager() {
    const params = useParams();
    const campaignId = params.id as Id<"campaigns">;
    const data = useQuery(api.forge.getCampaignDetails, { campaignId });
    const effectsLibrary = useQuery(api.forge.getEffectsLibrary);
    const createSpell = useMutation(api.forge.createSpell);

    const createLocation = useMutation(api.forge.createLocation);
    const createEvent = useMutation(api.forge.createEvent);
    const createNPC = useMutation(api.forge.createNPC);
    const createQuest = useMutation(api.forge.createQuest);
    const createMonster = useMutation(api.forge.createMonster);
    const createItem = useMutation(api.forge.createItem);
    const updateRarityColors = useMutation(api.forge.updateRarityColors);

    // Shop mutations
    const createShop = useMutation(api.shops.createShop);
    const deleteShop = useMutation(api.shops.deleteShop);
    const addItemToShop = useMutation(api.shops.addItemToShop);
    const removeItemFromShop = useMutation(api.shops.removeItemFromShop);
    const campaignShops = useQuery(api.shops.getCampaignShops, { campaignId });

    // Condition mutations
    const createCondition = useMutation(api.conditions.createCondition);
    const updateCondition = useMutation(api.conditions.updateCondition);
    const deleteCondition = useMutation(api.conditions.deleteCondition);
    const toggleCondition = useMutation(api.conditions.toggleCondition);
    const campaignConditions = useQuery(api.conditions.getConditions, { campaignId });

    const [activeTab, setActiveTab] = useState<'overview' | 'realm' | 'npcs' | 'events' | 'quests' | 'items' | 'spells' | 'monsters' | 'shops' | 'conditions' | 'players'>('overview');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    // Form States
    const [locName, setLocName] = useState("");
    const [locType, setLocType] = useState("Town");
    const [locEnvironment, setLocEnvironment] = useState("");
    const [locDesc, setLocDesc] = useState("");
    const [locNeighbors, setLocNeighbors] = useState<Id<"locations">[]>([]);

    const [eventTrigger, setEventTrigger] = useState("");
    const [eventEffect, setEventEffect] = useState("");
    const [eventLocationId, setEventLocationId] = useState("");

    const [npcName, setNpcName] = useState("");
    const [npcRole, setNpcRole] = useState("");
    const [npcAttitude, setNpcAttitude] = useState("Neutral");
    const [npcLocationId, setNpcLocationId] = useState("");
    const [npcDesc, setNpcDesc] = useState("");

    const [questTitle, setQuestTitle] = useState("");
    const [questDesc, setQuestDesc] = useState("");
    const [questLocationId, setQuestLocationId] = useState("");
    const [questNpcId, setQuestNpcId] = useState("");
    const [questNextId, setQuestNextId] = useState("");
    const [questRewardItemIds, setQuestRewardItemIds] = useState<Id<"items">[]>([]);
    const [rewardReputation, setRewardReputation] = useState("");
    const [rewardWorldUpdates, setRewardWorldUpdates] = useState("");

    // Item State
    const [itemName, setItemName] = useState("");
    const [itemType, setItemType] = useState("Weapon");
    const [itemRarity, setItemRarity] = useState("Common");
    const [itemUsage, setItemUsage] = useState("");
    const [itemSpellId, setItemSpellId] = useState("");
    const [itemEffectId, setItemEffectId] = useState("");
    const [itemEffects, setItemEffects] = useState("");
    const [effectMode, setEffectMode] = useState<'library' | 'custom'>('library');
    const [itemSpecial, setItemSpecial] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [itemRequirements, setItemRequirements] = useState("");
    const [itemLore, setItemLore] = useState("");
    
    // Rarity Colors State
    const [rarityColors, setRarityColors] = useState<Record<string, string>>({
        "Common": "#a8a29e",
        "Uncommon": "#10b981",
        "Rare": "#3b82f6",
        "Epic": "#8b5cf6",
        "Legendary": "#f59e0b",
        "Artifact": "#ef4444",
        "Custom": "#43485C"
    });

    // Spell State
    // Ability/Spell/Jutsu State - Genre-agnostic
    const [abilityName, setAbilityName] = useState("");
    const [abilityDescription, setAbilityDescription] = useState("");
    const [abilityCategory, setAbilityCategory] = useState("");
    const [abilitySubcategory, setAbilitySubcategory] = useState("");
    const [abilityIconEmoji, setAbilityIconEmoji] = useState("");
    const [abilityTags, setAbilityTags] = useState("");
    // Requirements
    const [abilityRequiredLevel, setAbilityRequiredLevel] = useState<number | undefined>(undefined);
    const [abilityRequiredStats, setAbilityRequiredStats] = useState("");
    // Cost & Cooldown
    const [abilityEnergyCost, setAbilityEnergyCost] = useState<number | undefined>(undefined);
    const [abilityHealthCost, setAbilityHealthCost] = useState<number | undefined>(undefined);
    const [abilityCooldown, setAbilityCooldown] = useState<number | undefined>(undefined);
    const [abilityUsesPerDay, setAbilityUsesPerDay] = useState<number | undefined>(undefined);
    const [abilityIsPassive, setAbilityIsPassive] = useState(false);
    // Effects
    const [abilityDamage, setAbilityDamage] = useState<number | undefined>(undefined);
    const [abilityDamageType, setAbilityDamageType] = useState("");
    const [abilityHealing, setAbilityHealing] = useState<number | undefined>(undefined);
    const [abilityStatusEffect, setAbilityStatusEffect] = useState("");
    const [abilityStatusDuration, setAbilityStatusDuration] = useState<number | undefined>(undefined);
    // Targeting
    const [abilityTargetType, setAbilityTargetType] = useState("single");
    const [abilityRange, setAbilityRange] = useState("melee");
    const [abilityAreaSize, setAbilityAreaSize] = useState("");
    // Special
    const [abilityCastTime, setAbilityCastTime] = useState("instant");
    const [abilityInterruptible, setAbilityInterruptible] = useState(false);
    // Lore
    const [abilityLore, setAbilityLore] = useState("");
    const [abilityRarity, setAbilityRarity] = useState("common");
    const [abilityIsForbidden, setAbilityIsForbidden] = useState(false);
    const [abilityNotes, setAbilityNotes] = useState("");
    // Upgrade
    const [abilityCanUpgrade, setAbilityCanUpgrade] = useState(false);
    const [abilityUpgradedVersion, setAbilityUpgradedVersion] = useState("");

    // Monster State
    const [monsterName, setMonsterName] = useState("");
    const [monsterLocationId, setMonsterLocationId] = useState("");
    const [monsterDesc, setMonsterDesc] = useState("");
    const [monsterHealth, setMonsterHealth] = useState(10);
    const [monsterDamage, setMonsterDamage] = useState(1);
    const [monsterDropIds, setMonsterDropIds] = useState<Id<"items">[]>([]);

    // Shop State
    const [shopName, setShopName] = useState("");
    const [shopDesc, setShopDesc] = useState("");
    const [shopType, setShopType] = useState("general");
    const [shopLocationId, setShopLocationId] = useState("");
    const [shopkeeperId, setShopkeeperId] = useState("");
    const [shopPriceModifier, setShopPriceModifier] = useState(1.0);
    const [shopBuybackModifier, setShopBuybackModifier] = useState(1.2);
    const [shopBuybackDuration, setShopBuybackDuration] = useState<number | undefined>(undefined);
    const [shopAiManaged, setShopAiManaged] = useState(false);
    const [selectedShopId, setSelectedShopId] = useState<Id<"shops"> | null>(null);
    const [shopItemId, setShopItemId] = useState("");
    const [shopItemStock, setShopItemStock] = useState(-1);
    const [shopItemPrice, setShopItemPrice] = useState<number | undefined>(undefined);

    // Condition State
    const [conditionName, setConditionName] = useState("");
    const [conditionDesc, setConditionDesc] = useState("");
    const [conditionTrigger, setConditionTrigger] = useState("on_enter_location");
    const [conditionTriggerContext, setConditionTriggerContext] = useState("");
    const [conditionPriority, setConditionPriority] = useState(0);
    const [conditionExecuteOnce, setConditionExecuteOnce] = useState(false);
    const [selectedConditionId, setSelectedConditionId] = useState<Id<"conditions"> | null>(null);

    // Condition Builder State - simplified for initial version
    const [conditionType, setConditionType] = useState<'level' | 'faction' | 'has_item' | 'not_has_item' | 'has_ability' | 'at_location' | 'quest' | 'quest_active' | 'npc_alive' | 'npc_dead' | 'flag' | 'stat' | 'gold' | 'custom'>('level');
    const [conditionOperator, setConditionOperator] = useState<'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'>('gte');
    const [conditionValue, setConditionValue] = useState("");
    const [conditionValueNum, setConditionValueNum] = useState(1);
    const [conditionStat, setConditionStat] = useState("strength"); // For stat-based conditions

    // Action Builder State
    const [actionType, setActionType] = useState<'block_entry' | 'show_message' | 'grant_ability' | 'remove_ability' | 'give_item' | 'remove_item' | 'set_flag' | 'clear_flag' | 'modify_reputation' | 'modify_hp' | 'modify_gold' | 'add_xp' | 'teleport' | 'spawn_npc' | 'kill_npc'>('block_entry');
    const [actionMessage, setActionMessage] = useState("");
    const [actionTarget, setActionTarget] = useState(""); // item name, ability name, flag key, etc.
    const [actionAmount, setActionAmount] = useState(0);


    // Derived Data
    const { campaign, locations, npcs, items, spells, monsters, factions, quests } = data || {};

    // Suggestions for MentionTextArea
    const mentionSuggestions = [
        ...(items?.map(i => ({ id: i._id, name: i.name, type: 'Item' as const })) || []),
        ...(npcs?.map(n => ({ id: n._id, name: n.name, type: 'NPC' as const })) || []),
        ...(locations?.map(l => ({ id: l._id, name: l.name, type: 'Location' as const })) || []),
    ];

    // --- HANDLERS ---

    const handleCreateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createLocation({
                campaignId,
                name: locName,
                type: locType,
                environment: locEnvironment || undefined,
                description: locDesc,
                neighbors: locNeighbors.length > 0 ? locNeighbors : undefined,
            });
            setLocName(""); setLocType("Town"); setLocEnvironment(""); setLocDesc(""); setLocNeighbors([]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateNPC = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createNPC({
                campaignId,
                name: npcName,
                role: npcRole,
                attitude: npcAttitude,
                locationId: npcLocationId ? (npcLocationId as Id<"locations">) : undefined,
                description: npcDesc,
            });
            setNpcName(""); setNpcRole(""); setNpcDesc("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateQuest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createQuest({
                campaignId,
                title: questTitle,
                description: questDesc,
                locationId: questLocationId ? (questLocationId as Id<"locations">) : undefined,
                npcId: questNpcId ? (questNpcId as Id<"npcs">) : undefined,
                rewardItemIds: questRewardItemIds.length > 0 ? questRewardItemIds : undefined,
                nextQuestId: questNextId ? (questNextId as Id<"quests">) : undefined,
                rewardReputation: rewardReputation,
                rewardWorldUpdates: rewardWorldUpdates,
            });
            setQuestTitle(""); setQuestDesc(""); setQuestLocationId(""); setQuestNpcId(""); setQuestNextId(""); setQuestRewardItemIds([]);
            setRewardReputation(""); setRewardWorldUpdates("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveRarityColors = async () => {
        setIsSubmitting(true);
        try {
            await updateRarityColors({ campaignId, rarityColors: JSON.stringify(rarityColors) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createItem({
                campaignId,
                name: itemName,
                type: itemType,
                rarity: itemRarity,
                description: itemDescription,
                usage: itemUsage,
                requirements: itemRequirements,
                lore: itemLore,
                effects: effectMode === 'custom' ? itemEffects : "",
                effectId: effectMode === 'library' && itemEffectId ? (itemEffectId as Id<"effectsLibrary">) : undefined,
                spellId: itemSpellId ? (itemSpellId as Id<"spells">) : undefined,
                specialAbilities: itemSpecial,
            });
            setItemName(""); setItemDescription(""); setItemEffects(""); setItemSpecial("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateSpell = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createSpell({
                campaignId,
                name: abilityName,
                description: abilityDescription,
                category: abilityCategory || undefined,
                subcategory: abilitySubcategory || undefined,
                iconEmoji: abilityIconEmoji || undefined,
                tags: abilityTags ? abilityTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
                requiredLevel: abilityRequiredLevel,
                requiredStats: abilityRequiredStats || undefined,
                energyCost: abilityEnergyCost,
                healthCost: abilityHealthCost,
                cooldown: abilityCooldown,
                usesPerDay: abilityUsesPerDay,
                isPassive: abilityIsPassive,
                damage: abilityDamage,
                damageType: abilityDamageType || undefined,
                healing: abilityHealing,
                statusEffect: abilityStatusEffect || undefined,
                statusDuration: abilityStatusDuration,
                targetType: abilityTargetType || undefined,
                range: abilityRange || undefined,
                areaSize: abilityAreaSize || undefined,
                castTime: abilityCastTime || undefined,
                interruptible: abilityInterruptible,
                lore: abilityLore || undefined,
                rarity: abilityRarity || undefined,
                isForbidden: abilityIsForbidden,
                canUpgrade: abilityCanUpgrade,
                upgradedVersion: abilityUpgradedVersion || undefined,
                notes: abilityNotes || undefined,
            });
            // Reset form
            setAbilityName(""); setAbilityDescription(""); setAbilityCategory(""); setAbilitySubcategory("");
            setAbilityIconEmoji(""); setAbilityTags(""); setAbilityRequiredLevel(undefined);
            setAbilityRequiredStats(""); setAbilityEnergyCost(undefined); setAbilityHealthCost(undefined);
            setAbilityCooldown(undefined); setAbilityUsesPerDay(undefined); setAbilityIsPassive(false);
            setAbilityDamage(undefined); setAbilityDamageType(""); setAbilityHealing(undefined);
            setAbilityStatusEffect(""); setAbilityStatusDuration(undefined); setAbilityTargetType("single");
            setAbilityRange("melee"); setAbilityAreaSize(""); setAbilityCastTime("instant");
            setAbilityInterruptible(false); setAbilityLore(""); setAbilityRarity("common");
            setAbilityIsForbidden(false); setAbilityCanUpgrade(false); setAbilityUpgradedVersion("");
            setAbilityNotes("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateMonster = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createMonster({
                campaignId,
                name: monsterName,
                locationId: monsterLocationId ? (monsterLocationId as Id<"locations">) : undefined,
                description: monsterDesc,
                health: monsterHealth,
                damage: monsterDamage,
                dropItemIds: monsterDropIds,
            });
            setMonsterName(""); setMonsterDesc(""); setMonsterDropIds([]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateShop = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopLocationId) return;
        setIsSubmitting(true);
        try {
            await createShop({
                campaignId,
                locationId: shopLocationId as Id<"locations">,
                name: shopName,
                description: shopDesc,
                type: shopType,
                shopkeeperId: shopkeeperId ? (shopkeeperId as Id<"npcs">) : undefined,
                basePriceModifier: shopPriceModifier,
                buybackModifier: shopBuybackModifier,
                buybackDuration: shopBuybackDuration,
                aiManaged: shopAiManaged,
            });
            setShopName(""); setShopDesc(""); setShopLocationId(""); setShopkeeperId("");
            setShopPriceModifier(1.0); setShopBuybackModifier(1.2); setShopBuybackDuration(undefined);
            setShopAiManaged(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteShop = async (shopId: Id<"shops">) => {
        if (!confirm("Are you sure you want to delete this shop?")) return;
        setIsSubmitting(true);
        try {
            await deleteShop({ shopId });
            if (selectedShopId === shopId) setSelectedShopId(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddItemToShop = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedShopId || !shopItemId) return;
        setIsSubmitting(true);
        try {
            await addItemToShop({
                shopId: selectedShopId,
                itemId: shopItemId as Id<"items">,
                stock: shopItemStock,
                basePrice: shopItemPrice,
            });
            setShopItemId(""); setShopItemStock(-1); setShopItemPrice(undefined);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveItemFromShop = async (itemId: Id<"items">) => {
        if (!selectedShopId) return;
        setIsSubmitting(true);
        try {
            await removeItemFromShop({ shopId: selectedShopId, itemId });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Build rules JSON from form state
    const buildRulesJson = () => {
        switch (conditionType) {
            case 'level':
                return JSON.stringify({ [conditionOperator]: ["player.level", conditionValueNum] });
            case 'faction':
                return JSON.stringify({ eq: ["player.faction", conditionValue] });
            case 'has_item':
                return JSON.stringify({ has_item: conditionValue });
            case 'not_has_item':
                return JSON.stringify({ not: { has_item: conditionValue } });
            case 'has_ability':
                return JSON.stringify({ has_ability: conditionValue });
            case 'at_location':
                return JSON.stringify({ at_location: conditionValue });
            case 'quest':
                return JSON.stringify({ quest_completed: conditionValue });
            case 'quest_active':
                return JSON.stringify({ quest_status: [conditionValue, "active"] });
            case 'npc_alive':
                return JSON.stringify({ npc_alive: conditionValue });
            case 'npc_dead':
                return JSON.stringify({ npc_dead: conditionValue });
            case 'flag':
                return JSON.stringify({ flag: [conditionValue, true] });
            case 'stat':
                return JSON.stringify({ [conditionOperator]: [`player.stats.${conditionStat}`, conditionValueNum] });
            case 'gold':
                return JSON.stringify({ [conditionOperator]: ["player.gold", conditionValueNum] });
            case 'custom':
                return conditionValue; // User provides raw JSON
            default:
                return "{}";
        }
    };

    // Build actions JSON from form state
    const buildActionsJson = () => {
        const action: Record<string, unknown> = { type: actionType };
        switch (actionType) {
            case 'block_entry':
            case 'show_message':
                action.message = actionMessage;
                break;
            case 'grant_ability':
            case 'remove_ability':
                action.abilityName = actionTarget;
                break;
            case 'give_item':
                action.itemName = actionTarget;
                action.quantity = actionAmount || 1;
                break;
            case 'remove_item':
                action.itemName = actionTarget;
                action.quantity = actionAmount || 1;
                break;
            case 'set_flag':
                action.key = actionTarget;
                action.value = true;
                break;
            case 'clear_flag':
                action.key = actionTarget;
                break;
            case 'modify_reputation':
                action.faction = actionTarget;
                action.amount = actionAmount;
                break;
            case 'modify_hp':
            case 'modify_gold':
            case 'add_xp':
                action.amount = actionAmount;
                break;
            case 'teleport':
                action.locationId = actionTarget;
                break;
            case 'spawn_npc':
            case 'kill_npc':
                action.npcId = actionTarget;
                break;
        }
        return JSON.stringify([action]);
    };

    const handleCreateCondition = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createCondition({
                campaignId,
                name: conditionName,
                description: conditionDesc,
                trigger: conditionTrigger,
                triggerContext: conditionTriggerContext || undefined,
                rules: buildRulesJson(),
                thenActions: buildActionsJson(),
                priority: conditionPriority,
                executeOnce: conditionExecuteOnce,
            });
            // Reset form
            setConditionName("");
            setConditionDesc("");
            setConditionTrigger("on_enter_location");
            setConditionTriggerContext("");
            setConditionPriority(0);
            setConditionExecuteOnce(false);
            setConditionType('level');
            setConditionOperator('gte');
            setConditionValue("");
            setConditionValueNum(1);
            setActionType('block_entry');
            setActionMessage("");
            setActionTarget("");
            setActionAmount(0);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCondition = async (conditionId: Id<"conditions">) => {
        if (!confirm("Are you sure you want to delete this condition?")) return;
        setIsSubmitting(true);
        try {
            await deleteCondition({ conditionId });
            if (selectedConditionId === conditionId) setSelectedConditionId(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleCondition = async (conditionId: Id<"conditions">) => {
        setIsSubmitting(true);
        try {
            await toggleCondition({ conditionId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!data) return (
        <div className={`flex flex-col items-center justify-center h-screen ${dark ? 'bg-[#0f1119]' : 'bg-[#f8f9fa]'}`}>
             <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                <motion.div className={`absolute inset-0 border-4 rounded-full ${dark ? 'border-[#2a2d3e]' : 'border-[#e8e0c5]'}`} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                <motion.div className="absolute inset-2 border border-[#D4AF37] rounded-full border-dashed" animate={{ rotate: 360 }} transition={{ duration: 10, ease: "linear", repeat: Infinity }} />
                <Settings size={24} className="text-[#D4AF37]" />
            </div>
            <span className={`font-serif tracking-[0.2em] text-xs font-bold uppercase ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>Opening Grimoire...</span>
        </div>
    );

    return (
        <div className={`min-h-screen font-serif relative selection:bg-[#D4AF37] selection:text-white ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-[#f8f9fa] text-[#43485C]'}`}>
            
             {/* Background */}
            <div className={`fixed inset-0 z-0 pointer-events-none ${dark ? 'bg-[#0a0c12]' : 'bg-[#fcfcfc]'}`}>
                 <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                 <StarPattern />
            </div>

            {/* Header */}
            <header className={`border-b backdrop-blur sticky top-0 z-40 shadow-sm ${dark ? 'border-[#D4AF37]/10 bg-[#1a1d2e]/80' : 'border-[#D4AF37]/10 bg-white/80'}`}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/forge" className={`hover:text-[#D4AF37] transition-colors ${dark ? 'text-gray-500' : 'text-[#43485C]/50'}`}>
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex flex-col">
                            <h1 className={`text-xl font-bold tracking-tight leading-none ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>{campaign?.title}</h1>
                            <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mt-0.5">Campaign Editor</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2">
                        {['overview', 'realm', 'npcs', 'events', 'quests', 'items', 'spells', 'monsters', 'shops', 'conditions', 'players'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                    activeTab === tab 
                                    ? 'bg-[#D4AF37] text-white border-[#D4AF37] shadow-md' 
                                    : dark 
                                        ? 'text-gray-400 border-transparent hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]'
                                        : 'text-[#43485C]/60 border-transparent hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                <div className="space-y-8">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="bg-white border border-[#D4AF37]/20 rounded-[2rem] p-8 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-full -mr-8 -mt-8" />
                                <h2 className="text-3xl font-bold text-[#43485C] mb-4 flex items-center gap-3">
                                    <Crown size={28} className="text-[#D4AF37]" />
                                    Campaign Overview
                                </h2>
                                <p className="text-[#43485C]/70 leading-relaxed max-w-3xl font-sans text-lg">{campaign?.description}</p>
                                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { label: "Locations", value: locations?.length || 0, icon: Map },
                                        { label: "NPCs", value: npcs?.length || 0, icon: Users },
                                        { label: "Items", value: items?.length || 0, icon: Package },
                                        { label: "Monsters", value: monsters?.length || 0, icon: Skull },
                                    ].map((stat, i) => (
                                        <div key={i} className="p-6 bg-[#f8f9fa] rounded-2xl border border-[#D4AF37]/10 flex flex-col items-center justify-center gap-2 group hover:border-[#D4AF37]/30 transition-colors">
                                            <stat.icon className="text-[#D4AF37]/50 group-hover:text-[#D4AF37] transition-colors" size={24} />
                                            <div className="text-3xl font-bold text-[#43485C]">{stat.value}</div>
                                            <div className="text-[10px] text-[#43485C]/50 uppercase tracking-widest font-bold">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REALM TAB - Locations */}
                    {activeTab === 'realm' && (
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="text-xl font-bold text-[#43485C] mb-4 flex items-center gap-2">
                                    <Map className="text-[#D4AF37]" /> Locations
                                </h3>
                                {locations && locations.length > 0 ? (
                                    <div className="grid gap-4">
                                        {locations.map((loc: any) => {
                                            const locNpcs = npcs?.filter(n => n.locationId === loc._id) || [];
                                            const locShops = campaignShops?.filter(s => s.locationId === loc._id) || [];
                                            const locMonsters = monsters?.filter(m => m.locationId === loc._id) || [];
                                            const connectedLocs = loc.neighbors?.map((nId: Id<"locations">) =>
                                                locations.find((l: any) => l._id === nId)
                                            ).filter(Boolean) || [];

                                            return (
                                                <div key={loc._id} className="bg-white border border-[#D4AF37]/10 rounded-2xl p-6 hover:border-[#D4AF37]/30 transition-all group">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-[#43485C] text-lg group-hover:text-[#D4AF37] transition-colors">{loc.name}</h4>
                                                            <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">{loc.type}</span>
                                                        </div>
                                                        <Link
                                                            href={`/forge/campaign/${campaignId}/location/${loc._id}/layout`}
                                                            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg hover:bg-[#D4AF37] hover:text-white transition-colors"
                                                        >
                                                            Edit Layout
                                                        </Link>
                                                    </div>
                                                    {loc.environment && (
                                                        <p className="text-sm text-[#43485C]/60 mt-2 italic">Environment: {loc.environment}</p>
                                                    )}
                                                    <p className="text-sm text-[#43485C]/70 mt-2 font-sans leading-relaxed">{loc.description}</p>

                                                    {/* Connected Locations */}
                                                    {connectedLocs.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-[#D4AF37]/10">
                                                            <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">Connected to:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {connectedLocs.map((connLoc: any) => (
                                                                    <span key={connLoc._id} className="text-xs px-2 py-1 bg-[#f8f9fa] text-[#43485C]/70 rounded-full border border-[#D4AF37]/10">
                                                                        {connLoc.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Location Contents */}
                                                    {(locNpcs.length > 0 || locShops.length > 0 || locMonsters.length > 0) && (
                                                        <div className="mt-4 pt-4 border-t border-[#D4AF37]/10 grid grid-cols-3 gap-4">
                                                            {locNpcs.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-[#43485C]/50 uppercase tracking-wider mb-1">NPCs</p>
                                                                    <div className="space-y-1">
                                                                        {locNpcs.slice(0, 3).map(npc => (
                                                                            <p key={npc._id} className="text-xs text-[#43485C]/70 truncate">{npc.name}</p>
                                                                        ))}
                                                                        {locNpcs.length > 3 && <p className="text-xs text-[#D4AF37]">+{locNpcs.length - 3} more</p>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {locShops.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-[#43485C]/50 uppercase tracking-wider mb-1">Shops</p>
                                                                    <div className="space-y-1">
                                                                        {locShops.slice(0, 3).map(shop => (
                                                                            <p key={shop._id} className="text-xs text-[#43485C]/70 truncate">{shop.name}</p>
                                                                        ))}
                                                                        {locShops.length > 3 && <p className="text-xs text-[#D4AF37]">+{locShops.length - 3} more</p>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {locMonsters.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-[#43485C]/50 uppercase tracking-wider mb-1">Monsters</p>
                                                                    <div className="space-y-1">
                                                                        {locMonsters.slice(0, 3).map(monster => (
                                                                            <p key={monster._id} className="text-xs text-[#43485C]/70 truncate">{monster.name}</p>
                                                                        ))}
                                                                        {locMonsters.length > 3 && <p className="text-xs text-[#D4AF37]">+{locMonsters.length - 3} more</p>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white border border-[#D4AF37]/10 rounded-2xl p-8 text-center text-[#43485C]/50 italic font-sans">
                                        No locations yet. Create your first location to build your world!
                                    </div>
                                )}
                            </div>
                            <div className="bg-white border border-[#D4AF37]/20 rounded-2xl p-6 h-fit shadow-lg">
                                <h3 className="text-lg font-bold text-[#43485C] mb-6 border-b border-[#D4AF37]/10 pb-4">Add Location</h3>
                                <form onSubmit={handleCreateLocation} className="space-y-4">
                                    <Input label="Name" placeholder="The Whispering Woods" value={locName} onChange={(e: any) => setLocName(e.target.value)} required />
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Type</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                            value={locType}
                                            onChange={(e) => setLocType(e.target.value)}
                                        >
                                            <option value="Town">Town</option>
                                            <option value="City">City</option>
                                            <option value="Village">Village</option>
                                            <option value="Dungeon">Dungeon</option>
                                            <option value="Forest">Forest</option>
                                            <option value="Mountain">Mountain</option>
                                            <option value="Desert">Desert</option>
                                            <option value="Swamp">Swamp</option>
                                            <option value="Castle">Castle</option>
                                            <option value="Ruins">Ruins</option>
                                            <option value="Cave">Cave</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <Input label="Environment" placeholder="Dense foliage, misty paths..." value={locEnvironment} onChange={(e: any) => setLocEnvironment(e.target.value)} />

                                    {/* Connected Locations */}
                                    {locations && locations.length > 0 && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Connected To</label>
                                            <select
                                                multiple
                                                className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors min-h-[80px]"
                                                value={locNeighbors}
                                                onChange={(e) => setLocNeighbors(Array.from(e.target.selectedOptions, option => option.value as Id<"locations">))}
                                            >
                                                {locations.map((loc: any) => (
                                                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-[#43485C]/50 ml-1">Hold Ctrl/Cmd to select multiple. These locations will be accessible from the new location.</p>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Description</label>
                                        <MentionTextArea
                                            label=""
                                            value={locDesc}
                                            onChange={(e: any) => setLocDesc(e.target.value)}
                                            placeholder="A dark forest where the trees seem to whisper secrets..."
                                            suggestions={mentionSuggestions}
                                        />
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 py-3 bg-[#D4AF37] text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#c9a432] transition-colors shadow-md hover:shadow-lg disabled:opacity-50">
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                        Add Location
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* QUESTS TAB */}
                    {activeTab === 'quests' && (
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="text-xl font-bold text-[#43485C] mb-4 flex items-center gap-2">
                                    <Scroll className="text-[#D4AF37]" /> Active Quests
                                </h3>
                                <div className="bg-white border border-[#D4AF37]/10 rounded-2xl p-8 text-center text-[#43485C]/50 italic font-sans">
                                    Visualization of existing quests coming soon to the archives.
                                </div>
                            </div>

                            {/* Create Quest Form */}
                            <div className="bg-white border border-[#D4AF37]/20 rounded-2xl p-6 h-fit shadow-lg">
                                <h3 className="text-lg font-bold text-[#43485C] mb-6 border-b border-[#D4AF37]/10 pb-4">Add New Quest</h3>
                                <form onSubmit={handleCreateQuest} className="space-y-4">
                                    <Input label="Title" placeholder="Retrieve the Ancient Relic" value={questTitle} onChange={(e: any) => setQuestTitle(e.target.value)} required />

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Quest Giver</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                            value={questNpcId}
                                            onChange={(e) => setQuestNpcId(e.target.value)}
                                        >
                                            <option value="">None (Bulletin Board / Auto)</option>
                                            {npcs?.map(npc => (
                                                <option key={npc._id} value={npc._id}>{npc.name} ({npc.role})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Location (Hub)</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                            value={questLocationId}
                                            onChange={(e) => setQuestLocationId(e.target.value)}
                                        >
                                            <option value="">None (Global)</option>
                                            {locations?.map(loc => (
                                                <option key={loc._id} value={loc._id}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Unlocks Next Quest (Chain)</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                            value={questNextId}
                                            onChange={(e) => setQuestNextId(e.target.value)}
                                        >
                                            <option value="">None</option>
                                            {data?.quests?.map((q: any) => (
                                                <option key={q._id} value={q._id}>{q.title}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-[#43485C]/50 ml-1">Completing this quest will set the selected quest to &quot;Active&quot;.</p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Reward Items</label>
                                        <select
                                            multiple
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors min-h-[80px]"
                                            value={questRewardItemIds}
                                            onChange={(e) => setQuestRewardItemIds(Array.from(e.target.selectedOptions, option => option.value as Id<"items">))}
                                        >
                                            {items?.map(item => (
                                                <option key={item._id} value={item._id}>{item.name} ({item.rarity})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Reward Reputation (JSON)</label>
                                        <Input placeholder='{"Mages Guild": 10}' value={rewardReputation} onChange={(e: any) => setRewardReputation(e.target.value)} />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">World Updates (JSON)</label>
                                        <TextArea placeholder='[{"locationId": "...", "newDescription": "..."}]' value={rewardWorldUpdates} onChange={(e: any) => setRewardWorldUpdates(e.target.value)} />
                                    </div>

                                    <div className="space-y-1">
                                         <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Description</label>
                                        <MentionTextArea 
                                            label="" 
                                            placeholder="Find the relic hidden in the deep caves... (Type @ to mention)" 
                                            value={questDesc} 
                                            onChange={(e: any) => setQuestDesc(e.target.value)} 
                                            suggestions={mentionSuggestions}
                                            required 
                                            className="bg-[#f8f9fa] border-[#D4AF37]/20 rounded-xl text-[#43485C] placeholder:text-[#43485C]/30"
                                        />
                                    </div>

                                    <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#D4AF37] hover:bg-[#eac88f] text-white font-bold rounded-full transition-all shadow-lg hover:shadow-[#D4AF37]/20 text-sm flex items-center justify-center gap-2 uppercase tracking-widest mt-4">
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                        Add Quest
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* NPCS TAB */}
                    {activeTab === 'npcs' && (
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="text-xl font-bold text-[#43485C] mb-4 flex items-center gap-2">
                                    <Users className="text-[#D4AF37]" /> Inhabitants
                                </h3>
                                {npcs?.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-[#D4AF37]/20 rounded-2xl bg-white/50">
                                        <Users className="mx-auto text-[#D4AF37]/50 mb-2" size={32} />
                                        <p className="text-[#43485C]/50 font-sans">No NPCs populated yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {npcs?.map((npc) => (
                                            <div key={npc._id} className="bg-white border border-[#D4AF37]/10 p-5 rounded-2xl hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-[#43485C] group-hover:text-[#D4AF37] transition-colors">{npc.name}</h4>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${npc.attitude === 'Hostile' ? 'bg-red-100 text-red-500' :
                                                        npc.attitude === 'Friendly' ? 'bg-emerald-100 text-emerald-600' :
                                                            'bg-stone-100 text-stone-500'
                                                        }`}>{npc.attitude}</span>
                                                </div>
                                                <p className="text-xs text-[#D4AF37] font-bold mb-2 uppercase tracking-wide">{npc.role}</p>
                                                <p className="text-xs text-[#43485C]/60 line-clamp-2 font-sans leading-relaxed">{npc.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Create NPC Form */}
                            <div className="bg-white border border-[#D4AF37]/20 rounded-2xl p-6 h-fit shadow-lg">
                                <h3 className="text-lg font-bold text-[#43485C] mb-6 border-b border-[#D4AF37]/10 pb-4">Add NPC</h3>
                                <form onSubmit={handleCreateNPC} className="space-y-4">
                                    <Input label="Name" placeholder="Garrick the Guard" value={npcName} onChange={(e: any) => setNpcName(e.target.value)} required />
                                    <Input label="Role" placeholder="Gatekeeper" value={npcRole} onChange={(e: any) => setNpcRole(e.target.value)} required />
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Attitude</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                            value={npcAttitude}
                                            onChange={(e) => setNpcAttitude(e.target.value)}
                                        >
                                            <option value="Neutral">Neutral</option>
                                            <option value="Friendly">Friendly</option>
                                            <option value="Hostile">Hostile</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Current Location</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                            value={npcLocationId}
                                            onChange={(e) => setNpcLocationId(e.target.value)}
                                        >
                                            <option value="">None (Wandering)</option>
                                            {locations?.map(loc => (
                                                <option key={loc._id} value={loc._id}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <TextArea label="Description" placeholder="Stern but bribable..." value={npcDesc} onChange={(e: any) => setNpcDesc(e.target.value)} required />
                                    <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#D4AF37] hover:bg-[#eac88f] text-white font-bold rounded-full transition-all shadow-lg hover:shadow-[#D4AF37]/20 text-sm flex items-center justify-center gap-2 uppercase tracking-widest mt-4">
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                        Add NPC
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ITEMS TAB */}
                    {activeTab === 'items' && (
                        <div className="space-y-8">
                            {/* Rarity Color Picker */}
                            <div className="bg-white rounded-[2rem] border border-[#D4AF37]/20 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Palette className="text-[#D4AF37]" />
                                        <h3 className="text-xl font-bold text-[#43485C]">Rarity Colors</h3>
                                    </div>
                                    <button
                                        onClick={handleSaveRarityColors}
                                        disabled={isSubmitting}
                                        className="bg-[#43485C] hover:bg-[#2d3142] text-white px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2 disabled:opacity-50 text-sm uppercase tracking-wider shadow-lg"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Save Config
                                    </button>
                                </div>
                                <div className="grid md:grid-cols-5 gap-6">
                                    {Object.entries(rarityColors).map(([rarity, color]) => (
                                        <div key={rarity} className="space-y-2 group">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">{rarity}</label>
                                            <div className="flex gap-3 items-center">
                                                <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md border border-black/10 group-hover:scale-110 transition-transform">
                                                    <input
                                                        type="color"
                                                        value={color}
                                                        onChange={(e) => setRarityColors({ ...rarityColors, [rarity]: e.target.value })}
                                                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0"
                                                    />
                                                </div>
                                                <div className="flex-1 bg-[#f8f9fa] rounded-lg px-3 py-2 border border-black/5">
                                                    <span className="font-mono text-xs text-[#43485C]">{color}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Create Item Form */}
                            <div className="bg-white rounded-[2rem] border border-[#D4AF37]/20 p-8 shadow-lg relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
                                <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-[#43485C]">
                                    <Package className="text-[#D4AF37]" />
                                    Forge Item
                                </h3>
                                <form onSubmit={handleCreateItem} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <Input label="Name" value={itemName} onChange={(e: any) => setItemName(e.target.value)} required />
                                        <Input label="Type" value={itemType} onChange={(e: any) => setItemType(e.target.value)} required />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Rarity</label>
                                            <select
                                                className="w-full mt-1 bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                                value={itemRarity}
                                                onChange={(e) => setItemRarity(e.target.value)}
                                            >
                                                {Object.keys(rarityColors).map((rarity) => (
                                                    <option key={rarity} value={rarity}>{rarity}</option>
                                                ))}
                                                <option value="Custom">Custom</option>
                                            </select>
                                        </div>
                                        <Input label="Usage / Charges" value={itemUsage} onChange={(e: any) => setItemUsage(e.target.value)} placeholder="3 charges, bonus action" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Linked Spell (optional)</label>
                                            <select
                                                className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                                value={itemSpellId}
                                                onChange={(e) => setItemSpellId(e.target.value)}
                                            >
                                                <option value="">None</option>
                                                {spells?.map((spell) => (
                                                    <option key={spell._id} value={spell._id}>{spell.name} (Lvl {spell.level})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Effects</label>
                                            <div className="flex gap-2 text-xs mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEffectMode('library')}
                                                    className={`px-4 py-1.5 rounded-full font-bold transition-colors ${effectMode === 'library' ? 'bg-[#D4AF37] text-white' : 'bg-[#f8f9fa] text-[#43485C]/60 hover:bg-[#D4AF37]/10'}`}
                                                >
                                                    Use Library
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEffectMode('custom')}
                                                    className={`px-4 py-1.5 rounded-full font-bold transition-colors ${effectMode === 'custom' ? 'bg-[#D4AF37] text-white' : 'bg-[#f8f9fa] text-[#43485C]/60 hover:bg-[#D4AF37]/10'}`}
                                                >
                                                    Custom
                                                </button>
                                            </div>
                                            {effectMode === 'library' ? (
                                                <div className="space-y-2">
                                                    <select
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                                        value={itemEffectId}
                                                        onChange={(e) => setItemEffectId(e.target.value)}
                                                    >
                                                        <option value="">Select effect from library</option>
                                                        {effectsLibrary?.map((eff) => (
                                                            <option key={eff._id} value={eff._id}>
                                                                {eff.name} — {eff.summary}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {itemEffectId && (
                                                        <div className="text-xs text-[#43485C]/70 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-xl p-3 font-sans">
                                                            {effectsLibrary?.find(e => e._id === itemEffectId)?.mechanics || effectsLibrary?.find(e => e._id === itemEffectId)?.summary}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <TextArea label="Custom Effect" value={itemEffects} onChange={(e: any) => setItemEffects(e.target.value)} placeholder="+2 to hit and damage; sheds dim light" />
                                            )}
                                        </div>
                                        <TextArea label="Special Abilities" value={itemSpecial} onChange={(e: any) => setItemSpecial(e.target.value)} placeholder="Once per day unleash a cone of flame" />
                                    </div>
                                    <TextArea label="Physical Description" value={itemDescription} onChange={(e: any) => setItemDescription(e.target.value)} placeholder="Ebony greatsword with a jagged edge" required />
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <TextArea label="Requirements / Attunement" value={itemRequirements} onChange={(e: any) => setItemRequirements(e.target.value)} placeholder="Requires attunement by a fighter of level 5+" />
                                        <TextArea label="Lore & Notes" value={itemLore} onChange={(e: any) => setItemLore(e.target.value)} placeholder="Crafted for the marsh sentinels" />
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-[#43485C] hover:bg-[#2d3142] text-white px-6 py-4 rounded-full font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl text-sm uppercase tracking-widest"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                            Create Item
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Items List */}
                            <div className="bg-white rounded-[2rem] border border-[#D4AF37]/20 p-8">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#43485C]">
                                    <Package className="text-[#D4AF37]" />
                                    Campaign Items ({items?.length || 0})
                                </h3>
                                {items && items.length > 0 ? (
                                    <div className="grid md:grid-cols-3 gap-6">
                                        {items.map((item) => (
                                            <div key={item._id} className="bg-[#f8f9fa] rounded-2xl p-5 border border-[#D4AF37]/10 hover:shadow-md transition-all group space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-lg" style={{ color: rarityColors[item.rarity as keyof typeof rarityColors] || '#43485C' }}>{item.name}</h4>
                                                        <p className="text-[10px] uppercase tracking-wide text-[#43485C]/50 font-bold">{item.type}</p>
                                                    </div>
                                                    <span className="text-[10px] px-2 py-1 rounded-full border border-black/5 font-bold uppercase" style={{ color: rarityColors[item.rarity as keyof typeof rarityColors] || '#43485C', backgroundColor: (rarityColors[item.rarity as keyof typeof rarityColors] || '#43485C') + '10' }}>
                                                        {item.rarity}
                                                    </span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-sm text-[#43485C]/70 font-sans leading-relaxed line-clamp-3">{item.description}</p>
                                                )}
                                                <div className="pt-3 border-t border-[#D4AF37]/10 space-y-2">
                                                    {item.effects && (
                                                        <div className="text-xs text-[#43485C]/80 bg-white border border-[#D4AF37]/10 rounded-lg p-2">
                                                            <span className="font-bold text-[#D4AF37]">Effects:</span> {item.effects}
                                                        </div>
                                                    )}
                                                    {item.specialAbilities && (
                                                        <div className="text-xs text-[#43485C]/80 bg-white border border-[#D4AF37]/10 rounded-lg p-2">
                                                            <span className="font-bold text-[#D4AF37]">Special:</span> {item.specialAbilities}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[#43485C]/40 text-center py-12 font-sans">No items yet. Create items in the main Forge.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ABILITIES TAB - Genre-agnostic (Spells/Jutsu/Powers/etc.) */}
                    {activeTab === 'spells' && (
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Abilities List */}
                            <div className="md:col-span-2 space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-[#43485C] flex items-center gap-2">
                                        <Sparkles className="text-[#D4AF37]" /> Abilities ({spells?.length || 0})
                                    </h3>
                                </div>
                                <p className="text-sm text-[#43485C]/60 font-sans mb-4">
                                    Create abilities for your campaign - these can be spells, jutsu, techniques, powers, or anything else.
                                </p>

                                {!spells || spells.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-[#D4AF37]/20 rounded-2xl bg-white/50">
                                        <Sparkles className="mx-auto text-[#D4AF37]/50 mb-2" size={32} />
                                        <p className="text-[#43485C]/50 font-sans">No abilities yet. Create your first one!</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {spells.map((spell: any) => (
                                            <div key={spell._id} className="bg-white border border-[#D4AF37]/10 rounded-2xl p-5 hover:border-[#D4AF37]/30 transition-all">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-start gap-3">
                                                        {spell.iconEmoji && (
                                                            <span className="text-2xl">{spell.iconEmoji}</span>
                                                        )}
                                                        <div>
                                                            <h4 className="font-bold text-[#43485C] text-lg">{spell.name}</h4>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                {spell.category && (
                                                                    <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">
                                                                        {spell.category}
                                                                    </span>
                                                                )}
                                                                {spell.rarity && (
                                                                    <span className={`text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                                                        spell.rarity === 'legendary' || spell.rarity === 'S-Rank' ? 'bg-yellow-100 text-yellow-600' :
                                                                        spell.rarity === 'rare' || spell.rarity === 'A-Rank' ? 'bg-purple-100 text-purple-600' :
                                                                        spell.rarity === 'uncommon' || spell.rarity === 'B-Rank' ? 'bg-blue-100 text-blue-600' :
                                                                        'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        {spell.rarity}
                                                                    </span>
                                                                )}
                                                                {spell.isForbidden && (
                                                                    <span className="text-xs uppercase tracking-wider font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                                                        Forbidden
                                                                    </span>
                                                                )}
                                                                {spell.isPassive && (
                                                                    <span className="text-xs uppercase tracking-wider font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                                                                        Passive
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-xs text-[#43485C]/50">
                                                        {spell.energyCost && <div>{spell.energyCost} Energy</div>}
                                                        {spell.damage && <div>{spell.damage} DMG</div>}
                                                        {spell.healing && <div>{spell.healing} Heal</div>}
                                                    </div>
                                                </div>
                                                {spell.description && (
                                                    <p className="text-sm text-[#43485C]/60 mt-3 line-clamp-2 font-sans">{spell.description}</p>
                                                )}
                                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#D4AF37]/10">
                                                    {spell.requiredLevel && (
                                                        <span className="text-[10px] bg-[#f8f9fa] px-2 py-1 rounded text-[#43485C]/70">Lvl {spell.requiredLevel}+</span>
                                                    )}
                                                    {spell.cooldown && (
                                                        <span className="text-[10px] bg-[#f8f9fa] px-2 py-1 rounded text-[#43485C]/70">{spell.cooldown} Turn CD</span>
                                                    )}
                                                    {spell.targetType && (
                                                        <span className="text-[10px] bg-[#f8f9fa] px-2 py-1 rounded text-[#43485C]/70">{spell.targetType}</span>
                                                    )}
                                                    {spell.range && (
                                                        <span className="text-[10px] bg-[#f8f9fa] px-2 py-1 rounded text-[#43485C]/70">{spell.range}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Create Ability Form */}
                            <div className="bg-white border border-[#D4AF37]/20 rounded-2xl p-6 h-fit shadow-lg sticky top-4">
                                <h3 className="text-lg font-bold text-[#43485C] mb-6 border-b border-[#D4AF37]/10 pb-4 flex items-center gap-2">
                                    <Sparkles className="text-[#D4AF37]" size={18} />
                                    Create Ability
                                </h3>
                                <form onSubmit={handleCreateSpell} className="space-y-4">
                                    {/* Core Identity */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="col-span-3">
                                                <Input label="Name" value={abilityName} onChange={(e: any) => setAbilityName(e.target.value)} required placeholder="Fire Ball Jutsu" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Icon</label>
                                                <input
                                                    type="text"
                                                    value={abilityIconEmoji}
                                                    onChange={(e) => setAbilityIconEmoji(e.target.value)}
                                                    placeholder="🔥"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-center text-xl"
                                                    maxLength={2}
                                                />
                                            </div>
                                        </div>
                                        <TextArea label="Description" value={abilityDescription} onChange={(e: any) => setAbilityDescription(e.target.value)} placeholder="A powerful fire technique that..." />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input label="Category" value={abilityCategory} onChange={(e: any) => setAbilityCategory(e.target.value)} placeholder="Ninjutsu" />
                                            <Input label="Subcategory" value={abilitySubcategory} onChange={(e: any) => setAbilitySubcategory(e.target.value)} placeholder="Fire Style" />
                                        </div>
                                        <Input label="Tags (comma separated)" value={abilityTags} onChange={(e: any) => setAbilityTags(e.target.value)} placeholder="fire, offensive, aoe" />
                                    </div>

                                    {/* Requirements */}
                                    <div className="border-t border-[#D4AF37]/10 pt-4">
                                        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">Requirements</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Min Level</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={abilityRequiredLevel ?? ''}
                                                    onChange={(e) => setAbilityRequiredLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                                                    placeholder="5"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Rarity</label>
                                                <select
                                                    value={abilityRarity}
                                                    onChange={(e) => setAbilityRarity(e.target.value)}
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                >
                                                    <option value="common">Common</option>
                                                    <option value="uncommon">Uncommon</option>
                                                    <option value="rare">Rare</option>
                                                    <option value="legendary">Legendary</option>
                                                    <option value="E-Rank">E-Rank</option>
                                                    <option value="D-Rank">D-Rank</option>
                                                    <option value="C-Rank">C-Rank</option>
                                                    <option value="B-Rank">B-Rank</option>
                                                    <option value="A-Rank">A-Rank</option>
                                                    <option value="S-Rank">S-Rank</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost & Cooldown */}
                                    <div className="border-t border-[#D4AF37]/10 pt-4">
                                        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">Cost & Cooldown</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Energy Cost</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={abilityEnergyCost ?? ''}
                                                    onChange={(e) => setAbilityEnergyCost(e.target.value ? parseInt(e.target.value) : undefined)}
                                                    placeholder="10"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">HP Cost (Forbidden)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={abilityHealthCost ?? ''}
                                                    onChange={(e) => setAbilityHealthCost(e.target.value ? parseInt(e.target.value) : undefined)}
                                                    placeholder="0"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Cooldown (turns)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={abilityCooldown ?? ''}
                                                    onChange={(e) => setAbilityCooldown(e.target.value ? parseInt(e.target.value) : undefined)}
                                                    placeholder="3"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Uses Per Day</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={abilityUsesPerDay ?? ''}
                                                    onChange={(e) => setAbilityUsesPerDay(e.target.value ? parseInt(e.target.value) : undefined)}
                                                    placeholder="∞"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 bg-[#f8f9fa] p-3 rounded-xl border border-[#D4AF37]/10">
                                            <input type="checkbox" checked={abilityIsPassive} onChange={(e) => setAbilityIsPassive(e.target.checked)} className="h-4 w-4 accent-[#D4AF37]" />
                                            <label className="text-xs text-[#43485C]">Passive (always active, no cost)</label>
                                        </div>
                                    </div>

                                    {/* Effects */}
                                    <div className="border-t border-[#D4AF37]/10 pt-4">
                                        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">Effects</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Damage</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={abilityDamage ?? ''}
                                                    onChange={(e) => setAbilityDamage(e.target.value ? parseInt(e.target.value) : undefined)}
                                                    placeholder="50"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Damage Type</label>
                                                <input
                                                    type="text"
                                                    value={abilityDamageType}
                                                    onChange={(e) => setAbilityDamageType(e.target.value)}
                                                    placeholder="Fire"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Healing</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={abilityHealing ?? ''}
                                                    onChange={(e) => setAbilityHealing(e.target.value ? parseInt(e.target.value) : undefined)}
                                                    placeholder="30"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Status Effect</label>
                                                <input
                                                    type="text"
                                                    value={abilityStatusEffect}
                                                    onChange={(e) => setAbilityStatusEffect(e.target.value)}
                                                    placeholder="Burn"
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Targeting */}
                                    <div className="border-t border-[#D4AF37]/10 pt-4">
                                        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">Targeting</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Target</label>
                                                <select
                                                    value={abilityTargetType}
                                                    onChange={(e) => setAbilityTargetType(e.target.value)}
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                >
                                                    <option value="self">Self</option>
                                                    <option value="single">Single Target</option>
                                                    <option value="area">Area</option>
                                                    <option value="all_enemies">All Enemies</option>
                                                    <option value="all_allies">All Allies</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Range</label>
                                                <select
                                                    value={abilityRange}
                                                    onChange={(e) => setAbilityRange(e.target.value)}
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                >
                                                    <option value="self">Self</option>
                                                    <option value="melee">Melee</option>
                                                    <option value="short">Short</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="long">Long</option>
                                                    <option value="unlimited">Unlimited</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Cast Time</label>
                                                <select
                                                    value={abilityCastTime}
                                                    onChange={(e) => setAbilityCastTime(e.target.value)}
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                >
                                                    <option value="instant">Instant</option>
                                                    <option value="1 turn">1 Turn</option>
                                                    <option value="2 turns">2 Turns</option>
                                                    <option value="channeled">Channeled</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Flags */}
                                    <div className="border-t border-[#D4AF37]/10 pt-4">
                                        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">Properties</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2 bg-[#f8f9fa] p-3 rounded-xl border border-[#D4AF37]/10">
                                                <input type="checkbox" checked={abilityIsForbidden} onChange={(e) => setAbilityIsForbidden(e.target.checked)} className="h-4 w-4 accent-[#D4AF37]" />
                                                <label className="text-xs text-[#43485C]">Forbidden</label>
                                            </div>
                                            <div className="flex items-center gap-2 bg-[#f8f9fa] p-3 rounded-xl border border-[#D4AF37]/10">
                                                <input type="checkbox" checked={abilityCanUpgrade} onChange={(e) => setAbilityCanUpgrade(e.target.checked)} className="h-4 w-4 accent-[#D4AF37]" />
                                                <label className="text-xs text-[#43485C]">Can Upgrade</label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lore */}
                                    <div className="border-t border-[#D4AF37]/10 pt-4">
                                        <TextArea label="Lore/Background" value={abilityLore} onChange={(e: any) => setAbilityLore(e.target.value)} placeholder="The history of this technique..." />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !abilityName}
                                        className="w-full py-3 bg-[#D4AF37] hover:bg-[#c9a432] text-white font-bold rounded-full transition-all shadow-lg text-sm flex items-center justify-center gap-2 uppercase tracking-widest mt-4 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                        Create Ability
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* MONSTERS TAB */}
                    {activeTab === 'monsters' && (
                        <div className="space-y-8">
                            <div className="bg-white rounded-[2rem] border border-[#D4AF37]/20 p-8 shadow-lg">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#43485C]">
                                    <Skull className="text-red-400" />
                                    Create Monster
                                </h3>
                                <form onSubmit={handleCreateMonster} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <Input label="Name" value={monsterName} onChange={(e: any) => setMonsterName(e.target.value)} required />
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Location</label>
                                            <select
                                                value={monsterLocationId}
                                                onChange={(e) => setMonsterLocationId(e.target.value)}
                                                className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                                            >
                                                <option value="">No Location</option>
                                                {locations?.map((loc) => (
                                                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <TextArea label="Description" value={monsterDesc} onChange={(e: any) => setMonsterDesc(e.target.value)} required />
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <Input label="Health" type="number" value={monsterHealth} onChange={(e: any) => setMonsterHealth(Math.max(1, parseInt(e.target.value, 10) || 1))} min={1} required />
                                        <Input label="Damage" type="number" value={monsterDamage} onChange={(e: any) => setMonsterDamage(Math.max(1, parseInt(e.target.value, 10) || 1))} min={1} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Item Drops</label>
                                        <select
                                            multiple
                                            value={monsterDropIds}
                                            onChange={(e) => setMonsterDropIds(Array.from(e.target.selectedOptions, option => option.value as Id<"items">))}
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] transition-colors min-h-[100px]"
                                        >
                                            {items?.map((item) => (
                                                <option key={item._id} value={item._id}>{item.name} ({item.rarity})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-[#43485C] hover:bg-[#2d3142] text-white px-6 py-4 rounded-full font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg text-sm uppercase tracking-widest"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                            Create Monster
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* SHOPS TAB */}
                    {activeTab === 'shops' && (
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Shops List */}
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="text-xl font-bold text-[#43485C] mb-4 flex items-center gap-2">
                                    <Store className="text-[#D4AF37]" /> Shops ({campaignShops?.length || 0})
                                </h3>
                                {!campaignShops || campaignShops.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-[#D4AF37]/20 rounded-2xl bg-white/50">
                                        <Store className="mx-auto text-[#D4AF37]/50 mb-2" size={32} />
                                        <p className="text-[#43485C]/50 font-sans">No shops yet. Create your first shop!</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {campaignShops.map((shop) => (
                                            <div
                                                key={shop._id}
                                                className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all ${
                                                    selectedShopId === shop._id
                                                        ? 'border-[#D4AF37] shadow-lg'
                                                        : 'border-[#D4AF37]/10 hover:border-[#D4AF37]/30'
                                                }`}
                                                onClick={() => setSelectedShopId(shop._id)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-[#43485C] text-lg">{shop.name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">{shop.type}</span>
                                                            <span className="text-xs text-[#43485C]/50">{shop.locationName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-[#43485C]/50">{shop.inventory?.length || 0} items</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteShop(shop._id); }}
                                                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-400"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {shop.description && (
                                                    <p className="text-sm text-[#43485C]/60 mt-2 line-clamp-2 font-sans">{shop.description}</p>
                                                )}
                                                {shop.shopkeeperName && (
                                                    <p className="text-xs text-[#43485C]/50 mt-2">Shopkeeper: {shop.shopkeeperName}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Shop Inventory Editor */}
                                {selectedShopId && (
                                    <div className="bg-white border border-[#D4AF37]/20 rounded-2xl p-6 mt-6 shadow-lg">
                                        <h3 className="text-lg font-bold text-[#43485C] mb-4 border-b border-[#D4AF37]/10 pb-4">
                                            Edit Shop Inventory
                                        </h3>

                                        {/* Current Inventory */}
                                        <div className="mb-6">
                                            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">Current Items</h4>
                                            {(() => {
                                                const shop = campaignShops?.find(s => s._id === selectedShopId);
                                                if (!shop?.inventory || shop.inventory.length === 0) {
                                                    return <p className="text-sm text-[#43485C]/50 italic">No items in this shop yet.</p>;
                                                }
                                                return (
                                                    <div className="space-y-2">
                                                        {shop.inventory.map((invItem) => {
                                                            const item = items?.find(i => i._id === invItem.itemId);
                                                            if (!item) return null;
                                                            return (
                                                                <div key={invItem.itemId} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg">
                                                                    <div>
                                                                        <span className="font-medium text-[#43485C]">{item.name}</span>
                                                                        <span className="text-xs text-[#43485C]/50 ml-2">
                                                                            Stock: {invItem.stock === -1 ? 'Unlimited' : invItem.stock}
                                                                            {invItem.basePrice && ` | Price: ${invItem.basePrice}g`}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleRemoveItemFromShop(invItem.itemId)}
                                                                        className="p-1 hover:bg-red-100 rounded text-red-400"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Add Item Form */}
                                        <form onSubmit={handleAddItemToShop} className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Add Item</label>
                                                <select
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    value={shopItemId}
                                                    onChange={(e) => setShopItemId(e.target.value)}
                                                >
                                                    <option value="">Select an item...</option>
                                                    {items?.map(item => (
                                                        <option key={item._id} value={item._id}>{item.name} ({item.rarity})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Stock (-1 = Unlimited)</label>
                                                    <input
                                                        type="number"
                                                        value={shopItemStock}
                                                        onChange={(e) => setShopItemStock(parseInt(e.target.value) || -1)}
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Custom Price (optional)</label>
                                                    <input
                                                        type="number"
                                                        value={shopItemPrice || ''}
                                                        onChange={(e) => setShopItemPrice(e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="Auto"
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting || !shopItemId}
                                                className="w-full py-2 bg-[#D4AF37] hover:bg-[#c9a432] text-white rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                                            >
                                                <Plus size={16} className="inline mr-1" /> Add to Shop
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>

                            {/* Create Shop Form */}
                            <div className="bg-white border border-[#D4AF37]/20 rounded-2xl p-6 h-fit shadow-lg">
                                <h3 className="text-lg font-bold text-[#43485C] mb-6 border-b border-[#D4AF37]/10 pb-4">Create Shop</h3>
                                <form onSubmit={handleCreateShop} className="space-y-4">
                                    <Input label="Shop Name" placeholder="The Rusty Sword" value={shopName} onChange={(e: any) => setShopName(e.target.value)} required />

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Shop Type</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                            value={shopType}
                                            onChange={(e) => setShopType(e.target.value)}
                                        >
                                            <option value="general">General Store</option>
                                            <option value="blacksmith">Blacksmith</option>
                                            <option value="potion">Potion Shop</option>
                                            <option value="magic">Magic Shop</option>
                                            <option value="armor">Armorer</option>
                                            <option value="jeweler">Jeweler</option>
                                            <option value="tailor">Tailor</option>
                                            <option value="provisioner">Provisioner</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Location *</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                            value={shopLocationId}
                                            onChange={(e) => setShopLocationId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select a location...</option>
                                            {locations?.map(loc => (
                                                <option key={loc._id} value={loc._id}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Shopkeeper (optional)</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                            value={shopkeeperId}
                                            onChange={(e) => setShopkeeperId(e.target.value)}
                                        >
                                            <option value="">No Shopkeeper (Self-service)</option>
                                            {npcs?.map(npc => (
                                                <option key={npc._id} value={npc._id}>{npc.name} ({npc.role})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <TextArea label="Description" placeholder="A dusty shop filled with weapons..." value={shopDesc} onChange={(e: any) => setShopDesc(e.target.value)} required />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Price Modifier</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.1"
                                                max="3"
                                                value={shopPriceModifier}
                                                onChange={(e) => setShopPriceModifier(parseFloat(e.target.value) || 1)}
                                                className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                            />
                                            <p className="text-[10px] text-[#43485C]/50 ml-1">1.0 = normal, 1.5 = expensive</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Buyback Modifier</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="1"
                                                max="3"
                                                value={shopBuybackModifier}
                                                onChange={(e) => setShopBuybackModifier(parseFloat(e.target.value) || 1.2)}
                                                className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                            />
                                            <p className="text-[10px] text-[#43485C]/50 ml-1">Price to buy back sold items</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Buyback Duration (minutes)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={shopBuybackDuration || ''}
                                            onChange={(e) => setShopBuybackDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                                            placeholder="Leave empty for no expiry"
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 bg-[#f8f9fa] p-4 rounded-xl border border-[#D4AF37]/10">
                                        <input
                                            type="checkbox"
                                            checked={shopAiManaged}
                                            onChange={(e) => setShopAiManaged(e.target.checked)}
                                            className="h-4 w-4 accent-[#D4AF37]"
                                        />
                                        <label className="text-sm text-[#43485C]">AI Managed (AI can modify inventory)</label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !shopLocationId}
                                        className="w-full py-3 bg-[#D4AF37] hover:bg-[#c9a432] text-white font-bold rounded-full transition-all shadow-lg text-sm flex items-center justify-center gap-2 uppercase tracking-widest mt-4 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                        Create Shop
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* CONDITIONS TAB */}
                    {activeTab === 'conditions' && (
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Conditions List */}
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="text-xl font-bold text-[#43485C] mb-4 flex items-center gap-2">
                                    <GitBranch className="text-[#D4AF37]" /> Conditional Logic ({campaignConditions?.length || 0})
                                </h3>
                                <p className="text-sm text-[#43485C]/60 font-sans mb-4">
                                    Create if-else rules that control game logic. For example: &quot;IF player is from Hidden Leaf village THEN block entry to Sand Village ANBU HQ&quot;.
                                </p>
                                {!campaignConditions || campaignConditions.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-[#D4AF37]/20 rounded-2xl bg-white/50">
                                        <GitBranch className="mx-auto text-[#D4AF37]/50 mb-2" size={32} />
                                        <p className="text-[#43485C]/50 font-sans">No conditions yet. Create your first rule!</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {campaignConditions.map((condition) => {
                                            let rulesDisplay = "";
                                            try {
                                                const rules = JSON.parse(condition.rules);
                                                rulesDisplay = JSON.stringify(rules, null, 0).substring(0, 60) + "...";
                                            } catch { rulesDisplay = condition.rules.substring(0, 60) + "..."; }

                                            let actionsDisplay = "";
                                            try {
                                                const actions = JSON.parse(condition.thenActions);
                                                if (Array.isArray(actions) && actions.length > 0) {
                                                    actionsDisplay = actions.map((a: { type: string }) => a.type).join(", ");
                                                }
                                            } catch { actionsDisplay = "Custom"; }

                                            return (
                                                <div
                                                    key={condition._id}
                                                    className={`bg-white border rounded-2xl p-5 transition-all ${
                                                        condition.isActive
                                                            ? 'border-[#D4AF37]/30 hover:border-[#D4AF37]/50'
                                                            : 'border-gray-200 opacity-60'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-[#43485C] text-lg">{condition.name}</h4>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                                    condition.isActive
                                                                        ? 'bg-emerald-100 text-emerald-600'
                                                                        : 'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                    {condition.isActive ? 'Active' : 'Disabled'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">
                                                                    {condition.trigger.replace(/_/g, ' ')}
                                                                </span>
                                                                {condition.executeOnce && (
                                                                    <span className="text-xs uppercase tracking-wider text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                                                        Once Only
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleToggleCondition(condition._id)}
                                                                className={`p-1.5 rounded-lg transition-colors ${
                                                                    condition.isActive
                                                                        ? 'hover:bg-amber-100 text-amber-500'
                                                                        : 'hover:bg-emerald-100 text-emerald-500'
                                                                }`}
                                                                title={condition.isActive ? 'Disable' : 'Enable'}
                                                            >
                                                                {condition.isActive ? <Pause size={14} /> : <Play size={14} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCondition(condition._id)}
                                                                className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-400"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {condition.description && (
                                                        <p className="text-sm text-[#43485C]/60 mt-2 line-clamp-2 font-sans">{condition.description}</p>
                                                    )}
                                                    <div className="mt-3 pt-3 border-t border-[#D4AF37]/10 grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mb-1">IF (Condition)</p>
                                                            <p className="text-xs text-[#43485C]/70 font-mono bg-[#f8f9fa] p-2 rounded">{rulesDisplay}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mb-1">THEN (Actions)</p>
                                                            <p className="text-xs text-[#43485C]/70 bg-[#f8f9fa] p-2 rounded">{actionsDisplay}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Create Condition Form */}
                            <div className="bg-white border border-[#D4AF37]/20 rounded-2xl p-6 h-fit shadow-lg">
                                <h3 className="text-lg font-bold text-[#43485C] mb-6 border-b border-[#D4AF37]/10 pb-4">Create Condition</h3>
                                <form onSubmit={handleCreateCondition} className="space-y-4">
                                    <Input label="Rule Name" placeholder="Block Hidden Leaf from Sand HQ" value={conditionName} onChange={(e: any) => setConditionName(e.target.value)} required />
                                    <Input label="Description" placeholder="Prevents Hidden Leaf ninja from entering..." value={conditionDesc} onChange={(e: any) => setConditionDesc(e.target.value)} />

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Trigger (When to Check)</label>
                                        <select
                                            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                            value={conditionTrigger}
                                            onChange={(e) => setConditionTrigger(e.target.value)}
                                        >
                                            <option value="on_enter_location">On Enter Location</option>
                                            <option value="on_exit_location">On Exit Location</option>
                                            <option value="on_npc_interact">On NPC Interaction</option>
                                            <option value="on_level_up">On Level Up</option>
                                            <option value="on_quest_update">On Quest Update</option>
                                            <option value="on_combat_start">On Combat Start</option>
                                            <option value="on_item_use">On Item Use</option>
                                            <option value="on_game_start">On Game Start</option>
                                            <option value="always">Always (Every Turn)</option>
                                        </select>
                                    </div>

                                    {(conditionTrigger === 'on_enter_location' || conditionTrigger === 'on_exit_location') && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Specific Location (Optional)</label>
                                            <select
                                                className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                value={conditionTriggerContext}
                                                onChange={(e) => setConditionTriggerContext(e.target.value)}
                                            >
                                                <option value="">Any Location</option>
                                                {locations?.map(loc => (
                                                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {conditionTrigger === 'on_npc_interact' && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Specific NPC (Optional)</label>
                                            <select
                                                className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                value={conditionTriggerContext}
                                                onChange={(e) => setConditionTriggerContext(e.target.value)}
                                            >
                                                <option value="">Any NPC</option>
                                                {npcs?.map(npc => (
                                                    <option key={npc._id} value={npc._id}>{npc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="border-t border-[#D4AF37]/10 pt-4">
                                        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">IF (Condition)</p>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Check Type</label>
                                                <select
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    value={conditionType}
                                                    onChange={(e) => setConditionType(e.target.value as any)}
                                                >
                                                    <optgroup label="Player Stats">
                                                        <option value="level">Player Level</option>
                                                        <option value="stat">Player Stat (Strength, etc.)</option>
                                                        <option value="gold">Player Gold</option>
                                                    </optgroup>
                                                    <optgroup label="Inventory & Abilities">
                                                        <option value="has_item">Has Item</option>
                                                        <option value="not_has_item">Does NOT Have Item</option>
                                                        <option value="has_ability">Has Ability/Spell</option>
                                                    </optgroup>
                                                    <optgroup label="World & Faction">
                                                        <option value="faction">Player Faction Is</option>
                                                        <option value="at_location">Player Is At Location</option>
                                                        <option value="npc_alive">NPC Is Alive</option>
                                                        <option value="npc_dead">NPC Is Dead</option>
                                                    </optgroup>
                                                    <optgroup label="Quests & Progress">
                                                        <option value="quest">Quest Completed</option>
                                                        <option value="quest_active">Quest Is Active</option>
                                                        <option value="flag">Custom Flag Is Set</option>
                                                    </optgroup>
                                                    <optgroup label="Advanced">
                                                        <option value="custom">Custom JSON (Advanced)</option>
                                                    </optgroup>
                                                </select>
                                            </div>

                                            {/* Level check */}
                                            {conditionType === 'level' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select
                                                        className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={conditionOperator}
                                                        onChange={(e) => setConditionOperator(e.target.value as any)}
                                                    >
                                                        <option value="gte">≥ (at least)</option>
                                                        <option value="lte">≤ (at most)</option>
                                                        <option value="eq">= (exactly)</option>
                                                        <option value="gt">&gt; (greater than)</option>
                                                        <option value="lt">&lt; (less than)</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={conditionValueNum}
                                                        onChange={(e) => setConditionValueNum(parseInt(e.target.value) || 1)}
                                                        className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        placeholder="Level"
                                                    />
                                                </div>
                                            )}

                                            {/* Stat check */}
                                            {conditionType === 'stat' && (
                                                <div className="space-y-2">
                                                    <select
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={conditionStat}
                                                        onChange={(e) => setConditionStat(e.target.value)}
                                                    >
                                                        <option value="strength">Strength</option>
                                                        <option value="dexterity">Dexterity</option>
                                                        <option value="constitution">Constitution</option>
                                                        <option value="intelligence">Intelligence</option>
                                                        <option value="wisdom">Wisdom</option>
                                                        <option value="charisma">Charisma</option>
                                                        <option value="ninjutsu">Ninjutsu</option>
                                                        <option value="taijutsu">Taijutsu</option>
                                                        <option value="genjutsu">Genjutsu</option>
                                                    </select>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                            value={conditionOperator}
                                                            onChange={(e) => setConditionOperator(e.target.value as any)}
                                                        >
                                                            <option value="gte">≥ (at least)</option>
                                                            <option value="lte">≤ (at most)</option>
                                                            <option value="eq">= (exactly)</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={conditionValueNum}
                                                            onChange={(e) => setConditionValueNum(parseInt(e.target.value) || 1)}
                                                            className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                            placeholder="Value"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Gold check */}
                                            {conditionType === 'gold' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select
                                                        className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={conditionOperator}
                                                        onChange={(e) => setConditionOperator(e.target.value as any)}
                                                    >
                                                        <option value="gte">≥ (at least)</option>
                                                        <option value="lte">≤ (at most)</option>
                                                        <option value="eq">= (exactly)</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={conditionValueNum}
                                                        onChange={(e) => setConditionValueNum(parseInt(e.target.value) || 0)}
                                                        className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        placeholder="Gold amount"
                                                    />
                                                </div>
                                            )}

                                            {/* Faction check - dropdown */}
                                            {conditionType === 'faction' && (
                                                <select
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    value={conditionValue}
                                                    onChange={(e) => setConditionValue(e.target.value)}
                                                >
                                                    <option value="">Select a faction...</option>
                                                    {factions?.map((f: any) => (
                                                        <option key={f._id} value={f.name}>{f.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {/* Item checks - dropdown */}
                                            {(conditionType === 'has_item' || conditionType === 'not_has_item') && (
                                                <div className="space-y-1">
                                                    <select
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={conditionValue}
                                                        onChange={(e) => setConditionValue(e.target.value)}
                                                    >
                                                        <option value="">Select an item...</option>
                                                        {items?.map((item: any) => (
                                                            <option key={item._id} value={item.name}>{item.name} ({item.rarity})</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">
                                                        {conditionType === 'has_item' ? 'Player must have this item' : 'Player must NOT have this item'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Ability check - dropdown */}
                                            {conditionType === 'has_ability' && (
                                                <select
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    value={conditionValue}
                                                    onChange={(e) => setConditionValue(e.target.value)}
                                                >
                                                    <option value="">Select an ability...</option>
                                                    {spells?.map((spell: any) => (
                                                        <option key={spell._id} value={spell.name}>{spell.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {/* Location check - dropdown */}
                                            {conditionType === 'at_location' && (
                                                <select
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    value={conditionValue}
                                                    onChange={(e) => setConditionValue(e.target.value)}
                                                >
                                                    <option value="">Select a location...</option>
                                                    {locations?.map((loc: any) => (
                                                        <option key={loc._id} value={loc._id}>{loc.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {/* NPC checks - dropdown */}
                                            {(conditionType === 'npc_alive' || conditionType === 'npc_dead') && (
                                                <div className="space-y-1">
                                                    <select
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={conditionValue}
                                                        onChange={(e) => setConditionValue(e.target.value)}
                                                    >
                                                        <option value="">Select an NPC...</option>
                                                        {npcs?.map((npc: any) => (
                                                            <option key={npc._id} value={npc._id}>{npc.name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">
                                                        {conditionType === 'npc_alive' ? 'NPC must be alive' : 'NPC must be dead'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Quest checks - dropdown */}
                                            {(conditionType === 'quest' || conditionType === 'quest_active') && (
                                                <div className="space-y-1">
                                                    <select
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={conditionValue}
                                                        onChange={(e) => setConditionValue(e.target.value)}
                                                    >
                                                        <option value="">Select a quest...</option>
                                                        {quests?.map((q: any) => (
                                                            <option key={q._id} value={q.title}>{q.title}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">
                                                        {conditionType === 'quest' ? 'Quest must be completed' : 'Quest must be active (in progress)'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Flag check */}
                                            {conditionType === 'flag' && (
                                                <div className="space-y-1">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., discovered_secret_cave, talked_to_elder"
                                                        value={conditionValue}
                                                        onChange={(e) => setConditionValue(e.target.value)}
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    />
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">Custom flags you set via other conditions</p>
                                                </div>
                                            )}

                                            {/* Custom JSON */}
                                            {conditionType === 'custom' && (
                                                <div className="space-y-1">
                                                    <textarea
                                                        placeholder='{"and": [{"gte": ["player.level", 10]}, {"has_item": "Magic Key"}]}'
                                                        value={conditionValue}
                                                        onChange={(e) => setConditionValue(e.target.value)}
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm font-mono min-h-[80px]"
                                                    />
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">Advanced: Use JSON for complex conditions with AND/OR logic</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-[#D4AF37]/10 pt-4">
                                        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">THEN (Action)</p>

                                        <div className="space-y-3">
                                            <select
                                                className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                value={actionType}
                                                onChange={(e) => setActionType(e.target.value as any)}
                                            >
                                                <optgroup label="Access Control">
                                                    <option value="block_entry">Block Entry (Prevent Access)</option>
                                                    <option value="teleport">Teleport Player</option>
                                                </optgroup>
                                                <optgroup label="Messaging">
                                                    <option value="show_message">Show Message</option>
                                                </optgroup>
                                                <optgroup label="Items">
                                                    <option value="give_item">Give Item</option>
                                                    <option value="remove_item">Remove Item (Consume/Destroy)</option>
                                                </optgroup>
                                                <optgroup label="Abilities">
                                                    <option value="grant_ability">Grant Ability/Spell</option>
                                                    <option value="remove_ability">Remove Ability/Spell</option>
                                                </optgroup>
                                                <optgroup label="Player Stats">
                                                    <option value="modify_hp">Modify HP</option>
                                                    <option value="modify_gold">Modify Gold</option>
                                                    <option value="add_xp">Add XP</option>
                                                </optgroup>
                                                <optgroup label="World">
                                                    <option value="modify_reputation">Modify Faction Reputation</option>
                                                    <option value="spawn_npc">Spawn NPC</option>
                                                    <option value="kill_npc">Kill NPC</option>
                                                </optgroup>
                                                <optgroup label="Progress Tracking">
                                                    <option value="set_flag">Set Custom Flag</option>
                                                    <option value="clear_flag">Clear Custom Flag</option>
                                                </optgroup>
                                            </select>

                                            {/* Block Entry / Show Message */}
                                            {(actionType === 'block_entry' || actionType === 'show_message') && (
                                                <div className="space-y-1">
                                                    <textarea
                                                        placeholder="The guards eye you suspiciously. 'Leaf ninja are not welcome here.'"
                                                        value={actionMessage}
                                                        onChange={(e) => setActionMessage(e.target.value)}
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm min-h-[60px]"
                                                    />
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">
                                                        {actionType === 'block_entry' ? 'Message shown when player is blocked' : 'Message shown to player'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Grant/Remove Ability */}
                                            {(actionType === 'grant_ability' || actionType === 'remove_ability') && (
                                                <div className="space-y-1">
                                                    <select
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={actionTarget}
                                                        onChange={(e) => setActionTarget(e.target.value)}
                                                    >
                                                        <option value="">Select ability...</option>
                                                        {spells?.map((spell: any) => (
                                                            <option key={spell._id} value={spell.name}>{spell.name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">
                                                        {actionType === 'grant_ability' ? 'Player will learn this ability' : 'Player will lose this ability'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Give/Remove Item */}
                                            {(actionType === 'give_item' || actionType === 'remove_item') && (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <select
                                                            className="col-span-2 bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                            value={actionTarget}
                                                            onChange={(e) => setActionTarget(e.target.value)}
                                                        >
                                                            <option value="">Select item...</option>
                                                            {items?.map((item: any) => (
                                                                <option key={item._id} value={item.name}>{item.name} ({item.rarity})</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            placeholder="Qty"
                                                            value={actionAmount || 1}
                                                            onChange={(e) => setActionAmount(parseInt(e.target.value) || 1)}
                                                            className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">
                                                        {actionType === 'give_item'
                                                            ? 'Add this item to player inventory'
                                                            : 'Remove/consume this item (e.g., one-time pass)'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Set/Clear Flag */}
                                            {(actionType === 'set_flag' || actionType === 'clear_flag') && (
                                                <div className="space-y-1">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., entered_secret_area, used_village_pass"
                                                        value={actionTarget}
                                                        onChange={(e) => setActionTarget(e.target.value)}
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    />
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">
                                                        {actionType === 'set_flag'
                                                            ? 'Set this flag to true (use in other conditions)'
                                                            : 'Remove this flag (reset progress)'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Modify Reputation */}
                                            {actionType === 'modify_reputation' && (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                            value={actionTarget}
                                                            onChange={(e) => setActionTarget(e.target.value)}
                                                        >
                                                            <option value="">Select faction...</option>
                                                            {factions?.map((f: any) => (
                                                                <option key={f._id} value={f.name}>{f.name}</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="number"
                                                            placeholder="+10 or -10"
                                                            value={actionAmount || ''}
                                                            onChange={(e) => setActionAmount(parseInt(e.target.value) || 0)}
                                                            className="bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">Positive = increase reputation, Negative = decrease</p>
                                                </div>
                                            )}

                                            {/* Modify HP */}
                                            {actionType === 'modify_hp' && (
                                                <div className="space-y-1">
                                                    <input
                                                        type="number"
                                                        placeholder="+20 (heal) or -10 (damage)"
                                                        value={actionAmount || ''}
                                                        onChange={(e) => setActionAmount(parseInt(e.target.value) || 0)}
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    />
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">Positive = heal, Negative = damage</p>
                                                </div>
                                            )}

                                            {/* Modify Gold */}
                                            {actionType === 'modify_gold' && (
                                                <div className="space-y-1">
                                                    <input
                                                        type="number"
                                                        placeholder="+100 (give) or -50 (take)"
                                                        value={actionAmount || ''}
                                                        onChange={(e) => setActionAmount(parseInt(e.target.value) || 0)}
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    />
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">Positive = give gold, Negative = take gold</p>
                                                </div>
                                            )}

                                            {/* Add XP */}
                                            {actionType === 'add_xp' && (
                                                <div className="space-y-1">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        placeholder="100"
                                                        value={actionAmount || ''}
                                                        onChange={(e) => setActionAmount(parseInt(e.target.value) || 0)}
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                    />
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">XP to award the player</p>
                                                </div>
                                            )}

                                            {/* Teleport */}
                                            {actionType === 'teleport' && (
                                                <div className="space-y-1">
                                                    <select
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={actionTarget}
                                                        onChange={(e) => setActionTarget(e.target.value)}
                                                    >
                                                        <option value="">Select destination...</option>
                                                        {locations?.map((loc: any) => (
                                                            <option key={loc._id} value={loc._id}>{loc.name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">Instantly move player to this location</p>
                                                </div>
                                            )}

                                            {/* Spawn/Kill NPC */}
                                            {(actionType === 'spawn_npc' || actionType === 'kill_npc') && (
                                                <div className="space-y-1">
                                                    <select
                                                        className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                        value={actionTarget}
                                                        onChange={(e) => setActionTarget(e.target.value)}
                                                    >
                                                        <option value="">Select NPC...</option>
                                                        {npcs?.map((npc: any) => (
                                                            <option key={npc._id} value={npc._id}>{npc.name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-[#43485C]/50 ml-1">
                                                        {actionType === 'spawn_npc'
                                                            ? 'Spawn this NPC at their default location'
                                                            : 'Kill this NPC (mark as dead)'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-[#D4AF37]/10 pt-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-[#43485C]/60 ml-1">Priority (higher = first)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={conditionPriority}
                                                    onChange={(e) => setConditionPriority(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-3 text-[#43485C] text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 bg-[#f8f9fa] p-3 rounded-xl border border-[#D4AF37]/10">
                                                <input
                                                    type="checkbox"
                                                    checked={conditionExecuteOnce}
                                                    onChange={(e) => setConditionExecuteOnce(e.target.checked)}
                                                    className="h-4 w-4 accent-[#D4AF37]"
                                                />
                                                <label className="text-xs text-[#43485C]">Execute Once Per Player</label>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !conditionName}
                                        className="w-full py-3 bg-[#D4AF37] hover:bg-[#c9a432] text-white font-bold rounded-full transition-all shadow-lg text-sm flex items-center justify-center gap-2 uppercase tracking-widest mt-4 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                        Create Condition
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'players' && (
                        <div className="text-center py-20 bg-white rounded-[2rem] border border-[#D4AF37]/20 shadow-sm">
                            <Users className="mx-auto text-[#D4AF37]/50 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-[#43485C]">Player Management</h3>
                            <p className="text-[#43485C]/50 max-w-md mx-auto mt-2 font-sans">
                                Invite players to your campaign and manage their starter inventories here.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div >
    );
}

// --- UI Components ---
const Input = ({ label, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">{label}</label>
        <input
            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 transition-all placeholder:text-[#43485C]/30 shadow-inner font-sans"
            {...props}
        />
    </div>
);

const TextArea = ({ label, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">{label}</label>
        <textarea
            className="w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 transition-all min-h-[100px] placeholder:text-[#43485C]/30 shadow-inner font-sans"
            {...props}
        />
    </div>
);