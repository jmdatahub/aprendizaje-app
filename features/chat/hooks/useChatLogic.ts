"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { chatStorage, Chat, ChatMessage } from "@/features/chat/services/chatStorage";
import { sendChatMessage } from "@/features/ia/services/openai";
import { detectChatSector } from "@/features/chat/utils/sectorUtils";

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface UseChatLogicOptions {
  initialChatId?: string;
  initialTopic?: string;
  initialSector?: string;
  autostart?: boolean;
  linkedLearningId?: string;
  onPlayMessage?: () => void;
  onPlayError?: () => void;
  onPlaySuccess?: () => void;
  onPlayClick?: () => void;
  onSpeak?: (text: string) => void;
  onStop?: () => void;
  autoPlay?: boolean;
  t: (key: string, params?: Record<string, any>) => string;
}

interface UseChatLogicReturn {
  // State
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  activeChatId: string;
  savedChats: Chat[];
  pendingQueue: ChatMessage[];
  
  // Handlers
  handleSend: (textOverride?: string) => Promise<void>;
  handleNewChat: () => void;
  handleSelectChat: (chat: Chat) => void;
  handleDeleteChat: (id: string) => void;
  handleDuplicateChat: (targetChat?: Chat) => void;
  handleSaveChat: (customTitle?: string) => void;
  handleEndChat: () => void;
  refreshChats: () => void;
  processQueue: (currentMessages: ChatMessage[]) => Promise<void>;
  
  // Computed
  filteredChats: Chat[];
  isRespondingRef: React.MutableRefObject<boolean>;
}

export function useChatLogic(options: UseChatLogicOptions): UseChatLogicReturn {
  const {
    initialChatId,
    initialTopic,
    initialSector,
    linkedLearningId,
    onPlayMessage,
    onPlayError,
    onPlaySuccess,
    onPlayClick,
    onSpeak,
    onStop,
    autoPlay = false,
    t
  } = options;

  // Core State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string>(initialChatId || createId());
  const [savedChats, setSavedChats] = useState<Chat[]>([]);
  const [pendingQueue, setPendingQueue] = useState<ChatMessage[]>([]);
  const isRespondingRef = useRef(false);

  // Load chats on mount
  useEffect(() => {
    refreshChats();
  }, []);

  const refreshChats = useCallback(() => {
    setSavedChats(chatStorage.getChats());
  }, []);

  // Process Queue Effect
  useEffect(() => {
    if (pendingQueue.length > 0 && !isRespondingRef.current) {
      const nextMsg = pendingQueue[0];
      setPendingQueue(prev => prev.slice(1));
      processQueue([...messages, nextMsg]);
    }
  }, [pendingQueue, messages]);

  // Filter & Sort (simplified - returns all for now, sorting in component)
  const filteredChats = savedChats;

  const processQueue = useCallback(async (currentMessages: ChatMessage[]) => {
    const lastMsg = currentMessages[currentMessages.length - 1];
    if (lastMsg.role !== 'user') return;

    setLoading(true);
    isRespondingRef.current = true;

    try {
      const fullHistory = currentMessages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const context = initialTopic ? `El usuario está interesado en aprender sobre: ${initialTopic}.` : undefined;
      const config = { verbosity: 'normal' as const };

      const res = await sendChatMessage(fullHistory, context, config);

      const assistantText = res.respuesta || res.content || t('chat.error_generic');

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        animate: true
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save chat
      const currentChat = savedChats.find(c => c.id === activeChatId);
      const batch = [lastMsg]; 
      
      const updatedChat: Chat = currentChat ? {
        ...currentChat,
        messages: [...currentChat.messages, ...batch, assistantMessage],
        updatedAt: Date.now()
      } : {
        id: activeChatId,
        title: initialTopic || "Nuevo Chat",
        messages: [...batch, assistantMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        origin: 'aprendizaje',
        section: initialSector || undefined
      };
      
      chatStorage.saveChat(updatedChat);
      refreshChats();

      if (autoPlay && onSpeak) {
        onSpeak(assistantText);
      }
      
      onPlayMessage?.();
      setLoading(false);
      isRespondingRef.current = false;

    } catch {
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: t('chat.error_connection'),
        animate: true
      };
      setMessages(prev => [...prev, assistantMessage]);
      onPlayError?.();
      setLoading(false);
      isRespondingRef.current = false;
    }
  }, [activeChatId, autoPlay, initialSector, initialTopic, onPlayError, onPlayMessage, onSpeak, refreshChats, savedChats, t]);

  const handleSend = useCallback(async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    
    onStop?.();

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: textToSend.trim(),
      animate: true,
      status: 'pending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

    if (isRespondingRef.current) {
      setPendingQueue(prev => [...prev, userMessage]);
      return;
    }

    processQueue([...messages, userMessage]);
  }, [input, messages, onStop, processQueue]);

  const handleNewChat = useCallback(() => {
    const newId = createId();
    setActiveChatId(newId);
    setMessages([{ 
      id: "welcome-1",
      role: "assistant", 
      content: "Pregúntame lo que quieras y yo te lo enseño",
      animate: true 
    }]);
    onStop?.();
    onPlayClick?.();
  }, [onPlayClick, onStop]);

  const handleSelectChat = useCallback((chat: Chat) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages.map(m => ({ ...m, animate: false })));
    onPlayClick?.();
  }, [onPlayClick]);

  const handleDeleteChat = useCallback((id: string) => {
    chatStorage.deleteChat(id);
    refreshChats();
    if (activeChatId === id) {
      handleNewChat();
    }
  }, [activeChatId, handleNewChat, refreshChats]);

  const handleDuplicateChat = useCallback((targetChat?: Chat) => {
    const sourceChat = targetChat || savedChats.find(c => c.id === activeChatId);
    if (!sourceChat) return;
    
    const baseTitle = sourceChat.title || 'Chat';
    const newTitle = `${baseTitle} (copia)`;
    const newId = createId();
    
    const duplicatedChat: Chat = {
      id: newId,
      title: newTitle,
      messages: sourceChat.messages.map(m => ({...m})),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      origin: 'aprendizaje',
      section: sourceChat.section,
      tags: sourceChat.tags,
      emoji: sourceChat.emoji,
      color: sourceChat.color
    };
    
    chatStorage.saveChat(duplicatedChat);
    refreshChats();
    setActiveChatId(newId);
    onPlaySuccess?.();
  }, [activeChatId, onPlaySuccess, refreshChats, savedChats]);

  const handleSaveChat = useCallback((customTitle?: string) => {
    if (!messages.length) return;

    const sectorInfo = detectChatSector(messages);
    
    const firstUserMsg = messages.find(m => m.role === 'user')?.content || 'Nuevo Chat';
    const generatedTitle = firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg;
    const finalTitle = customTitle || generatedTitle;

    const newChat: Chat = {
      id: activeChatId,
      title: finalTitle,
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      origin: 'aprendizaje',
      section: sectorInfo.key,
      tags: [sectorInfo.key],
      linkedLearningId: linkedLearningId || undefined,
      emoji: sectorInfo.emoji, 
      color: sectorInfo.colorClass 
    };

    chatStorage.saveChat(newChat);
    refreshChats();
    onPlaySuccess?.();
  }, [activeChatId, linkedLearningId, messages, onPlaySuccess, refreshChats]);

  const handleEndChat = useCallback(() => {
    setMessages([{ 
      id: createId(), 
      role: "assistant", 
      content: "Pregúntame lo que quieras y yo te lo enseño",
      animate: true 
    }]);
    setActiveChatId(createId());
    onStop?.();
    onPlayClick?.();
  }, [onPlayClick, onStop]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    loading,
    activeChatId,
    savedChats,
    pendingQueue,
    handleSend,
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,
    handleDuplicateChat,
    handleSaveChat,
    handleEndChat,
    refreshChats,
    processQueue,
    filteredChats,
    isRespondingRef
  };
}
