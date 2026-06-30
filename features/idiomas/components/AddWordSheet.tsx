"use client"

/**
 * "Apunta palabra": escribes una palabra en inglés, la IA del VPS la completa
 * (traducción, ejemplo en contexto, fonética, tipo, nivel CEFR), revisas/editas
 * y guardas. Si la palabra es A1–B1 avisa de que es "demasiado básica".
 * Si la IA no está disponible, permite alta manual.
 */
import React, { useState } from "react"
import { Sparkles, Loader2, AlertTriangle } from "lucide-react"
import { Sheet } from "@/shared/components"
import { playClick, playSuccess } from "@/shared/utils/sounds"
import { addWord, updateWord } from "../services/vocabStorage"
import type { GeneratedCard, PartOfSpeech, CefrLevel, VocabWord } from "../types"

const POS_OPTIONS: { value: PartOfSpeech; label: string }[] = [
  { value: "noun", label: "Sustantivo" },
  { value: "verb", label: "Verbo" },
  { value: "adjective", label: "Adjetivo" },
  { value: "adverb", label: "Adverbio" },
  { value: "phrasal_verb", label: "Phrasal verb" },
  { value: "idiom", label: "Idiom" },
  { value: "expression", label: "Expresión" },
  { value: "other", label: "Otro" },
]

const CEFR_OPTIONS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"]
const BASIC_LEVELS: CefrLevel[] = ["A1", "A2", "B1"]

const EMPTY: GeneratedCard = {
  word: "",
  translation: "",
  partOfSpeech: "other",
  phonetic: "",
  example: "",
  exampleTranslation: "",
  cefr: undefined,
  synonyms: [],
}

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Se llama tras guardar una palabra, para refrescar la lista/tablero. */
  onSaved?: () => void
  /** Palabra inicial (p.ej. preseleccionada desde otra pantalla). */
  initialWord?: string
  /** Si se pasa, el sheet edita esa palabra en vez de crear una nueva. */
  editWord?: VocabWord | null
}

function cardFromWord(w: VocabWord): GeneratedCard {
  return {
    word: w.word,
    translation: w.translation,
    partOfSpeech: w.partOfSpeech,
    phonetic: w.phonetic ?? "",
    example: w.example ?? "",
    exampleTranslation: w.exampleTranslation ?? "",
    cefr: w.cefr,
    synonyms: w.synonyms ?? [],
  }
}

export function AddWordSheet({ isOpen, onClose, onSaved, initialWord = "", editWord = null }: Props) {
  const isEditing = !!editWord
  const [step, setStep] = useState<"input" | "review">("input")
  const [word, setWord] = useState(initialWord)
  const [card, setCard] = useState<GeneratedCard>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reinicia el formulario al abrir (o lo precarga si estamos editando).
  React.useEffect(() => {
    if (!isOpen) return
    setError(null)
    setLoading(false)
    if (editWord) {
      setCard(cardFromWord(editWord))
      setWord(editWord.word)
      setStep("review")
    } else {
      setCard(EMPTY)
      setWord(initialWord)
      setStep("input")
    }
  }, [isOpen, initialWord, editWord])

  const handleGenerate = async () => {
    const w = word.trim()
    if (!w) return
    playClick()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/idiomas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: w }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.ok && data.card) {
        setCard({ ...EMPTY, ...data.card })
        setStep("review")
      } else if (data?.error === "BRAIN_NOT_CONFIGURED") {
        // Sin IA: pasamos a alta manual con la palabra ya puesta.
        setCard({ ...EMPTY, word: w })
        setStep("review")
        setError("La IA no está disponible ahora. Rellena la tarjeta a mano.")
      } else {
        setError("No se pudo generar la tarjeta. Inténtalo de nuevo o rellénala a mano.")
        setCard({ ...EMPTY, word: w })
        setStep("review")
      }
    } catch {
      setError("Error de conexión. Rellena la tarjeta a mano si quieres.")
      setCard({ ...EMPTY, word: w })
      setStep("review")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!card.word.trim() || !card.translation.trim()) {
      setError("La palabra y su traducción son obligatorias.")
      return
    }
    if (editWord) {
      updateWord(editWord.id, {
        word: card.word.trim(),
        translation: card.translation.trim(),
        partOfSpeech: card.partOfSpeech,
        phonetic: card.phonetic?.trim() || undefined,
        example: (card.example ?? "").trim(),
        exampleTranslation: card.exampleTranslation?.trim() || undefined,
        cefr: card.cefr,
        synonyms: Array.isArray(card.synonyms) ? card.synonyms : undefined,
      })
    } else {
      addWord(card, { source: "manual" })
    }
    playSuccess()
    onSaved?.()
    onClose()
  }

  const set = <K extends keyof GeneratedCard>(key: K, value: GeneratedCard[K]) =>
    setCard((c) => ({ ...c, [key]: value }))

  const isBasic = card.cefr ? BASIC_LEVELS.includes(card.cefr) : false

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={isEditing ? "✏️ Editar palabra" : "📝 Apunta una palabra"}
      desktopMaxWidth="max-w-lg"
      preventDragClose
      footer={
        <div className="flex justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent transition-all min-h-[40px]"
          >
            Cancelar
          </button>
          {step === "review" && (
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all min-h-[40px]"
            >
              Guardar palabra
            </button>
          )}
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-5">
        {/* Paso 1: introducir la palabra (solo al crear, no al editar) */}
        {!isEditing && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Palabra en inglés</label>
          <div className="flex gap-2">
            <input
              autoFocus
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && step === "input") handleGenerate()
              }}
              placeholder="p.ej. ubiquitous"
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !word.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-500 font-medium text-sm hover:bg-indigo-500/20 transition-all disabled:opacity-50 min-h-[40px] shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Generando" : "Generar"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            La IA rellena traducción, ejemplo, fonética y nivel. Tú revisas antes de guardar.
          </p>
        </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Paso 2: revisar / editar */}
        {step === "review" && (
          <div className="space-y-4 border-t border-border pt-4">
            {isBasic && (
              <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Esta palabra es de nivel <strong>{card.cefr}</strong> (básico). Buscas vocabulario B2–C2;
                  puedes guardarla igualmente o cambiarla.
                </span>
              </div>
            )}

            <Field label="Palabra (inglés)">
              <input
                value={card.word}
                onChange={(e) => set("word", e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>

            <Field label="Traducción (español)">
              <input
                value={card.translation}
                onChange={(e) => set("translation", e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select
                  value={card.partOfSpeech}
                  onChange={(e) => set("partOfSpeech", e.target.value as PartOfSpeech)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {POS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nivel CEFR">
                <select
                  value={card.cefr ?? ""}
                  onChange={(e) => set("cefr", (e.target.value || undefined) as CefrLevel | undefined)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">—</option>
                  {CEFR_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Fonética (IPA)">
              <input
                value={card.phonetic ?? ""}
                onChange={(e) => set("phonetic", e.target.value)}
                placeholder="/juːˈbɪkwɪtəs/"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>

            <Field label="Ejemplo (inglés)">
              <textarea
                value={card.example}
                onChange={(e) => set("example", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </Field>

            <Field label="Traducción del ejemplo (español)">
              <textarea
                value={card.exampleTranslation ?? ""}
                onChange={(e) => set("exampleTranslation", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </Field>

            {card.synonyms && card.synonyms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground self-center">Sinónimos:</span>
                {card.synonyms.map((s) => (
                  <span key={s} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
