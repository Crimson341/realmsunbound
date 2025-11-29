'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';

interface DialogueChoice {
  text: string;
  action?: string;
}

interface DialogueBoxProps {
  isOpen: boolean;
  speakerName: string;
  speakerRole?: string;
  text: string;
  choices?: DialogueChoice[];
  isLoading?: boolean;
  onClose: () => void;
  onChoiceSelect?: (choice: DialogueChoice) => void;
  onContinue?: () => void;
}

export function DialogueBox({
  isOpen,
  speakerName,
  speakerRole,
  text,
  choices = [],
  isLoading = false,
  onClose,
  onChoiceSelect,
  onContinue,
}: DialogueBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!isOpen || !text) {
      setDisplayedText('');
      return;
    }

    setIsTyping(true);
    setDisplayedText('');

    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 25); // Speed of typing

    return () => clearInterval(interval);
  }, [text, isOpen]);

  // Skip typing on click
  const handleBoxClick = () => {
    if (isTyping) {
      setDisplayedText(text);
      setIsTyping(false);
    } else if (choices.length === 0) {
      onContinue?.();
    }
  };

  // Handle keyboard
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleBoxClick();
      }
      if (e.code === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isTyping, choices.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
        >
          <div
            className="bg-genshin-dark/95 backdrop-blur-md border border-genshin-gold/40 rounded-xl shadow-2xl overflow-hidden cursor-pointer"
            onClick={handleBoxClick}
          >
            {/* Speaker Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-genshin-gold/10 border-b border-genshin-gold/20">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-genshin-gold" />
                <span className="font-serif font-bold text-genshin-gold">{speakerName}</span>
                {speakerRole && (
                  <span className="text-xs text-stone-500 uppercase tracking-wide">
                    ({speakerRole})
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-stone-500 hover:text-genshin-gold transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dialogue Content */}
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-stone-400">
                  <div className="w-2 h-2 rounded-full bg-genshin-gold animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-genshin-gold animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-genshin-gold animate-bounce delay-200" />
                </div>
              ) : (
                <p className="text-stone-200 leading-relaxed min-h-[3rem]">
                  {displayedText}
                  {isTyping && (
                    <span className="inline-block w-2 h-4 bg-genshin-gold ml-1 animate-pulse" />
                  )}
                </p>
              )}
            </div>

            {/* Choices */}
            {!isTyping && !isLoading && choices.length > 0 && (
              <div className="px-4 pb-4 space-y-2">
                {choices.map((choice, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChoiceSelect?.(choice);
                    }}
                    className="w-full text-left px-4 py-2 bg-stone-800/50 hover:bg-genshin-gold/20 border border-stone-700 hover:border-genshin-gold/50 rounded-lg text-stone-300 hover:text-genshin-gold transition-all group"
                  >
                    <span className="text-genshin-gold/60 mr-2">{index + 1}.</span>
                    {choice.text}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Continue Indicator */}
            {!isTyping && !isLoading && choices.length === 0 && (
              <div className="px-4 pb-3 text-center">
                <span className="text-xs text-stone-500 animate-pulse">
                  Press SPACE or click to continue...
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DialogueBox;
