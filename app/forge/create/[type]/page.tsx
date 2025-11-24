/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
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
    const type = params.type as string; // 'campaign', 'character', 'item'

    const generateUploadUrl = useMutation(api.forge.generateUploadUrl);
    const createCampaign = useMutation(api.forge.createCampaign);
    const createCharacter = useMutation(api.forge.createCharacter);
    const createItem = useMutation(api.forge.createItem);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [image, setImage] = useState<File | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState<any>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // 1. Upload Image if exists
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

            // 2. Call Mutation based on type
            if (type === 'campaign') {
                await createCampaign({
                    title: formData.title,
                    description: formData.description,
                    xpRate: Number(formData.xpRate) || 1,
                    rules: formData.rules || "{}",
                    imageId,
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
        <div className="min-h-screen bg-[#f8f9fa] text-[#43485C] font-serif selection:bg-[#D4AF37] selection:text-white relative overflow-hidden p-6 md:p-12">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[#fcfcfc]">
                 <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                 <StarPattern />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0)_50%,rgba(212,175,55,0.03)_100%)]" />
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                <Link href="/forge" className="inline-flex items-center gap-2 text-[#43485C]/50 hover:text-[#D4AF37] mb-8 transition-colors group font-bold text-sm uppercase tracking-widest">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Forge
                </Link>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-md border border-[#D4AF37]/20 rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden"
                >
                    {/* Decorative Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37]">
                            <PenTool size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-[#43485C] capitalize">Forge New {type}</h1>
                            <p className="text-[#43485C]/50 text-sm font-sans">Add a new entry to your archives.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Image Upload */}
                        <div
                            onClick={() => imageInputRef.current?.click()}
                            className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group bg-[#f8f9fa] ${image ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5'}`}
                        >
                            {image ? (
                                <div className="text-center">
                                    <p className="text-[#D4AF37] font-bold text-lg">{image.name}</p>
                                    <p className="text-xs text-[#43485C]/60 mt-2 uppercase tracking-wider font-bold">Click to change</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="text-[#43485C]/40 group-hover:text-[#D4AF37] mb-3 transition-colors" size={32} />
                                    <p className="text-[#43485C]/60 group-hover:text-[#D4AF37] font-bold transition-colors">Upload Cover Image</p>
                                    <p className="text-xs text-[#43485C]/40 mt-1 font-sans">JPG, PNG, WEBP</p>
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
                                    <Input name="title" label="Campaign Title" placeholder="The Shadow over Innsmouth" onChange={handleInputChange} required />
                                    <TextArea name="description" label="Description" placeholder="A dark tale of..." onChange={handleInputChange} required />
                                    <Input name="xpRate" label="XP Rate Multiplier" type="number" placeholder="1.0" onChange={handleInputChange} />
                                    <TextArea name="rules" label="Custom Rules (JSON)" placeholder='{"permadeath": true}' onChange={handleInputChange} fontMono />
                                </>
                            )}

                            {type === 'character' && (
                                <>
                                    <Input name="name" label="Character Name" placeholder="Grom Hellscream" onChange={handleInputChange} required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input name="class" label="Class" placeholder="Barbarian" onChange={handleInputChange} required />
                                        <Input name="level" label="Level" type="number" placeholder="1" onChange={handleInputChange} required />
                                    </div>
                                    <TextArea name="stats" label="Stats (JSON)" placeholder='{"str": 18, "dex": 12}' onChange={handleInputChange} fontMono />
                                </>
                            )}

                            {type === 'item' && (
                                <>
                                    <Input name="name" label="Item Name" placeholder="Sword of a Thousand Truths" onChange={handleInputChange} required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input name="type" label="Type" placeholder="Weapon" onChange={handleInputChange} required />
                                        <Input name="rarity" label="Rarity" placeholder="Legendary" onChange={handleInputChange} required />
                                    </div>
                                    <TextArea name="description" label="Physical Description" placeholder="Ebony greatsword with a jagged edge" onChange={handleInputChange} required />
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <TextArea name="effects" label="Mechanical Effects" placeholder="+2 to hit and damage; sheds dim light" onChange={handleInputChange} />
                                        <TextArea name="specialAbilities" label="Special Abilities" placeholder="Once per day unleash a cone of shadow flame" onChange={handleInputChange} />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <TextArea name="usage" label="Usage / Charges" placeholder="3 charges; expend 1 to reroll damage dice" onChange={handleInputChange} />
                                        <TextArea name="requirements" label="Requirements / Attunement" placeholder="Requires attunement by a fighter of level 5+" onChange={handleInputChange} />
                                    </div>
                                    <TextArea name="lore" label="Lore & Notes" placeholder="Crafted for the marsh sentinels; rumored to drink moonlight" onChange={handleInputChange} />
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
const Input = ({ label, fontMono, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-serif ml-1">{label}</label>
        <input
            className={`w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 transition-all placeholder:text-[#43485C]/30 shadow-inner ${fontMono ? 'font-mono' : 'font-sans'}`}
            {...props}
        />
    </div>
);

const TextArea = ({ label, fontMono, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-serif ml-1">{label}</label>
        <textarea
            className={`w-full bg-[#f8f9fa] border border-[#D4AF37]/20 rounded-xl p-4 text-[#43485C] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 transition-all min-h-[120px] placeholder:text-[#43485C]/30 shadow-inner ${fontMono ? 'font-mono text-sm' : 'font-sans'}`}
            {...props}
        />
    </div>
);