'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Link from 'next/link';
import { ChevronLeft, Save, User } from 'lucide-react';

export default function SettingsPage() {
    const updateProfile = useMutation(api.forge.updateProfile);
    const myProfile = useQuery(api.forge.getMyProfile);
    
    const [studioName, setStudioName] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (myProfile?.studioName) {
            setStudioName(myProfile.studioName);
        }
    }, [myProfile]);

    const handleSave = async () => {
        setSaving(true);
        setMessage("");
        try {
            await updateProfile({ studioName });
            setMessage("Profile updated successfully!");
            setTimeout(() => setMessage(""), 3000);
        } catch (e) {
            console.error(e);
            setMessage("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#43485C] font-serif p-8 flex justify-center items-start pt-20">
             <div className="w-full max-w-2xl">
                <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] mb-8 transition-colors font-sans font-bold text-sm uppercase tracking-wider">
                    <ChevronLeft size={16} /> Back to Dashboard
                </Link>

                <div className="bg-white rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] border border-[#D4AF37]/10 p-8">
                    <div className="flex items-center gap-4 mb-8 border-b border-[#D4AF37]/10 pb-6">
                        <div className="p-3 bg-[#D4AF37]/10 rounded-full text-[#D4AF37]">
                            <User size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Creator Profile</h1>
                            <p className="text-gray-400 text-sm font-sans">Manage your public identity</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 font-sans">Studio Name</label>
                            <input 
                                type="text" 
                                value={studioName}
                                onChange={(e) => setStudioName(e.target.value)}
                                placeholder="e.g. Mythic Forge Studios"
                                className="w-full bg-[#f8f9fa] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4AF37] transition-colors font-sans text-[#43485C]"
                            />
                            <p className="text-xs text-gray-400 mt-2 font-sans">This name will appear on your campaign cards instead of your personal name.</p>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 w-full bg-[#D4AF37] text-white font-bold py-3 rounded-xl hover:bg-[#c5a028] transition-colors disabled:opacity-50 shadow-lg shadow-[#D4AF37]/20 font-sans uppercase tracking-wide text-sm"
                            >
                                {saving ? "Saving..." : <><Save size={18} /> Save Changes</>}
                            </button>
                            {message && (
                                <p className={`text-center mt-4 text-sm font-bold font-sans ${message.includes("Failed") ? "text-red-500" : "text-green-500"}`}>
                                    {message}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
