"use client"

/**
 * Lista de palabras con búsqueda y filtros (estado, nivel). Permite borrar y
 * editar la nota. Presentacional sobre los datos de localStorage.
 */
import { useMemo, useState } from "react"
import { Trash2, Search } from "lucide-react"
import { playClick } from "@/shared/utils/sounds"
import { deleteWord } from "../services/vocabStorage"
import type { VocabWord, WordStatus } from "../types"

const STATUS_META: Record<WordStatus, { label: string; cls: string }> = {
  new: { label: "Nueva", cls: "bg-sky-500/10 text-sky-500" },
  learning: { label: "Aprendiendo", cls: "bg-indigo-500/10 text-indigo-500" },
  known: { label: "Dominada", cls: "bg-emerald-500/10 text-emerald-500" },
  leech: { label: "Atascada", cls: "bg-rose-500/10 text-rose-500" },
}

type Filter = "all" | WordStatus

interface Props {
  words: VocabWord[]
  onChanged?: () => void
}

export function VocabList({ words, onChanged }: Props) {
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return words
      .filter((w) => (filter === "all" ? true : w.status === filter))
      .filter(
        (w) =>
          !needle ||
          w.word.toLowerCase().includes(needle) ||
          w.translation.toLowerCase().includes(needle),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [words, q, filter])

  const handleDelete = (w: VocabWord) => {
    if (!confirm(`¿Eliminar "${w.word}"?`)) return
    playClick()
    deleteWord(w.id)
    onChanged?.()
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: words.length, new: 0, learning: 0, known: 0, leech: 0 }
    for (const w of words) c[w.status]++
    return c
  }, [words])

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "new", label: "Nuevas" },
    { key: "learning", label: "Aprendiendo" },
    { key: "known", label: "Dominadas" },
    { key: "leech", label: "Atascadas" },
  ]

  return (
    <div className="space-y-3">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar palabra o traducción..."
          className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key)
              playClick()
            }}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label} <span className="opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {words.length === 0 ? "Aún no has apuntado ninguna palabra." : "Sin resultados."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((w) => {
            const sm = STATUS_META[w.status]
            return (
              <li
                key={w.id}
                className="flex items-center gap-3 bg-card border border-border/60 rounded-xl p-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{w.word}</span>
                    {w.cefr && (
                      <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {w.cefr}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{w.translation}</p>
                </div>
                <button
                  onClick={() => handleDelete(w)}
                  aria-label={`Eliminar ${w.word}`}
                  className="shrink-0 p-2 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
