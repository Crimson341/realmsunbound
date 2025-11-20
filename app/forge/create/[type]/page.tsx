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
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans pt-24 px-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/forge" className="inline-flex items-center gap-2 text-stone-500 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Forge
                </Link>

                <h1 className="text-3xl font-serif font-bold text-white mb-8 capitalize">Forge New {type}</h1>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Image Upload */}
                    <div
                        onClick={() => imageInputRef.current?.click()}
                        className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${image ? 'border-indigo-500 bg-indigo-900/20' : 'border-stone-800 hover:border-stone-600 hover:bg-stone-900'}`}
                    >
                        {image ? (
                            <div className="text-center">
                                <p className="text-indigo-400 font-medium">{image.name}</p>
                                <p className="text-xs text-stone-500 mt-1">Click to change</p>
                            </div>
                        ) : (
                            <>
                                <Upload className="text-stone-500 mb-2" size={32} />
                                <p className="text-stone-400 font-medium">Upload Image</p>
                                <p className="text-xs text-stone-600 mt-1">JPG, PNG, WEBP</p>
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
                    <div className="pt-8 border-t border-stone-800">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            {isSubmitting ? 'Forging...' : 'Create Entity'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

// --- UI Components ---
const Input = ({ label, fontMono, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">{label}</label>
        <input
            className={`w-full bg-stone-900 border border-stone-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors ${fontMono ? 'font-mono' : ''}`}
            {...props}
        />
    </div>
);

const TextArea = ({ label, fontMono, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">{label}</label>
        <textarea
            className={`w-full bg-stone-900 border border-stone-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors min-h-[120px] ${fontMono ? 'font-mono text-sm' : ''}`}
            {...props}
        />
    </div>
);
