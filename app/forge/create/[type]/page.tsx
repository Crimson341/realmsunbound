/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useTheme } from '@/components/ThemeProvider';
import { Upload, Save, ArrowLeft, Loader2, PenTool } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const StarPattern = () => (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
         style={{ 
             backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)', 
             backgroundSize: '32px 32px' 
         }} 
    />
);

export default function CreateEntityPage() {
    const params = useParams();
    const router = useRouter();
    const type = params.type as string;
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    const generateUploadUrl = useMutation(api.forge.generateUploadUrl);
    const createCampaign = useMutation(api.forge.createCampaign);
    const createCharacter = useMutation(api.forge.createCharacter);
    const createItem = useMutation(api.forge.createItem);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [image, setImage] = useState<File | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<any>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let imageId = undefined;
            if (image) {
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": image.type },
                    body: image,
                });
                const { storageId } = await result.json();
                imageId = storageId;
            }

            if (type === 'campaign') {
                await createCampaign({
                    title: formData.title,
                    description: formData.description,
                    xpRate: Number(formData.xpRate) || 1,
                    rules: formData.rules || "{}",
                    imageId,
                    genre: formData.genre || undefined,
                    isPublic: true,
                });
            } else if (type === 'character') {
                await createCharacter({
                    name: formData.name,
                    class: formData.class,
                    level: Number(formData.level) || 1,
                    stats: formData.stats || "{}",
                    imageId,
                });
            } else if (type === 'item') {
                await createItem({
                    name: formData.name,
                    type: formData.type,
                    rarity: formData.rarity,
                    effects: formData.effects || "",
                    description: formData.description || "",
                    specialAbilities: formData.specialAbilities || "",
                    usage: formData.usage || "",
                    requirements: formData.requirements || "",
                    lore: formData.lore || "",
                    imageId,
                });
            }

            router.push('/forge');
        } catch (error) {
            console.error("Failed to create:", error);
            alert("Failed to create entity. See console for details.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`min-h-screen font-serif selection:bg-[#D4AF37] selection:text-white relative overflow-hidden p-6 md:p-12 ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-[#f8f9fa] text-[#43485C]'}`}>
            {/* Background */}
            <div className={`fixed inset-0 z-0 pointer-events-none ${dark ? 'bg-[#0a0c12]' : 'bg-[#fcfcfc]'}`}>
                 <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                 <StarPattern />
                 <div className={`absolute inset-0 ${dark ? 'bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0)_50%,rgba(212,175,55,0.02)_100%)]' : 'bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0)_50%,rgba(212,175,55,0.03)_100%)]'}`} />
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                <Link href="/forge" className={`inline-flex items-center gap-2 hover:text-[#D4AF37] mb-8 transition-colors group font-bold text-sm uppercase tracking-widest ${dark ? 'text-gray-500' : 'text-[#43485C]/50'}`}>
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Forge
                </Link>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`backdrop-blur-md border rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden ${
                        dark 
                            ? 'bg-[#1a1d2e]/80 border-[#D4AF37]/20' 
                            : 'bg-white/80 border-[#D4AF37]/20'
                    }`}
                >
                    {/* Decorative Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37]">
                            <PenTool size={24} />
                        </div>
                        <div>
                            <h1 className={`text-3xl font-bold capitalize ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>Forge New {type}</h1>
                            <p className={`text-sm font-sans ${dark ? 'text-gray-500' : 'text-[#43485C]/50'}`}>Add a new entry to your archives.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Image Upload */}
                        <div
                            onClick={() => imageInputRef.current?.click()}
                            className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                                image 
                                    ? 'border-[#D4AF37] bg-[#D4AF37]/5' 
                                    : dark 
                                        ? 'border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 bg-[#151821]' 
                                        : 'border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 bg-[#f8f9fa]'
                            }`}
                        >
                            {image ? (
                                <div className="text-center">
                                    <p className="text-[#D4AF37] font-bold text-lg">{image.name}</p>
                                    <p className={`text-xs mt-2 uppercase tracking-wider font-bold ${dark ? 'text-gray-500' : 'text-[#43485C]/60'}`}>Click to change</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className={`mb-3 transition-colors group-hover:text-[#D4AF37] ${dark ? 'text-gray-600' : 'text-[#43485C]/40'}`} size={32} />
                                    <p className={`font-bold transition-colors group-hover:text-[#D4AF37] ${dark ? 'text-gray-500' : 'text-[#43485C]/60'}`}>Upload Cover Image</p>
                                    <p className={`text-xs mt-1 font-sans ${dark ? 'text-gray-600' : 'text-[#43485C]/40'}`}>JPG, PNG, WEBP</p>
                                </>
                            )}
                            <input
                                type="file"
                                ref={imageInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && setImage(e.target.files[0])}
                            />
                        </div>

                        {/* Dynamic Fields */}
                        <div className="space-y-6">
                            {type === 'campaign' && (
                                <>
                                    <Input name="title" label="Campaign Title" placeholder="The Shadow over Innsmouth" onChange={handleInputChange} required dark={dark} />
                                    <TextArea name="description" label="Description" placeholder="A dark tale of..." onChange={handleInputChange} required dark={dark} />
                                    
                                    {/* Genre Selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-serif ml-1">Genre</label>
                                        <select
                                            name="genre"
                                            onChange={handleInputChange}
                                            className={`w-full border rounded-xl p-4 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 transition-all shadow-inner font-sans ${
                                                dark 
                                                    ? 'bg-[#151821] border-[#2a2d3e] text-[#e8e6e3]' 
                                                    : 'bg-[#f8f9fa] border-[#D4AF37]/20 text-[#43485C]'
                                            }`}
                                        >
                                            <option value="">Select a genre...</option>
                                            <option value="fantasy">🏰 Fantasy</option>
                                            <option value="sci-fi">🚀 Sci-Fi</option>
                                            <option value="anime">⚔️ Anime</option>
                                            <option value="realism">🌍 Realism</option>
                                            <option value="historical">📜 Historical</option>
                                            <option value="horror">👻 Horror</option>
                                            <option value="mythology">⚡ Mythology</option>
                                            <option value="cyberpunk">🤖 Cyberpunk</option>
                                            <option value="steampunk">⚙️ Steampunk</option>
                                            <option value="post-apocalyptic">☢️ Post-Apocalyptic</option>
                                        </select>
                                    </div>
                                    
                                    <Input name="xpRate" label="XP Rate Multiplier" type="number" placeholder="1.0" onChange={handleInputChange} dark={dark} />
                                    <TextArea name="rules" label="Custom Rules (JSON)" placeholder='{"permadeath": true}' onChange={handleInputChange} fontMono dark={dark} />
                                </>
                            )}

                            {type === 'character' && (
                                <>
                                    <Input name="name" label="Character Name" placeholder="Grom Hellscream" onChange={handleInputChange} required dark={dark} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input name="class" label="Class" placeholder="Barbarian" onChange={handleInputChange} required dark={dark} />
                                        <Input name="level" label="Level" type="number" placeholder="1" onChange={handleInputChange} required dark={dark} />
                                    </div>
                                    <TextArea name="stats" label="Stats (JSON)" placeholder='{"str": 18, "dex": 12}' onChange={handleInputChange} fontMono dark={dark} />
                                </>
                            )}

                            {type === 'item' && (
                                <>
                                    <Input name="name" label="Item Name" placeholder="Sword of a Thousand Truths" onChange={handleInputChange} required dark={dark} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input name="type" label="Type" placeholder="Weapon" onChange={handleInputChange} required dark={dark} />
                                        <Input name="rarity" label="Rarity" placeholder="Legendary" onChange={handleInputChange} required dark={dark} />
                                    </div>
                                    <TextArea name="description" label="Physical Description" placeholder="Ebony greatsword with a jagged edge" onChange={handleInputChange} required dark={dark} />
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <TextArea name="effects" label="Mechanical Effects" placeholder="+2 to hit and damage; sheds dim light" onChange={handleInputChange} dark={dark} />
                                        <TextArea name="specialAbilities" label="Special Abilities" placeholder="Once per day unleash a cone of shadow flame" onChange={handleInputChange} dark={dark} />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <TextArea name="usage" label="Usage / Charges" placeholder="3 charges; expend 1 to reroll damage dice" onChange={handleInputChange} dark={dark} />
                                        <TextArea name="requirements" label="Requirements / Attunement" placeholder="Requires attunement by a fighter of level 5+" onChange={handleInputChange} dark={dark} />
                                    </div>
                                    <TextArea name="lore" label="Lore & Notes" placeholder="Crafted for the marsh sentinels; rumored to drink moonlight" onChange={handleInputChange} dark={dark} />
                                </>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="pt-8 border-t border-[#D4AF37]/10">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-[#D4AF37] hover:bg-[#eac88f] text-white font-bold rounded-full transition-all shadow-lg hover:shadow-[#D4AF37]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-serif tracking-widest uppercase hover:-translate-y-0.5"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                {isSubmitting ? 'Forging...' : 'Create Entity'}
                            </button>
                        </div>

                    </form>
                </motion.div>
            </div>
        </div>
    );
}

// --- UI Components ---
const Input = ({ label, fontMono, dark, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-serif ml-1">{label}</label>
        <input
            className={`w-full border rounded-xl p-4 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 transition-all shadow-inner ${
                fontMono ? 'font-mono' : 'font-sans'
            } ${
                dark 
                    ? 'bg-[#151821] border-[#2a2d3e] text-[#e8e6e3] placeholder:text-gray-600' 
                    : 'bg-[#f8f9fa] border-[#D4AF37]/20 text-[#43485C] placeholder:text-[#43485C]/30'
            }`}
            {...props}
        />
    </div>
);

const TextArea = ({ label, fontMono, dark, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-serif ml-1">{label}</label>
        <textarea
            className={`w-full border rounded-xl p-4 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 transition-all min-h-[120px] shadow-inner ${
                fontMono ? 'font-mono text-sm' : 'font-sans'
            } ${
                dark 
                    ? 'bg-[#151821] border-[#2a2d3e] text-[#e8e6e3] placeholder:text-gray-600' 
                    : 'bg-[#f8f9fa] border-[#D4AF37]/20 text-[#43485C] placeholder:text-[#43485C]/30'
            }`}
            {...props}
        />
    </div>
);
