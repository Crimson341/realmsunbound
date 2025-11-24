/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { X, MapPin, Gift, Scroll } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

interface QuestDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAsk: (questTitle: string) => void;
    quest: any;
    locationName?: string;
}

export default function QuestDetailModal({ isOpen, onClose, onAsk, quest, locationName }: QuestDetailModalProps) {
    if (!isOpen || !quest) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-[#1a1d2d] border border-[#D4AF37] rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-6 border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/10 to-transparent relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-[#D4AF37] transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-2xl font-serif font-bold text-[#D4AF37] pr-8">{quest.title}</h2>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 mt-2">
                        <Scroll size={12} />
                        <span>{quest.source === 'ai' ? 'Dynamic Quest' : 'Main Quest'}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar text-gray-300">
                    
                    {/* Description */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]/70">Overview</h3>
                        <p className="text-sm leading-relaxed italic border-l-2 border-[#D4AF37]/30 pl-4">
                            {quest.description}
                        </p>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-3 bg-[#D4AF37]/5 p-3 rounded-md border border-[#D4AF37]/10">
                        <MapPin className="text-[#D4AF37] mt-0.5" size={16} />
                        <div>
                            <h4 className="text-sm font-bold text-gray-200">Location</h4>
                            <p className="text-xs text-gray-400">
                                {locationName || "Unknown Location"}
                            </p>
                        </div>
                    </div>

                    {/* Rewards */}
                    {quest.rewards || (quest.rewardItemIds && quest.rewardItemIds.length > 0) ? (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]/70 flex items-center gap-2">
                                <Gift size={14} /> Rewards
                            </h3>
                            <div className="grid gap-2">
                                {/* Text Rewards */}
                                {quest.rewards && typeof quest.rewards === 'string' && (
                                     <div className="bg-black/20 p-2 rounded text-xs border border-white/5 text-gray-400">
                                        {quest.rewards}
                                     </div>
                                )}
                                {/* Item Rewards */}
                                {quest.rewardItemIds?.map((itemId: string) => (
                                    <RewardItemPreview key={itemId} itemId={itemId} />
                                ))}
                            </div>
                        </div>
                    ) : null}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#D4AF37]/20 bg-black/20 flex justify-between">
                     <button 
                        onClick={() => {
                            onAsk(quest.title);
                            onClose();
                        }}
                        className="px-4 py-2 bg-transparent border border-[#D4AF37]/50 text-[#D4AF37] font-bold text-sm rounded hover:bg-[#D4AF37]/10 transition-colors"
                    >
                        Ask Locals
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-[#D4AF37] text-black font-bold text-sm rounded hover:bg-[#eac88f] transition-colors"
                    >
                        Close Journal
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper to fetch/display item info (since we only have ID in quest)
// Note: In a real app, we might pass the full item object or fetch it here.
// For now, just a placeholder or we rely on the parent to pass enriched data if available.
// Since 'quest' object from 'getCampaignDetails' doesn't fully expand items by default (only IDs),
// we might show "Unknown Item" or minimal info unless we update the backend query.
// However, we can try to use a separate component that fetches.

function RewardItemPreview({ itemId }: { itemId: string }) {
    const item = useQuery(api.forge.getMyItems); 
    // This is inefficient (fetching all items to find one). 
    // Better: standard useQuery(api.forge.getItem, { id: itemId }) if it existed.
    // Assuming 'getMyItems' caches well or we change strategy.
    
    const foundItem = item?.find((i: any) => i._id === itemId);

    if (!foundItem) return <div className="text-xs text-gray-500 animate-pulse">Loading Reward...</div>;

    return (
        <div className="flex items-center gap-3 bg-[#1f2235] p-2 rounded border border-[#D4AF37]/20">
            <div className="w-8 h-8 bg-[#D4AF37]/10 rounded flex items-center justify-center text-[#D4AF37]">
                <Gift size={14} />
            </div>
            <div>
                <div className="text-sm font-bold text-gray-200">{foundItem.name}</div>
                <div className="text-[10px] text-[#D4AF37] uppercase">{foundItem.rarity} {foundItem.type}</div>
            </div>
        </div>
    );
}
