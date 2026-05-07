"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "@/features/chat/services/chatStorage";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/features/i18n/hooks/useTranslation";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  pendingQueue: ChatMessage[];
  recommendations: { relatedTopics: string[]; subtopics: string[] } | null;
  recommendationsLoading: boolean;
  onTopicClick: (topic: string) => void;
  viewMode: "compact" | "expanded";
  onSpeak: (text: string) => void;
  suggestedTopics?: string[];
}

export function ChatMessageList({
  messages,
  loading,
  pendingQueue,
  recommendations,
  recommendationsLoading,
  onTopicClick,
  viewMode,
  onSpeak,
  suggestedTopics,
}: ChatMessageListProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, recommendations, pendingQueue]);

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Silently fail; clipboard may not be available in some contexts
    }
  };

  const showSuggestedTopics = messages.length <= 1 && !loading && suggestedTopics && suggestedTopics.length > 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
      {messages.length === 0 && !loading && (
        <div className="flex h-full flex-col items-center justify-center text-center p-8 opacity-60">
          <div className="text-4xl mb-4">👋</div>
          <p className="text-lg font-medium text-foreground">
            {t("chat.empty_state_title") || "¡Hola!"}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mt-2">
            {t("chat.empty_state_desc") ||
              "Soy tu tutor personal. Pregúntame lo que quieras aprender hoy."}
          </p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <motion.div
              key={msg.id}
              initial={msg.animate ? { opacity: 0, y: 10, scale: 0.98 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn(
                "flex flex-col max-w-[88%] sm:max-w-[60ch] w-full",
                isUser ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {/* Role Label (Desktop Only) */}
              <span className={cn(
                "text-[10px] mb-1 px-1 hidden md:block",
                isUser ? "text-primary/60 text-right" : "text-muted-foreground/70"
              )}>
                {isUser ? "Tú" : "Tutor IA"}
              </span>

              {/* Bubble */}
              <div
                className={cn(
                  "relative px-4 py-3 text-sm leading-relaxed rounded-3xl",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                )}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none chat-prose text-foreground">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="my-3 list-disc pl-4 space-y-1.5" {...props} />,
                        ol: ({node, ...props}) => <ol className="my-3 list-decimal pl-4 space-y-1.5" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-3 mb-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                        code: ({node, ...props}) => <code className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono text-primary" {...props} />,
                      }}
                    >
                      {/* Pre-process: Force double newlines for cleaner spacing if needed, but be careful not to break code blocks */}
                      {msg.content.includes('\n\n') ? msg.content : msg.content.replace(/\n/g, '\n\n')}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Assistant Actions (Speaker + Copy) — always visible on mobile, hover on desktop */}
                {!isUser && (
                  <div className="mt-2 flex items-center gap-1 opacity-100 md:opacity-60 md:hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onSpeak(msg.content)}
                      aria-label="Escuchar respuesta"
                      className="min-w-[36px] min-h-[36px] p-2 rounded-full hover:bg-background/50 active:bg-background/70 active:scale-95 text-muted-foreground hover:text-foreground transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      aria-label={copiedId === msg.id ? "Copiado" : "Copiar respuesta"}
                      className="min-w-[36px] min-h-[36px] p-2 rounded-full hover:bg-background/50 active:bg-background/70 active:scale-95 text-muted-foreground hover:text-foreground transition-all"
                    >
                      {copiedId === msg.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-500"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Suggested Topics Block (Empty State) */}
      {showSuggestedTopics && (
         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 max-w-3xl mx-auto w-full"
         >
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
               Sugerencias para empezar
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
               {suggestedTopics!.map((topic, idx) => (
                  <button
                     key={idx}
                     onClick={() => onTopicClick(topic)}
                     className="text-left rounded-2xl bg-muted hover:bg-muted/70 hover:-translate-y-0.5 p-3.5 text-sm flex items-center gap-2.5 transition-all group"
                  >
                     <span className="text-lg flex-shrink-0">💡</span>
                     <span className="font-medium text-foreground truncate">{topic}</span>
                  </button>
               ))}
            </div>
         </motion.div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col max-w-[60ch] mr-auto items-start"
        >
          <span className="text-[10px] text-muted-foreground/70 mb-1 px-1">
            Tutor IA
          </span>
          <div className="bg-muted px-4 py-3 rounded-3xl rounded-tl-sm flex items-center gap-2">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Pensando...
            </span>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {recommendations && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-4 max-w-2xl mx-auto pt-2 border-t border-border/40"
        >
          {recommendations.relatedTopics && recommendations.relatedTopics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Temas relacionados
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendations.relatedTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => onTopicClick(topic)}
                    className="px-3 py-1.5 rounded-full bg-background border border-border/60 text-xs text-foreground hover:border-primary/50 hover:bg-muted transition-all shadow-sm"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recommendations.subtopics && recommendations.subtopics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Profundizar
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendations.subtopics.map((sub, idx) => (
                  <button
                    key={idx}
                    onClick={() => onTopicClick(sub)}
                    className="px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs text-primary hover:bg-primary/10 transition-all"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Recommendations Loading */}
      {recommendationsLoading && !loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-2 animate-pulse">
          <span>✨</span>
          <span>Generando sugerencias...</span>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
