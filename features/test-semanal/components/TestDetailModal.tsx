"use client";

import React from "react";
import { useApp } from "@/shared/contexts/AppContext";
import { useEscapeKey } from "@/shared/hooks/useEscapeKey";

interface TestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: {
    score: number;
    total_questions: number;
    questions_data: {
      esCorrecta: boolean;
      enunciado: string;
      respuestaUsuario: string | null;
      feedback: string;
    }[];
    created_at: string;
  } | null;
  /** Promedio histórico normalizado (0-10) para la sección de comparación. Opcional. */
  avgScore?: number;
}

export function TestDetailModal({ isOpen, onClose, exam, avgScore }: TestDetailModalProps) {
  const { formatDate } = useApp();

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !exam) return null;

  // Comparación: nota de este examen (0-10) vs promedio histórico (0-10).
  const examScore10 =
    exam.total_questions > 0 ? (exam.score / exam.total_questions) * 10 : 0;
  const hasAvg = typeof avgScore === 'number' && Number.isFinite(avgScore) && avgScore > 0;
  const compareDelta = hasAvg ? examScore10 - (avgScore as number) : 0;
  const compareDir: 'up' | 'down' | 'flat' =
    !hasAvg || Math.abs(compareDelta) < 0.05 ? 'flat' : compareDelta > 0 ? 'up' : 'down';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-full sm:max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detalles del Examen</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(exam.created_at)}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Result Summary */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 py-4 px-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <div className="text-center min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Puntuación</p>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                {exam.score} <span className="text-sm sm:text-lg font-normal text-gray-400">/ {exam.total_questions}</span>
              </div>
            </div>
            <div className="w-px h-10 sm:h-12 bg-blue-200 dark:bg-blue-800 shrink-0" />
            <div className="text-center min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Resultado</p>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {((exam.score / exam.total_questions) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Comparación: este examen vs promedio histórico */}
          {hasAvg && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Comparación</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Esta nota{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{examScore10.toFixed(1)}</span>
                  {' '}vs promedio{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{(avgScore as number).toFixed(1)}</span>
                </p>
              </div>
              <div
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full font-bold text-sm ${
                  compareDir === 'up'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : compareDir === 'down'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                <span aria-hidden="true">
                  {compareDir === 'up' ? '↗︎' : compareDir === 'down' ? '↘︎' : '→'}
                </span>
                <span className="tabular-nums">
                  {compareDir === 'flat'
                    ? 'En la media'
                    : `${compareDelta > 0 ? '+' : ''}${compareDelta.toFixed(1)}`}
                </span>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-4">
            {exam.questions_data.map((p, idx) => (
              <div 
                key={idx} 
                className={`p-5 rounded-2xl border-l-4 shadow-sm bg-white dark:bg-slate-800 ${
                  p.esCorrecta ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2 gap-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    <span className="text-gray-400 mr-2">{idx + 1}.</span>
                    {p.enunciado}
                  </h3>
                  <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full ${
                    p.esCorrecta 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {p.esCorrecta ? '✓' : '✗'}
                  </span>
                </div>
                
                <div className="mb-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Tu respuesta</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">&quot;{p.respuestaUsuario || 'Sin respuesta'}&quot;</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Feedback del Tutor</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{p.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 text-center">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Cerrar revisión
          </button>
        </div>
      </div>
    </div>
  );
}
