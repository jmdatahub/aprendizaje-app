"use client";

import React, { useState } from "react";
import { Chat } from "@/features/chat/services/chatStorage";
import {
  formatChatAsMarkdown,
  formatChatAsText,
  downloadAsFile,
  copyToClipboard,
  generateFilename,
} from "@/features/chat/utils/chatExport";
import { cn } from "@/lib/utils";
import { Sheet } from "@/shared/components";

interface ShareChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
}

export function ShareChatModal({ isOpen, onClose, chat }: ShareChatModalProps) {
  const [copied, setCopied] = useState(false);

  if (!chat) return null;

  const handleCopy = async () => {
    const text = formatChatAsText(chat);
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    const content = formatChatAsMarkdown(chat);
    const filename = generateFilename(chat, "md");
    downloadAsFile(content, filename, "text/markdown");
  };

  const handleDownloadText = () => {
    const content = formatChatAsText(chat);
    const filename = generateFilename(chat, "txt");
    downloadAsFile(content, filename, "text/plain");
  };

  return (
    <Sheet open={isOpen} onClose={onClose} title="Exportar conversación" desktopMaxWidth="max-w-sm">
      <div className="p-4 sm:p-6">
        {/* Chat info */}
        <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border/50">
          <p className="text-sm font-medium text-foreground truncate">
            {chat.emoji || "💬"} {chat.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {chat.messages.length} mensajes
          </p>
        </div>

        {/* Export options */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCopy}
            aria-live="polite"
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all min-h-[60px] active:scale-[0.98]",
              copied
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600"
                : "bg-muted/30 border-border hover:bg-muted/60 active:bg-muted/80"
            )}
          >
            <span className="text-xl">{copied ? "✓" : "📋"}</span>
            <div className="text-left">
              <p className="text-sm font-medium">
                {copied ? "¡Copiado!" : "Copiar al portapapeles"}
              </p>
              <p className="text-xs text-muted-foreground">
                Texto plano listo para pegar
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 active:bg-muted/80 active:scale-[0.98] transition-all min-h-[60px]"
          >
            <span className="text-xl">📝</span>
            <div className="text-left">
              <p className="text-sm font-medium">Descargar Markdown</p>
              <p className="text-xs text-muted-foreground">
                Formato con estilos (.md)
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleDownloadText}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 active:bg-muted/80 active:scale-[0.98] transition-all min-h-[60px]"
          >
            <span className="text-xl">📄</span>
            <div className="text-left">
              <p className="text-sm font-medium">Descargar texto</p>
              <p className="text-xs text-muted-foreground">
                Texto plano simple (.txt)
              </p>
            </div>
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Pronto: compartir por enlace público
        </p>
      </div>
    </Sheet>
  );
}
