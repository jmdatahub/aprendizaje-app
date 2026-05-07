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
  if (embedded) {
    if (!isSidebarOpen) return null;
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
      className={cn(
        "flex flex-col bg-background overflow-hidden transition-all duration-300 z-[70]",
        // Mobile styles: absolute, fixed width (85vw), fly-in animation, with rounded corners
        "absolute top-0 bottom-0 left-0 h-full w-[85vw] max-w-[320px] rounded-3xl border border-border shadow-xl",
        // Desktop styles: relative, dynamic width, flat right border instead of card
        "md:relative md:h-full md:w-auto md:m-0 md:rounded-none md:border-0 md:border-r md:border-border md:shadow-none",
        // Conditional visibility
        !isSidebarOpen && "md:hidden -translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto",
        isSidebarOpen && "translate-x-0 opacity-100 pointer-events-auto"
      )}
      style={{ 
        width: typeof window !== 'undefined' && window.innerWidth >= 768 ? sidebarWidth : undefined 
      }}
    >
      {/* Resizer (Desktop only) */}
      <div
        onMouseDown={handleMouseDown}
        className="hidden md:block absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-border/60 transition-colors z-10"
      />

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header sidebar */}
        <div className="px-3 pt-4 pb-3 bg-background">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm font-semibold text-foreground">Conversaciones</span>
            <button
              type="button"
              onClick={onNewChat}
              aria-label="Nuevo chat"
              className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-3.5 h-9 hover:bg-primary/90 active:scale-95 transition-all"
            >
              + Nuevo
            </button>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar conversaciones"
              className="flex-1 rounded-full bg-muted px-3.5 py-2 text-base md:text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button
              type="button"
              onClick={toggleViewMode}
              title={viewMode === "compact" ? "Vista amplia" : "Vista compacta"}
              aria-label="Cambiar vista"
              className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all flex-shrink-0"
            >
              {viewMode === "compact" ? "▤" : "▦"}
            </button>
          </div>

          {/* Sort Chips */}
          <div className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
            {(["date", "title", "section"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onSortChange(key)}
                title={key === "date" ? "Fecha" : key === "title" ? "Título" : "Sección"}
                aria-label={`Ordenar por ${key === "date" ? "fecha" : key === "title" ? "título" : "sección"}`}
                aria-pressed={sortBy === key}
                className={cn(
                  "px-3 h-9 sm:h-8 rounded-full text-xs flex items-center gap-1 transition-all min-w-[44px] sm:min-w-[40px] justify-center",
                  sortBy === key
                    ? "bg-background text-foreground shadow-sm font-medium ring-1 ring-border/40"
                    : "text-muted-foreground hover:text-foreground active:bg-background/60"
                )}
              >
                <span>
                  {key === "date" ? "📅" : key === "title" ? "🔤" : "🗂️"}
                </span>
                {sortBy === key && (
                  <span className="text-[10px]">
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
            <div className="mt-8 text-center text-muted-foreground flex flex-col items-center gap-2 px-6">
              <span className="text-2xl opacity-50">💭</span>
              <p className="text-xs">No tienes conversaciones guardadas todavía.</p>
              <button
                type="button"
                onClick={onNewChat}
                className="text-sm text-primary underline mt-2 px-3 py-2 rounded-lg active:bg-primary/10"
              >
                Empieza una nueva
              </button>
            </div>
          )}

          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat)}
              className={cn(
                "w-full text-left group transition-colors duration-150",
                activeChatId === chat.id
                  ? "bg-muted"
                  : "hover:bg-muted/60",
                viewMode === "compact"
                   ? "flex items-center gap-3 px-2.5 py-2 rounded-xl"
                   : "rounded-xl px-3 py-2.5 text-[12px] flex flex-col gap-1.5"
              )}
            >
              {viewMode === "compact" ? (
                // COMPACT MODE
                <>
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0",
                    activeChatId === chat.id ? "bg-background" : "bg-muted/70"
                  )}>
                    {chat.emoji || "💭"}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn(
                      "text-[13px] font-medium truncate",
                      activeChatId === chat.id ? "text-foreground" : "text-foreground/85"
                    )}>
                      {chat.title || "Chat sin título"}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                       {formatDate(chat.updatedAt || chat.createdAt)} • {chat.section || "General"}
                    </span>
                  </div>
                  <div className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                     <span onClick={(e) => { e.stopPropagation(); onDuplicateChat(chat); }} className="hover:text-primary cursor-pointer p-1.5 hover:bg-background rounded-full transition-colors" title="Duplicar">⧉</span>
                     <span onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} className="hover:text-red-500 cursor-pointer p-1.5 hover:bg-background rounded-full transition-colors" title="Eliminar">×</span>
                  </div>
                </>
              ) : (
                // EXPANDED MODE
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "truncate font-medium text-sm",
                      activeChatId === chat.id ? "text-foreground" : "text-foreground/85"
                    )}>
                      {chat.title || "Chat sin título"}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateChat(chat);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-primary p-1 rounded hover:bg-background shadow-sm"
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
                        className="text-[11px] text-muted-foreground hover:text-red-500 p-1 rounded hover:bg-background shadow-sm"
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
