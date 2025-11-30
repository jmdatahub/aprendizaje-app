import { useState, useEffect } from 'react';
import { chatStorage, Chat } from '../services/chatStorage';
import { getChatMetadata } from '../utils/chatUtils';

export function useChatList() {
  const [chats, setChats] = useState<Chat[]>([]);

  const refreshChats = () => {
    setChats(chatStorage.getAllChats());
  };

  useEffect(() => {
    // Migration: Check for chats without metadata and fix them
    const allChats = chatStorage.getAllChats();
    let hasChanges = false;
    
    const migratedChats = allChats.map(chat => {
      if (!chat.emoji || !chat.color || !chat.section || chat.section === 'General') {
        const metadata = getChatMetadata(chat.messages);
        hasChanges = true;
        return {
          ...chat,
          emoji: metadata.emoji,
          color: metadata.color,
          section: metadata.section, // Store the raw section key or translated? 
          // Note: chatStorage usually stores translated section name if from props, 
          // but for metadata we might want the key. 
          // Let's store the key if we can, but UI expects text.
          // For now, let's rely on metadata.section which is the key, 
          // and let the UI handle translation if needed, or just store the key.
          // Actually, existing code stores "t('sectors...')" which is bad for persistence.
          // Let's store the key if possible, but for compatibility let's just ensure we have *something* distinct.
          tags: metadata.tags
        };
      }
      return chat;
    });

    if (hasChanges) {
      // We can't batch save easily with current service, so we iterate
      migratedChats.forEach(c => chatStorage.saveChat(c));
      refreshChats();
    } else {
      refreshChats();
    }

    const handleStorage = () => {
      refreshChats();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    chats,
    refreshChats,
    deleteChat: (id: string) => {
      chatStorage.deleteChat(id);
      refreshChats();
    }
  };
}
