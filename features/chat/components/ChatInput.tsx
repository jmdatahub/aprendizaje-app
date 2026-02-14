"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  sendButtonControls: any;
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
  autoPlay,
  setAutoPlay,
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
      <div className="md:hidden w-full bg-background px-4 py-3 flex items-end gap-2 border-t border-border/40">
        {/* Pill Container */}
        <div className="flex-1 bg-muted/50 rounded-[26px] flex items-end p-1.5 gap-2 transition-all focus-within:bg-muted/80 focus-within:ring-1 focus-within:ring-border/50">
          
          {/* Mic Button (Inside Left) */}
          <button
            type="button"
            onClick={onToggleListening}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0",
              listening && "bg-red-500/10 text-red-500 animate-pulse"
            )}
            title={listening ? "Detener" : "Dictar"}
          >
            {listening ? (
              <span className="w-3 h-3 bg-current rounded-sm animate-pulse" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            )}
          </button>

          {/* Textarea */}
          <textarea
            ref={mobileTextareaRef}
            value={listening ? transcript : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? "Escuchando..." : "Mensaje..."}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-[15px] resize-none max-h-32 py-2 min-h-[40px] placeholder:text-muted-foreground/50"
            style={{ height: 'auto' }}
          />

          {/* Send Button (Inside Right) */}
          <AnimatePresence mode="popLayout">
            {(input.trim() || transcript) && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                type="button"
                onClick={onSend}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm hover:opacity-90 transition-opacity"
              >
                <span className="text-sm font-bold">↑</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* DESKTOP INPUT (hidden md:flex) */}
      <div className="hidden md:flex border-t border-border/60 bg-background/95 px-3 py-3 items-end gap-2 backdrop-blur-sm">
        {/* Mic Button */}
        <button
          type="button"
          onClick={onToggleListening}
          className={cn(
            "rounded-full w-9 h-9 flex items-center justify-center border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex-shrink-0",
            listening && "bg-red-50 border-red-200 text-red-500 animate-pulse"
          )}
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
            className="w-full resize-none rounded-2xl border border-border bg-muted/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary placeholder:text-muted-foreground/70 max-h-32 min-h-[40px] transition-all"
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
