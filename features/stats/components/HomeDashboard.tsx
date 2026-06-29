"use client"

/**
 * Dashboard de entrada: reúne TODAS las métricas de un vistazo (racha, tiempo de
 * práctica, aprendizajes, repasos pendientes), un gráfico de actividad de 30 días,
 * el reparto por sector, un resumen de habilidades y la tendencia de exámenes.
 *
 * Fuentes (consistentes con el resto de la app):
 *  - Aprendizajes: localStorage `sector_data_*` (igual que home y /progreso).
 *  - Habilidades y práctica: /api/habilidades + /api/stats/activity (Supabase).
 *  - Exámenes: /api/repaso/historial (Supabase).
 */
import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from "recharts"
import { Flame, Clock, BookOpen, CalendarCheck, Zap, GraduationCap, TrendingUp, TrendingDown, Minus, Languages, Play } from "lucide-react"
import { SECTORES_DATA } from "@/shared/constants/sectores"
import { calculateGamificationStats } from "@/shared/utils/gamification"
import { formatearTiempo } from "@/shared/constants/habilidades"
import { isDue } from "@/lib/srs"
import { useApp } from "@/shared/contexts/AppContext"
import { getVocabStats, getVocabPracticeDates } from "@/features/idiomas/services/vocabStats"
import { syncVocab } from "@/features/idiomas/services/vocabSync"
import type { VocabStats } from "@/features/idiomas/types"

// ---------- Tipos ----------
interface SkillLite { id: string; nombre: string; tiempo_total_segundos: number; nivel: string }
interface ActivityItem { date: string; type: "learning" | "practice"; details?: { duration?: number } }
interface ExamItem { score: number; total_questions: number; created_at: string }

// ---------- Lectura de aprendizajes (localStorage) ----------
function readLearnings() {
  const dates: string[] = []
  const bySector: Record<string, number> = {}
  let total = 0
  let dueToday = 0
  const now = new Date()
  let decayed: string[] = []
  try {
    const raw = JSON.parse(localStorage.getItem("decayed_items") || "[]")
    if (Array.isArray(raw)) decayed = raw
  } catch { /* noop */ }

  for (const sector of SECTORES_DATA) {
    try {
      const stored = localStorage.getItem(`sector_data_${sector.id}`)
      if (!stored) { bySector[sector.id] = 0; continue }
      const data = JSON.parse(stored)
      const items = Array.isArray(data?.items) ? data.items : []
      bySector[sector.id] = items.length
      total += items.length
      for (const it of items) {
        if (it?.date) dates.push(it.date)
        if (isDue(it?.srs, now) || (it?.id && decayed.includes(it.id))) dueToday++
      }
    } catch { bySector[sector.id] = 0 }
  }
  return { dates, bySector, total, dueToday }
}

// ---------- Tarjeta de métrica ----------
function StatCard({ icon, label, value, sub, href, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; href: string; accent: string
}) {
  return (
    <Link href={href} className="group">
      <div className="h-full bg-card border border-border/60 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-border transition-all active:scale-[0.98]">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${accent}`}>{icon}</span>
          <span className="text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform">→</span>
        </div>
        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>}
      </div>
    </Link>
  )
}

export function HomeDashboard() {
  const { settings } = useApp()
  const isDark = settings.darkMode
  const [tick, setTick] = useState(0)
  const [skills, setSkills] = useState<SkillLite[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [exams, setExams] = useState<ExamItem[]>([])
  const [learn, setLearn] = useState<{ dates: string[]; bySector: Record<string, number>; total: number; dueToday: number }>(
    { dates: [], bySector: {}, total: 0, dueToday: 0 }
  )
  const [vocab, setVocab] = useState<VocabStats | null>(null)
  const [vocabDates, setVocabDates] = useState<string[]>([])

  const weeklyGoal = settings.vocabWeeklyGoal ?? 20
  const dailyGoal = settings.vocabDailyGoal ?? 3

  const refreshVocab = React.useCallback(() => {
    setVocab(getVocabStats(new Date(), weeklyGoal, dailyGoal))
    setVocabDates(getVocabPracticeDates())
  }, [weeklyGoal, dailyGoal])

  // Recalcula los aprendizajes (localStorage) en cada sync.
  useEffect(() => {
    setLearn(readLearnings())
    refreshVocab()
    void syncVocab()
    const onSynced = () => setTick((n) => n + 1)
    const onVocab = () => { setTick((n) => n + 1); refreshVocab() }
    window.addEventListener("learnings-synced", onSynced)
    window.addEventListener("vocab-synced", onVocab)
    return () => {
      window.removeEventListener("learnings-synced", onSynced)
      window.removeEventListener("vocab-synced", onVocab)
    }
  }, [refreshVocab])
  useEffect(() => { setLearn(readLearnings()); refreshVocab() }, [tick, refreshVocab])

  // Datos remotos (habilidades / práctica / exámenes).
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [hRes, aRes, eRes] = await Promise.allSettled([
          fetch("/api/habilidades"),
          fetch("/api/stats/activity"),
          fetch("/api/repaso/historial"),
        ])
        if (!alive) return
        if (hRes.status === "fulfilled" && hRes.value.ok) {
          const j = await hRes.value.json().catch(() => null)
          const items = j?.data?.items || j?.data || []
          if (Array.isArray(items)) setSkills(items)
        }
        if (aRes.status === "fulfilled" && aRes.value.ok) {
          const j = await aRes.value.json().catch(() => null)
          const log = j?.data?.activityLog || []
          if (Array.isArray(log)) setActivity(log.filter((x: ActivityItem) => x.type === "practice"))
        }
        if (eRes.status === "fulfilled" && eRes.value.ok) {
          const j = await eRes.value.json().catch(() => null)
          const hist = j?.data || j?.history || j?.data?.items || []
          if (Array.isArray(hist)) setExams(hist)
        }
      } catch { /* silencioso: el dashboard muestra lo que tenga */ }
    })()
    return () => { alive = false }
  }, [tick])

  // La racha es unificada: cuenta tanto aprendizajes como práctica de vocabulario.
  const gam = useMemo(() => calculateGamificationStats([...learn.dates, ...vocabDates]), [learn.dates, vocabDates])

  // Tiempo de práctica total y de los últimos 7 días.
  const practice = useMemo(() => {
    const totalSec = skills.reduce((s, k) => s + Number(k.tiempo_total_segundos || 0), 0)
    const weekAgo = Date.now() - 7 * 86400000
    let weekSec = 0
    for (const a of activity) {
      const t = new Date(a.date).getTime()
      if (!isNaN(t) && t >= weekAgo) weekSec += Number(a.details?.duration || 0)
    }
    return { totalSec, weekSec, count: skills.length }
  }, [skills, activity])

  // Serie de actividad de los últimos 30 días (aprendizajes + sesiones de práctica).
  const activity30 = useMemo(() => {
    const days: { key: string; label: string; learn: number; practice: number; isToday: boolean }[] = []
    const today = new Date()
    const dayKey = (d: Date) => d.toLocaleDateString("en-CA")
    const map: Record<string, { learn: number; practice: number }> = {}
    for (const d of learn.dates) {
      const k = new Date(d)
      if (!isNaN(k.getTime())) { const key = dayKey(k); (map[key] ||= { learn: 0, practice: 0 }).learn++ }
    }
    for (const a of activity) {
      const k = new Date(a.date)
      if (!isNaN(k.getTime())) { const key = dayKey(k); (map[key] ||= { learn: 0, practice: 0 }).practice++ }
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      const key = dayKey(d)
      days.push({
        key,
        label: d.getDate().toString(),
        learn: map[key]?.learn || 0,
        practice: map[key]?.practice || 0,
        isToday: i === 0,
      })
    }
    return days
  }, [learn.dates, activity])

  const activeDays30 = activity30.filter((d) => d.learn + d.practice > 0).length

  // Tendencia de exámenes (nota /10 + sparkline).
  const examTrend = useMemo(() => {
    if (!exams.length) return null
    const sorted = [...exams].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const toScore = (e: ExamItem) => (e.total_questions > 0 ? (e.score / e.total_questions) * 10 : 0)
    const avg = sorted.reduce((s, e) => s + toScore(e), 0) / sorted.length
    const last = toScore(sorted[sorted.length - 1])
    const series = sorted.slice(-8).map((e, i) => ({ i, v: Number(toScore(e).toFixed(1)) }))
    const dir = Math.abs(last - avg) < 0.05 ? "flat" : last > avg ? "up" : "down"
    return { avg, last, series, dir, count: sorted.length }
  }, [exams])

  // Top habilidades por tiempo.
  const topSkills = useMemo(() => {
    return [...skills].sort((a, b) => Number(b.tiempo_total_segundos || 0) - Number(a.tiempo_total_segundos || 0)).slice(0, 4)
  }, [skills])
  const maxSkillSec = topSkills[0] ? Number(topSkills[0].tiempo_total_segundos || 0) || 1 : 1

  const sectorDistro = useMemo(() => {
    const arr = SECTORES_DATA.map((s) => ({ id: s.id, icon: s.icono, count: learn.bySector[s.id] || 0 }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
    const max = arr[0]?.count || 1
    return { arr, max }
  }, [learn.bySector])

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-sm font-semibold text-foreground/90">Tu progreso de un vistazo</h2>
        <Link href="/progreso" className="text-xs text-indigo-500 hover:text-indigo-400 font-medium">Ver más →</Link>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <StatCard icon={<Flame className="w-4 h-4 text-orange-500" />} accent="bg-orange-500/10"
          label="Racha" value={`${gam.currentStreak}d`} sub={gam.isTodayLearned ? "hoy ✓" : "¡no la pierdas!"} href="/progreso" />
        <StatCard icon={<Clock className="w-4 h-4 text-indigo-500" />} accent="bg-indigo-500/10"
          label="Práctica (7d)" value={practice.weekSec >= 60 ? formatearTiempo(practice.weekSec) : "0m"} sub={`Total: ${formatearTiempo(practice.totalSec)}`} href="/habilidades" />
        <StatCard icon={<BookOpen className="w-4 h-4 text-emerald-500" />} accent="bg-emerald-500/10"
          label="Aprendizajes" value={learn.total} sub={`${activeDays30} días activos (30d)`} href="/aprendizajes" />
        <StatCard icon={<CalendarCheck className="w-4 h-4 text-violet-500" />} accent="bg-violet-500/10"
          label="Repasar hoy" value={learn.dueToday} sub={learn.dueToday > 0 ? "tocan repaso" : "al día ✓"} href={learn.dueToday > 0 ? "/repaso/hoy" : "/progreso"} />
      </div>

      {/* Idiomas — vocabulario de inglés */}
      {(settings.learningEnglish ?? true) && vocab && (
        <Link href="/idiomas" className="block group">
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-border transition-all active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-rose-500/10 shrink-0">
                <Languages className="w-4 h-4 text-rose-500" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">🇬🇧 Inglés · esta semana</h3>
                  <span className="text-xs font-bold text-foreground tabular-nums">{vocab.weekLearned}/{vocab.weeklyGoal}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all"
                    style={{ width: `${Math.min(100, vocab.weeklyGoal > 0 ? (vocab.weekLearned / vocab.weeklyGoal) * 100 : 0)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {vocab.dueToday > 0
                    ? `${vocab.dueToday} para repasar · ${vocab.mastered} dominadas`
                    : vocab.total === 0
                      ? "Apunta tu primera palabra"
                      : `Al día · ${vocab.mastered} dominadas`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 shrink-0">
                <Play className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Practicar</span>
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Actividad 30 días */}
      <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Actividad · últimos 30 días</h3>
          <span className="text-[10px] text-muted-foreground">{activeDays30}/30 días</span>
        </div>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity30} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barCategoryGap="18%">
              <XAxis dataKey="label" tick={{ fill: isDark ? "#475569" : "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <Tooltip
                cursor={{ fill: isDark ? "#7c3aed15" : "#7c3aed08" }}
                contentStyle={{ background: isDark ? "#1e1b4b" : "#fff", border: `1px solid ${isDark ? "#4c1d95" : "#ddd6fe"}`, borderRadius: 12, fontSize: 12 }}
                formatter={(v: number, n: string) => [v, n === "learn" ? "Aprendizajes" : "Prácticas"]}
                labelFormatter={(l) => `Día ${l}`}
              />
              <Bar dataKey="learn" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={14}>
                {activity30.map((d, i) => <Cell key={i} fill={d.isToday ? "#34d399" : "#10b981"} />)}
              </Bar>
              <Bar dataKey="practice" stackId="a" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {activity30.map((d, i) => <Cell key={i} fill={d.isToday ? "#a78bfa" : "#7c3aed"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Aprendizajes</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-600" /> Prácticas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Habilidades */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Zap className="w-4 h-4 text-indigo-500" /> Habilidades</h3>
            <Link href="/habilidades" className="text-[11px] text-indigo-500 hover:text-indigo-400">Ver todas →</Link>
          </div>
          {topSkills.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Aún no practicas ninguna habilidad.<br />Dile a tu bot <span className="text-foreground/80">&quot;estoy tocando el piano&quot;</span> 🎹</p>
          ) : (
            <div className="space-y-2.5">
              {topSkills.map((s) => {
                const sec = Number(s.tiempo_total_segundos || 0)
                const pct = Math.max(4, Math.round((sec / maxSkillSec) * 100))
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground/90 truncate">{s.nombre}</span>
                      <span className="text-muted-foreground tabular-nums">{formatearTiempo(sec)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Exámenes */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-amber-500" /> Exámenes</h3>
            <Link href="/repaso/historial" className="text-[11px] text-indigo-500 hover:text-indigo-400">Historial →</Link>
          </div>
          {!examTrend ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Aún no has hecho ningún test semanal.</p>
          ) : (
            <div>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-2xl font-bold text-foreground leading-none">{examTrend.avg.toFixed(1)}<span className="text-sm text-muted-foreground font-normal">/10</span></span>
                <span className={`flex items-center gap-0.5 text-xs font-medium mb-0.5 ${examTrend.dir === "up" ? "text-emerald-500" : examTrend.dir === "down" ? "text-rose-500" : "text-muted-foreground"}`}>
                  {examTrend.dir === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : examTrend.dir === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {examTrend.dir === "flat" ? "estable" : `último ${examTrend.last.toFixed(1)}`}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Nota media · {examTrend.count} examen{examTrend.count !== 1 ? "es" : ""}</p>
              <div className="h-[48px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={examTrend.series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <Tooltip contentStyle={{ background: isDark ? "#1e1b4b" : "#fff", border: `1px solid ${isDark ? "#4c1d95" : "#ddd6fe"}`, borderRadius: 10, fontSize: 11 }} formatter={(v: number) => [`${v}/10`, "Nota"]} labelFormatter={() => ""} />
                    <Line type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2, fill: "#f59e0b" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reparto por sector */}
      {sectorDistro.arr.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3">Aprendizajes por sector</h3>
          <div className="space-y-2">
            {sectorDistro.arr.map((s) => (
              <Link key={s.id} href={`/aprendizajes/${s.id}`} className="flex items-center gap-2.5 group">
                <span className="text-base w-6 text-center">{s.icon}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 group-hover:opacity-90" style={{ width: `${Math.max(6, Math.round((s.count / sectorDistro.max) * 100))}%` }} />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{s.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
