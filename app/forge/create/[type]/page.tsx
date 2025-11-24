"use client";

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Upload, Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
        <div className="min-h-screen bg-genshin-dark text-stone-200 font-sans pt-24 px-6 selection:bg-genshin-gold selection:text-genshin-dark">
            <div className="max-w-3xl mx-auto">
                <Link href="/forge" className="inline-flex items-center gap-2 text-stone-500 hover:text-genshin-gold mb-8 transition-colors group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Forge
                </Link>

                <div className="bg-[#1f2235]/50 backdrop-blur-sm border border-genshin-gold/20 rounded-sm p-8 shadow-xl relative overflow-hidden">
                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-genshin-gold/10 to-transparent pointer-events-none"></div>

                    <h1 className="text-3xl font-serif font-bold text-genshin-gold mb-8 capitalize flex items-center gap-3">
                        <span className="w-2 h-8 bg-genshin-gold rounded-sm inline-block"></span>
                        Forge New {type}
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Image Upload */}
                        <div
                            onClick={() => imageInputRef.current?.click()}
                            className={`h-48 border-2 border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${image ? 'border-genshin-gold bg-genshin-gold/10' : 'border-genshin-gold/30 hover:border-genshin-gold hover:bg-genshin-gold/5'}`}
                        >
                            {image ? (
                                <div className="text-center">
                                    <p className="text-genshin-gold font-medium font-serif text-lg">{image.name}</p>
                                    <p className="text-xs text-stone-400 mt-2 uppercase tracking-wider">Click to change</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="text-stone-500 group-hover:text-genshin-gold mb-3 transition-colors" size={32} />
                                    <p className="text-stone-400 group-hover:text-genshin-gold font-medium font-serif transition-colors">Upload Image</p>
                                    <p className="text-xs text-stone-600 mt-1 group-hover:text-stone-500">JPG, PNG, WEBP</p>
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
                        <div className="pt-8 border-t border-genshin-gold/10">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-genshin-gold hover:bg-[#eac88f] text-genshin-dark font-bold rounded-sm transition-all shadow-lg hover:shadow-genshin-gold/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-serif tracking-widest uppercase"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                {isSubmitting ? 'Forging...' : 'Create Entity'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}

// --- UI Components ---
const Input = ({ label, fontMono, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-genshin-gold/70 uppercase tracking-wider font-serif ml-1">{label}</label>
        <input
            className={`w-full bg-[#181b2c] border border-genshin-gold/30 rounded-sm p-3 text-stone-200 focus:outline-none focus:border-genshin-gold focus:ring-1 focus:ring-genshin-gold/20 transition-colors placeholder:text-stone-600 ${fontMono ? 'font-mono' : ''}`}
            {...props}
        />
    </div>
);

const TextArea = ({ label, fontMono, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-genshin-gold/70 uppercase tracking-wider font-serif ml-1">{label}</label>
        <textarea
            className={`w-full bg-[#181b2c] border border-genshin-gold/30 rounded-sm p-3 text-stone-200 focus:outline-none focus:border-genshin-gold focus:ring-1 focus:ring-genshin-gold/20 transition-colors min-h-[120px] placeholder:text-stone-600 ${fontMono ? 'font-mono text-sm' : ''}`}
            {...props}
        />
    </div>
);
