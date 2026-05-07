"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { UnifiedTutorChat } from "@/features/chat/components/UnifiedTutorChat";

export default function AprenderPage() {
  const router = useRouter();

  return (
    <div className="w-full h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Desktop header — hidden on mobile (ChatHeader provides nav there) */}
      <div className="hidden md:flex pt-4 px-6 pb-0 max-w-6xl mx-auto w-full items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Volver al inicio"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-4 h-9 text-xs text-muted-foreground hover:bg-muted/80 active:scale-95 transition-all hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          <span>Inicio</span>
        </button>

        <div className="text-right">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Tutor IA
          </h1>
          <p className="text-xs text-muted-foreground">
            Escribe tu duda o tema y el tutor te guía paso a paso.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-0 md:px-6 pb-0 md:pb-4">
        <div className="w-full h-full max-w-6xl mx-auto md:rounded-3xl md:border border-border md:bg-card md:shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden md:p-1 sm:md:p-2">
          <React.Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Cargando tutor...</div>}>
            <UnifiedTutorChat />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}
