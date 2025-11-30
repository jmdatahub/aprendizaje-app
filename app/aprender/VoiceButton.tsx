'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onTranscript: (text: string) => void
}

export default function VoiceButton({ onTranscript }: Props) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // @ts-ignore - Web Speech API no tipada en TS por defecto
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }
    setSupported(true)
    const rec: any = new SR()
    rec.lang = 'es-ES'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        .map((r: any) => r?.[0]?.transcript ?? '')
        .join(' ')
        .trim()
      if (transcript) onTranscript(transcript)
    }
    rec.onerror = (ev: any) => {
      console.warn('[VoiceButton] speech error', ev)
      try { rec.stop() } catch {}
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    return () => {
      const r = recognitionRef.current
      if (r) {
        r.onresult = null
        r.onerror = null
        r.onend = null
        try { r.stop() } catch {}
      }
      recognitionRef.current = null
    }
  }, [onTranscript])

  const toggle = () => {
    if (!supported || !recognitionRef.current) return
    try {
      if (!listening) {
        recognitionRef.current.start()
        setListening(true)
      } else {
        recognitionRef.current.stop()
        setListening(false)
      }
    } catch (e) {
      console.warn('[VoiceButton] toggle failed', e)
      setListening(false)
    }
  }

  if (!supported) {
    return (
      <button
        type="button"
        title="Tu navegador no soporta dictado por voz"
        disabled
        className="px-4 py-3 rounded-2xl border text-sm opacity-50 cursor-not-allowed text-slate-400 border-slate-200"
      >
        Sin micro
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`px-4 py-3 rounded-2xl border text-sm transition ${
        listening
          ? 'bg-red-500 text-white border-red-500 shadow-sm'
          : 'bg-blue-500 text-white hover:bg-blue-600 border-blue-500'
      }`}
    >
      {listening ? 'Escuchando…' : '🎙️ Hablar'}
    </button>
  )
}

