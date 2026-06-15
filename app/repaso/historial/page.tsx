"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/shared/contexts/AppContext";
import { playClick } from "@/shared/utils/sounds";
import { TestDetailModal } from "@/features/test-semanal/components/TestDetailModal";

interface QuestionData {
  esCorrecta: boolean;
  enunciado: string;
  respuestaUsuario: string | null;
  feedback: string;
}

interface ExamRecord {
  id: string;
  score: number;
  total_questions: number;
  questions_data: QuestionData[];
  created_at: string;
}

export default function HistorialPage() {
  const { formatDate } = useApp();
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
      } catch {
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

  // Tendencia real: último examen (history[0], el más reciente) vs promedio histórico.
  const lastScore = history.length > 0
    ? (history[0].score / history[0].total_questions) * 10
    : 0;
  const trendDelta = lastScore - avgScore;
  const trendPct = avgScore > 0 ? (trendDelta / avgScore) * 100 : 0;
  // Umbral pequeño para considerar "estable" (plano)
  const trendDir: 'up' | 'down' | 'flat' =
    history.length < 2 || Math.abs(trendDelta) < 0.05
      ? 'flat'
      : trendDelta > 0
      ? 'up'
      : 'down';

  // Mini sparkline: últimos 6-8 exámenes en orden cronológico (antiguo → reciente).
  const sparkScores = history
    .slice(0, 8)
    .map((r) => (r.score / r.total_questions) * 10)
    .reverse();
  const sparkW = 120;
  const sparkH = 36;
  const sparkPath = (() => {
    if (sparkScores.length < 2) return '';
    const max = 10;
    const min = 0;
    const range = max - min || 1;
    const stepX = sparkW / (sparkScores.length - 1);
    return sparkScores
      .map((s, i) => {
        const x = i * stepX;
        const y = sparkH - ((s - min) / range) * sparkH;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  })();
  const sparkColor =
    trendDir === 'up' ? '#22c55e' : trendDir === 'down' ? '#ef4444' : '#64748b';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 pb-mobile-nav">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              onClick={() => playClick()}
              aria-label="Volver al inicio"
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-3xl font-bold ${
                    trendDir === 'up'
                      ? 'text-green-500'
                      : trendDir === 'down'
                      ? 'text-red-500'
                      : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                >
                  {trendDir === 'up' ? '↗︎' : trendDir === 'down' ? '↘︎' : '→'}
                </span>
                {history.length >= 2 && (
                  <span
                    className={`text-sm font-semibold ${
                      trendDir === 'up'
                        ? 'text-green-500'
                        : trendDir === 'down'
                        ? 'text-red-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {trendDir === 'flat'
                      ? 'Estable'
                      : `${trendDelta > 0 ? '+' : ''}${trendPct.toFixed(0)}%`}
                  </span>
                )}
              </div>
              {sparkPath && (
                <svg
                  width={sparkW}
                  height={sparkH}
                  viewBox={`0 0 ${sparkW} ${sparkH}`}
                  className="shrink-0 overflow-visible"
                  role="img"
                  aria-label={`Tendencia de las últimas ${sparkScores.length} notas`}
                >
                  <path
                    d={sparkPath}
                    fill="none"
                    stroke={sparkColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={sparkW}
                    cy={sparkH - (sparkScores[sparkScores.length - 1] / 10) * sparkH}
                    r="2.5"
                    fill={sparkColor}
                  />
                </svg>
              )}
            </div>
            <p className="sr-only">
              {trendDir === 'flat'
                ? 'La nota se mantiene estable respecto al promedio.'
                : `Tu última nota está ${trendDir === 'up' ? 'por encima' : 'por debajo'} del promedio histórico.`}
            </p>
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
        avgScore={avgScore}
      />
    </div>
  );
}
