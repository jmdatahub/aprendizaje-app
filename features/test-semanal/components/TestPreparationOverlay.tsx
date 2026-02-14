import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface TestPreparationOverlayProps {
  isOpen: boolean;
  status: 'idle' | 'generating' | 'ready' | 'in_progress' | 'error';
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

import { useApp } from "@/shared/contexts/AppContext";

export function TestPreparationOverlay({ isOpen, status, error, onRetry, onClose }: TestPreparationOverlayProps) {
  const { t } = useApp();
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = (t('test.preparing_messages', { returnObjects: true }) as unknown) as string[];

  useEffect(() => {
    if (status === 'generating') {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [status]);

  if (!isOpen) return null;
  if (status === 'idle' && !error) return null;
  if (status === 'ready') return null;
  if (status === 'in_progress') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden border border-gray-100"
      >
        {/* Close/Minimize Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
          title={t('common.close')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {status === 'generating' && (
            <div className="flex flex-col items-center space-y-8 py-4">
                {/* Animation */}
                <div className="relative w-24 h-24">
                    <motion.div 
                        className="absolute inset-0 border-[6px] border-indigo-50 rounded-full"
                    />
                    <motion.div 
                        className="absolute inset-0 border-[6px] border-indigo-600 rounded-full border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
                        🧠
                    </div>
                </div>

                <div className="space-y-3 w-full">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('test.preparing_title')}</h2>
                    <div className="h-6 overflow-hidden relative w-full flex justify-center">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={messageIndex}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-gray-500 text-sm font-medium absolute w-full text-center"
                            >
                                {messages[messageIndex]}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium text-sm"
                >
                  {t('test.continue_background')}
                </Button>
            </div>
        )}

        {status === 'error' && (
            <div className="flex flex-col items-center space-y-6 py-2">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-4xl mb-2 shadow-sm">
                    ⚠️
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">{t('test.error_title')}</h2>
                    <p className="text-gray-500 text-sm px-4">{error || t('test.error_generating')}</p>
                </div>
                <div className="flex gap-3 w-full pt-4">
                    <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700">
                        {t('common.close')}
                    </Button>
                    <Button onClick={onRetry} className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                        {t('common.retry')}
                    </Button>
                </div>
            </div>
        )}
      </motion.div>
    </div>
  );
}
