"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { chatStorage, Chat, ChatMessage } from "@/features/chat/services/chatStorage";
import { sendChatMessage, generateChatTitle } from "@/features/ia/services/openai";
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
  detailLevel?: 'concise' | 'normal' | 'detailed';
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
    detailLevel = 'normal',
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
    setSavedChats(chatStorage.getAllChats());
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

    // Guard against parallel executions
    if (isRespondingRef.current) return;
    isRespondingRef.current = true;
    setLoading(true);

    try {
      // Build full history from currentMessages, not from savedChats
      const fullHistory = currentMessages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const context = initialTopic ? `El usuario está interesado en aprender sobre: ${initialTopic}.` : undefined;
      const config = { verbosity: detailLevel };

      const res = await sendChatMessage(fullHistory, context, config);

      const assistantText = res.respuesta || res.content || t('chat.error_generic');

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        animate: true
      };

      // Build the updated messages list from currentMessages
      const updatedMessages = [...currentMessages, assistantMessage];
      setMessages(updatedMessages);

      // Save chat using the unified updatedMessages
      const currentChat = savedChats.find(c => c.id === activeChatId);
      
      const updatedChat: Chat = currentChat ? {
        ...currentChat,
        messages: updatedMessages,
        updatedAt: Date.now()
      } : {
        id: activeChatId,
        title: initialTopic || "Nuevo Chat",
        messages: updatedMessages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        origin: 'aprendizaje',
        section: initialSector || undefined
      };
      
      chatStorage.saveChat(updatedChat);
      refreshChats();

      // NEW: Trigger auto-titling if it's the first exchange or title is generic
      if (updatedChat.messages.length >= 2 && (updatedChat.title === "Nuevo Chat" || updatedChat.title === initialTopic)) {
        generateChatTitle(updatedChat.messages).then(newTitle => {
          if (newTitle) {
            const titledChat = { ...updatedChat, title: newTitle };
            chatStorage.saveChat(titledChat);
            refreshChats();
          }
        });
      }

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
  }, [activeChatId, autoPlay, detailLevel, initialSector, initialTopic, onPlayError, onPlayMessage, onSpeak, refreshChats, savedChats, t]);

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

  const handleSaveChat = useCallback(async (customTitle?: string) => {
    if (!messages.length) return;

    const sectorInfo = detectChatSector(messages);
    
    let finalTitle = customTitle;
    if (!finalTitle) {
      // Try to generate a better title via IA if it's still generic
      const currentChat = savedChats.find(c => c.id === activeChatId);
      if (currentChat && (currentChat.title === "Nuevo Chat" || currentChat.title === initialTopic)) {
         const aiTitle = await generateChatTitle(messages);
         if (aiTitle) finalTitle = aiTitle;
      }

      if (!finalTitle) {
        const firstUserMsg = messages.find(m => m.role === 'user')?.content || 'Nuevo Chat';
        finalTitle = firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg;
      }
    }

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
  }, [activeChatId, initialTopic, linkedLearningId, messages, onPlaySuccess, refreshChats, savedChats]);

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
