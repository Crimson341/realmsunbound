/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Map, Users, Scroll, Zap, Settings, Plus, Save, ArrowLeft, Loader2, Link as LinkIcon, Package, Skull, Palette, Sparkles, ChevronDown, Sword, Shield, Crown } from 'lucide-react';
import Link from 'next/link';
import { MentionTextArea } from '@/components/MentionTextArea';
import { motion } from 'framer-motion';

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
                effectId: spellEffectId ? (spellEffectId as Id<"effectsLibrary">) : undefined,
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
        <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
             <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                <motion.div className="absolute inset-0 border-4 border-[#e8e0c5] rounded-full" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                <motion.div className="absolute inset-2 border border-[#D4AF37] rounded-full border-dashed" animate={{ rotate: 360 }} transition={{ duration: 10, ease: "linear", repeat: Infinity }} />
                <Settings size={24} className="text-[#D4AF37]" />
            </div>
            <span className="text-[#43485C] font-serif tracking-[0.2em] text-xs font-bold uppercase">Opening Grimoire...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#43485C] font-serif relative selection:bg-[#D4AF37] selection:text-white">
            
             {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[#fcfcfc]">
                 <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                 <StarPattern />
            </div>

            {/* Header */}
            <header className="border-b border-[#D4AF37]/10 bg-white/80 backdrop-blur sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/forge" className="text-[#43485C]/50 hover:text-[#D4AF37] transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-[#43485C] tracking-tight leading-none">{campaign?.title}</h1>
                            <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mt-0.5">Campaign Editor</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2">
                        {['overview', 'realm', 'npcs', 'events', 'quests', 'items', 'spells', 'monsters', 'players'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                    activeTab === tab 
                                    ? 'bg-[#D4AF37] text-white border-[#D4AF37] shadow-md' 
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

                    {/* SPELLS TAB */}
                    {activeTab === 'spells' && (
                        <div className="space-y-8">
                            <div className="bg-white rounded-[2rem] border border-[#D4AF37]/20 p-8 shadow-lg relative">
                                <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-l from-transparent via-[#D4AF37]/30 to-transparent" />
                                <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-[#43485C]">
                                    <Sparkles className="text-[#D4AF37]" />
                                    Forge Spell
                                </h3>
                                <form onSubmit={handleCreateSpell} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <Input label="Name" value={spellName} onChange={(e: any) => setSpellName(e.target.value)} required />
                                        <Input label="School" value={spellSchool} onChange={(e: any) => setSpellSchool(e.target.value)} />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <Input label="Level" type="number" min={0} value={spellLevel} onChange={(e: any) => setSpellLevel(parseInt(e.target.value) || 0)} />
                                        <Input label="Casting Time" value={spellCastingTime} onChange={(e: any) => setSpellCastingTime(e.target.value)} />
                                        <Input label="Range" value={spellRange} onChange={(e: any) => setSpellRange(e.target.value)} />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <Input label="Components" value={spellComponents} onChange={(e: any) => setSpellComponents(e.target.value)} />
                                        <Input label="Duration" value={spellDuration} onChange={(e: any) => setSpellDuration(e.target.value)} />
                                        <Input label="Save / DC" value={spellSave} onChange={(e: any) => setSpellSave(e.target.value)} placeholder="DEX save" />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div className="flex items-center gap-2 bg-[#f8f9fa] p-4 rounded-xl border border-[#D4AF37]/10">
                                            <input type="checkbox" checked={spellConcentration} onChange={(e) => setSpellConcentration(e.target.checked)} className="h-4 w-4 accent-[#D4AF37]" />
                                            <label className="text-sm font-bold text-[#43485C] uppercase tracking-wider text-xs">Concentration</label>
                                        </div>
                                        <div className="flex items-center gap-2 bg-[#f8f9fa] p-4 rounded-xl border border-[#D4AF37]/10">
                                            <input type="checkbox" checked={spellRitual} onChange={(e) => setSpellRitual(e.target.checked)} className="h-4 w-4 accent-[#D4AF37]" />
                                            <label className="text-sm font-bold text-[#43485C] uppercase tracking-wider text-xs">Ritual</label>
                                        </div>
                                        <Input label="Tags" value={spellTags} onChange={(e: any) => setSpellTags(e.target.value)} placeholder="fire, aoe, damage" />
                                    </div>
                                    
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-[#43485C] hover:bg-[#2d3142] text-white px-6 py-4 rounded-full font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl text-sm uppercase tracking-widest"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                            Create Spell
                                        </button>
                                    </div>
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
                                        <Input label="Health" type="number" value={monsterHealth} onChange={(e: any) => setMonsterHealth(parseInt(e.target.value))} min={1} required />
                                        <Input label="Damage" type="number" value={monsterDamage} onChange={(e: any) => setMonsterDamage(parseInt(e.target.value))} min={1} required />
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