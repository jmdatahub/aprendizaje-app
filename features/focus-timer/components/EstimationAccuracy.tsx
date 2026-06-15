"use client"

import { useEffect, useState } from "react"
import { Target } from "lucide-react"

/**
 * A single persisted entry of an estimated-vs-real task measurement.
 * Stored (accumulated) under the `focus_session_log` localStorage key.
 */
export interface SessionLogEntry {
  name: string
  /** Estimated minutes for the task. */
  est: number
  /** Real (measured) minutes the task took. */
  real: number
  /** ISO timestamp of when the task was completed. */
  date: string
}

export const SESSION_LOG_KEY = "focus_session_log"
/** Cap stored entries so localStorage never grows unbounded. */
export const SESSION_LOG_MAX = 500

interface AccuracyStats {
  /** Mean absolute deviation as a percentage (0–∞). */
  meanDeviationPct: number
  /** Net signed bias: positive = tends to underestimate (real > est). */
  biasPct: number
  /** Number of valid measured tasks. */
  count: number
}

/**
 * Reads the accumulated session log and computes estimation-accuracy stats.
 * Only entries with a positive estimate are considered (a 0 estimate has no
 * meaningful percentage deviation).
 */
function computeAccuracy(entries: SessionLogEntry[]): AccuracyStats | null {
  const valid = entries.filter((e) => e.est > 0 && e.real >= 0)
  if (valid.length === 0) return null

  let absSum = 0
  let signedSum = 0
  for (const e of valid) {
    const diff = (e.real - e.est) / e.est
    absSum += Math.abs(diff)
    signedSum += diff
  }

  return {
    meanDeviationPct: Math.round((absSum / valid.length) * 100),
    biasPct: Math.round((signedSum / valid.length) * 100),
    count: valid.length,
  }
}

/**
 * Discreet, mobile-friendly indicator of accumulated estimation precision
 * (estimated vs. real time). Renders nothing when there is no data yet.
 *
 * The `refreshKey` prop lets a parent force a re-read of localStorage after it
 * appends a new entry (e.g. when a task is completed).
 */
export function EstimationAccuracy({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<AccuracyStats | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_LOG_KEY)
      if (!raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- recomputes the accuracy metric from localStorage on mount and when refreshKey changes (client-only; no reactive value to derive during render)
        setStats(null)
        return
      }
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        setStats(null)
        return
      }
      const entries = parsed.filter(
        (e): e is SessionLogEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as SessionLogEntry).est === "number" &&
          typeof (e as SessionLogEntry).real === "number"
      )
      setStats(computeAccuracy(entries))
    } catch {
      setStats(null)
    }
  }, [refreshKey])

  // Empty state: render nothing for a clean UI.
  if (!stats) return null

  const { meanDeviationPct, biasPct, count } = stats

  // Bias label: a small tolerance band counts as "afinado" (on target).
  let tendency: string
  if (biasPct > 5) tendency = "sueles subestimar"
  else if (biasPct < -5) tendency = "sueles sobreestimar"
  else tendency = "muy afinado"

  return (
    <div className="flex items-center justify-center gap-1.5 opacity-50">
      <Target className="w-3 h-3 text-indigo-400" aria-hidden="true" />
      <span className="uppercase tracking-[0.2em] font-medium text-[9px]">
        De media te desvías un {meanDeviationPct}% · {tendency} · {count}{" "}
        {count === 1 ? "tarea medida" : "tareas medidas"}
      </span>
    </div>
  )
}

/**
 * Appends a measured task to the persisted `focus_session_log`, keeping only
 * the most recent {@link SESSION_LOG_MAX} entries. Safe to call on the client
 * only. Failures (e.g. quota / disabled storage) are swallowed silently so the
 * timer flow is never interrupted.
 */
export function appendSessionLogEntry(entry: {
  name: string
  est: number
  real: number
}): void {
  try {
    const raw = localStorage.getItem(SESSION_LOG_KEY)
    let entries: SessionLogEntry[] = []
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) entries = parsed as SessionLogEntry[]
    }
    entries.push({ ...entry, date: new Date().toISOString() })
    if (entries.length > SESSION_LOG_MAX) {
      entries = entries.slice(entries.length - SESSION_LOG_MAX)
    }
    localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(entries))
  } catch {
    // Ignore persistence errors; in-session behavior is unaffected.
  }
}
