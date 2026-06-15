"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useTts } from "@/features/voice/hooks/useTts";
import { useSoundEffects } from "@/features/gamification/hooks/useSoundEffects";
import { chatStorage } from "@/features/chat/services/chatStorage";
import { generateRecommendations } from "@/features/ia/services/openai";
import { useTranslation } from "@/features/i18n/hooks/useTranslation";
import { SaveLearningModal } from "@/features/learning/components/SaveLearningModal";
import { ShareChatModal } from "./ShareChatModal";

import { ChatHeader } from "./ChatHeader";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { DetailLevelSelector, DetailLevel } from "./DetailLevelSelector";

import { useChatLogic } from "../hooks/useChatLogic";
import { useLearningDraft } from "../hooks/useLearningDraft";

interface UnifiedTutorChatProps {
  initialChatId?: string;
  initialContext?: string;
  initialTopic?: string;
  initialMode?: 'normal' | 'learning_path';
  initialSector?: string;
  autostart?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  linkedLearningId?: string;
}

export function UnifiedTutorChat({
  initialChatId,
  initialTopic,
  initialSector,
  autostart = false,
  embedded = false,
  linkedLearningId
}: UnifiedTutorChatProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { speak, stop } = useTts();
  const { playClick, playSuccess, playError, playMessage } = useSoundEffects();
  
  // Voice recognition
  const {
    transcript,
    listening,
    resetTranscript
  } = useSpeechRecognition();

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(!embedded);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("compact");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "section">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [autoPlay, setAutoPlay] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("normal");
  const sendButtonControls = useAnimation();
  
  // Mobile Support: Close sidebar on mount if small screen
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);
  
  // Recommendations
  const [recommendations, setRecommendations] = useState<{ relatedTopics: string[]; subtopics: string[] } | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  // Derived state from URL
  const tema = initialTopic || searchParams?.get("tema");
  const sector = initialSector || searchParams?.get("sector");

  // Use extracted chat logic hook
  const chatLogic = useChatLogic({
    initialChatId,
    initialTopic: tema || undefined,
    initialSector: sector || undefined,
    linkedLearningId,
    detailLevel,
    onPlayMessage: playMessage,
    onPlayError: playError,
    onPlaySuccess: playSuccess,
    onPlayClick: playClick,
    onSpeak: speak,
    onStop: stop,
    autoPlay,
    t
  });

  // Use extracted learning draft hook
  const learningDraft = useLearningDraft({
    messages: chatLogic.messages,
    activeChatId: chatLogic.activeChatId,
    onChatDeleted: () => {
      chatStorage.deleteChat(chatLogic.activeChatId);
      chatLogic.refreshChats();
      chatLogic.handleNewChat();
    },
    onRefreshChats: chatLogic.refreshChats,
    onPlaySuccess: playSuccess,
    onPlayError: playError,
    onStop: stop,
  });

  // Filter & Sort Chats
  const filteredChats = chatLogic.savedChats
    .filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.section?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let valA: string | number = a.updatedAt;
      let valB: string | number = b.updatedAt;

      if (sortBy === 'title') {
        valA = a.title || "";
        valB = b.title || "";
      } else if (sortBy === 'section') {
        valA = a.section || "";
        valB = b.section || "";
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Initial Setup
  useEffect(() => {
    if (initialChatId) {
      const chat = chatStorage.getChat(initialChatId);
      if (chat) {
        chatLogic.setMessages(chat.messages);
        return;
      }
    }

    if (autostart && chatLogic.messages.length === 0) {
      chatLogic.handleNewChat();
      if (tema) {
        setTimeout(() => handleTopicClick(tema), 500);
      }
    } else if (chatLogic.messages.length === 0) {
      chatLogic.setMessages([{ 
        id: "welcome", 
        role: "assistant", 
        content: "Hola, soy tu Tutor IA. ¿Qué quieres aprender hoy?",
        animate: true 
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial-setup effect must run only when the chat identity changes (initialChatId/autostart/tema); chatLogic and handleTopicClick are recreated each render and including them would re-trigger setup and clobber the user's messages
  }, [initialChatId, autostart, tema]);

  // Voice Input Handling
  const handleToggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: 'es-ES' });
    }
    playClick();
  };

  // Enhanced send with voice support
  const handleSend = async () => {
    let textToSend = chatLogic.input;
    
    if (listening) {
      SpeechRecognition.stopListening();
      if (transcript) {
        textToSend += (textToSend ? " " : "") + transcript;
      }
      resetTranscript();
    }

    if (!textToSend.trim()) return;

    sendButtonControls.start({
      scale: [1, 1.08, 1],
      transition: { duration: 0.16, ease: "easeOut" }
    });

    await chatLogic.handleSend(textToSend);
  };

  // Topic click with recommendations
  const handleTopicClick = async (topic: string) => {
    setRecommendations(null);
    setRecommendationsLoading(true);
    
    // Set initial message and process
    const initialUserText = t('chat.topic_intent', { topic });
    chatLogic.setInput(initialUserText);
    await chatLogic.handleSend(initialUserText);
    
    // Generate recommendations in background
    try {
      const recommendationsRes = await generateRecommendations(
        chatLogic.messages.slice(-4).map(m => ({
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
  };

  const handleSortChange = (criteria: "date" | "title" | "section") => {
    if (sortBy === criteria) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(criteria);
      setSortDirection('asc');
    }
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'compact' ? 'expanded' : 'compact');
  };

  const handleEndChat = () => {
    chatLogic.handleEndChat();
    setRecommendations(null);
  };

  const SUGGESTED_TOPICS = [
    "Aprender Inglés Básico",
    "Historia del Arte",
    "Fundamentos de Programación",
    "Matemáticas para Principiantes",
    "Ciencia de Datos",
    "Marketing Digital"
  ];

  const mainContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTop = 0;
    }
  }, []);

  // Mobile: lift the chat above the virtual keyboard using visualViewport.
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const layoutH = window.innerHeight;
      const visualBottom = vv.height + vv.offsetTop;
      const diff = layoutH - visualBottom;
      setKeyboardInset(diff > 80 ? diff : 0);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <div
      ref={mainContainerRef}
      className="flex h-full w-full overflow-hidden bg-background text-foreground relative"
      style={keyboardInset > 0 ? { paddingBottom: `${keyboardInset}px` } : undefined}
    >
      {/* Mobile Backdrop — CSS only, fade in/out */}
      <button
        type="button"
        aria-label="Cerrar conversaciones"
        tabIndex={isSidebarOpen ? 0 : -1}
        onClick={() => setIsSidebarOpen(false)}
        className={`md:hidden absolute inset-0 bg-black/55 backdrop-blur-sm z-[60] transition-opacity duration-200 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar */}
      <ChatSidebar
        embedded={embedded}
        isSidebarOpen={isSidebarOpen}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        viewMode={viewMode}
        toggleViewMode={toggleViewMode}
        onNewChat={() => {
          chatLogic.handleNewChat();
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filteredChats={filteredChats}
        activeChatId={chatLogic.activeChatId}
        onSelectChat={(chat) => {
          chatLogic.handleSelectChat(chat);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onDeleteChat={chatLogic.handleDeleteChat}
        onDuplicateChat={chatLogic.handleDuplicateChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        <ChatHeader
          embedded={embedded}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          sector={sector}
          messagesLength={chatLogic.messages.length}
          summaryLoading={learningDraft.summaryLoading}
          onSaveChat={() => chatLogic.handleSaveChat()}
          onSaveLearning={learningDraft.handleOpenSaveLearning}
          onShare={() => setIsShareModalOpen(true)}
          onEndChat={handleEndChat}
          isModalOpen={learningDraft.showSaveLearningModal}
        />

        {/* Detail Level Selector */}
        <div className="px-4 pt-1 pb-2 flex items-center justify-end relative z-50 overflow-visible">
          <DetailLevelSelector value={detailLevel} onChange={setDetailLevel} compact />
        </div>

        <ChatMessageList
          messages={chatLogic.messages}
          loading={chatLogic.loading}
          pendingQueue={chatLogic.pendingQueue}
          recommendations={recommendations}
          recommendationsLoading={recommendationsLoading}
          onTopicClick={handleTopicClick}
          viewMode={viewMode}
          onSpeak={speak}
          suggestedTopics={SUGGESTED_TOPICS}
        />

        <ChatInput
          input={chatLogic.input}
          setInput={chatLogic.setInput}
          onSend={handleSend}
          onToggleListening={handleToggleListening}
          listening={listening}
          transcript={transcript}
          loading={chatLogic.loading}
          onEndChat={handleEndChat}
          autoPlay={autoPlay}
          setAutoPlay={setAutoPlay}
          sendButtonControls={sendButtonControls}
        />

        {/* Success Toast */}
        <AnimatePresence>
          {learningDraft.showSaveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-30"
            >
              <span>✅</span>
              <span className="text-sm font-medium">{t('chat.save_success')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <SaveLearningModal
          isOpen={learningDraft.showSaveLearningModal}
          onClose={() => learningDraft.setShowSaveLearningModal(false)}
          initialSummary={learningDraft.learningDraft?.summary || ''}
          initialTitle={learningDraft.learningDraft?.title || ''}
          initialSection={learningDraft.learningDraft?.section}
          initialSections={learningDraft.learningDraft?.sections || []}
          suggestedSections={learningDraft.suggestedSections}
          initialTags={learningDraft.learningDraft?.tags}
          onSave={learningDraft.handleConfirmSaveLearning}
          onEditSummary={async (summary, instruction) => {
            const { editSummaryWithAI } = await import('@/features/learning/services/editSummaryService');
            return editSummaryWithAI(summary, instruction);
          }}
          loading={learningDraft.summaryLoading}
        />

        <ShareChatModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          chat={chatStorage.getChat(chatLogic.activeChatId)}
        />
      </div>
    </div>
  );
}
