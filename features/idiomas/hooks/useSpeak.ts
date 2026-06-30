"use client"

/**
 * Pronunciación de inglés con la Web Speech API del navegador (gratis, sin deps).
 * Elige automáticamente una voz inglesa (en-GB / en-US) y lee un poco más lento
 * para facilitar el aprendizaje. Tolerante a fallos: si no hay TTS, no hace nada.
 */
import { useCallback, useEffect, useRef, useState } from "react"

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  // Preferencias: en-GB, luego en-US, luego cualquier inglés.
  return (
    voices.find((v) => /^en-GB/i.test(v.lang)) ||
    voices.find((v) => /^en-US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  )
}

export function useSpeak() {
  const [speaking, setSpeaking] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const supported = typeof window !== "undefined" && "speechSynthesis" in window

  // Las voces se cargan de forma asíncrona en algunos navegadores.
  useEffect(() => {
    if (!supported) return
    const load = () => {
      voiceRef.current = pickEnglishVoice(window.speechSynthesis.getVoices())
    }
    load()
    window.speechSynthesis.addEventListener("voiceschanged", load)
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load)
      window.speechSynthesis.cancel()
    }
  }, [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text?.trim()) return
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text)
        const v = voiceRef.current || pickEnglishVoice(window.speechSynthesis.getVoices())
        if (v) u.voice = v
        u.lang = v?.lang || "en-GB"
        u.rate = 0.92
        u.onstart = () => setSpeaking(true)
        u.onend = () => setSpeaking(false)
        u.onerror = () => setSpeaking(false)
        window.speechSynthesis.speak(u)
      } catch {
        setSpeaking(false)
      }
    },
    [supported],
  )

  return { speak, speaking, supported }
}
