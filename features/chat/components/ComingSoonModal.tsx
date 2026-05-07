import React from 'react';
import { useApp } from '@/shared/contexts/AppContext';
import { Sheet } from '@/shared/components';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComingSoonModal({ isOpen, onClose }: ComingSoonModalProps) {
  const { t } = useApp();

  return (
    <Sheet open={isOpen} onClose={onClose} desktopMaxWidth="max-w-sm">
      <div className="p-6 sm:p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{t('common.coming_soon_title')}</h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-6">
          {t('common.coming_soon_desc')}
        </p>
        <button
          onClick={onClose}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 active:scale-[0.97] transition-all w-full sm:w-auto min-h-[44px]"
        >
          {t('common.understood')}
        </button>
      </div>
    </Sheet>
  );
}
