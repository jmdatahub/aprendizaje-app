import { useState, useEffect, useCallback } from 'react';
import { chatStorage, Chat, ChatMessage } from '../services/chatStorage';

export function useChatPersistence(chatId?: string) {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);

  // Load chat on mount or id change
  useEffect(() => {
    if (chatId) {
      const chat = chatStorage.getChat(chatId);
      if (chat) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates currentChat from localStorage when chatId changes; a derived/lazy initializer can't be used because chatId is a prop that can change after mount
        setCurrentChat(chat);
      }
    }
  }, [chatId]);

  const saveMessage = useCallback((message: ChatMessage) => {
    if (!currentChat) return;

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, message],
      updatedAt: Date.now()
    };

    setCurrentChat(updatedChat);
    chatStorage.saveChat(updatedChat);
  }, [currentChat]);

  const updateChatTitle = useCallback((title: string) => {
    if (!currentChat) return;
    
    const updatedChat = {
      ...currentChat,
      title,
      updatedAt: Date.now()
    };

    setCurrentChat(updatedChat);
    chatStorage.saveChat(updatedChat);
  }, [currentChat]);

  const initChat = useCallback((partialChat: Partial<Chat>) => {
    const newChat = chatStorage.createChat(partialChat);
    setCurrentChat(newChat);
    return newChat;
  }, []);

  return {
    currentChat,
    saveMessage,
    updateChatTitle,
    initChat,
    refreshChat: () => chatId && setCurrentChat(chatStorage.getChat(chatId))
  };
}
