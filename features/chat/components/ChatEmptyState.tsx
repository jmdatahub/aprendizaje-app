import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/shared/contexts/AppContext';

const EMPTY_MESSAGES = [
  "chat.empty_state_1",
  "chat.empty_state_2",
  "chat.empty_state_3",
  "chat.empty_state_4"
];

interface ChatEmptyStateProps {
  suggestions: string[];
  onTopicClick: (topic: string) => void;
}

export function ChatEmptyState({ suggestions, onTopicClick }: ChatEmptyStateProps) {
  const { t } = useApp();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % EMPTY_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
      <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-primary/10 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full" />
        <span className="text-5xl relative z-10 transition-transform duration-300 group-hover:scale-110">👋</span>
      </div>

      <div className="h-16 mb-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.h3
            key={messageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-semibold text-foreground/80"
          >
            {t(EMPTY_MESSAGES[messageIndex]) || t('chat.welcome_title')}
          </motion.h3>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
        {suggestions.map((topic, i) => (
          <button
            key={i}
            onClick={() => onTopicClick(topic)}
            className="text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-sm font-medium group-hover:text-primary transition-colors relative z-10">
              {topic}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
