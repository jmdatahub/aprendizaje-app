"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimationControls } from "framer-motion";
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
  sendButtonControls: AnimationControls;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input, transcript]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-border/60 bg-background/95 px-3 py-3 flex items-end gap-2 backdrop-blur-sm">
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
          ref={textareaRef}
          value={listening ? transcript : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Escuchando..." : "Escribe tu duda o tema..."}
          rows={1}
          className="w-full resize-none rounded-2xl border border-border bg-muted/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary placeholder:text-muted-foreground/70 max-h-32 min-h-[40px] transition-all"
        />
      </div>

      {/* Send Button */}
      <motion.button
        type="button"
        onClick={onSend}
        disabled={(!input.trim() && !transcript) || loading}
        animate={sendButtonControls}
        className="rounded-2xl px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1 h-[40px] flex-shrink-0 transition-colors shadow-sm"
      >
        <span>Enviar</span>
        <span className="text-xs">➤</span>
      </motion.button>

      {/* Finish Button (Discreet) */}
      <button
        type="button"
        onClick={onEndChat}
        className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded-full border border-transparent hover:border-destructive/40 h-[40px] flex items-center justify-center flex-shrink-0 transition-colors"
        title="Finalizar y guardar"
      >
        Finalizar
      </button>
      
      {/* Auto-play toggle (Hidden/Integrated could be better, but keeping functionality) */}
      <div className="hidden">
         <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
      </div>
    </div>
  );
}
