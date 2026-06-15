'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { useApp } from '@/shared/contexts/AppContext'
import { playClick, playSuccess } from '@/shared/utils/sounds'
import { loadDueReviewItems, applyReview, type ReviewItem } from '@/lib/review'
import { reviewSrs, type ReviewGrade } from '@/lib/srs'

/** Convierte un intervalo en días a una etiqueta humana en español. */
function intervalLabel(days: number): string {
  if (days <= 1) return 'mañana'
  if (days < 7) return `en ${days} días`
  if (days < 30) return `en ${Math.round(days / 7)} sem`
  if (days < 365) return `en ${Math.round(days / 30)} meses`
  return 'en 1 año'
}

export default function RepasoHoyPage() {
  const { t } = useApp()
  // queue === null => cargando; [] => nada que repasar
  const [queue, setQueue] = useState<ReviewItem[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [againCount, setAgainCount] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga única desde localStorage al montar; client-only (localStorage es undefined en SSR) así que un inicializador perezoso no sirve
    setQueue(loadDueReviewItems(new Date()))
  }, [])

  const total = queue?.length ?? 0
  const current = queue && index < total ? queue[index] : null
  const finished = queue !== null && total > 0 && index >= total
  const empty = queue !== null && total === 0

  // Vista previa del próximo intervalo para cada grado (estilo Anki).
  const previews = useMemo(() => {
    if (!current) return null
    const now = new Date()
    return {
      again: intervalLabel(reviewSrs(current.srs, 'again', now).intervalDays),
      good: intervalLabel(reviewSrs(current.srs, 'good', now).intervalDays),
      easy: intervalLabel(reviewSrs(current.srs, 'easy', now).intervalDays),
    }
  }, [current])

  const handleGrade = useCallback((grade: ReviewGrade) => {
    if (!current) return
    applyReview(current.sectorId, current.id, grade, new Date())
    if (grade === 'again') { setAgainCount(c => c + 1); playClick() } else { playSuccess() }
    setReviewedCount(c => c + 1)
    setRevealed(false)
    setIndex(i => i + 1)
  }, [current])

  // --- Estados de carga / vacío / final ---

  if (queue === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (empty || finished) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-sm w-full space-y-5"
        >
          <div className="text-6xl">{empty ? '✅' : '🎉'}</div>
          <h1 className="text-2xl font-bold text-foreground">
            {empty ? 'Nada que repasar hoy' : '¡Repaso completado!'}
          </h1>
          <p className="text-muted-foreground">
            {empty
              ? 'Estás al día con tu repaso. Vuelve mañana o sigue aprendiendo algo nuevo.'
              : `Has repasado ${reviewedCount} ${reviewedCount === 1 ? 'aprendizaje' : 'aprendizajes'}${againCount > 0 ? ` · ${againCount} para reforzar pronto` : ''}.`}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/aprendizajes"
              onClick={() => playClick()}
              className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Ver mis aprendizajes
            </Link>
            <Link
              href="/"
              onClick={() => playClick()}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground font-medium hover:bg-accent transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // --- Tarjeta de repaso activa ---
  const sectorName = current ? t(`sectors.${current.sectorKey}`) : ''
  const progress = total > 0 ? Math.round((index / total) * 100) : 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cabecera: salir + progreso */}
      <header
        className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-2xl mx-auto w-full px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            onClick={() => playClick()}
            aria-label="Salir del repaso"
            className="shrink-0 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <span aria-hidden="true" className="text-lg">✕</span>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">📅 Repasar hoy</span>
              <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                {Math.min(index + 1, total)} / {total}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido de la tarjeta */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-6">
          {/* key={item.id}: al cambiar de item React remonta la tarjeta y re-anima
              la entrada. Evitamos AnimatePresence mode="wait" (se quedaba "colgado"
              esperando el exit y no montaba la siguiente tarjeta). */}
          <motion.div
              key={current?.id ?? index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl shadow-sm p-5 sm:p-7"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base" aria-hidden="true">{current?.sectorIcon}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{sectorName}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{current?.title}</h1>

              {!revealed ? (
                <div className="mt-6 flex flex-col items-center text-center gap-4 py-4">
                  <p className="text-sm text-muted-foreground">Intenta recordar de qué trata antes de ver el resumen.</p>
                  <button
                    type="button"
                    onClick={() => { setRevealed(true); playClick() }}
                    className="px-6 py-3 min-h-[48px] rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                  >
                    Mostrar resumen
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="mt-4 prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground border-t border-border pt-4">
                    {current?.summary
                      ? <ReactMarkdown>{current.summary}</ReactMarkdown>
                      : <p className="text-muted-foreground italic">Este aprendizaje no tiene resumen.</p>}
                  </div>

                  <div className="mt-6">
                    <p className="text-center text-sm font-medium text-foreground mb-3">¿Qué tal lo recordaste?</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleGrade('again')}
                        aria-label={`Otra vez (volver a repasar ${previews?.again})`}
                        className="flex flex-col items-center gap-0.5 px-2 py-3 min-h-[56px] rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold transition-colors"
                      >
                        <span>Otra vez</span>
                        <span className="text-[10px] font-normal opacity-80">{previews?.again}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGrade('good')}
                        aria-label={`Bien (próximo repaso ${previews?.good})`}
                        className="flex flex-col items-center gap-0.5 px-2 py-3 min-h-[56px] rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors"
                      >
                        <span>Bien</span>
                        <span className="text-[10px] font-normal opacity-80">{previews?.good}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGrade('easy')}
                        aria-label={`Fácil (próximo repaso ${previews?.easy})`}
                        className="flex flex-col items-center gap-0.5 px-2 py-3 min-h-[56px] rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 font-semibold transition-colors"
                      >
                        <span>Fácil</span>
                        <span className="text-[10px] font-normal opacity-80">{previews?.easy}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
        </div>
      </main>
    </div>
  )
}
