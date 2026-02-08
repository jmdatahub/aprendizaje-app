"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/shared/contexts/AppContext";
import { playClick } from "@/shared/utils/sounds";
import { TestDetailModal } from "@/features/test-semanal/components/TestDetailModal";

interface ExamRecord {
  id: string;
  score: number;
  total_questions: number;
  questions_data: any[];
  created_at: string;
}

export default function HistorialPage() {
  const { t, formatDate } = useApp();
  const [history, setHistory] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/repaso/historial');
        const json = await res.json();
        if (json.success) {
          setHistory(json.data);
        } else {
          setError(json.error);
        }
      } catch (err) {
        setError("No se pudo conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const avgScore = history.length > 0 
    ? (history.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / history.length) * 10
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              onClick={() => playClick()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Historial de Exámenes</h1>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nota Media</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{avgScore.toFixed(1)}</span>
              <span className="text-gray-400 mb-1">/ 10</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Exámenes</p>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{history.length}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tendencia</p>
            <span className="text-3xl font-bold text-green-500">↗︎</span>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Exámenes recientes</h2>
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4 text-gray-400">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              <p>Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-center">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error al cargar el historial</p>
              <p className="text-sm text-red-500/70">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-gray-500 dark:text-gray-400">Aún no has completado ningún examen.</p>
              <Link href="/" className="text-blue-600 dark:text-blue-400 font-bold mt-4 inline-block">¡Haz tu primer test!</Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {history.map((record) => (
                <div key={record.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      (record.score / record.total_questions) >= 0.8 ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      (record.score / record.total_questions) >= 0.5 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {record.score}/{record.total_questions}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Examen Completo</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(record.created_at)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { playClick(); setSelectedExam(record); }}
                    className="text-blue-600 dark:text-blue-400 font-bold text-sm px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    Ver detalles
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <TestDetailModal 
        isOpen={!!selectedExam} 
        onClose={() => setSelectedExam(null)} 
        exam={selectedExam} 
      />
    </div>
  );
}
