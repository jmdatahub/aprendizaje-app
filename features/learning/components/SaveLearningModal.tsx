import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/shared/contexts/AppContext';
import { LearningCanvas } from './LearningCanvas';
import { SECTORES_DATA } from '@/shared/constants/sectores'; // Assuming this exists or I'll define it locally if needed

interface SaveLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSummary: string;
  initialTitle: string;
  initialSection?: string;
  initialSections?: number[];
  suggestedSections?: number[];
  initialTags?: string[];
  onSave: (data: any) => void;
  onExpandSummary: (section: string) => Promise<string>;
  onEditSummary?: (currentSummary: string, instruction: string) => Promise<string>;
  loading?: boolean;
}

export function SaveLearningModal({
  isOpen,
  onClose,
  initialSummary,
  initialTitle,
  initialSection,
  initialSections = [],
  suggestedSections = [],
  initialTags = [],
  onSave,
  onExpandSummary,
  onEditSummary,
  loading
}: SaveLearningModalProps) {
  const { t } = useApp();
  
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [selectedSections, setSelectedSections] = useState<number[]>(initialSections);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewLater, setReviewLater] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [type, setType] = useState('teoria');
  const [difficulty, setDifficulty] = useState('basico');
  const [status, setStatus] = useState('pendiente');
  const [keepChat, setKeepChat] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  
  // AI Editing State
  const [showAiEdit, setShowAiEdit] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiEditLoading, setAiEditLoading] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setSummary(initialSummary);
      // Pre-select suggested sections
      setSelectedSections(suggestedSections.length > 0 ? suggestedSections : initialSections);
      setTags(initialTags);
      setIsFavorite(false);
      setReviewLater(false);
      setType('teoria');
      setDifficulty('basico');
      setStatus('pendiente');
      setKeepChat(false);
      setPersonalNote('');
      setShowAiEdit(false);
      setAiPrompt('');
    }
  }, [isOpen, initialTitle, initialSummary, initialSection, initialSections, suggestedSections, initialTags]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleToggleSection = (sectionId: number) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId) 
        : [...prev, sectionId]
    );
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim() || !onEditSummary || aiEditLoading) return;
    setAiEditLoading(true);
    try {
      const newSummary = await onEditSummary(summary, aiPrompt);
      setSummary(newSummary);
      setAiPrompt('');
    } catch (e) {
      console.error('AI edit failed', e);
    } finally {
      setAiEditLoading(false);
    }
  };

  const handleSave = () => {
    onSave({
      title,
      summary,
      sections: selectedSections,
      section: selectedSections[0]?.toString() || '',
      tags,
      isFavorite,
      reviewLater,
      type,
      difficulty,
      status,
      keepChat,
      personalNote
    });
  };

  const handleRestore = () => {
    setSummary(initialSummary);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-background w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden border border-border"
          >
            {/* Left Side: Canvas + AI Editor */}
            <div className="flex-1 border-r border-border p-4 bg-muted/10 flex flex-col">
              <div className="flex-1 min-h-0">
                <LearningCanvas
                  initialContent={summary}
                  onContentChange={setSummary}
                  onExpand={onExpandSummary}
                  onRestore={handleRestore}
                  loading={loading}
                />
              </div>
              
              {/* Inline AI Editing Chat */}
              {onEditSummary && (
                <div className="mt-4 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAiEdit(!showAiEdit)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    <span>✨</span>
                    <span>Editar con IA</span>
                    <span className="text-xs">{showAiEdit ? '▲' : '▼'}</span>
                  </button>
                  
                  {showAiEdit && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()}
                        placeholder="Ej: Hazlo más corto, Ordénalo por importancia..."
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        disabled={aiEditLoading}
                      />
                      <button
                        type="button"
                        onClick={handleAiEdit}
                        disabled={aiEditLoading || !aiPrompt.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {aiEditLoading ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <span>Aplicar</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side: Metadata & Actions */}
            <div className="w-[350px] flex flex-col bg-card">
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-1">{t('chat.save_learning')}</h2>
                  <p className="text-sm text-muted-foreground">{t('chat.summary_default_desc')}</p>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">{t('learnings.title_label')}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder={t('learnings.title_label')}
                  />
                </div>

                {/* Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">{t('learnings.section_label')} (múltiple)</label>
                  <div className="flex flex-wrap gap-2">
                    {SECTORES_DATA.map(s => {
                      const isSelected = selectedSections.includes(Number(s.id));
                      const isSuggested = suggestedSections.includes(Number(s.id));
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleToggleSection(Number(s.id))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5
                            ${isSelected 
                              ? 'bg-primary/20 border-primary text-primary' 
                              : 'bg-muted border-border text-muted-foreground hover:border-primary/50'}
                            ${isSuggested && !isSelected ? 'ring-2 ring-primary/30' : ''}`}
                        >
                          <span>{s.icono}</span>
                          <span>{t(`sectors.${s.key}`)}</span>
                          {isSelected && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  {suggestedSections.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">✨ Sugeridas por IA basándose en el contenido</p>
                  )}
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de aprendizaje</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                  >
                    <option value="teoria">Teoría</option>
                    <option value="ejemplo">Ejemplo práctico</option>
                    <option value="checklist">Checklist</option>
                    <option value="plantilla">Plantilla</option>
                    <option value="conversacion">Conversación guiada</option>
                  </select>
                </div>

                {/* Difficulty & Status Row */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Dificultad</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                    >
                      <option value="basico">Básico</option>
                      <option value="intermedio">Intermedio</option>
                      <option value="avanzado">Avanzado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Estado</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_progreso">En progreso</option>
                      <option value="aprendido">Aprendido</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">{t('learnings.tags_label')}</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span key={tag} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-primary/70">×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder={t('learnings.add_tag_placeholder')}
                  />
                </div>

                {/* Personal Note */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Nota personal (opcional)</label>
                  <textarea
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    className="w-full text-xs bg-muted/70 rounded-2xl border border-border/60 px-3 py-2 resize-none min-h-[60px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Añade una nota..."
                  />
                </div>

                {/* Flags & Options */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isFavorite ? 'bg-amber-400 border-amber-400' : 'border-muted-foreground group-hover:border-primary'}`}>
                      {isFavorite && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={isFavorite} onChange={() => setIsFavorite(!isFavorite)} />
                    <span className="text-sm font-medium">{t('learnings.favorite_label')} ⭐</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${reviewLater ? 'bg-blue-500 border-blue-500' : 'border-muted-foreground group-hover:border-primary'}`}>
                      {reviewLater && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={reviewLater} onChange={() => setReviewLater(!reviewLater)} />
                    <span className="text-sm font-medium">{t('learnings.review_label')} ⏰</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${keepChat ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground group-hover:border-primary'}`}>
                      {keepChat && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={keepChat} onChange={() => setKeepChat(!keepChat)} />
                    <span className="text-sm font-medium">Mantener chat original</span>
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-border bg-muted/30 flex flex-col gap-3">
                <button
                  onClick={handleSave}
                  disabled={!title || selectedSections.length === 0}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>💾</span> {t('chat.save_learning')}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
