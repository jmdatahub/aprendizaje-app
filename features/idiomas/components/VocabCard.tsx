"use client"

/**
 * Tarjeta de práctica de una palabra. Soporta dos modos:
 *  - "flip": cara A (palabra o traducción según dirección) → revelar → cara B.
 *  - "cloze": la frase de ejemplo con la palabra oculta (hueco) → revelar.
 * Presentacional: el estado (revelado, dirección, modo) lo controla la sesión.
 */
import { motion } from "framer-motion"
import type { VocabWord, ReviewDirection } from "../types"

const POS_LABEL: Record<VocabWord["partOfSpeech"], string> = {
  noun: "sustantivo",
  verb: "verbo",
  adjective: "adjetivo",
  adverb: "adverbio",
  phrasal_verb: "phrasal verb",
  idiom: "idiom",
  expression: "expresión",
  other: "",
}

/** Escapa una cadena para usarla literal en una RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Sustituye la palabra dentro de la frase por un hueco (case-insensitive). */
function clozeSentence(example: string, word: string): { text: string; matched: boolean } {
  if (!example || !word) return { text: example, matched: false }
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi")
  if (!re.test(example)) return { text: example, matched: false }
  return { text: example.replace(re, "_____"), matched: true }
}

/** Resalta la palabra dentro de la frase. */
function highlight(example: string, word: string): React.ReactNode {
  if (!example || !word) return example
  const re = new RegExp(`(\\b${escapeRegExp(word)}\\b)`, "gi")
  const parts = example.split(re)
  return parts.map((p, i) =>
    re.test(p) ? (
      <strong key={i} className="text-primary font-semibold">
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

interface Props {
  word: VocabWord
  direction: ReviewDirection
  mode: "flip" | "cloze"
  revealed: boolean
  onReveal: () => void
}

export function VocabCard({ word, direction, mode, revealed, onReveal }: Props) {
  const pos = POS_LABEL[word.partOfSpeech]
  const cloze = mode === "cloze" ? clozeSentence(word.example, word.word) : { text: "", matched: false }
  const useCloze = mode === "cloze" && cloze.matched

  return (
    <motion.div
      key={word.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border rounded-2xl shadow-sm p-5 sm:p-7"
    >
      {/* Meta */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {direction === "recv" ? "🇬🇧 → 🇪🇸 Reconoce" : "🇪🇸 → 🇬🇧 Produce"}
        </span>
        {word.cefr && (
          <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
            {word.cefr}
          </span>
        )}
        {pos && <span className="text-[10px] text-muted-foreground/70">· {pos}</span>}
      </div>

      {/* Cara A (pregunta) */}
      {useCloze ? (
        <p className="text-lg sm:text-xl text-foreground leading-relaxed">{cloze.text}</p>
      ) : direction === "recv" ? (
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground break-words">{word.word}</h1>
          {word.phonetic && <p className="text-sm text-muted-foreground mt-1">{word.phonetic}</p>}
        </div>
      ) : (
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">{word.translation}</h1>
      )}

      {!revealed ? (
        <div className="mt-6 flex flex-col items-center text-center gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            {useCloze
              ? "¿Qué palabra falta? Intenta recordarla."
              : direction === "recv"
                ? "¿Qué significa? Intenta recordarlo."
                : "¿Cómo se dice en inglés?"}
          </p>
          <button
            type="button"
            onClick={onReveal}
            className="px-6 py-3 min-h-[48px] rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Mostrar respuesta
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 border-t border-border pt-4 space-y-3">
          {/* Respuesta */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-bold text-foreground">{word.word}</span>
            {word.phonetic && <span className="text-sm text-muted-foreground">{word.phonetic}</span>}
          </div>
          <p className="text-lg text-primary font-medium">{word.translation}</p>

          {/* Ejemplo en contexto */}
          {word.example && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-1">
              <p className="text-sm text-foreground leading-relaxed">{highlight(word.example, word.word)}</p>
              {word.exampleTranslation && (
                <p className="text-xs text-muted-foreground italic">{word.exampleTranslation}</p>
              )}
            </div>
          )}

          {word.synonyms && word.synonyms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {word.synonyms.map((s) => (
                <span key={s} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
