"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onToggleListening: () => void;
  listening: boolean;
  transcript: string;
  loading: boolean;
  onEndChat: () => void;
  autoPlay: boolean;
  setAutoPlay: (val: boolean) => void;
  sendButtonControls: ReturnType<typeof useAnimation>;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  onToggleListening,
  listening,
  transcript,
  loading,
  onEndChat,
  sendButtonControls,
}: ChatInputProps) {
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    // Resize Mobile
    if (mobileTextareaRef.current) {
      mobileTextareaRef.current.style.height = "auto";
      mobileTextareaRef.current.style.height = `${Math.min(mobileTextareaRef.current.scrollHeight, 128)}px`;
    }
    // Resize Desktop
    if (desktopTextareaRef.current) {
      desktopTextareaRef.current.style.height = "auto";
      desktopTextareaRef.current.style.height = `${Math.min(desktopTextareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input, transcript]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
      {/* MOBILE INPUT (md:hidden) */}
      <div
        className="md:hidden w-full bg-background px-3 pt-2 flex items-end gap-2 border-t border-border/40"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {/* Pill Container */}
        <div className="flex-1 bg-muted/60 rounded-[24px] flex items-end p-1.5 gap-1.5 transition-all focus-within:bg-muted/90 focus-within:ring-2 focus-within:ring-primary/20 min-w-0">

          {/* Mic Button (Inside Left) — bigger touch target */}
          <button
            type="button"
            onClick={onToggleListening}
            aria-label={listening ? "Detener dictado" : "Activar dictado por voz"}
            aria-pressed={listening}
            className={cn(
              "min-w-[40px] h-10 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/40 active:scale-95 transition-all flex-shrink-0",
              listening && "bg-red-500/15 text-red-500 mic-pulse"
            )}
          >
            {listening ? (
              <span className="w-3.5 h-3.5 bg-current rounded-sm" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            )}
          </button>

          {/* Textarea — 16px font to prevent iOS zoom */}
          <textarea
            ref={mobileTextareaRef}
            value={listening ? transcript : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? "Escuchando..." : "Pregúntame algo..."}
            rows={1}
            enterKeyHint="send"
            autoCapitalize="sentences"
            aria-label="Mensaje al tutor"
            className="flex-1 bg-transparent border-none outline-none text-base resize-none max-h-32 py-2 min-h-[40px] placeholder:text-muted-foreground/55 leading-snug"
            style={{ height: 'auto' }}
          />

          {/* Send Button (Inside Right) — bigger, animated */}
          <AnimatePresence mode="popLayout">
            {(input.trim() || transcript) && (
              <motion.button
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={onSend}
                disabled={loading}
                aria-label="Enviar mensaje"
                className="min-w-[40px] h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-sm active:scale-90 disabled:opacity-50 transition-transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2.5 11.5L21 3l-8.5 18-2.5-7.5z" stroke="none" /></svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* DESKTOP INPUT (hidden md:flex) */}
      <div className="hidden md:flex bg-background px-4 py-3 items-end gap-2">
        {/* Mic Button */}
        <button
          type="button"
          onClick={onToggleListening}
          className={cn(
            "rounded-full w-10 h-10 flex items-center justify-center bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0",
            listening && "bg-red-500/10 text-red-500 animate-pulse"
          )}
          aria-label={listening ? "Detener escucha" : "Activar voz"}
          title={listening ? "Detener escucha" : "Activar voz"}
        >
          {listening ? "🛑" : "🎤"}
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={desktopTextareaRef}
            value={listening ? transcript : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? "Escuchando..." : "Escribe tu duda o tema..."}
            rows={1}
            enterKeyHint="send"
            autoCapitalize="sentences"
            aria-label="Mensaje al tutor"
            className="w-full resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 placeholder:text-muted-foreground/60 max-h-32 min-h-[40px] transition-all"
            style={{ height: 'auto' }}
          />
        </div>

        {/* Send Button */}
        <motion.button
          type="button"
          onClick={onSend}
          disabled={(!input.trim() && !transcript) || loading}
          animate={sendButtonControls}
          className={cn(
            "rounded-full w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0 transition-colors shadow-sm",
            (!input.trim() && !transcript) ? "opacity-50" : "opacity-100"
          )}
        >
          <span className="text-lg translate-x-0.5">➤</span>
        </motion.button>

        {/* Finish Button */}
        <button
          type="button"
          onClick={onEndChat}
          className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded-full border border-transparent hover:border-destructive/40 h-10 flex items-center justify-center flex-shrink-0 transition-colors"
          title="Finalizar y guardar"
        >
          <span className="hidden sm:inline">Finalizar</span>
          <span className="sm:hidden text-lg">🏁</span>
        </button>
      </div>
    </>
  );
}
