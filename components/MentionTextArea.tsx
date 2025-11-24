"use client";

import React, { useState, useRef } from 'react';

type Suggestion = {
    id: string;
    name: string;
    type: 'Item' | 'NPC' | 'Location' | 'Quest';
};

interface MentionTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    suggestions: Suggestion[];
    value: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (e: any) => void;
}

export const MentionTextArea = ({ label, suggestions, value, onChange, ...props }: MentionTextAreaProps) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorPos, setCursorPos] = useState(0);
    const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const newCursorPos = e.target.selectionStart;
        onChange(e);
        setCursorPos(newCursorPos);

        // Check for @ mention
        const textBeforeCursor = val.substring(0, newCursorPos);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtPos + 1);
            // If space, reset unless it's part of the name we are typing? 
            // Simplified: Only allow single word or continuous typing until space for now, 
            // or check if we are "in" a mention.
            // Better regex: look for @ followed by non-whitespace chars at the end
            // But names have spaces. So let's just look for @ and capture everything until cursor.
            // If the capture has a newline, abort.
            if (!textAfterAt.includes('\n')) {
                setShowSuggestions(true);
                const filtered = suggestions.filter(s =>
                    s.name.toLowerCase().includes(textAfterAt.toLowerCase())
                );
                setFilteredSuggestions(filtered);
                return;
            }
        }
        setShowSuggestions(false);
    };

    const insertSuggestion = (suggestion: Suggestion) => {
        if (!textareaRef.current) return;
        const val = value;
        const textBeforeCursor = val.substring(0, cursorPos);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = val.substring(cursorPos);

        const newValue = val.substring(0, lastAtPos) + `[${suggestion.name}]` + textAfterCursor;
        
        // Create a synthetic event to bubble up the change
        const event = {
            target: { value: newValue },
            preventDefault: () => {}
        };
        onChange(event);
        setShowSuggestions(false);
        
        // Restore focus (simple approach, cursor might jump to end)
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    };

    return (
        <div className="space-y-1 relative">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{label}</label>
            <textarea
                ref={textareaRef}
                className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors min-h-[80px]"
                value={value}
                onChange={handleInput}
                onKeyDown={() => {
                    // Optional: Handle Arrows/Enter for suggestions
                }}
                {...props}
            />
            
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 bg-stone-900 border border-stone-800 rounded-lg shadow-xl max-h-48 overflow-y-auto mt-1">
                    {filteredSuggestions.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => insertSuggestion(s)}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-900/30 text-sm flex items-center justify-between group"
                        >
                            <span className="text-stone-200 group-hover:text-white">{s.name}</span>
                            <span className="text-[10px] text-stone-500 bg-stone-950 px-1.5 py-0.5 rounded uppercase">{s.type}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
