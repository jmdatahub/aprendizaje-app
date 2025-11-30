'use client'

import { useEffect, useRef, useState } from 'react'

export default function LabVozPage() {
  // Estado principal del laboratorio de voz
  const [input, setInput] = useState('')
  const [lastTranscript, setLastTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [hasSpeechApi, setHasSpeechApi] = useState(false)
  // Nota: usamos any para compatibilidad con navegadores sin tipos de Web Speech API
  const recognitionRef = useRef<any>(null)

  // Inicializa una unica instancia de SpeechRecognition al montar
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setHasSpeechApi(false)
      return
    }
    setHasSpeechApi(true)

    const rec: any = new SpeechRecognition()
    rec.lang = 'es-ES'
    rec.continuous = false
    rec.interimResults = false

    rec.onstart = () => {
      setListening(true)
    }
    rec.onend = () => {
      setListening(false)
    }
    rec.onerror = (ev: any) => {
      // Mantenemos la UI estable aunque haya errores
      console.error('Speech recognition error (lab)', ev)
      setListening(false)
    }
    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        .map((r: any) => r[0].transcript)
        .join(' ')
        .trim()
      if (transcript) {
        setLastTranscript(transcript)
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript))
      }
    }

    recognitionRef.current = rec

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null
        recognitionRef.current.onend = null
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        try { recognitionRef.current.stop() } catch {}
        recognitionRef.current = null
      }
    }
  }, [])

  // Toggle escuchar
  const toggleListening = () => {
    if (!hasSpeechApi || !recognitionRef.current) {
      console.warn('Web Speech API no disponible en este navegador (lab)')
      return
    }
    try {
      if (!listening) recognitionRef.current.start()
      else recognitionRef.current.stop()
    } catch (e) {
      console.error('No se pudo cambiar estado de reconocimiento (lab)', e)
      setListening(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/95 shadow rounded-2xl p-6">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Laboratorio de voz</h1>
          <p className="text-sm text-gray-500 mb-4">Prueba de dictado con Web Speech API (sin afectar produccion).</p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            placeholder="Texto dictado o escrito aqui..."
            className="w-full mb-3 px-3 py-2 rounded-xl border text-sm text-gray-900 placeholder-gray-400 bg-white"
          />

          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={toggleListening}
              disabled={!hasSpeechApi}
              title={!hasSpeechApi ? 'Voz no disponible en este navegador' : undefined}
              className={`px-3 py-2 rounded-xl text-sm transition duration-200 ${
                !hasSpeechApi
                  ? 'opacity-50 cursor-not-allowed border text-gray-400'
                  : listening
                    ? 'bg-rose-500 text-white hover:bg-rose-600 animate-pulse'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {listening ? 'Escuchando (lab)...' : 'Hablar (lab)'}
            </button>
          </div>

          <div className="text-xs text-gray-600">
            <div className="font-semibold mb-1">Ultimo reconocimiento:</div>
            <div className="rounded-md bg-gray-50 border border-gray-200 p-2 min-h-[2.25rem]">
              {lastTranscript || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

