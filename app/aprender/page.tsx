"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { UnifiedTutorChat } from "@/features/chat/components/UnifiedTutorChat";

export default function AprenderPage() {
  const router = useRouter();

  return (
    <div className="w-full h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="pt-4 px-6 pb-0 max-w-6xl mx-auto w-full flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
        >
          <span>←</span>
          <span>Inicio</span>
        </button>

        <div className="text-right">
          <h1 className="text-base font-semibold text-foreground">
            Tutor IA
          </h1>
          <p className="text-xs text-muted-foreground">
            Escribe tu duda o tema y el tutor te guía paso a paso.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-4">
        <div className="w-full h-full max-w-6xl mx-auto rounded-3xl border border-border bg-gradient-to-br from-background/95 via-background/90 to-background/80 shadow-[0_18px_40px_rgba(0,0,0,0.35)] overflow-hidden p-1 sm:p-2">
          <React.Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Cargando tutor...</div>}>
            <UnifiedTutorChat />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}
