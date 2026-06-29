"use client"

/**
 * /idiomas — tablero de aprendizaje de vocabulario de inglés.
 * Progreso semanal (anillo 20/sem + mini-meta diaria), accesos a practicar y
 * apuntar palabras, y la lista con búsqueda/filtros. Sincroniza con Supabase.
 */
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, Play, Flame, GraduationCap, AlertTriangle, BookMarked } from "lucide-react"
import { useApp } from "@/shared/contexts/AppContext"
import { playClick } from "@/shared/utils/sounds"
import { readVocab } from "@/features/idiomas/services/vocabStorage"
import { getVocabStats } from "@/features/idiomas/services/vocabStats"
import { syncVocab } from "@/features/idiomas/services/vocabSync"
import { WeeklyRing } from "@/features/idiomas/components/WeeklyRing"
import { VocabList } from "@/features/idiomas/components/VocabList"
import { AddWordSheet } from "@/features/idiomas/components/AddWordSheet"
import type { VocabWord, VocabStats } from "@/features/idiomas/types"

export default function IdiomasPage() {
  const { settings } = useApp()
  const weeklyGoal = settings.vocabWeeklyGoal ?? 20
  const dailyGoal = settings.vocabDailyGoal ?? 3

  const [words, setWords] = useState<VocabWord[]>([])
  const [stats, setStats] = useState<VocabStats | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const refresh = useCallback(() => {
    setWords(readVocab())
    setStats(getVocabStats(new Date(), weeklyGoal, dailyGoal))
  }, [weeklyGoal, dailyGoal])

  useEffect(() => {
    refresh()
    void syncVocab()
    const onSynced = () => refresh()
    window.addEventListener("vocab-synced", onSynced)
    return () => window.removeEventListener("vocab-synced", onSynced)
  }, [refresh])

  const toPractice = (stats?.dueToday ?? 0) + Math.min(stats?.newAvailable ?? 0, dailyGoal)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-6 pb-mobile-nav md:pb-10">
      <div className="w-full max-w-2xl space-y-5">
        {/* Cabecera */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            onClick={() => playClick()}
            className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1"
          >
            ← Inicio
          </Link>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            🇬🇧 Inglés
          </h1>
          <div className="w-14" />
        </header>

        {/* Tablero semanal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm"
        >
          {stats && (
            <WeeklyRing
              weekLearned={stats.weekLearned}
              weeklyGoal={stats.weeklyGoal}
              todayLearned={stats.todayLearned}
              dailyGoal={stats.dailyGoal}
            />
          )}
        </motion.div>

        {/* Mini-métricas */}
        {stats && (
          <div className="grid grid-cols-3 gap-2.5">
            <MiniStat icon={<GraduationCap className="w-4 h-4 text-emerald-500" />} label="Dominadas" value={stats.mastered} />
            <MiniStat icon={<Flame className="w-4 h-4 text-violet-500" />} label="Vencidas" value={stats.dueToday} />
            <MiniStat icon={<BookMarked className="w-4 h-4 text-sky-500" />} label="Total" value={stats.total} />
          </div>
        )}

        {/* Aviso de atascadas */}
        {stats && stats.leeches > 0 && (
          <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-xl p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Tienes <strong>{stats.leeches}</strong> palabra{stats.leeches === 1 ? "" : "s"} atascada
              {stats.leeches === 1 ? "" : "s"}. Las verás filtrando por “Atascadas” abajo.
            </span>
          </div>
        )}

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/idiomas/practica"
            onClick={() => playClick()}
            className="relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4" /> Practicar
            {toPractice > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {toPractice}
              </span>
            )}
          </Link>
          <button
            onClick={() => {
              playClick()
              setAddOpen(true)
            }}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold hover:bg-accent transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Apunta palabra
          </button>
        </div>

        {/* Lista */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
          <VocabList words={words} onChanged={refresh} />
        </div>
      </div>

      <AddWordSheet isOpen={addOpen} onClose={() => setAddOpen(false)} onSaved={refresh} />
    </div>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-3 shadow-sm text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xl font-bold text-foreground leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  )
}
