"use client"

/**
 * Lista de palabras con búsqueda y filtros (estado, nivel). Tocar una fila la
 * abre para editar; el botón papelera pide una confirmación en línea (sin
 * diálogos nativos). Presentacional sobre los datos de localStorage.
 */
import { useMemo, useState } from "react"
import { Trash2, Search, Check, X, Volume2 } from "lucide-react"
import { playClick } from "@/shared/utils/sounds"
import { deleteWord } from "../services/vocabStorage"
import { useSpeak } from "../hooks/useSpeak"
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
  onEdit?: (word: VocabWord) => void
}

export function VocabList({ words, onChanged, onEdit }: Props) {
  const { speak, supported } = useSpeak()
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [confirmId, setConfirmId] = useState<string | null>(null)

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
    playClick()
    deleteWord(w.id)
    setConfirmId(null)
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
                className="flex items-center gap-2 bg-card border border-border/60 rounded-xl p-3 group"
              >
                <button
                  type="button"
                  onClick={() => { playClick(); onEdit?.(w) }}
                  aria-label={`Editar ${w.word}`}
                  className="flex-1 min-w-0 text-left"
                >
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
                </button>
                {supported && confirmId !== w.id && (
                  <button
                    onClick={() => speak(w.word)}
                    aria-label={`Pronunciar ${w.word}`}
                    className="shrink-0 p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
                {confirmId === w.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(w)}
                      aria-label={`Confirmar borrado de ${w.word}`}
                      className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { playClick(); setConfirmId(null) }}
                      aria-label="Cancelar borrado"
                      className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { playClick(); setConfirmId(w.id) }}
                    aria-label={`Eliminar ${w.word}`}
                    className="shrink-0 p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
