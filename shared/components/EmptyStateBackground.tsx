import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface EmptyStateBackgroundProps {
  active: boolean;
  context?: 'chat' | 'sidebar' | 'learnings' | 'general';
  customMessages?: string[];
  className?: string;
}

export const EmptyStateBackground: React.FC<EmptyStateBackgroundProps> = ({
  active,
  context = 'general',
  customMessages,
  className = ''
}) => {
  const { t } = useTranslation();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Get messages from props or translations
  const messages = customMessages || t('common.empty_state_messages', { returnObjects: true }) as string[];

  // Rotate messages
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [active, messages.length]);

  if (!active) return null;

  return (
    <div 
      className={`absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMessageIndex}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -10 }}
          transition={{ 
            duration: 0.8, 
            ease: [0.16, 1, 0.3, 1] // Custom ease-out
          }}
          className="text-center px-8 max-w-4xl w-full"
        >
          <h2 
            className="text-4xl md:text-6xl lg:text-7xl font-[100] tracking-tight text-foreground/5 dark:text-foreground/10 leading-tight"
            style={{ 
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              textShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            {messages[currentMessageIndex]}
          </h2>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
