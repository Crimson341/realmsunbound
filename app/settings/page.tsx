'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import { ChevronLeft, Save, User } from 'lucide-react';

export default function SettingsPage() {
    const updateProfile = useMutation(api.forge.updateProfile);
    const myProfile = useQuery(api.forge.getMyProfile);
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;
    
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
        <div className={`min-h-screen font-serif p-8 flex justify-center items-start pt-20 ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-[#f8f9fa] text-[#43485C]'}`}>
             <div className="w-full max-w-2xl">
                <Link href="/dashboard" className={`flex items-center gap-2 hover:text-[#D4AF37] mb-8 transition-colors font-sans font-bold text-sm uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <ChevronLeft size={16} /> Back to Dashboard
                </Link>

                <div className={`rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] border p-8 ${dark ? 'bg-[#1a1d2e] border-[#D4AF37]/20' : 'bg-white border-[#D4AF37]/10'}`}>
                    <div className="flex items-center gap-4 mb-8 border-b border-[#D4AF37]/10 pb-6">
                        <div className="p-3 bg-[#D4AF37]/10 rounded-full text-[#D4AF37]">
                            <User size={24} />
                        </div>
                        <div>
                            <h1 className={`text-2xl font-bold ${dark ? 'text-[#e8e6e3]' : 'text-[#43485C]'}`}>Creator Profile</h1>
                            <p className={`text-sm font-sans ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Manage your public identity</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 font-sans ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Studio Name</label>
                            <input 
                                type="text" 
                                value={studioName}
                                onChange={(e) => setStudioName(e.target.value)}
                                placeholder="e.g. Mythic Forge Studios"
                                className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4AF37] transition-colors font-sans ${
                                    dark 
                                        ? 'bg-[#151821] border-[#2a2d3e] text-[#e8e6e3] placeholder:text-gray-600' 
                                        : 'bg-[#f8f9fa] border-gray-200 text-[#43485C]'
                                }`}
                            />
                            <p className={`text-xs mt-2 font-sans ${dark ? 'text-gray-500' : 'text-gray-400'}`}>This name will appear on your campaign cards instead of your personal name.</p>
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
