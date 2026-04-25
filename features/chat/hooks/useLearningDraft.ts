"use client";

import { useState, useCallback } from "react";
import { ChatMessage } from "@/features/chat/services/chatStorage";
import { createAprendizajeDraft } from "@/features/learning/services/learningService";
import { SECTORES_DATA } from "@/shared/constants/sectores";

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeSectorId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const asString = String(raw);
  if (SECTORES_DATA.some(s => s.id === asString)) return asString;
  const asNumber = Number(asString);
  if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= SECTORES_DATA.length) {
    return SECTORES_DATA[asNumber - 1].id;
  }
  return null;
}

interface LearningDraft {
  title: string;
  summary: string;
  section?: string;
  sections?: string[];
  tags?: string[];
}

interface SaveData {
  title?: string;
  summary?: string;
  section?: string;
  tags?: string[];
  isFavorite?: boolean;
  keepChat?: boolean;
  personalNote?: string;
}

interface UseLearningDraftOptions {
  messages: ChatMessage[];
  activeChatId: string;
  onChatDeleted?: () => void;
  onRefreshChats?: () => void;
  onPlaySuccess?: () => void;
  onPlayError?: () => void;
  onStop?: () => void;
}

interface UseLearningDraftReturn {
  summaryLoading: boolean;
  showSaveSuccess: boolean;
  showSaveLearningModal: boolean;
  setShowSaveLearningModal: (show: boolean) => void;
  learningDraft: LearningDraft | null;
  suggestedSections: string[];
  handleOpenSaveLearning: () => Promise<void>;
  handleConfirmSaveLearning: (data?: SaveData) => void;
}

export function useLearningDraft(options: UseLearningDraftOptions): UseLearningDraftReturn {
  const { messages, activeChatId, onChatDeleted, onRefreshChats, onPlaySuccess, onPlayError, onStop } = options;

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showSaveLearningModal, setShowSaveLearningModal] = useState(false);
  const [learningDraft, setLearningDraft] = useState<LearningDraft | null>(null);
  const [suggestedSections, setSuggestedSections] = useState<string[]>([]);

  const handleOpenSaveLearning = useCallback(async () => {
    if (!messages.length || summaryLoading) return;
    setSummaryLoading(true);
    onStop?.();

    try {
      const plainConversation = messages.map((m) => ({
        rol: m.role === 'user' ? 'usuario' : 'asistente',
        texto: m.content
      }));

      const res = await createAprendizajeDraft({ conversacion: plainConversation }) as any;

      if (res) {
        const rawSuggested: unknown[] = Array.isArray(res.suggested_sections)
          ? res.suggested_sections
          : (res.sector_id ? [res.sector_id] : []);
        const sections = rawSuggested
          .map(normalizeSectorId)
          .filter((s): s is string => s !== null);
        setSuggestedSections(sections);

        const primarySection = normalizeSectorId(res.sector_id) ?? sections[0] ?? undefined;
        setLearningDraft({
          title: res.titulo || "Nuevo Aprendizaje",
          summary: res.resumen || "",
          section: primarySection,
          sections,
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

  const handleConfirmSaveLearning = useCallback((data?: SaveData) => {
    const finalTitle = data?.title || 'Nuevo Aprendizaje';
    const finalSummary = data?.summary || '';
    const rawSection = data?.section;
    // Ensure we always use a valid sector ID — never fall back to display names or empty strings
    const finalSectionId = (rawSection && SECTORES_DATA.some(s => s.id === rawSection))
      ? rawSection
      : SECTORES_DATA[0].id;
    const finalTags = data?.tags || [];

    try {
      const sectorKey = `sector_data_${finalSectionId}`;
      const existing = localStorage.getItem(sectorKey);
      const sectorData = existing ? JSON.parse(existing) : { items: [] };

      sectorData.items.push({
        id: createId(),
        title: finalTitle,
        summary: finalSummary,
        content: messages
          .map(m => `${m.role === 'user' ? 'Tú' : 'Tutor'}: ${m.content}`)
          .join('\n\n'),
        date: new Date().toISOString(),
        tags: finalTags,
        isFavorite: data?.isFavorite || false,
        personalNote: data?.personalNote || '',
      });

      localStorage.setItem(sectorKey, JSON.stringify(sectorData));

      if (activeChatId && !data?.keepChat) {
        onChatDeleted?.();
      }
      onRefreshChats?.();

      setShowSaveLearningModal(false);
      setShowSaveSuccess(true);
      onPlaySuccess?.();
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (e) {
      console.error('Error saving learning', e);
      onPlayError?.();
      alert('No se ha podido guardar el aprendizaje, inténtalo de nuevo');
    }
  }, [activeChatId, messages, onChatDeleted, onPlayError, onPlaySuccess, onRefreshChats]);

  return {
    summaryLoading,
    showSaveSuccess,
    showSaveLearningModal,
    setShowSaveLearningModal,
    learningDraft,
    suggestedSections,
    handleOpenSaveLearning,
    handleConfirmSaveLearning,
  };
}
