"use client";

import React from "react";
import { Chat } from "@/features/chat/services/chatStorage";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  embedded?: boolean;
  isSidebarOpen: boolean;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  viewMode: "compact" | "expanded";
  toggleViewMode: () => void;
  onNewChat: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortBy: "date" | "title" | "section";
  sortDirection: "asc" | "desc";
  onSortChange: (criteria: "date" | "title" | "section") => void;
  filteredChats: Chat[];
  activeChatId: string;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (id: string) => void;
  onDuplicateChat: (chat: Chat) => void;
}

export function ChatSidebar({
  embedded,
  isSidebarOpen,
  sidebarWidth,
  setSidebarWidth,
  viewMode,
  toggleViewMode,
  onNewChat,
  searchQuery,
  setSearchQuery,
  sortBy,
  sortDirection,
  onSortChange,
  filteredChats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onDuplicateChat,
}: ChatSidebarProps) {
  if (embedded || !isSidebarOpen) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newWidth = Math.min(420, Math.max(220, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
  };

  const formatDate = (ts?: number) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleDateString();
    } catch {
      return "";
    }
  };

  return (
    <aside
      className="relative h-full flex flex-col m-2 rounded-3xl border border-border/70 bg-background/70 shadow-sm overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {/* Resizer */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-border/60 transition-colors z-10"
      />

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header sidebar */}
        <div className="px-3 pt-3 pb-2 border-b border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold">Conversaciones</span>
              <span className="text-[11px] text-muted-foreground">
                Historial de tu tutor
              </span>
            </div>
            <button
              type="button"
              onClick={onNewChat}
              className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] px-3 py-1 hover:bg-primary/90"
            >
              Nuevo
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 rounded-full border border-border bg-muted/70 px-3 py-1 text-[11px] outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={toggleViewMode}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-full border border-border/60 bg-muted/40"
            >
              {viewMode === "compact" ? "Amplia" : "Compacta"}
            </button>
          </div>

          {/* Sort Chips */}
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1 overflow-x-auto max-w-full scrollbar-hide">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1 flex-shrink-0">Ordenar</span>
            {(["date", "title", "section"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onSortChange(key)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] border border-transparent flex items-center gap-1 transition-colors flex-shrink-0",
                  sortBy === key
                    ? "bg-background text-foreground border-border shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                <span>
                  {key === "date" ? "📅" : key === "title" ? "🔤" : "🗂️"}
                </span>
                {viewMode === "expanded" && (
                  <span className="capitalize">
                    {key === "date" ? "Fecha" : key === "title" ? "Título" : "Sección"}
                  </span>
                )}
                {sortBy === key && (
                  <span className="text-[10px] ml-0.5">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-hide">
          {filteredChats.length === 0 && (
            <div className="mt-4 text-center text-[12px] text-muted-foreground px-3">
              No tienes conversaciones guardadas todavía.
            </div>
          )}

          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat)}
              className={cn(
                "w-full text-left border border-transparent hover:border-border hover:bg-muted/70 group transition-all",
                activeChatId === chat.id && "bg-muted border-border shadow-sm",
                viewMode === "compact" 
                   ? "flex items-center gap-2 px-3 py-1.5 rounded-2xl"
                   : "rounded-xl px-3 py-2 text-[12px] flex flex-col gap-1"
              )}
            >
              {viewMode === "compact" ? (
                // COMPACT MODE
                <>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-base flex-shrink-0">
                    {chat.emoji || "💭"}
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-[140px] flex-1">
                    {chat.title || "Chat sin título"}
                  </span>
                  <div className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                     <span onClick={(e) => { e.stopPropagation(); onDuplicateChat(chat); }} className="hover:text-primary cursor-pointer p-1">⧉</span>
                     <span onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} className="hover:text-red-500 cursor-pointer p-1">×</span>
                  </div>
                </>
              ) : (
                // EXPANDED MODE
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {chat.title || "Chat sin título"}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateChat(chat);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-primary p-1 rounded hover:bg-background/80"
                        title="Duplicar chat"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-red-500 p-1 rounded hover:bg-background/80"
                        title="Eliminar chat"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    {chat.emoji && chat.color ? (
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]",
                        chat.color.includes("bg-") ? chat.color : `bg-${chat.color} bg-opacity-20 text-${chat.color.replace('bg-', '')}`
                      )}>
                        <span>{chat.emoji}</span>
                        <span className="truncate max-w-[80px]">{chat.section || "General"}</span>
                      </div>
                    ) : (
                       <span className="truncate">{chat.section || "General"}</span>
                    )}
                    <span>{formatDate(chat.updatedAt || chat.createdAt)}</span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
