"use client";

import React, { useEffect, useRef } from "react";
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

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, recommendations, pendingQueue]);

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
                "flex flex-col max-w-[60ch] w-full",
                isUser ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {/* Role Label (Optional) */}
              <span className={cn(
                "text-[10px] mb-1 px-1",
                isUser ? "text-primary/60 text-right" : "text-muted-foreground/70"
              )}>
                {isUser ? "Tú" : "Tutor IA"}
              </span>

              {/* Bubble */}
              <div
                className={cn(
                  "relative px-4 py-2.5 text-sm leading-relaxed shadow-sm rounded-3xl",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/80 text-foreground border border-border/70 rounded-tl-sm"
                )}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none chat-prose">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Assistant Actions (Speaker) */}
                {!isUser && (
                  <div className="mt-2 flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onSpeak(msg.content)}
                      className="p-1 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Escuchar"
                    >
                      🔊
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
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto"
         >
            {suggestedTopics!.map((topic, idx) => (
               <button
                  key={idx}
                  onClick={() => onTopicClick(topic)}
                  className="text-left rounded-2xl border border-border bg-muted/60 hover:bg-muted/90 p-3 text-sm flex flex-col gap-1 transition-colors group"
               >
                  <span className="font-medium flex items-center gap-2 text-foreground">
                     <span>💡</span>
                     <span className="truncate">{topic}</span>
                  </span>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
                     Explorar "{topic}"
                  </span>
               </button>
            ))}
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
          <div className="bg-muted/50 border border-border/50 px-4 py-3 rounded-3xl rounded-tl-sm flex items-center gap-2">
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
