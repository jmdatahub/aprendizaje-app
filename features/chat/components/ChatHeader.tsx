"use client";

import React, { useState, useRef, useEffect } from "react";
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
  onShare?: () => void;
  onEndChat?: () => void;
  isModalOpen?: boolean;
}

export function ChatHeader({
  embedded,
  isSidebarOpen,
  setIsSidebarOpen,
  sector,
  messagesLength,
  onSaveChat,
  onSaveLearning,
  onShare,
  onEndChat,
  isModalOpen = false
}: ChatHeaderProps) {
  const hasMessages = messagesLength > 0;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sets a client-only "mounted" flag once on mount to gate SSR/hydration-sensitive rendering; intentional one-time render
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
              aria-label={isSidebarOpen ? "Cerrar conversaciones" : "Abrir conversaciones"}
              aria-expanded={isSidebarOpen}
              className="min-w-[40px] min-h-[40px] -ml-2 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground active:bg-muted active:scale-95 transition-all flex items-center justify-center"
            >
              <span className="text-xl leading-none">☰</span>
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
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Más opciones"
            aria-expanded={showMenu}
            className="min-w-[40px] min-h-[40px] -mr-2 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground active:bg-muted active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="text-xl leading-none">⋮</span>
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
      <header className="hidden md:flex w-full bg-background px-5 py-3 items-center justify-between gap-3">
        {/* IZQUIERDA */}
        <div className="flex items-center gap-3 min-w-0">
          {!embedded && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={isSidebarOpen ? "Cerrar panel" : "Abrir panel"}
            >
              {isSidebarOpen ? "←" : "☰"}
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">
              Tutor IA
            </span>
            {sector ? (
              <span className="text-[11px] text-muted-foreground leading-tight truncate max-w-[220px]">
                {sector}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground leading-tight whitespace-nowrap hidden lg:block">
                Chat de aprendizaje personalizado
              </span>
            )}
          </div>
        </div>

        {/* DERECHA */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              disabled={!hasMessages}
              title="Compartir chat"
              aria-label="Compartir"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            >
              <span className="text-base">🔗</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSaveChat}
            disabled={!hasMessages}
            title="Guardar chat"
            aria-label="Guardar"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-base">💾</span>
          </button>

          <div className="w-px h-5 bg-border/60 mx-1" />

          <button
            type="button"
            onClick={onSaveLearning}
            disabled={!hasMessages}
            title="Guardar aprendizaje"
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-colors shadow-sm"
          >
            <span>🎓</span>
            <span>Aprendizaje</span>
          </button>
        </div>
      </header>
    </>
  );
}
