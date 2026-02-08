"use client";

import React from "react";
import { useApp } from "@/shared/contexts/AppContext";

interface TestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: {
    score: number;
    total_questions: number;
    questions_data: any[];
    created_at: string;
  } | null;
}

export function TestDetailModal({ isOpen, onClose, exam }: TestDetailModalProps) {
  const { t, formatDate } = useApp();

  if (!isOpen || !exam) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Result Summary */}
          <div className="flex items-center justify-center gap-8 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <div className="text-center">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Puntuación</p>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {exam.score} <span className="text-lg font-normal text-gray-400">/ {exam.total_questions}</span>
              </div>
            </div>
            <div className="w-px h-12 bg-blue-200 dark:bg-blue-800" />
            <div className="text-center">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Resultado</p>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {((exam.score / exam.total_questions) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

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
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{p.respuestaUsuario || 'Sin respuesta'}"</p>
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
