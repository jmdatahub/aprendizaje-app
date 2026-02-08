"use client";

import { useState, useCallback } from "react";
import { ChatMessage } from "@/features/chat/services/chatStorage";
import { createAprendizajeDraft } from "@/features/learning/services/learningService";

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface LearningDraft {
  title: string;
  summary: string;
  section?: string;
  sections?: number[];
  tags?: string[];
  sectorId?: string;
}

interface UseLearningDraftOptions {
  messages: ChatMessage[];
  activeChatId: string;
  sector?: string;
  onChatDeleted?: () => void;
  onRefreshChats?: () => void;
  onPlaySuccess?: () => void;
  onPlayError?: () => void;
  onStop?: () => void;
  t: (key: string) => string;
}

interface UseLearningDraftReturn {
  // State
  showSummaryPanel: boolean;
  setShowSummaryPanel: (show: boolean) => void;
  summaryData: { titulo: string; resumen: string; tags?: string[] } | null;
  setSummaryData: React.Dispatch<React.SetStateAction<{ titulo: string; resumen: string; tags?: string[] } | null>>;
  summaryLoading: boolean;
  confirmedSectorId: string | null;
  setConfirmedSectorId: (id: string | null) => void;
  isEditingSector: boolean;
  setIsEditingSector: (editing: boolean) => void;
  showSaveSuccess: boolean;
  showSaveLearningModal: boolean;
  setShowSaveLearningModal: (show: boolean) => void;
  learningDraft: LearningDraft | null;
  suggestedSections: number[];
  
  // Actions
  handleSaveLearning: () => Promise<void>;
  handleOpenSaveLearning: () => Promise<void>;
  handleConfirmSaveLearning: (data?: {
    title?: string;
    summary?: string;
    section?: string;
    tags?: string[];
    type?: string;
    difficulty?: string;
    status?: string;
    keepChat?: boolean;
    personalNote?: string;
  }) => void;
  handleExpandSummary: (currentSummary: string) => Promise<string>;
}

export function useLearningDraft(options: UseLearningDraftOptions): UseLearningDraftReturn {
  const {
    messages,
    activeChatId,
    sector,
    onChatDeleted,
    onRefreshChats,
    onPlaySuccess,
    onPlayError,
    onStop,
    t
  } = options;

  // State
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [summaryData, setSummaryData] = useState<{ titulo: string; resumen: string; tags?: string[] } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [confirmedSectorId, setConfirmedSectorId] = useState<string | null>(null);
  const [isEditingSector, setIsEditingSector] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showSaveLearningModal, setShowSaveLearningModal] = useState(false);
  const [learningDraft, setLearningDraft] = useState<LearningDraft | null>(null);
  const [suggestedSections, setSuggestedSections] = useState<number[]>([]);

  const handleSaveLearning = useCallback(async () => {
    if (!messages.length || summaryLoading) return;
    setSummaryLoading(true);
    setShowSummaryPanel(true);
    onStop?.();

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
  }, [messages, onStop, sector, summaryLoading, t]);

  const handleOpenSaveLearning = useCallback(async () => {
    if (!messages.length || summaryLoading) return;
    
    setSummaryLoading(true);
    onStop?.();
    
    try {
      const plainConversation = messages.map((m) => ({
        rol: m.role === 'user' ? 'usuario' : 'asistente',
        texto: m.content
      }));

      const res = await createAprendizajeDraft({
        conversacion: plainConversation
      }) as any;

      if (res) {
        const sections = res.suggested_sections || (res.sector_id ? [Number(res.sector_id)] : []);
        setSuggestedSections(sections);
        setLearningDraft({
          title: res.titulo || "Nuevo Aprendizaje",
          summary: res.resumen || "",
          section: res.sector_id?.toString(),
          sections: sections,
          tags: res.tags
        });
        setShowSaveLearningModal(true);
      }
    } catch (e) {
      console.error("Error generating draft", e);
    } finally {
      setSummaryLoading(false);
    }
  }, [messages, onStop, summaryLoading]);

  const handleConfirmSaveLearning = useCallback((data?: {
    title?: string;
    summary?: string;
    section?: string;
    tags?: string[];
    type?: string;
    difficulty?: string;
    status?: string;
    keepChat?: boolean;
    personalNote?: string;
  }) => {
    const finalTitle = data?.title ?? summaryData?.titulo ?? t('chat.summary_default_title');
    const finalSummary = data?.summary ?? summaryData?.resumen ?? t('chat.summary_default_desc');
    const finalSectionId = data?.section ?? confirmedSectorId ?? sector ?? 'general';
    const finalTags = data?.tags ?? summaryData?.tags ?? [];

    try {
      const sectorKey = `sector_data_${finalSectionId}`;
      const existingData = localStorage.getItem(sectorKey);
      const sectorKnowledge = existingData ? JSON.parse(existingData) : { items: [] };

      sectorKnowledge.items.push({
        id: createId(),
        title: finalTitle,
        summary: finalSummary,
        content: messages
          .map(m => `${m.role === 'user' ? 'Tú' : 'Tutor'}: ${m.content}`)
          .join('\n\n'),
        date: new Date().toISOString(),
        tags: finalTags,
        type: data?.type || 'teoria',
        difficulty: data?.difficulty || 'basico',
        status: data?.status || 'pendiente',
        personalNote: data?.personalNote || '',
      });

      localStorage.setItem(sectorKey, JSON.stringify(sectorKnowledge));

      if (activeChatId && !data?.keepChat) {
        onChatDeleted?.();
      }
      onRefreshChats?.();

      setShowSummaryPanel(false);
      setSummaryData(null);
      setShowSaveLearningModal(false);

      setShowSaveSuccess(true);
      onPlaySuccess?.();
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (e) {
      console.error('Error saving learning', e);
      onPlayError?.();
      alert('No se ha podido guardar el aprendizaje, inténtalo de nuevo');
    }
  }, [activeChatId, confirmedSectorId, messages, onChatDeleted, onPlayError, onPlaySuccess, onRefreshChats, sector, summaryData, t]);

  const handleExpandSummary = useCallback(async (currentSummary: string) => {
    return currentSummary; 
  }, []);

  return {
    showSummaryPanel,
    setShowSummaryPanel,
    summaryData,
    setSummaryData,
    summaryLoading,
    confirmedSectorId,
    setConfirmedSectorId,
    isEditingSector,
    setIsEditingSector,
    showSaveSuccess,
    showSaveLearningModal,
    setShowSaveLearningModal,
    learningDraft,
    suggestedSections,
    handleSaveLearning,
    handleOpenSaveLearning,
    handleConfirmSaveLearning,
    handleExpandSummary
  };
}
