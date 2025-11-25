'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Link from 'next/link';
import { 
    ChevronLeft, Plus, Hash, Send, MessageSquare, 
    Settings, Trash2, Users, Loader2, Copy, Check,
    Sparkles, MoreHorizontal, X
} from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

// Discord-inspired color palette
const colors = {
    bg: '#313338',
    bgSecondary: '#2b2d31',
    bgTertiary: '#1e1f22',
    bgModifier: '#383a40',
    bgModifierHover: '#404249',
    bgModifierActive: '#4e505899',
    text: '#f2f3f5',
    textMuted: '#949ba4',
    textFaint: '#6d6f78',
    channelIcon: '#80848e',
    accent: '#5865f2',
    accentHover: '#4752c4',
    green: '#23a55a',
    danger: '#f23f43',
    divider: '#3f4147',
};

// Message type
interface Message {
    _id: Id<"hubMessages">;
    _creationTime: number;
    channelId: Id<"hubChannels">;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
}

// Helper: Format relative time
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

// Helper: Format exact time
function formatExactTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper: Get date separator label
function getDateLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

// Helper: Group messages
function groupMessages(messages: Message[]): { date: string; groups: { firstMessage: Message; messages: Message[] }[] }[] {
    const dayGroups: Map<string, Message[]> = new Map();
    
    messages.forEach(msg => {
        const dateKey = new Date(msg._creationTime).toDateString();
        if (!dayGroups.has(dateKey)) {
            dayGroups.set(dateKey, []);
        }
        dayGroups.get(dateKey)!.push(msg);
    });

    return Array.from(dayGroups.entries()).map(([dateKey, dayMessages]) => {
        const groups: { firstMessage: Message; messages: Message[] }[] = [];
        let currentGroup: Message[] = [];
        let lastUserId: string | null = null;
        let lastTime: number = 0;

        dayMessages.forEach(msg => {
            const timeDiff = msg._creationTime - lastTime;
            const sameUser = msg.userId === lastUserId;
            const withinTimeWindow = timeDiff < 5 * 60 * 1000; // 5 minutes

            if (sameUser && withinTimeWindow && currentGroup.length > 0) {
                currentGroup.push(msg);
            } else {
                if (currentGroup.length > 0) {
                    groups.push({ firstMessage: currentGroup[0], messages: currentGroup });
                }
                currentGroup = [msg];
            }
            lastUserId = msg.userId;
            lastTime = msg._creationTime;
        });

        if (currentGroup.length > 0) {
            groups.push({ firstMessage: currentGroup[0], messages: currentGroup });
        }

        return { date: dateKey, groups };
    });
}

// Date Separator Component
const DateSeparator = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px" style={{ backgroundColor: colors.divider }} />
        <span className="text-xs font-medium px-2" style={{ color: colors.textMuted }}>{label}</span>
        <div className="flex-1 h-px" style={{ backgroundColor: colors.divider }} />
    </div>
);

// Message Group Component
const MessageGroup = ({ 
    group, 
    onDelete,
    canDelete 
}: { 
    group: { firstMessage: Message; messages: Message[] };
    onDelete: (id: Id<"hubMessages">) => void;
    canDelete: boolean;
}) => {
    const [hoveredId, setHoveredId] = useState<Id<"hubMessages"> | null>(null);
    const [copiedId, setCopiedId] = useState<Id<"hubMessages"> | null>(null);

    const copyMessage = (msg: Message) => {
        navigator.clipboard.writeText(msg.content);
        setCopiedId(msg._id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    return (
        <div 
            className="group/messagegroup relative py-0.5 px-4 -mx-4 rounded transition-colors"
            style={{ backgroundColor: hoveredId ? colors.bgModifier : 'transparent' }}
        >
            {/* First message with avatar */}
            <div 
                className="flex gap-4 pt-1"
                onMouseEnter={() => setHoveredId(group.firstMessage._id)}
                onMouseLeave={() => setHoveredId(null)}
            >
                <div 
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold overflow-hidden"
                    style={{ backgroundColor: colors.accent }}
                >
                    {group.firstMessage.userAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={group.firstMessage.userAvatar} alt={group.firstMessage.userName} className="w-full h-full object-cover" />
                    ) : (
                        <span style={{ color: colors.text }}>{group.firstMessage.userName[0].toUpperCase()}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm hover:underline cursor-pointer" style={{ color: colors.text }}>
                            {group.firstMessage.userName}
                        </span>
                        <span 
                            className="text-xs cursor-default" 
                            style={{ color: colors.textMuted }}
                            title={formatExactTime(group.firstMessage._creationTime)}
                        >
                            {formatRelativeTime(group.firstMessage._creationTime)}
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed break-words" style={{ color: colors.text }}>
                        {group.firstMessage.content}
                    </p>
                </div>

                {/* Hover actions for first message */}
                {hoveredId === group.firstMessage._id && (
                    <div 
                        className="absolute right-2 -top-3 flex items-center gap-0.5 rounded shadow-lg border"
                        style={{ backgroundColor: colors.bgSecondary, borderColor: colors.divider }}
                    >
                        <button
                            onClick={() => copyMessage(group.firstMessage)}
                            className="p-1.5 rounded transition-colors hover:bg-white/10"
                            title="Copy message"
                        >
                            {copiedId === group.firstMessage._id ? (
                                <Check size={16} style={{ color: colors.green }} />
                            ) : (
                                <Copy size={16} style={{ color: colors.textMuted }} />
                            )}
                        </button>
                        {canDelete && (
                            <button
                                onClick={() => onDelete(group.firstMessage._id)}
                                className="p-1.5 rounded transition-colors hover:bg-white/10"
                                title="Delete message"
                            >
                                <Trash2 size={16} style={{ color: colors.danger }} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Subsequent messages (compact) */}
            {group.messages.slice(1).map((msg) => (
                <div 
                    key={msg._id}
                    className="flex gap-4 relative"
                    onMouseEnter={() => setHoveredId(msg._id)}
                    onMouseLeave={() => setHoveredId(null)}
                >
                    {/* Timestamp on hover */}
                    <div className="w-10 flex-shrink-0 flex items-center justify-end">
                        {hoveredId === msg._id && (
                            <span 
                                className="text-[10px] opacity-0 group-hover/messagegroup:opacity-100 transition-opacity"
                                style={{ color: colors.textMuted }}
                                title={formatExactTime(msg._creationTime)}
                            >
                                {new Date(msg._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                    <p className="flex-1 text-sm leading-relaxed break-words" style={{ color: colors.text }}>
                        {msg.content}
                    </p>

                    {/* Hover actions */}
                    {hoveredId === msg._id && (
                        <div 
                            className="absolute right-2 -top-2 flex items-center gap-0.5 rounded shadow-lg border"
                            style={{ backgroundColor: colors.bgSecondary, borderColor: colors.divider }}
                        >
                            <button
                                onClick={() => copyMessage(msg)}
                                className="p-1.5 rounded transition-colors hover:bg-white/10"
                                title="Copy message"
                            >
                                {copiedId === msg._id ? (
                                    <Check size={16} style={{ color: colors.green }} />
                                ) : (
                                    <Copy size={16} style={{ color: colors.textMuted }} />
                                )}
                            </button>
                            {canDelete && (
                                <button
                                    onClick={() => onDelete(msg._id)}
                                    className="p-1.5 rounded transition-colors hover:bg-white/10"
                                    title="Delete message"
                                >
                                    <Trash2 size={16} style={{ color: colors.danger }} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default function HubManagementPage() {
    const { user, loading: authLoading } = useAuth();
    
    // Queries
    const myHub = useQuery(api.hubs.getOrCreateMyHub);
    
    // Mutations
    const createHub = useMutation(api.hubs.createHub);
    const createChannel = useMutation(api.hubs.createChannel);
    const deleteChannel = useMutation(api.hubs.deleteChannel);
    const sendMessage = useMutation(api.hubs.sendMessage);
    const deleteMessage = useMutation(api.hubs.deleteMessage);
    
    // State
    const [selectedChannelId, setSelectedChannelId] = useState<Id<"hubChannels"> | null>(null);
    const [newHubName, setNewHubName] = useState("");
    const [newHubDescription, setNewHubDescription] = useState("");
    const [newChannelName, setNewChannelName] = useState("");
    const [messageInput, setMessageInput] = useState("");
    const [isCreatingHub, setIsCreatingHub] = useState(false);
    const [isCreatingChannel, setIsCreatingChannel] = useState(false);
    const [showNewChannelForm, setShowNewChannelForm] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Get messages for selected channel
    const messages = useQuery(
        api.hubs.getChannelMessages,
        selectedChannelId ? { channelId: selectedChannelId } : "skip"
    );

    // Group messages
    const groupedMessages = useMemo(() => {
        if (!messages) return [];
        return groupMessages(messages as Message[]);
    }, [messages]);

    // Auto-select first channel when hub loads
    useEffect(() => {
        if (myHub && myHub.channels.length > 0 && !selectedChannelId) {
            setSelectedChannelId(myHub.channels[0]._id);
        }
    }, [myHub, selectedChannelId]);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleCreateHub = async () => {
        if (!newHubName.trim()) return;
        setIsCreatingHub(true);
        try {
            await createHub({
                name: newHubName,
                description: newHubDescription || undefined,
            });
            setNewHubName("");
            setNewHubDescription("");
        } catch (e) {
            console.error(e);
        } finally {
            setIsCreatingHub(false);
        }
    };

    const handleCreateChannel = async () => {
        if (!newChannelName.trim() || !myHub) return;
        setIsCreatingChannel(true);
        try {
            await createChannel({
                hubId: myHub._id,
                name: newChannelName,
            });
            setNewChannelName("");
            setShowNewChannelForm(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsCreatingChannel(false);
        }
    };

    const handleDeleteChannel = async (channelId: Id<"hubChannels">) => {
        if (!confirm("Delete this channel and all its messages?")) return;
        try {
            await deleteChannel({ channelId });
            if (selectedChannelId === channelId) {
                setSelectedChannelId(myHub?.channels[0]?._id || null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedChannelId) return;
        const content = messageInput;
        setMessageInput("");
        try {
            await sendMessage({
                channelId: selectedChannelId,
                content,
            });
        } catch (e) {
            console.error(e);
            setMessageInput(content);
        }
    };

    const handleDeleteMessage = async (messageId: Id<"hubMessages">) => {
        try {
            await deleteMessage({ messageId });
        } catch (e) {
            console.error(e);
        }
    };

    const copyHubLink = () => {
        if (!user) return;
        const link = `${window.location.origin}/hub/${encodeURIComponent(user.id)}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Loading state
    if (authLoading || myHub === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.accent }} />
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.text }}>
                <div className="text-center">
                    <MessageSquare size={48} className="mx-auto mb-4" style={{ color: colors.accent }} />
                    <h1 className="text-2xl font-bold mb-2">Sign in to create your Hub</h1>
                    <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
                        Connect with your community in real-time
                    </p>
                    <Link 
                        href="/sign-in" 
                        className="px-6 py-3 font-semibold rounded-md transition-colors inline-block"
                        style={{ backgroundColor: colors.accent, color: colors.text }}
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    // No hub yet - show creation form
    if (!myHub) {
        return (
            <div className="min-h-screen p-8 flex justify-center items-start pt-20" style={{ backgroundColor: colors.bg, color: colors.text }}>
                <div className="w-full max-w-lg">
                    <Link href="/dashboard" className="flex items-center gap-2 mb-8 transition-colors text-sm font-medium" style={{ color: colors.textMuted }}>
                        <ChevronLeft size={16} /> Back to Dashboard
                    </Link>

                    <div className="rounded-lg shadow-xl p-6" style={{ backgroundColor: colors.bgSecondary }}>
                        <div className="flex items-center gap-4 mb-6 pb-4" style={{ borderBottom: `1px solid ${colors.divider}` }}>
                            <div className="p-3 rounded-full" style={{ backgroundColor: colors.accent + '20' }}>
                                <Sparkles size={24} style={{ color: colors.accent }} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold" style={{ color: colors.text }}>Create Your Hub</h1>
                                <p className="text-sm" style={{ color: colors.textMuted }}>A community space for your fans</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textMuted }}>Hub Name *</label>
                                <input 
                                    type="text" 
                                    value={newHubName}
                                    onChange={(e) => setNewHubName(e.target.value)}
                                    placeholder="e.g. The Arcane Tavern"
                                    className="w-full rounded-md px-3 py-2.5 focus:outline-none transition-colors text-sm"
                                    style={{ 
                                        backgroundColor: colors.bgTertiary, 
                                        color: colors.text,
                                        border: `1px solid ${colors.bgTertiary}`,
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textMuted }}>Description</label>
                                <textarea 
                                    value={newHubDescription}
                                    onChange={(e) => setNewHubDescription(e.target.value)}
                                    placeholder="A place for adventurers to gather..."
                                    rows={3}
                                    className="w-full rounded-md px-3 py-2.5 focus:outline-none transition-colors text-sm resize-none"
                                    style={{ 
                                        backgroundColor: colors.bgTertiary, 
                                        color: colors.text,
                                        border: `1px solid ${colors.bgTertiary}`,
                                    }}
                                />
                            </div>

                            <button 
                                onClick={handleCreateHub}
                                disabled={isCreatingHub || !newHubName.trim()}
                                className="flex items-center justify-center gap-2 w-full font-semibold py-2.5 rounded-md transition-colors disabled:opacity-50 text-sm"
                                style={{ backgroundColor: colors.accent, color: colors.text }}
                            >
                                {isCreatingHub ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Create Hub</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Hub exists - show management interface
    const selectedChannel = myHub.channels.find(c => c._id === selectedChannelId);

    return (
        <div className="h-screen flex" style={{ backgroundColor: colors.bg, color: colors.text }}>
            {/* Sidebar */}
            <div className="w-60 flex flex-col" style={{ backgroundColor: colors.bgSecondary }}>
                {/* Hub Header */}
                <div className="h-12 px-4 flex items-center shadow-sm" style={{ borderBottom: `1px solid ${colors.bgTertiary}` }}>
                    <h1 className="font-bold text-base truncate" style={{ color: colors.text }}>{myHub.name}</h1>
                    <button className="ml-auto p-1 rounded hover:bg-white/10 transition-colors">
                        <MoreHorizontal size={18} style={{ color: colors.textMuted }} />
                    </button>
                </div>

                {/* Share Link */}
                <div className="px-2 py-2">
                    <button 
                        onClick={copyHubLink}
                        className="w-full flex items-center justify-center gap-2 py-1.5 rounded text-xs font-medium transition-colors"
                        style={{ 
                            backgroundColor: copied ? colors.green + '20' : colors.bgModifier,
                            color: copied ? colors.green : colors.textMuted 
                        }}
                    >
                        {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Invite Link</>}
                    </button>
                </div>

                {/* Channels */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    <div className="flex items-center justify-between px-1 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.channelIcon }}>
                            Text Channels
                        </span>
                        <button 
                            onClick={() => setShowNewChannelForm(true)}
                            className="p-0.5 rounded hover:bg-white/10 transition-colors"
                        >
                            <Plus size={14} style={{ color: colors.channelIcon }} />
                        </button>
                    </div>

                    {showNewChannelForm && (
                        <div className="mb-2 p-2 rounded" style={{ backgroundColor: colors.bgTertiary }}>
                            <input
                                type="text"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                placeholder="new-channel"
                                className="w-full text-sm px-2 py-1 rounded mb-2 focus:outline-none"
                                style={{ backgroundColor: colors.bg, color: colors.text }}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                                autoFocus
                            />
                            <div className="flex gap-1">
                                <button
                                    onClick={handleCreateChannel}
                                    disabled={isCreatingChannel || !newChannelName.trim()}
                                    className="flex-1 text-xs py-1 rounded font-medium disabled:opacity-50"
                                    style={{ backgroundColor: colors.accent, color: colors.text }}
                                >
                                    {isCreatingChannel ? '...' : 'Create'}
                                </button>
                                <button
                                    onClick={() => { setShowNewChannelForm(false); setNewChannelName(""); }}
                                    className="px-2 text-xs py-1 rounded font-medium"
                                    style={{ color: colors.textMuted }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-0.5">
                        {myHub.channels.map((channel) => (
                            <div
                                key={channel._id}
                                className="group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors"
                                style={{ 
                                    backgroundColor: selectedChannelId === channel._id ? colors.bgModifierActive : 'transparent',
                                    color: selectedChannelId === channel._id ? colors.text : colors.channelIcon
                                }}
                                onClick={() => setSelectedChannelId(channel._id)}
                                onMouseEnter={(e) => {
                                    if (selectedChannelId !== channel._id) {
                                        e.currentTarget.style.backgroundColor = colors.bgModifierHover;
                                        e.currentTarget.style.color = colors.text;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedChannelId !== channel._id) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = colors.channelIcon;
                                    }
                                }}
                            >
                                <Hash size={18} style={{ color: colors.channelIcon }} />
                                <span className="flex-1 text-sm truncate">{channel.name}</span>
                                {myHub.channels.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channel._id); }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all hover:bg-white/10"
                                    >
                                        <Trash2 size={14} style={{ color: colors.danger }} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* User Panel */}
                <div className="h-[52px] px-2 flex items-center gap-2" style={{ backgroundColor: colors.bgTertiary }}>
                    <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden"
                        style={{ backgroundColor: colors.accent }}
                    >
                        {user.profilePictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            user.firstName?.[0]?.toUpperCase() || 'U'
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{user.firstName || 'User'}</p>
                        <p className="text-[10px] truncate" style={{ color: colors.textMuted }}>Owner</p>
                    </div>
                    <Link href="/settings" className="p-1.5 rounded hover:bg-white/10 transition-colors">
                        <Settings size={16} style={{ color: colors.textMuted }} />
                    </Link>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col" style={{ backgroundColor: colors.bg }}>
                {/* Channel Header */}
                <div className="h-12 px-4 flex items-center shadow-sm" style={{ borderBottom: `1px solid ${colors.bgTertiary}` }}>
                    <Hash size={20} style={{ color: colors.channelIcon }} />
                    <h2 className="font-bold ml-2" style={{ color: colors.text }}>{selectedChannel?.name || "Select a channel"}</h2>
                    {selectedChannel?.description && (
                        <>
                            <div className="w-px h-6 mx-3" style={{ backgroundColor: colors.divider }} />
                            <span className="text-sm truncate" style={{ color: colors.textMuted }}>
                                {selectedChannel.description}
                            </span>
                        </>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        <Users size={18} style={{ color: colors.textMuted }} />
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {messages === undefined ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.accent }} />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-start pt-8">
                            <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                style={{ backgroundColor: colors.bgModifier }}
                            >
                                <Hash size={32} style={{ color: colors.textMuted }} />
                            </div>
                            <h3 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                                Welcome to #{selectedChannel?.name}!
                            </h3>
                            <p className="text-sm" style={{ color: colors.textMuted }}>
                                This is the start of the #{selectedChannel?.name} channel.
                            </p>
                        </div>
                    ) : (
                        groupedMessages.map((day, dayIdx) => (
                            <div key={dayIdx}>
                                <DateSeparator label={getDateLabel(new Date(day.date).getTime())} />
                                {day.groups.map((group, groupIdx) => (
                                    <MessageGroup 
                                        key={groupIdx} 
                                        group={group} 
                                        onDelete={handleDeleteMessage}
                                        canDelete={true}
                                    />
                                ))}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="px-4 pb-6">
                    <div 
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg"
                        style={{ backgroundColor: colors.bgModifier }}
                    >
                        <Plus 
                            size={20} 
                            className="flex-shrink-0 cursor-pointer hover:text-white transition-colors" 
                            style={{ color: colors.textMuted }} 
                        />
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={`Message #${selectedChannel?.name || 'channel'}`}
                            className="flex-1 bg-transparent focus:outline-none text-sm"
                            style={{ color: colors.text }}
                            disabled={!selectedChannelId}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || !selectedChannelId}
                            className="p-1.5 rounded transition-colors disabled:opacity-30"
                            style={{ color: messageInput.trim() ? colors.accent : colors.textMuted }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
