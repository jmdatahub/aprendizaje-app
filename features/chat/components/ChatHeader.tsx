"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface ChatHeaderProps {
  embedded?: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  sector?: string | null;
  messagesLength: number;
  summaryLoading: boolean;
  onSaveChat: () => void;
  onSaveLearning: () => void;
  onGenerateSummary?: () => void;
  onShare?: () => void;
  onEndChat?: () => void;
  isModalOpen?: boolean; // New prop
}

export function ChatHeader({
  embedded,
  isSidebarOpen,
  setIsSidebarOpen,
  sector,
  messagesLength,
  summaryLoading,
  onSaveChat,
  onSaveLearning,
  onGenerateSummary,
  onShare,
  onEndChat,
  isModalOpen = false
}: ChatHeaderProps) {
  const hasMessages = messagesLength > 0;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // If modal is open, we hide the mobile header completely to avoid z-index wars
  if (isModalOpen) return null;

  return (
    <>
      {/* --- MOBILE HEADER (md:hidden) --- */}
      <header className="md:hidden w-full flex-none h-14 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 transition-all">
        {/* 1. Left: Sidebar Toggle */}
        <div className="flex items-center w-10">
          {!embedded && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              aria-label="Menú"
            >
              <span className="text-xl">☰</span>
            </button>
          )}
        </div>

        {/* 2. Center: Title */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
            Tutor IA
          </h1>
          {sector && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
              {sector}
            </span>
          )}
        </div>

        {/* 3. Right: New Chat + Menu */}
        <div className="flex items-center justify-end w-10 relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 -mr-2 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <span className="text-xl">⋮</span>
          </button>

          {/* Dropdown Menu (Portal) */}
          {showMenu && mounted && createPortal(
            <>
              {/* Backdrop to close */}
              <div 
                className="fixed inset-0 z-[9999] bg-black/20 backdrop-blur-[1px]" 
                onClick={() => setShowMenu(false)}
              />
              <div
                style={{
                   position: 'fixed',
                   top: '3.5rem',
                   right: '1rem',
                   zIndex: 10000
                }}
                className="w-56 bg-popover border border-border rounded-xl shadow-lg shadow-black/10 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="py-1">
                  <button
                      onClick={() => { onSaveLearning(); setShowMenu(false); }}
                      disabled={!hasMessages}
                      className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 flex items-center gap-3 disabled:opacity-50"
                  >
                    <span className="text-lg">🎓</span> 
                    <span className="font-medium">Guardar Aprendizaje</span>
                  </button>
                  <button
                      onClick={() => { onGenerateSummary(); setShowMenu(false); }}
                      disabled={!hasMessages || summaryLoading}
                      className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 flex items-center gap-3 disabled:opacity-50"
                  >
                    <span className="text-lg">{summaryLoading ? "⏳" : "✨"}</span>
                    <span className="font-medium">Generar Resumen</span>
                  </button>
                  <div className="h-px bg-border/50 my-1 mx-2" />
                  <button
                      onClick={() => { onSaveChat(); setShowMenu(false); }}
                      disabled={!hasMessages}
                      className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 flex items-center gap-3 disabled:opacity-50"
                  >
                    <span className="text-lg">💾</span>
                    <span className="font-medium">Guardar Chat</span>
                  </button>
                  <button
                      onClick={() => { if(onEndChat) onEndChat(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-3"
                  >
                    <span className="text-lg">🏁</span>
                    <span className="font-medium">Finalizar Chat</span>
                  </button>
                  {onShare && (
                    <button
                        onClick={() => { onShare(); setShowMenu(false); }}
                        disabled={!hasMessages}
                        className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 flex items-center gap-3 disabled:opacity-50"
                    >
                        <span className="text-lg">🔗</span>
                        <span className="font-medium">Compartir</span>
                    </button>
                  )}
                </div>
              </div>
            </>,
            document.body
          )}
        </div>
      </header>

      {/* --- DESKTOP HEADER (hidden md:flex) --- */}
      <header className="hidden md:flex w-full border-b border-border bg-background/80 backdrop-blur-sm px-4 py-3 items-center justify-between gap-2">
        {/* IZQUIERDA */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!embedded && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground hover:bg-muted/80"
              aria-label={isSidebarOpen ? "Cerrar panel" : "Abrir panel"}
            >
              {isSidebarOpen ? "←" : "☰"}
            </button>
          )}

          <div className="flex flex-col">
            <span className="text-xs font-semibold leading-tight whitespace-nowrap">
              Tutor IA
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight whitespace-nowrap hidden sm:block">
              Chat de aprendizaje personalizado
            </span>
          </div>
        </div>

        {/* CENTRO */}
        <div className="hidden lg:flex flex-1 items-center justify-center min-w-0">
          <div className="inline-flex items-center gap-3 rounded-full bg-muted/60 px-3 py-1">
            {sector && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                <span className="font-medium text-foreground">Sector:</span>{" "}
                {sector}
              </span>
            )}
            <span className="h-3 w-px bg-border" />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              Mensajes:{" "}
              <span className="font-medium text-foreground">
                {messagesLength}
              </span>
            </span>
          </div>
        </div>

        {/* DERECHA */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              disabled={!hasMessages}
              title="Compartir chat"
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-full w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1 text-[11px] border border-border bg-muted/70 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
              )}
            >
              <span>🔗</span>
              <span className="hidden sm:inline">Compartir</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSaveChat}
            disabled={!hasMessages}
            title="Guardar chat"
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-full w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1 text-[11px] border border-border bg-muted/70 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
            )}
          >
            <span>💾</span>
            <span className="hidden sm:inline">Guardar</span>
          </button>

          <button
            type="button"
            onClick={onSaveLearning}
            disabled={!hasMessages}
            title="Guardar aprendizaje"
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-full w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1 text-[11px] bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors shadow-sm"
            )}
          >
            <span>🎓</span>
            <span className="hidden sm:inline">Aprendizaje</span>
          </button>

          <button
            type="button"
            onClick={onGenerateSummary}
            disabled={!hasMessages || summaryLoading}
            title="Generar resumen"
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-full w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap transition-colors shadow-sm"
            )}
          >
            {summaryLoading ? (
              <span className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>✨</span>
            )}
            <span className="hidden sm:inline">Resumen</span>
          </button>
        </div>
      </header>
    </>
  );
}
