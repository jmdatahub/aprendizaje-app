"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSpeechRecognition } from "react-speech-recognition";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useTts } from "@/features/voice/hooks/useTts";
import { useSoundEffects } from "@/features/gamification/hooks/useSoundEffects";
import { Chat, chatStorage } from "@/features/chat/services/chatStorage";
import { generateRecommendations } from "@/features/ia/services/openai";
import { SECTORES_DATA } from "@/features/chat/utils/sectorUtils";
import { useTranslation } from "@/features/i18n/hooks/useTranslation";
import { SaveLearningModal } from "@/features/learning/components/SaveLearningModal";

import { ChatHeader } from "./ChatHeader";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";

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
  initialContext,
  initialTopic,
  initialMode = 'normal',
  initialSector,
  autostart = false,
  onClose,
  embedded = false,
  linkedLearningId
}: UnifiedTutorChatProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { speak, stop, isSpeaking } = useTts();
  const { playClick, playSuccess, playError, playMessage } = useSoundEffects();
  
  // Voice recognition
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(!embedded);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("compact");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "section">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [autoPlay, setAutoPlay] = useState(false);
  const sendButtonControls = useAnimation();
  
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
    sector: sector || undefined,
    onChatDeleted: () => {
      chatStorage.deleteChat(chatLogic.activeChatId);
      chatLogic.refreshChats();
      chatLogic.handleNewChat();
    },
    onRefreshChats: chatLogic.refreshChats,
    onPlaySuccess: playSuccess,
    onPlayError: playError,
    onStop: stop,
    t
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
      let valA: any = a.updatedAt;
      let valB: any = b.updatedAt;

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

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <ChatSidebar
        embedded={embedded}
        isSidebarOpen={isSidebarOpen}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        viewMode={viewMode}
        toggleViewMode={toggleViewMode}
        onNewChat={chatLogic.handleNewChat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filteredChats={filteredChats}
        activeChatId={chatLogic.activeChatId}
        onSelectChat={chatLogic.handleSelectChat}
        onDeleteChat={chatLogic.handleDeleteChat}
        onDuplicateChat={chatLogic.handleDuplicateChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50 relative">
        <ChatHeader
          embedded={embedded}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          sector={sector}
          messagesLength={chatLogic.messages.length}
          summaryLoading={learningDraft.summaryLoading}
          onSaveChat={() => chatLogic.handleSaveChat()}
          onSaveLearning={learningDraft.handleOpenSaveLearning}
          onGenerateSummary={learningDraft.handleSaveLearning}
        />

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

        {/* Summary Panel Overlay */}
        <AnimatePresence>
          {learningDraft.showSummaryPanel && learningDraft.summaryData && (
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              className="absolute bottom-24 right-4 w-96 bg-card border border-border/70 rounded-3xl shadow-xl overflow-hidden z-40 flex flex-col"
            >
              <div className="p-4 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground">Guardar Aprendizaje</h3>
                <button 
                  onClick={() => learningDraft.setShowSummaryPanel(false)}
                  className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Título</label>
                  <input
                    value={learningDraft.summaryData.titulo}
                    onChange={(e) => learningDraft.setSummaryData({...learningDraft.summaryData!, titulo: e.target.value})}
                    className="w-full text-lg font-semibold bg-transparent border-b border-border/40 focus:border-primary outline-none pb-1 placeholder:text-muted-foreground/50"
                    placeholder="Escribe un título..."
                  />
                </div>
                
                {/* Summary */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumen</label>
                  <textarea
                    value={learningDraft.summaryData.resumen}
                    onChange={(e) => learningDraft.setSummaryData({...learningDraft.summaryData!, resumen: e.target.value})}
                    className="w-full text-sm text-muted-foreground leading-relaxed bg-muted/70 p-3 rounded-2xl border border-border/60 min-h-[140px] resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Resumen del aprendizaje..."
                  />
                </div>

                {/* Sector */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sector</label>
                  <div className="flex items-center justify-between">
                     {learningDraft.isEditingSector ? (
                        <select
                          value={learningDraft.confirmedSectorId || ''}
                          onChange={(e) => {
                             learningDraft.setConfirmedSectorId(e.target.value);
                             learningDraft.setIsEditingSector(false);
                          }}
                          className="w-full p-2 bg-muted rounded-lg text-sm border border-border focus:border-primary outline-none"
                          autoFocus
                        >
                          <option value="">Seleccionar sector...</option>
                          {SECTORES_DATA.map(s => (
                            <option key={s.id} value={s.id}>{s.icono} {t(`sectors.${s.key}`)}</option>
                          ))}
                        </select>
                     ) : (
                        <div className="flex items-center gap-2">
                           <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full border border-border/60 text-xs text-foreground">
                              <span>{SECTORES_DATA.find(s => s.id === (learningDraft.confirmedSectorId || sector))?.icono || '💭'}</span>
                              <span>{t(`sectors.${SECTORES_DATA.find(s => s.id === (learningDraft.confirmedSectorId || sector))?.key || 'general'}`)}</span>
                           </div>
                           <button 
                              onClick={() => learningDraft.setIsEditingSector(true)}
                              className="text-xs text-primary hover:underline font-medium"
                           >
                              Cambiar
                           </button>
                        </div>
                     )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border/50 bg-muted/30 flex gap-2">
                <button
                  onClick={() => learningDraft.setShowSummaryPanel(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => learningDraft.handleConfirmSaveLearning()}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <span>💾</span> Guardar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
          initialTags={learningDraft.learningDraft?.tags}
          onSave={learningDraft.handleConfirmSaveLearning}
          onExpandSummary={learningDraft.handleExpandSummary}
          loading={learningDraft.summaryLoading}
        />
      </div>
    </div>
  );
}
