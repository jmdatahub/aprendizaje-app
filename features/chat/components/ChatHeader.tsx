"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  embedded?: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  sector?: string | null;
  messagesLength: number;
  summaryLoading: boolean;
  onSaveChat: () => void;
  onSaveLearning: () => void;
  onGenerateSummary: () => void;
  onShare?: () => void;
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
}: ChatHeaderProps) {
  const hasMessages = messagesLength > 0;

  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-sm px-4 py-4 flex items-center gap-3 overflow-x-auto scrollbar-hide">
      {/* IZQUIERDA: toggle sidebar + título - NO se encoge */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {!embedded && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground hover:bg-muted/80"
            aria-label={isSidebarOpen ? "Cerrar panel de conversaciones" : "Abrir panel de conversaciones"}
          >
            {isSidebarOpen ? "←" : "☰"}
          </button>
        )}

        <div className="flex flex-col">
          <span className="text-xs font-semibold leading-tight whitespace-nowrap">
            Tutor IA
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight whitespace-nowrap">
            Chat de aprendizaje personalizado
          </span>
        </div>
      </div>

      {/* CENTRO: info de contexto - OCULTO en pantallas pequeñas, flexible en grandes */}
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

      {/* Spacer para cuando no hay centro */}
      <div className="flex-1 lg:hidden" />

      {/* DERECHA: acciones - NO se encoge */}
      <div className="flex items-center gap-2 flex-shrink-0 pr-4">
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            disabled={!hasMessages}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] border border-border bg-muted/70 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            )}
          >
            <span>🔗</span>
            <span>Compartir</span>
          </button>
        )}

        <button
          type="button"
          onClick={onSaveChat}
          disabled={!hasMessages}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] border border-border bg-muted/70 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          )}
        >
          <span>💾</span>
          <span>Guardar</span>
        </button>

        <button
          type="button"
          onClick={onSaveLearning}
          disabled={!hasMessages}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          )}
        >
          <span>🎓</span>
          <span>Aprendizaje</span>
        </button>

        <button
          type="button"
          onClick={onGenerateSummary}
          disabled={!hasMessages || summaryLoading}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          )}
        >
          {summaryLoading ? (
            <span className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>✨</span>
          )}
          <span>Resumen</span>
        </button>
      </div>
    </header>
  );
}
