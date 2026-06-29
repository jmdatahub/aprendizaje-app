"use client"

/**
 * Sesión de práctica de vocabulario a pantalla completa.
 * Toma la cola de hoy (vencidas + nuevas), muestra cada palabra con VocabCard,
 * alterna dirección receptiva/productiva según el progreso SRS y registra el
 * grading (otra vez / bien / fácil) que alimenta el SRS y las métricas.
 */
import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { playClick, playSuccess } from "@/shared/utils/sounds"
import { useApp } from "@/shared/contexts/AppContext"
import { reviewSrs, type ReviewGrade } from "@/lib/srs"
import { getTodayQueue, applyVocabReview, nextDirection } from "../services/vocabStorage"
import { VocabCard } from "./VocabCard"
import type { VocabWord, ReviewDirection } from "../types"

/** Intervalo (días) → etiqueta humana. */
function intervalLabel(days: number): string {
  if (days <= 1) return "mañana"
  if (days < 7) return `en ${days} días`
  if (days < 30) return `en ${Math.round(days / 7)} sem`
  if (days < 365) return `en ${Math.round(days / 30)} meses`
  return "en 1 año"
}

export function PracticeSession() {
  const { settings } = useApp()
  const dailyGoal = settings.vocabDailyGoal ?? 3
  const leechThreshold = settings.vocabLeechThreshold ?? 8

  const [queue, setQueue] = useState<VocabWord[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [mode, setMode] = useState<"flip" | "cloze">("flip")
  const [reviewedCount, setReviewedCount] = useState(0)
  const [againCount, setAgainCount] = useState(0)
  const [learnedCount, setLearnedCount] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga única desde localStorage al montar (client-only)
    setQueue(getTodayQueue(new Date(), dailyGoal))
  }, [dailyGoal])

  const total = queue?.length ?? 0
  const current = queue && index < total ? queue[index] : null
  const finished = queue !== null && total > 0 && index >= total
  const empty = queue !== null && total === 0

  const direction: ReviewDirection = useMemo(
    () => (current ? nextDirection(current) : "recv"),
    [current],
  )

  const previews = useMemo(() => {
    if (!current) return null
    const now = new Date()
    return {
      again: intervalLabel(reviewSrs(current.srs, "again", now).intervalDays),
      good: intervalLabel(reviewSrs(current.srs, "good", now).intervalDays),
      easy: intervalLabel(reviewSrs(current.srs, "easy", now).intervalDays),
    }
  }, [current])

  const handleGrade = useCallback(
    (grade: ReviewGrade) => {
      if (!current) return
      const before = current
      const updated = applyVocabReview(before.id, grade, direction, new Date(), leechThreshold)
      if (grade === "again") {
        setAgainCount((c) => c + 1)
        playClick()
      } else {
        playSuccess()
        // Primera vez que se aprende (no tenía learnedAt y ahora sí).
        if (updated && !before.learnedAt && updated.learnedAt) setLearnedCount((c) => c + 1)
      }
      setReviewedCount((c) => c + 1)
      setRevealed(false)
      setIndex((i) => i + 1)
    },
    [current, direction, leechThreshold],
  )

  // --- Carga / vacío / final ---

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
          <div className="text-6xl">{empty ? "✅" : "🎉"}</div>
          <h1 className="text-2xl font-bold text-foreground">
            {empty ? "Nada que practicar ahora" : "¡Sesión completada!"}
          </h1>
          <p className="text-muted-foreground">
            {empty
              ? "Estás al día con tu vocabulario. Apunta palabras nuevas o vuelve más tarde."
              : `Has practicado ${reviewedCount} ${reviewedCount === 1 ? "palabra" : "palabras"}` +
                `${learnedCount > 0 ? ` · ${learnedCount} aprendida${learnedCount === 1 ? "" : "s"} 🎯` : ""}` +
                `${againCount > 0 ? ` · ${againCount} para reforzar` : ""}.`}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/idiomas"
              onClick={() => playClick()}
              className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Volver a Idiomas
            </Link>
            <Link
              href="/"
              onClick={() => playClick()}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground font-medium hover:bg-accent transition-colors"
            >
              Inicio
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  const progress = total > 0 ? Math.round((index / total) * 100) : 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cabecera: salir + progreso + modo */}
      <header
        className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-2xl mx-auto w-full px-4 py-3 flex items-center gap-3">
          <Link
            href="/idiomas"
            onClick={() => playClick()}
            aria-label="Salir de la práctica"
            className="shrink-0 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <span aria-hidden="true" className="text-lg">
              ✕
            </span>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">🇬🇧 Practicar inglés</span>
              <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                {Math.min(index + 1, total)} / {total}
              </span>
            </div>
            <div
              className="h-1.5 w-full bg-muted rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          {/* Toggle modo */}
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "flip" ? "cloze" : "flip"))
              playClick()
            }}
            className="shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cambiar modo de práctica"
          >
            {mode === "flip" ? "Tarjeta" : "Hueco"}
          </button>
        </div>
      </header>

      {/* Tarjeta */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-6">
          <VocabCard
            word={current!}
            direction={direction}
            mode={mode}
            revealed={revealed}
            onReveal={() => {
              setRevealed(true)
              playClick()
            }}
          />

          {revealed && (
            <div className="mt-6">
              <p className="text-center text-sm font-medium text-foreground mb-3">¿Qué tal lo recordaste?</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleGrade("again")}
                  aria-label={`Otra vez (repasar ${previews?.again})`}
                  className="flex flex-col items-center gap-0.5 px-2 py-3 min-h-[56px] rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold transition-colors"
                >
                  <span>Otra vez</span>
                  <span className="text-[10px] font-normal opacity-80">{previews?.again}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade("good")}
                  aria-label={`Bien (próximo repaso ${previews?.good})`}
                  className="flex flex-col items-center gap-0.5 px-2 py-3 min-h-[56px] rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors"
                >
                  <span>Bien</span>
                  <span className="text-[10px] font-normal opacity-80">{previews?.good}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade("easy")}
                  aria-label={`Fácil (próximo repaso ${previews?.easy})`}
                  className="flex flex-col items-center gap-0.5 px-2 py-3 min-h-[56px] rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 font-semibold transition-colors"
                >
                  <span>Fácil</span>
                  <span className="text-[10px] font-normal opacity-80">{previews?.easy}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
