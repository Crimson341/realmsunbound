/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Map, Users, Scroll, Zap, Settings, Plus, Save, ArrowLeft, Loader2, Link as LinkIcon, Package, Skull, Palette, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { MentionTextArea } from '@/components/MentionTextArea';

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

    const [activeTab, setActiveTab] = useState<'overview' | 'realm' | 'npcs' | 'events' | 'quests' | 'items' | 'spells' | 'monsters' | 'players'>('overview');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [locName, setLocName] = useState("");
    const [locType, setLocType] = useState("Town");
    const [locEnvironment, setLocEnvironment] = useState("");
    const [locDesc, setLocDesc] = useState("");

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
    const [questRewardItemIds, setQuestRewardItemIds] = useState<Id<"items">[]>([]);

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
        "Custom": "#ffffff"
    });

    // Spell State
    const [spellName, setSpellName] = useState("");
    const [spellSchool, setSpellSchool] = useState("");
    const [spellLevel, setSpellLevel] = useState(0);
    const [spellCastingTime, setSpellCastingTime] = useState("");
    const [spellRange, setSpellRange] = useState("");
    const [spellComponents, setSpellComponents] = useState("");
    const [spellDuration, setSpellDuration] = useState("");
    const [spellSave, setSpellSave] = useState("");
    const [spellConcentration, setSpellConcentration] = useState(false);
    const [spellRitual, setSpellRitual] = useState(false);
    const [spellTags, setSpellTags] = useState("");
    const [spellDamageDice, setSpellDamageDice] = useState("");
    const [spellDamageType, setSpellDamageType] = useState("");
    const [spellAreaShape, setSpellAreaShape] = useState("");
    const [spellAreaSize, setSpellAreaSize] = useState("");
    const [spellHigherLevels, setSpellHigherLevels] = useState("");
    const [spellEffectId, setSpellEffectId] = useState("");
    const [spellDescription, setSpellDescription] = useState("");
    const [spellNotes, setSpellNotes] = useState("");
    const [spellFilterTag, setSpellFilterTag] = useState("");
    const [spellFilterConc, setSpellFilterConc] = useState(false);
    const [spellFilterRitual, setSpellFilterRitual] = useState(false);

    // Monster State
    const [monsterName, setMonsterName] = useState("");
    const [monsterLocationId, setMonsterLocationId] = useState("");
    const [monsterDesc, setMonsterDesc] = useState("");
    const [monsterHealth, setMonsterHealth] = useState(10);
    const [monsterDamage, setMonsterDamage] = useState(1);
    const [monsterDropIds, setMonsterDropIds] = useState<Id<"items">[]>([]);


    // Derived Data
    const { campaign, locations, npcs, items, spells, monsters } = data || {};

    // Suggestions for MentionTextArea
    const mentionSuggestions = [
        ...(items?.map(i => ({ id: i._id, name: i.name, type: 'Item' as const })) || []),
        ...(npcs?.map(n => ({ id: n._id, name: n.name, type: 'NPC' as const })) || []),
        ...(locations?.map(l => ({ id: l._id, name: l.name, type: 'Location' as const })) || []),
    ];

    // --- HANDLERS ---

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
                status: "Active",
                locationId: questLocationId ? (questLocationId as Id<"locations">) : undefined,
                npcId: questNpcId ? (questNpcId as Id<"npcs">) : undefined,
                rewardItemIds: questRewardItemIds.length > 0 ? questRewardItemIds : undefined,
            });
            setQuestTitle(""); setQuestDesc(""); setQuestLocationId(""); setQuestNpcId(""); setQuestRewardItemIds([]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveRarityColors = async () => {
        setIsSubmitting(true);
        try {
            await updateRarityColors({ campaignId, rarityColors: rarityColors });
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
                effects: effectMode === 'custom' ? itemEffects : undefined,
                effectId: effectMode === 'library' && itemEffectId ? (itemEffectId as Id<"effects">) : undefined,
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
                name: spellName,
                school: spellSchool,
                level: spellLevel,
                castingTime: spellCastingTime,
                range: spellRange,
                components: spellComponents,
                duration: spellDuration,
                save: spellSave,
                concentration: spellConcentration,
                ritual: spellRitual,
                tags: spellTags.split(',').map(t => t.trim()).filter(Boolean),
                damageDice: spellDamageDice,
                damageType: spellDamageType,
                areaShape: spellAreaShape,
                areaSize: spellAreaSize,
                higherLevels: spellHigherLevels,
                effectId: spellEffectId ? (spellEffectId as Id<"effects">) : undefined,
                description: spellDescription,
                notes: spellNotes,
            });
            setSpellName(""); setSpellDescription("");
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

    if (!data) return (
        <div className="h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 text-stone-400">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <span className="text-xs uppercase tracking-[0.3em] font-medium">Loading Forge...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0c0a09] text-stone-300 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
            
            {/* Header */}
            <header className="border-b border-stone-800 bg-[#12100e]/90 backdrop-blur sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/forge" className="text-stone-500 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-serif font-bold text-stone-100">{campaign?.title}</h1>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {['overview', 'realm', 'npcs', 'events', 'quests', 'items', 'spells', 'monsters', 'players'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                                    activeTab === tab 
                                    ? 'bg-stone-100 text-stone-900' 
                                    : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="space-y-8">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-8">
                                <h2 className="text-2xl font-serif font-bold text-white mb-4">Campaign Overview</h2>
                                <p className="text-stone-400 leading-relaxed max-w-3xl">{campaign?.description}</p>
                                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-stone-800/50 rounded-lg border border-stone-700">
                                        <div className="text-2xl font-bold text-white mb-1">{locations?.length || 0}</div>
                                        <div className="text-xs text-stone-500 uppercase tracking-wider">Locations</div>
                                    </div>
                                    <div className="p-4 bg-stone-800/50 rounded-lg border border-stone-700">
                                        <div className="text-2xl font-bold text-white mb-1">{npcs?.length || 0}</div>
                                        <div className="text-xs text-stone-500 uppercase tracking-wider">NPCs</div>
                                    </div>
                                    <div className="p-4 bg-stone-800/50 rounded-lg border border-stone-700">
                                        <div className="text-2xl font-bold text-white mb-1">{items?.length || 0}</div>
                                        <div className="text-xs text-stone-500 uppercase tracking-wider">Items</div>
                                    </div>
                                    <div className="p-4 bg-stone-800/50 rounded-lg border border-stone-700">
                                        <div className="text-2xl font-bold text-white mb-1">{monsters?.length || 0}</div>
                                        <div className="text-xs text-stone-500 uppercase tracking-wider">Monsters</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* QUESTS TAB (Restored from snippet) */}
                    {activeTab === 'quests' && (
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Quest List - Placeholder as I don't have the list implementation in snippet but I can guess */}
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="text-xl font-bold text-white mb-4">Quests</h3>
                                <div className="text-stone-500 text-sm italic">
                                    Quest list visualization would go here.
                                </div>
                            </div>

                            {/* Create Quest Form */}
                            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 h-fit">
                                <h3 className="text-lg font-bold text-white mb-4">Add Quest</h3>
                                <form onSubmit={handleCreateQuest} className="space-y-4">
                                    <Input label="Title" placeholder="Retrieve the Ancient Relic" value={questTitle} onChange={(e: any) => setQuestTitle(e.target.value)} required />

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Quest Giver (NPC)</label>
                                        <select
                                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
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
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Location (Hub)</label>
                                        <select
                                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
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
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Reward Items (Hold Ctrl/Cmd)</label>
                                        <select
                                            multiple
                                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors min-h-[80px]"
                                            value={questRewardItemIds}
                                            onChange={(e) => setQuestRewardItemIds(Array.from(e.target.selectedOptions, option => option.value as Id<"items">))}
                                        >
                                            {items?.map(item => (
                                                <option key={item._id} value={item._id}>{item.name} ({item.rarity})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <MentionTextArea 
                                        label="Description" 
                                        placeholder="Find the relic hidden in the deep caves... (Type @ to mention)" 
                                        value={questDesc} 
                                        onChange={(e: any) => setQuestDesc(e.target.value)} 
                                        suggestions={mentionSuggestions}
                                        required 
                                    />

                                    <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded transition-colors text-sm flex items-center justify-center gap-2">
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
                                <h3 className="text-xl font-bold text-white mb-4">NPCs</h3>
                                {npcs?.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-stone-800 rounded-xl">
                                        <Users className="mx-auto text-stone-600 mb-2" size={32} />
                                        <p className="text-stone-500">No NPCs populated yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {npcs?.map((npc) => (
                                            <div key={npc._id} className="bg-stone-900 border border-stone-800 p-4 rounded-lg hover:border-indigo-500/50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-white">{npc.name}</h4>
                                                    <span className={`text-xs px-2 py-1 rounded ${npc.attitude === 'Hostile' ? 'bg-red-900/30 text-red-400' :
                                                        npc.attitude === 'Friendly' ? 'bg-emerald-900/30 text-emerald-400' :
                                                            'bg-stone-800 text-stone-400'
                                                        }`}>{npc.attitude}</span>
                                                </div>
                                                <p className="text-xs text-indigo-400 font-bold mb-2">{npc.role}</p>
                                                <p className="text-xs text-stone-500 line-clamp-2">{npc.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Create NPC Form */}
                            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 h-fit">
                                <h3 className="text-lg font-bold text-white mb-4">Add NPC</h3>
                                <form onSubmit={handleCreateNPC} className="space-y-4">
                                    <Input label="Name" placeholder="Garrick the Guard" value={npcName} onChange={(e: any) => setNpcName(e.target.value)} required />
                                    <Input label="Role" placeholder="Gatekeeper" value={npcRole} onChange={(e: any) => setNpcRole(e.target.value)} required />
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Attitude</label>
                                        <select
                                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                            value={npcAttitude}
                                            onChange={(e) => setNpcAttitude(e.target.value)}
                                        >
                                            <option value="Neutral">Neutral</option>
                                            <option value="Friendly">Friendly</option>
                                            <option value="Hostile">Hostile</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Current Location</label>
                                        <select
                                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
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
                                    <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded transition-colors text-sm flex items-center justify-center gap-2">
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
                            <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Palette className="text-indigo-400" />
                                        <h3 className="text-xl font-bold">Rarity Colors</h3>
                                    </div>
                                    <button
                                        onClick={handleSaveRarityColors}
                                        disabled={isSubmitting}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Save Colors
                                    </button>
                                </div>
                                <div className="grid md:grid-cols-5 gap-4">
                                    {Object.entries(rarityColors).map(([rarity, color]) => (
                                        <div key={rarity} className="space-y-2">
                                            <label className="text-sm font-medium text-stone-300">{rarity}</label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="color"
                                                    value={color}
                                                    onChange={(e) => setRarityColors({ ...rarityColors, [rarity]: e.target.value })}
                                                    className="w-12 h-12 rounded border border-stone-700 cursor-pointer"
                                                />
                                                <div className="flex-1 bg-stone-800 rounded px-3 py-2">
                                                    <span style={{ color }}>{color}</span>
                                                </div>
                                            </div>
                                            <div className="text-sm" style={{ color }}>Preview Text</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Create Item Form */}
                            <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-6">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Package className="text-emerald-400" />
                                    Forge Item
                                </h3>
                                <form onSubmit={handleCreateItem} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Input label="Name" value={itemName} onChange={(e: any) => setItemName(e.target.value)} required />
                                        <Input label="Type" value={itemType} onChange={(e: any) => setItemType(e.target.value)} required />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Rarity</label>
                                            <select
                                                className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
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
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Linked Spell (optional)</label>
                                            <select
                                                className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                                value={itemSpellId}
                                                onChange={(e) => setItemSpellId(e.target.value)}
                                            >
                                                <option value="">None</option>
                                                {spells?.map((spell) => (
                                                    <option key={spell._id} value={spell._id}>{spell.name} (Lvl {spell.level})</option>
                                                ))}
                                            </select>
                                            {itemSpellId && (
                                                <p className="text-[11px] text-stone-500">This item is associated with the selected spell.</p>
                                            )}
                                        </div>
                                        <div />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Effects</label>
                                            <div className="flex gap-2 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setEffectMode('library')}
                                                    className={`px-3 py-1 rounded border ${effectMode === 'library' ? 'border-emerald-500 text-emerald-400' : 'border-stone-700 text-stone-400'}`}
                                                >
                                                    Use Library
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEffectMode('custom')}
                                                    className={`px-3 py-1 rounded border ${effectMode === 'custom' ? 'border-indigo-500 text-indigo-300' : 'border-stone-700 text-stone-400'}`}
                                                >
                                                    Custom
                                                </button>
                                            </div>
                                            {effectMode === 'library' ? (
                                                <div className="space-y-2">
                                                    <select
                                                        className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
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
                                                        <div className="text-xs text-stone-300 bg-stone-800/60 border border-stone-700 rounded p-2">
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
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <TextArea label="Requirements / Attunement" value={itemRequirements} onChange={(e: any) => setItemRequirements(e.target.value)} placeholder="Requires attunement by a fighter of level 5+" />
                                        <TextArea label="Lore & Notes" value={itemLore} onChange={(e: any) => setItemLore(e.target.value)} placeholder="Crafted for the marsh sentinels" />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                        Create Item
                                    </button>
                                </form>
                            </div>

                            {/* Items List */}
                            <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-6">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Package className="text-yellow-400" />
                                    Campaign Items ({items?.length || 0})
                                </h3>
                                            {items && items.length > 0 ? (
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    {items.map((item) => (
                                                        <div key={item._id} className="bg-stone-800/50 rounded-lg p-4 border border-stone-700 space-y-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold" style={{ color: item.textColor || '#fff' }}>{item.name}</h4>
                                                        <p className="text-xs uppercase tracking-wide text-stone-500">{item.type}</p>
                                                    </div>
                                                    <span className="text-xs px-2 py-1 rounded border border-stone-700" style={{ color: rarityColors[item.rarity as keyof typeof rarityColors] || '#fff' }}>
                                                        {item.rarity}
                                                    </span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-sm text-stone-300">{item.description}</p>
                                                )}
                                                {item.effects && (
                                                    <div className="text-xs text-indigo-200 bg-indigo-950/20 border border-indigo-900 rounded p-2">
                                                        <span className="font-semibold text-indigo-300">Effects:</span> {item.effects}
                                                    </div>
                                                )}
                                                {item.effectId && effectsLibrary && (
                                                    (() => {
                                                        const eff = effectsLibrary.find((e) => e._id === item.effectId);
                                                        if (!eff) return null;
                                                        return (
                                                            <div className="text-xs bg-stone-900 border border-stone-700 rounded p-2 text-stone-200">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-semibold text-emerald-300">{eff.name}</span>
                                                                    <span className="text-[10px] uppercase tracking-wide text-stone-500">{eff.category}</span>
                                                                </div>
                                                                <div className="text-stone-300 mt-1">{eff.summary}</div>
                                                                {eff.mechanics && <div className="text-stone-400 mt-1">{eff.mechanics}</div>}
                                                                {eff.duration && <div className="text-stone-500 mt-1 text-[11px]">Duration: {eff.duration}</div>}
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                                {item.spawnLocationIds && item.spawnLocationIds.length > 0 && (
                                                    <div className="text-[11px] text-stone-400 flex flex-wrap gap-1">
                                                        <span className="font-semibold text-stone-300">Locations:</span>
                                                        {item.spawnLocationIds.map((locId) => {
                                                            const loc = locations?.find((l) => l._id === locId);
                                                            return loc ? (
                                                                <span key={locId} className="bg-stone-900 border border-stone-700 px-2 py-1 rounded">
                                                                    {loc.name}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                )}
                                                {item.specialAbilities && (
                                                    <div className="text-xs text-amber-200 bg-amber-900/10 border border-amber-800 rounded p-2">
                                                        <span className="font-semibold text-amber-300">Special:</span> {item.specialAbilities}
                                                    </div>
                                                )}
                                                {(item.usage || item.requirements) && (
                                                    <div className="grid grid-cols-1 gap-2 text-xs text-stone-400">
                                                        {item.usage && <div><span className="font-semibold text-stone-300">Usage:</span> {item.usage}</div>}
                                                        {item.requirements && <div><span className="font-semibold text-stone-300">Req:</span> {item.requirements}</div>}
                                                    </div>
                                                )}
                                                {item.lore && (
                                                    <p className="text-xs text-stone-500 border-t border-stone-700 pt-2">{item.lore}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-stone-500 text-center py-8">No items yet. Create items in the main Forge.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SPELLS TAB */}
                    {activeTab === 'spells' && (
                        <div className="space-y-8">
                            <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-6">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Sparkles className="text-purple-300" />
                                    Forge Spell
                                </h3>
                                <form onSubmit={handleCreateSpell} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Input label="Name" value={spellName} onChange={(e: any) => setSpellName(e.target.value)} required />
                                        <Input label="School" value={spellSchool} onChange={(e: any) => setSpellSchool(e.target.value)} />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <Input label="Level" type="number" min={0} value={spellLevel} onChange={(e: any) => setSpellLevel(parseInt(e.target.value) || 0)} />
                                        <Input label="Casting Time" value={spellCastingTime} onChange={(e: any) => setSpellCastingTime(e.target.value)} />
                                        <Input label="Range" value={spellRange} onChange={(e: any) => setSpellRange(e.target.value)} />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <Input label="Components" value={spellComponents} onChange={(e: any) => setSpellComponents(e.target.value)} />
                                        <Input label="Duration" value={spellDuration} onChange={(e: any) => setSpellDuration(e.target.value)} />
                                        <Input label="Save / DC" value={spellSave} onChange={(e: any) => setSpellSave(e.target.value)} placeholder="DEX save" />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={spellConcentration} onChange={(e) => setSpellConcentration(e.target.checked)} className="h-4 w-4" />
                                            <label className="text-sm text-stone-300">Concentration</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={spellRitual} onChange={(e) => setSpellRitual(e.target.checked)} className="h-4 w-4" />
                                            <label className="text-sm text-stone-300">Ritual</label>
                                        </div>
                                        <Input label="Tags (comma-separated)" value={spellTags} onChange={(e: any) => setSpellTags(e.target.value)} placeholder="fire, aoe, damage" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Input label="Damage Dice" value={spellDamageDice} onChange={(e: any) => setSpellDamageDice(e.target.value)} placeholder="8d6" />
                                        <Input label="Damage Type" value={spellDamageType} onChange={(e: any) => setSpellDamageType(e.target.value)} placeholder="Fire" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Input label="Area Shape" value={spellAreaShape} onChange={(e: any) => setSpellAreaShape(e.target.value)} placeholder="Sphere, Cone, Line" />
                                        <Input label="Area Size" value={spellAreaSize} onChange={(e: any) => setSpellAreaSize(e.target.value)} placeholder="20 ft radius" />
                                    </div>
                                    <TextArea label="Higher Levels" value={spellHigherLevels} onChange={(e: any) => setSpellHigherLevels(e.target.value)} placeholder="Add 1d6 per slot above 3rd" />
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Effect (library)</label>
                                            <select
                                                className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                                value={spellEffectId}
                                                onChange={(e) => setSpellEffectId(e.target.value)}
                                            >
                                                <option value="">None</option>
                                                {effectsLibrary?.map((eff) => (
                                                    <option key={eff._id} value={eff._id}>{eff.name} — {eff.summary}</option>
                                                ))}
                                            </select>
                                            {spellEffectId && (
                                                <div className="text-xs text-stone-300 bg-stone-800/60 border border-stone-700 rounded p-2">
                                                    {effectsLibrary?.find(e => e._id === spellEffectId)?.mechanics || effectsLibrary?.find(e => e._id === spellEffectId)?.summary}
                                                </div>
                                            )}
                                        </div>
                                        <TextArea label="Damage / Heal" value={`${spellDamageDice || ''} ${spellDamageType || ''}`.trim()} onChange={(e: any) => {
                                            const val = e.target.value;
                                            // If user types like "8d6 fire", split first token as dice, rest as type
                                            const [dice, ...rest] = val.split(' ');
                                            setSpellDamageDice(dice);
                                            setSpellDamageType(rest.join(' '));
                                        }} placeholder="8d6 fire (DEX save half)" />
                                    </div>
                                    <TextArea label="Description" value={spellDescription} onChange={(e: any) => setSpellDescription(e.target.value)} placeholder="A burst of flame erupts..." />
                                    <TextArea label="Notes" value={spellNotes} onChange={(e: any) => setSpellNotes(e.target.value)} placeholder="Concentration ends if casting other spells." />
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                        Create Spell
                                    </button>
                                </form>
                            </div>

                            <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-6">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Sparkles className="text-purple-300" />
                                    Campaign Spells ({spells?.length || 0})
                                </h3>
                                <div className="flex flex-wrap gap-3 mb-4 text-sm">
                                    <input
                                        placeholder="Filter by tag"
                                        className="bg-stone-950 border border-stone-800 rounded px-3 py-2 text-white"
                                        value={spellFilterTag}
                                        onChange={(e) => setSpellFilterTag(e.target.value)}
                                    />
                                    <label className="flex items-center gap-2 text-stone-400">
                                        <input type="checkbox" checked={spellFilterConc} onChange={(e) => setSpellFilterConc(e.target.checked)} /> Concentration only
                                    </label>
                                    <label className="flex items-center gap-2 text-stone-400">
                                        <input type="checkbox" checked={spellFilterRitual} onChange={(e) => setSpellFilterRitual(e.target.checked)} /> Ritual only
                                    </label>
                                </div>
                                {spells && spells.length > 0 ? (
                                    <div className="grid md:grid-cols-3 gap-4">
                                        {spells
                                            .filter((spell) => {
                                                const matchTag = spellFilterTag ? (spell.tags || []).some(t => t.toLowerCase().includes(spellFilterTag.toLowerCase())) : true;
                                                const matchConc = spellFilterConc ? spell.concentration === true : true;
                                                const matchRitual = spellFilterRitual ? spell.ritual === true : true;
                                                return matchTag && matchConc && matchRitual;
                                            })
                                            .map((spell) => (
                                                <div key={spell._id} className="bg-stone-800/50 rounded-lg p-4 border border-stone-700 space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="font-bold text-white">{spell.name}</h4>
                                                            <p className="text-xs text-stone-500 uppercase tracking-wide">Level {spell.level} • {spell.school}</p>
                                                        </div>
                                                    <span className="text-[11px] bg-stone-900 border border-stone-700 px-2 py-1 rounded">{spell.castingTime}</span>
                                                    </div>
                                                    <div className="text-xs text-stone-400 flex flex-col gap-1">
                                                        <span>Range: {spell.range}</span>
                                                        {spell.components && <span>Components: {spell.components}</span>}
                                                        <span>Duration: {spell.duration}</span>
                                                        {spell.save && <span>Save: {spell.save}</span>}
                                                        {(spell.concentration || spell.ritual) && (
                                                            <span className="text-emerald-300">{spell.concentration ? 'Concentration' : ''} {spell.ritual ? 'Ritual' : ''}</span>
                                                        )}
                                                        {spell.tags && spell.tags.length > 0 && (
                                                            <span className="text-[11px] text-stone-500">Tags: {spell.tags.join(', ')}</span>
                                                        )}
                                                    </div>
                                                    {spell.effectId && effectsLibrary && (() => {
                                                        const eff = effectsLibrary.find(e => e._id === spell.effectId);
                                                        if (!eff) return null;
                                                        return (
                                                        <div className="text-xs bg-stone-900 border border-stone-700 rounded p-2 text-stone-200">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-semibold text-emerald-300">{eff.name}</span>
                                                                <span className="text-[10px] uppercase tracking-wide text-stone-500">{eff.category}</span>
                                                            </div>
                                                            <div className="text-stone-300 mt-1">{eff.summary}</div>
                                                            {eff.mechanics && <div className="text-stone-400 mt-1">{eff.mechanics}</div>}
                                                        </div>
                                                    );
                                                })()}
                                                {(spell.damageDice || spell.damageType) && (
                                                    <div className="text-xs text-red-200 bg-red-900/10 border border-red-800 rounded p-2">
                                                        {(spell.damageDice || '')} {spell.damageType || ''}
                                                    </div>
                                                )}
                                                {(spell.areaShape || spell.areaSize) && (
                                                    <div className="text-xs text-stone-200 bg-stone-900 border border-stone-700 rounded p-2">
                                                        Area: {spell.areaShape || ''} {spell.areaSize || ''}
                                                    </div>
                                                )}
                                                {spell.higherLevels && <p className="text-xs text-indigo-200 bg-indigo-950/20 border border-indigo-900 rounded p-2">Higher Levels: {spell.higherLevels}</p>}
                                                {spell.description && <p className="text-sm text-stone-300">{spell.description}</p>}
                                                {spell.notes && <p className="text-xs text-stone-500 border-t border-stone-800 pt-2">{spell.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-stone-500 text-center py-8">No spells yet. Forge your first spell above.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MONSTERS TAB */}
                    {activeTab === 'monsters' && (
                        <div className="space-y-8">
                            {/* Create Monster Form */}
                            <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-6">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Skull className="text-red-400" />
                                    Create Monster
                                </h3>
                                <form onSubmit={handleCreateMonster} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Name</label>
                                            <input
                                                type="text"
                                                value={monsterName}
                                                onChange={(e) => setMonsterName(e.target.value)}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Location</label>
                                            <select
                                                value={monsterLocationId}
                                                onChange={(e) => setMonsterLocationId(e.target.value)}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            >
                                                <option value="">No Location</option>
                                                {locations?.map((loc) => (
                                                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            value={monsterDesc}
                                            onChange={(e) => setMonsterDesc(e.target.value)}
                                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Health</label>
                                            <input
                                                type="number"
                                                value={monsterHealth}
                                                onChange={(e) => setMonsterHealth(parseInt(e.target.value))}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Damage</label>
                                            <input
                                                type="number"
                                                value={monsterDamage}
                                                onChange={(e) => setMonsterDamage(parseInt(e.target.value))}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                min="1"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Item Drops (hold Ctrl/Cmd to select multiple)</label>
                                        <select
                                            multiple
                                            value={monsterDropIds}
                                            onChange={(e) => setMonsterDropIds(Array.from(e.target.selectedOptions, option => option.value as Id<"items">))}
                                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
                                        >
                                            {items?.map((item) => (
                                                <option key={item._id} value={item._id}>{item.name} ({item.rarity})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                        Create Monster
                                    </button>
                                </form>
                            </div>

                            {/* Monsters List */}
                            <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-6">
                                <h3 className="text-xl font-bold mb-4">Monsters ({monsters?.length || 0})</h3>
                                {monsters && monsters.length > 0 ? (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {monsters.map((monster) => (
                                            <div key={monster._id} className="bg-stone-800/50 rounded-lg p-4 border border-stone-700">
                                                <h4 className="font-bold text-red-400 mb-2">{monster.name}</h4>
                                                <p className="text-sm text-stone-400 mb-3">{monster.description}</p>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="text-green-400">❤️ {monster.health} HP</div>
                                                    <div className="text-orange-400">⚔️ {monster.damage} DMG</div>
                                                </div>
                                                {monster.dropItemIds && monster.dropItemIds.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-stone-700">
                                                        <p className="text-xs text-stone-500 mb-1">Drops:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {monster.dropItemIds.map((itemId) => {
                                                                const item = items?.find(i => i._id === itemId);
                                                                return item ? (
                                                                    <span key={itemId} className="text-xs bg-stone-700 px-2 py-1 rounded" style={{ color: item.textColor || '#fff' }}>
                                                                        {item.name}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-stone-500 text-center py-8">No monsters yet. Create your first monster above!</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'players' && (
                        <div className="text-center py-20">
                            <Users className="mx-auto text-stone-700 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-stone-300">Player Management</h3>
                            <p className="text-stone-500 max-w-md mx-auto mt-2">
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
    <div className="space-y-1">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{label}</label>
        <input
            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            {...props}
        />
    </div>
);

const TextArea = ({ label, ...props }: any) => (
    <div className="space-y-1">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{label}</label>
        <textarea
            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors min-h-[80px]"
            {...props}
        />
    </div>
);