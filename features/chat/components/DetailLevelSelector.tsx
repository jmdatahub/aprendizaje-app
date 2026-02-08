"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export type DetailLevel = "concise" | "normal" | "detailed";

interface DetailLevelSelectorProps {
  value: DetailLevel;
  onChange: (level: DetailLevel) => void;
  compact?: boolean;
}

const LEVELS: { key: DetailLevel; label: string; emoji: string; desc: string; tooltip: string }[] = [
  { 
    key: "concise", 
    label: "Breve", 
    emoji: "⚡", 
    desc: "Respuestas cortas",
    tooltip: "Respuestas directas y al grano. Ideal cuando tienes prisa o ya conoces el tema."
  },
  { 
    key: "normal", 
    label: "Normal", 
    emoji: "💬", 
    desc: "Balance ideal",
    tooltip: "Un equilibrio entre brevedad y detalle. Perfecto para la mayoría de las preguntas."
  },
  { 
    key: "detailed", 
    label: "Detallado", 
    emoji: "📚", 
    desc: "Explicaciones profundas",
    tooltip: "Explicaciones completas con ejemplos y contexto. Ideal para temas nuevos o complejos."
  },
];

export function DetailLevelSelector({ value, onChange, compact = false }: DetailLevelSelectorProps) {
  const [hoveredLevel, setHoveredLevel] = useState<DetailLevel | null>(null);

  if (compact) {
    return (
      <div className="relative inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1">
        <span className="text-[10px] text-muted-foreground mr-1">Detalle:</span>
        {LEVELS.map((level) => (
          <button
            key={level.key}
            type="button"
            onClick={() => onChange(level.key)}
            onMouseEnter={() => setHoveredLevel(level.key)}
            onMouseLeave={() => setHoveredLevel(null)}
            className={cn(
              "relative px-2 py-0.5 rounded-full text-[11px] transition-colors",
              value === level.key
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {level.emoji}
            
            {/* Tooltip */}
            {hoveredLevel === level.key && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[999] pointer-events-none">
                <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-2xl px-3 py-2 text-[11px] w-48 text-center ring-1 ring-black/10">
                  <div className="font-semibold mb-1 text-foreground">{level.emoji} {level.label}</div>
                  <div className="text-muted-foreground leading-tight">{level.tooltip}</div>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1">
                  <div className="border-[6px] border-transparent border-b-popover" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/50">
      {LEVELS.map((level) => (
        <button
          key={level.key}
          type="button"
          onClick={() => onChange(level.key)}
          onMouseEnter={() => setHoveredLevel(level.key)}
          onMouseLeave={() => setHoveredLevel(null)}
          className={cn(
            "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
            value === level.key
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <span>{level.emoji}</span>
          <span className="font-medium">{level.label}</span>
          
          {/* Tooltip */}
          {hoveredLevel === level.key && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[999] pointer-events-none">
              <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-2xl px-3 py-2 text-[11px] w-48 text-center ring-1 ring-black/10">
                <div className="text-muted-foreground leading-tight">{level.tooltip}</div>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1">
                <div className="border-[6px] border-transparent border-b-popover" />
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
