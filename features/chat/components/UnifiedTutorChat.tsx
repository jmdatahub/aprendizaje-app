"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sendChatMessage, createAprendizajeDraft, generateRecommendations } from "@/lib/apiClient";
import { ChatEmptyState } from "@/features/chat/components/ChatEmptyState";
import { RecommendationsBlock } from "@/features/chat/components/RecommendationsBlock";
import { SaveLearningModal } from "@/features/learning/components/SaveLearningModal";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { useChatList } from "@/features/chat/hooks/useChatList";
import { chatStorage, Chat } from "@/features/chat/services/chatStorage";
import { playClick, playMessage, playError, playSuccess } from "@/shared/utils/sounds";
import { useApp } from "@/shared/contexts/AppContext";
import { detectChatSector } from "@/features/chat/utils/chatUtils";
import { SECTORES_DATA } from "@/shared/constants/sectores";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  animate?: boolean;
  status?: 'pending' | 'sent' | 'error';
};

const SUGGESTED_TOPICS = [
  "Ayúdame a entender las derivadas",
  "Explícame la Revolución Francesa",
  "¿Cómo funcionan los agujeros negros?",
  "Quiero practicar inglés"
];

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface UnifiedTutorChatProps {
  initialChatId?: string;
  initialContext?: string;
  initialTopic?: string;
  initialMode?: string;
  initialSector?: string;
  autostart?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  linkedLearningId?: string;
}

export function UnifiedTutorChat({
  initialChatId,
  initialContext,
  initialTopic,
  initialMode,
  initialSector,
  autostart,
  onClose,
  embedded = false,
  linkedLearningId
}: UnifiedTutorChatProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tema = initialTopic || searchParams?.get("tema");
  const continueContext = initialContext || searchParams?.get("continueContext");
  const intent = searchParams?.get("intent");
  const shouldAutostart = autostart || searchParams?.get("autostart") === 'true' || searchParams?.get("autostart") === '1';
  const mode = initialMode || searchParams?.get("mode");
  const sector = initialSector || searchParams?.get("sector");
  
  const { t } = useApp();
  const hasStartedRef = useRef(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [verbosity, setVerbosity] = useState(50);

  const [pendingQueue, setPendingQueue] = useState<ChatMessage[]>([]);
  const isRespondingRef = useRef(false);

  const { chats: savedChats, refreshChats } = useChatList();
  const [activeChatId, setActiveChatId] = useState<string>(initialChatId || createId());
  const [isSidebarOpen, setIsSidebarOpen] = useState(!embedded);
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('expanded');
  
  const [recommendations, setRecommendations] = useState<{relatedTopics: string[], subtopics: string[]} | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonControls = useAnimation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Summary Panel State
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    titulo: string;
    resumen: string;
    tags?: string[];
    sectorId?: string;
  } | null>(null);
  const [confirmedSectorId, setConfirmedSectorId] = useState<string | null>(null);
  const [isEditingSector, setIsEditingSector] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Save Learning Modal State
  const [showSaveLearningModal, setShowSaveLearningModal] = useState(false);
  const [learningDraft, setLearningDraft] = useState<{
    title: string;
    summary: string;
    section?: string;
    tags?: string[];
  } | null>(null);

  // Sidebar Resizing
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(200, Math.min(450, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const saved = localStorage.getItem('chat_sidebar_view_mode');
    if (saved === 'compact' || saved === 'expanded') {
      setViewMode(saved);
    }
  }, []);

  const toggleViewMode = () => {
    const newMode = viewMode === 'compact' ? 'expanded' : 'compact';
    setViewMode(newMode);
    localStorage.setItem('chat_sidebar_view_mode', newMode);
  };

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'section'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredChats = React.useMemo(() => {
    let result = savedChats.filter(c => 
      (c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    const handleSortChange = (criteria: 'date' | 'title' | 'section') => {
      if (sortBy === criteria) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(criteria);
        setSortDirection(criteria === 'date' ? 'desc' : 'asc');
      }
    };

    switch (sortBy) {
      case 'date':
        result.sort((a, b) => sortDirection === 'asc' ? (a.updatedAt - b.updatedAt) : (b.updatedAt - a.updatedAt));
        break;
      case 'title':
        result.sort((a, b) => {
          const titleA = a.title || '';
          const titleB = b.title || '';
          return sortDirection === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
        });
        break;
      case 'section':
        result.sort((a, b) => {
          const sectionA = a.section || 'General';
          const sectionB = b.section || 'General';
          const compare = sectionA.localeCompare(sectionB);
          if (compare !== 0) return sortDirection === 'asc' ? compare : -compare;
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
        break;
    }
    return result;
  }, [savedChats, sortBy, sortDirection, searchQuery]);

  const handleSortChange = (criteria: 'date' | 'title' | 'section') => {
      if (sortBy === criteria) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(criteria);
        setSortDirection(criteria === 'date' ? 'desc' : 'asc');
      }
  };

  const handleDeleteChat = (id: string) => {
    chatStorage.deleteChat(id);
    refreshChats();
    if (activeChatId === id) {
      setActiveChatId(createId());
      setMessages([]);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAtBottomRef.current = isAtBottom;
  };

  const scrollToBottom = (force = false) => {
    if (force || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      scrollToBottom(true);
    } else {
      scrollToBottom();
    }
  }, [messages, loading, recommendations, recommendationsLoading]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleToggleListening = () => {
    if (!browserSupportsSpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome.");
      return;
    }

    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      stopSpeaking();
      SpeechRecognition.startListening({ continuous: true, language: 'es-ES' });
    }
  };

  useEffect(() => {
    if (initialChatId && initialChatId !== 'main') {
        const existing = savedChats.find(c => c.id === initialChatId);
        if (existing) {
            setActiveChatId(existing.id);
            setMessages(existing.messages.map(m => ({ ...m, animate: false })));
            return;
        }
    }

    if (messages.length > 0) return;

    if (shouldAutostart && !hasStartedRef.current) {
        hasStartedRef.current = true;
        startAutoChat();
    } else if (!messages.length) {
        setMessages([{ 
            id: "welcome", 
            role: "assistant", 
            content: "Pregúntame lo que quieras y yo te lo enseño",
            animate: true 
        }]);
    }
  }, [initialChatId, savedChats, shouldAutostart]);

  const startAutoChat = async () => {
    setLoading(true);
    isRespondingRef.current = true;
    try {
        let initialUserText = "";
        let systemContext = "";

        if (mode === 'review' && tema) {
            initialUserText = t('chat.review_intent', { topic: tema });
            systemContext = `El usuario necesita repasar el tema "${tema}" del sector "${sector || 'General'}".
            Tu objetivo es hacer un REPASO INTERACTIVO. Haz preguntas específicas una a una.`;
        } else if (intent === 'suggest_topics' && tema) {
            initialUserText = t('chat.suggest_intent', { topic: tema });
            systemContext = `El usuario quiere explorar el tema "${tema}". Sugiere subtemas interesantes.`;
        } else if (continueContext) {
             initialUserText = t('chat.continue_intent', { topic: continueContext });
             systemContext = `Retoma la conversación sobre: ${continueContext}. Haz un breve resumen y pregunta cómo seguir.`;
        } else {
             initialUserText = t('chat.default_greeting');
        }

        const userMsg: ChatMessage = {
            id: createId(),
            role: 'user',
            content: initialUserText,
            animate: false
        };
        
        setMessages([userMsg]);

        const res = await sendChatMessage(
            [{ role: 'user', content: initialUserText }], 
            systemContext,
            { verbosity: 'normal' }
        );
        
        const aiMsg: ChatMessage = {
            id: createId(),
            role: 'assistant',
            content: res.respuesta || res.content || t('chat.default_greeting'),
            animate: true
        };
        
        setMessages(prev => [...prev, aiMsg]);
        
        if (autoPlay) {
            speak(res.respuesta || res.content || t('chat.default_greeting'));
        }
        
    } catch (e) {
        console.error("Error auto-starting chat", e);
    } finally {
        setLoading(false);
        isRespondingRef.current = false;
    }
  };

  const processQueue = async (currentMessages: ChatMessage[]) => {
    if (pendingQueue.length === 0) {
      setLoading(false);
      isRespondingRef.current = false;
      return;
    }

    const batch = [...pendingQueue];
    setPendingQueue([]);

    setMessages(prev => prev.map(m => batch.find(b => b.id === m.id) ? { ...m, status: 'sent' } : m));

    try {
      const fullHistory = [...currentMessages, ...batch].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const context = tema ? `El usuario está interesado en aprender sobre: ${tema}.` : undefined;
      
      const config = {
        verbosity: (verbosity < 33 ? 'concise' : verbosity > 66 ? 'detailed' : 'normal') as 'concise' | 'detailed' | 'normal'
      };

      const res = await sendChatMessage(fullHistory, context, config);

      const assistantText =
        res.respuesta || 
        res.content || 
        t('chat.error_generic');

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        animate: true
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const currentChat = savedChats.find(c => c.id === activeChatId);
      
      const updatedChat: Chat = currentChat ? {
          ...currentChat,
          messages: [...currentMessages, ...batch, assistantMessage],
          updatedAt: Date.now()
      } : {
          id: activeChatId,
          title: tema || "Nuevo Chat",
          messages: [...batch, assistantMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          origin: 'aprendizaje',
          section: sector || undefined
      };
      
      chatStorage.saveChat(updatedChat);
      refreshChats();

      if (autoPlay) {
        speak(assistantText);
      }
      
      playMessage();

      await processQueue([...currentMessages, ...batch, assistantMessage]);

    } catch {
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: t('chat.error_connection'),
        animate: true
      };
      setMessages((prev) => [...prev, assistantMessage]);
      playError();
      setLoading(false);
      isRespondingRef.current = false;
    }
  };

  const handleSend = async () => {
    let textToSend = input;
    
    if (listening) {
      SpeechRecognition.stopListening();
      if (transcript) {
        textToSend += (textToSend ? " " : "") + transcript;
      }
      resetTranscript();
    }

    if (!textToSend.trim()) return;
    
    stopSpeaking();

    sendButtonControls.start({
      scale: [1, 1.08, 1],
      transition: { duration: 0.16, ease: "easeOut" }
    });

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: textToSend.trim(),
      animate: true,
      status: 'pending'
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (isRespondingRef.current) {
      setPendingQueue(prev => [...prev, userMessage]);
      return;
    }

    setLoading(true);
    isRespondingRef.current = true;
    
    setMessages(prev => prev.map(m => m.id === userMessage.id ? { ...m, status: 'sent' } : m));

    if (activeChatId && activeChatId !== 'main') {
        const chat = savedChats.find(c => c.id === activeChatId);
        if (chat) {
            const updatedChat = { ...chat, messages: [...chat.messages, userMessage], updatedAt: Date.now() };
            chatStorage.saveChat(updatedChat);
            refreshChats();
        }
    }

    try {
      const fullHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const context = tema ? `El usuario está interesado en aprender sobre: ${tema}.` : undefined;
      
      const config = {
        verbosity: (verbosity < 33 ? 'concise' : verbosity > 66 ? 'detailed' : 'normal') as 'concise' | 'detailed' | 'normal'
      };

      const res = await sendChatMessage(fullHistory, context, config);

      const assistantText =
        res.respuesta || 
        res.content || 
        t('chat.error_generic');

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        animate: true
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const currentChat = savedChats.find(c => c.id === activeChatId);
      
      const updatedChat: Chat = currentChat ? {
          ...currentChat,
          messages: [...messages, userMessage, assistantMessage],
          updatedAt: Date.now()
      } : {
          id: activeChatId,
          title: tema || "Nuevo Chat",
          messages: [userMessage, assistantMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          origin: 'aprendizaje',
          section: sector || undefined
      };
      
      chatStorage.saveChat(updatedChat);
      refreshChats();

      if (mode === 'learning_path' || intent === 'suggest_topics') {
          setRecommendationsLoading(true);
          try {
            const recommendationsRes = await generateRecommendations(
              [...messages, userMessage, assistantMessage].map(m => ({
                role: m.role,
                content: m.content
              }))
            );
            setRecommendations({
              relatedTopics: recommendationsRes.relatedTopics,
              subtopics: recommendationsRes.subtopics
            });
          } catch (e) {
            console.error('Error generating recommendations:', e);
          } finally {
            setRecommendationsLoading(false);
          }
      }

      if (autoPlay) {
        speak(assistantText);
      }
      
      playMessage();

      await processQueue([...messages, userMessage, assistantMessage]);

    } catch {
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: t('chat.error_connection'),
        animate: true
      };
      setMessages((prev) => [...prev, assistantMessage]);
      playError();
      setLoading(false);
      isRespondingRef.current = false;
    }
  };

  const handleSaveChat = async (customTitle?: string, customSummary?: string) => {
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
    playSuccess();
  };

  const handleEndChat = () => {
      setMessages([{ 
          id: createId(), 
          role: "assistant", 
          content: "Pregúntame lo que quieras y yo te lo enseño",
          animate: true 
      }]);
      setActiveChatId(createId());
      setRecommendations(null);
      stopSpeaking();
      playClick();
  };

  const handleSelectChat = (chat: Chat) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages.map(m => ({ ...m, animate: false })));
    playClick();
  };

  const handleNewChat = () => {
    const newId = createId();
    setActiveChatId(newId);
    setMessages([{ 
      id: "welcome-1",
      role: "assistant",
      content: "Pregúntame lo que quieras y yo te lo enseño",
      animate: true 
    }]);
    setSummaryData(null);
    setShowSummaryPanel(false);
    setRecommendations(null);
    stopSpeaking();
    playClick();
  };

  const handleTopicClick = async (topic: string) => {
    setRecommendations(null);
    setLoading(true);
    playClick();
    
    try {
      const initialUserText = t('chat.topic_intent', { topic });
      const systemContext = `El usuario quiere aprender sobre ${topic}. Saluda y pregunta qué le interesa específicamente.`;
      
      const userMsg: ChatMessage = {
        id: createId(),
        role: 'user',
        content: initialUserText,
        animate: true
      };
      setMessages([userMsg]);
      
      const res = await sendChatMessage(
        [{ role: 'user', content: initialUserText }], 
        systemContext,
        { verbosity: 'normal' }
      );
      
      const aiMsg: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: res.respuesta || res.content || t('chat.default_greeting'),
        animate: true
      };
      
      setMessages(prev => [...prev, aiMsg]);
      
      if (autoPlay) {
        speak(res.respuesta || res.content || t('chat.default_greeting'));
      }
      
      setRecommendationsLoading(true);
      try {
        const recommendationsRes = await generateRecommendations(
          [userMsg, aiMsg].map(m => ({
            role: m.role,
            content: m.content
          }))
        );
        setRecommendations({
          relatedTopics: recommendationsRes.relatedTopics,
          subtopics: recommendationsRes.subtopics
        });
      } catch (e) {
        console.error('Error generating recommendations:', e);
      } finally {
        setRecommendationsLoading(false);
      }
    } catch (e) {
      console.error("Error starting new topic chat", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!messages.length || summaryLoading) return;
    setSummaryLoading(true);
    setShowSummaryPanel(true);
    stopSpeaking();
    playClick();

    try {
      const plainConversation = messages.map((m) => ({
        rol: m.role === 'user' ? 'usuario' : 'asistente',
        texto: m.content
      }));

      const res = await createAprendizajeDraft({
        conversacion: plainConversation
      }) as any;

      if (res && (res.titulo || res.resumen)) {
        const newSummary = {
          titulo: res.titulo || t('chat.summary_default_title'),
          resumen: res.resumen || t('chat.summary_default_desc'),
          tags: res.tags,
          sectorId: res.sector_id
        };
        setSummaryData(newSummary);
        
        if (res.sector_id) {
          setConfirmedSectorId(res.sector_id);
        } else if (sector) {
           setConfirmedSectorId(sector);
        }
      } else {
        setSummaryData({
          titulo: t('chat.summary_provisional_title'),
          resumen: t('chat.summary_provisional_desc'),
        });
      }
    } catch {
      setSummaryData({
        titulo: t('chat.summary_error_title'),
        resumen: t('chat.summary_error_desc')
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleOpenSaveLearning = async () => {
    // Logic restored but kept simple
    if (!messages.length || summaryLoading) return;
    
    setSummaryLoading(true);
    stopSpeaking();
    
    try {
      const plainConversation = messages.map((m) => ({
        rol: m.role === 'user' ? 'usuario' : 'asistente',
        texto: m.content
      }));

      const res = await createAprendizajeDraft({
        conversacion: plainConversation
      }) as any;

      if (res) {
        setLearningDraft({
          title: res.titulo || "Nuevo Aprendizaje",
          summary: res.resumen || "",
          section: res.sector_id,
          tags: res.tags
        });
        setShowSaveLearningModal(true);
      }
    } catch (e) {
      console.error("Error generating draft", e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleConfirmSaveLearning = (data: any) => {
    if (!data.section) return;

    try {
      const sectorKey = `sector_data_${data.section}`;
      const existingData = localStorage.getItem(sectorKey);
      const sectorKnowledge = existingData ? JSON.parse(existingData) : { items: [] };
      
      sectorKnowledge.items.push({
        id: createId(),
        title: data.title,
        summary: data.summary,
        content: messages.map(m => `${m.role === 'user' ? 'Tú' : 'Tutor'}: ${m.content}`).join('\n\n'),
        date: new Date().toISOString(),
        tags: data.tags || [],
        status: 'active'
      });
      
      localStorage.setItem(sectorKey, JSON.stringify(sectorKnowledge));
      
      setShowSaveLearningModal(false);
      setShowSaveSuccess(true);
      playSuccess();
      
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Error saving learning", e);
      playError();
    }
  };

  const handleSaveAndFinish = () => {
    if (summaryData) {
      setLearningDraft({
        title: summaryData.titulo,
        summary: summaryData.resumen,
        section: confirmedSectorId || undefined,
        tags: summaryData.tags
      });
      setShowSummaryPanel(false);
      setShowSaveLearningModal(true);
    }
  };

  const handleExpandSummary = () => {
    // Optional: Implement if needed
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden font-sans text-foreground">
      
      {/* Sidebar */}
      {!embedded && isSidebarOpen && (
        <aside 
          ref={sidebarRef}
          style={{ width: sidebarWidth }}
          className="flex flex-col bg-background border-r border-border shrink-0 relative transition-none ease-linear"
        >
          {/* Drag Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-50"
            onMouseDown={startResizing}
          />

          {/* Sidebar Header */}
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all"
              >
                <span>←</span> {t('chat.back')}
              </button>
              
              <button 
                onClick={toggleViewMode}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"
                title={viewMode === 'compact' ? t('chat.view_expanded') : t('chat.view_compact')}
              >
                {viewMode === 'compact' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                )}
              </button>
            </div>

            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 shadow-sm hover:shadow-md transition-all group"
            >
              <span className="text-lg font-light leading-none">+</span>
              <span className="text-sm font-medium">{t('chat.new_chat')}</span>
            </button>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('chat.search_placeholder')}
                className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <svg className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleSortChange('date')}
                className={`px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  sortBy === 'date' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                📅 {t('learnings.sort_date')}
                {sortBy === 'date' && (
                  <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <button
                onClick={() => handleSortChange('title')}
                className={`px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  sortBy === 'title' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                🔤 {t('learnings.sort_title')}
                {sortBy === 'title' && (
                  <span>{sortDirection === 'asc' ? '↓' : '↑'}</span>
                )}
              </button>
              <button
                onClick={() => handleSortChange('section')}
                className={`px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  sortBy === 'section' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                🗂️ {t('chat.sector_label')}
                {sortBy === 'section' && (
                  <span>{sortDirection === 'asc' ? '↓' : '↑'}</span>
                )}
              </button>
            </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {filteredChats.map((chat) => (
                  <div
                    role="button"
                    tabIndex={0}
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full text-left p-3 rounded-lg transition-all border group relative cursor-pointer ${
                      activeChatId === chat.id
                        ? "bg-primary/10 border-primary/20"
                        : "bg-card hover:bg-muted border-transparent hover:border-border"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm truncate flex-1 pr-6">
                        {chat.title || t('chat.untitled')}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                      {[...chat.messages].reverse().find(m => m.role === 'assistant')?.content || chat.messages[chat.messages.length - 1]?.content || ''}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      {chat.section && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          <span>{SECTORES_DATA.find(s => s.id === chat.section)?.icono}</span>
                          <span className="truncate max-w-[100px]">
                            {t(`sectors.${SECTORES_DATA.find(s => s.id === chat.section)?.key}`)}
                          </span>
                        </span>
                      )}
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                          title={t('common.delete')}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredChats.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? t('chat.no_results') : t('chat.no_chats')}
                    </p>
                  </div>
                )}
              </div>
            </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-background overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm z-10 shrink-0 flex-none">
          <div className="flex items-center gap-3">
            {!embedded && !isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                title={t('chat.show_sidebar')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                Tutor IA
              </h2>
              {sector && (
                <span className="text-[10px] text-muted-foreground">
                  {t(`sectors.${SECTORES_DATA.find(s => s.id === sector)?.key}`)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateSummary}
              disabled={summaryLoading || messages.length === 0}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
              title={t('chat.generate_summary')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            
            <button
              onClick={handleOpenSaveLearning}
              disabled={summaryLoading || messages.length === 0}
              className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
              title={t('chat.save_learning')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div 
          className="flex-1 overflow-y-auto relative scroll-smooth" 
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {messages.length === 0 && (
            <ChatEmptyState 
              suggestions={SUGGESTED_TOPICS}
              onTopicClick={handleTopicClick}
            />
          )}

          {messages.length > 0 && (
            <section className={`max-w-3xl mx-auto w-full py-8 px-4 flex flex-col gap-6 ${viewMode === 'compact' ? 'gap-4' : 'gap-8'}`}>
              {messages.map((m, index) => (
                <div
                  key={m.id}
                  className={`flex gap-4 ${
                    m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    )}
                  </div>

                  <div className={`flex flex-col gap-1 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {m.role === 'user' ? t('chat.you') : t('chat.assistant')}
                      </span>
                      {m.role === 'assistant' && (
                        <button
                          onClick={() => speak(m.content)}
                          className="ml-2 p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-muted"
                          title="Leer en voz alta"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user' 
                        ? 'bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm shadow-sm' 
                        : 'text-foreground'
                    }`}>
                      {m.content}
                    </div>
                  </div>
              </div>
            ))}

            {loading && !pendingQueue.length && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="px-5 py-3 bg-card border border-border rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
            
            {(recommendations || recommendationsLoading) && (
              <RecommendationsBlock
                relatedTopics={recommendations?.relatedTopics || []}
                subtopics={recommendations?.subtopics || []}
                onTopicClick={handleTopicClick}
                loading={recommendationsLoading}
              />
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </section>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-card border-t border-border p-4 md:p-6 z-30 flex-none">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          
          <button
            type="button"
            onClick={handleToggleListening}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all shrink-0 ${
              listening
                ? "bg-red-50 text-destructive ring-2 ring-red-100 animate-pulse"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            title={listening ? t('chat.stop_speaking') : t('chat.voice_input')}
          >
            {listening ? (
              <div className="w-4 h-4 bg-red-500 rounded-sm" />
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          <div className="flex-1 bg-muted border border-border rounded-3xl px-5 py-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm">
            <textarea
              ref={inputRef as any}
              value={input + (transcript ? " " + transcript : "")}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                  setTimeout(() => inputRef.current?.focus(), 10);
                }
              }}
              placeholder={listening ? (transcript ? "" : "Escuchando...") : "Escribe tu duda o tema..."}
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm resize-none max-h-32 text-foreground placeholder:text-muted-foreground"
              rows={1}
              style={{ minHeight: '24px' }}
            />
          </div>

          <motion.button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            animate={sendButtonControls}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
            title={t('chat.send')}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <motion.svg 
                className="w-5 h-5 translate-x-0.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                animate={sendButtonControls}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </motion.svg>
            )}
          </motion.button>

          <div className="w-px h-8 bg-border mx-2 self-center"></div>

          <button
            type="button"
            onClick={handleEndChat}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-destructive transition-colors px-2"
            title={t('chat.end_chat')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-[9px] font-medium leading-none">{t('chat.end_chat')}</span>
          </button>

        </div>
        
        <div className="max-w-4xl mx-auto mt-2 flex justify-between items-center px-2">
           <button 
              onClick={() => setAutoPlay(!autoPlay)}
              className={`text-[10px] flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${
                autoPlay ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              {autoPlay ? t('chat.auto_play') : t('chat.auto_play')}
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 flex items-start gap-2">
              <span>{t('chat.advice')}</span>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {showSummaryPanel && summaryData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 right-4 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-40 flex flex-col"
          >
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Título</label>
                <p className="text-foreground font-medium">{summaryData.titulo}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Resumen</label>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted p-3 rounded-lg border border-border">
                  {summaryData.resumen}
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">{t('chat.sector_label')}</label>
                  <button 
                    onClick={() => setIsEditingSector(!isEditingSector)}
                    className="text-xs text-primary hover:underline"
                  >
                    {isEditingSector ? t('common.cancel') : 'Cambiar'}
                  </button>
                </div>
                
                {isEditingSector ? (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {SECTORES_DATA.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setConfirmedSectorId(s.id);
                          setIsEditingSector(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 ${
                          confirmedSectorId === s.id 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'bg-card hover:bg-muted border border-border'
                        }`}
                      >
                        <span>{s.icono}</span>
                        <span className="truncate">{t(`sectors.${s.key}`)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {confirmedSectorId ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg text-sm">
                        <span>{SECTORES_DATA.find(s => s.id === confirmedSectorId)?.icono}</span>
                        <span>{SECTORES_DATA.find(s => s.id === confirmedSectorId)?.key ? t(`sectors.${SECTORES_DATA.find(s => s.id === confirmedSectorId)?.key}`) : '...'}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Sin sector asignado</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-muted border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowSummaryPanel(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium"
              >
                {t('chat.cancel_button')}
              </button>
              <button
                onClick={handleSaveAndFinish}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors"
              >
                {t('chat.save_button')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
      
      {/* Save Learning Modal */}
      <SaveLearningModal
        isOpen={showSaveLearningModal}
        onClose={() => setShowSaveLearningModal(false)}
        initialSummary={learningDraft?.summary || ''}
        initialTitle={learningDraft?.title || ''}
        initialSection={learningDraft?.section}
        initialTags={learningDraft?.tags}
        onSave={handleConfirmSaveLearning}
        onExpandSummary={handleExpandSummary}
        loading={summaryLoading}
      />

      {/* Save Success Animation */}
      <AnimatePresence>
        {showSaveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-green-500 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 backdrop-blur-md bg-opacity-90">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1.2, rotate: 360 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="bg-white text-green-500 rounded-full p-3"
              >
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <div className="text-center">
                <h3 className="text-2xl font-bold">¡Guardado!</h3>
                <p className="text-green-100 font-medium">Tu aprendizaje está seguro</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
