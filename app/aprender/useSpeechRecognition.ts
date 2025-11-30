'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Options = {
  onResult?: (text: string) => void
}

type Return = {
  listening: boolean
  supported: boolean
  error: string | null
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
}

// Hook de reconocimiento de voz aislado y robusto
export function useSpeechRecognition(options?: Options): Return {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guardamos la instancia en un ref para no recrearla
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Detectar de forma segura la API en cliente
    const SR: any = typeof window !== 'undefined'
      ? (// @ts-ignore - propiedades no tipadas en navegadores
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null

    if (!SR) {
      setSupported(false)
      setListening(false)
      return
    }

    setSupported(true)

    // Crear UNA instancia y configurar eventos
    const recognition: any = new SR()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      try {
        const transcript: string = Array.from(event.results)
          .map((r: any) => r?.[0]?.transcript ?? '')
          .join(' ')
          .trim()
        if (transcript && options?.onResult) options.onResult(transcript)
      } catch (e) {
        // No rompemos el flujo si el navegador no da el shape esperado
      }
    }

    recognition.onerror = (event: any) => {
      // Guardamos el error para debug opcional, pero sin lanzar excepciones
      // Ej: event.error === 'not-allowed' cuando el usuario deniega permisos
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const err = (event && (event.error as string)) || 'unknown'
      setError(err)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition

    // Cleanup: eliminar handlers y parar si seguía escuchando
    return () => {
      const rec = recognitionRef.current
      if (rec) {
        rec.onstart = null
        rec.onend = null
        rec.onresult = null
        rec.onerror = null
        try { rec.stop() } catch {}
      }
      recognitionRef.current = null
      setListening(false)
    }
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startListening = useCallback(() => {
    if (!supported || !recognitionRef.current) {
      // No hay soporte: avisamos y no rompemos
      // eslint-disable-next-line no-console
      console.warn('SpeechRecognition no soportado en este navegador')
      return
    }
    if (listening) return
    setError(null)
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch (e) {
      setError('start-failed')
      setListening(false)
    }
  }, [listening, supported])

  const stopListening = useCallback(() => {
    if (!supported || !recognitionRef.current) {
      // eslint-disable-next-line no-console
      console.warn('SpeechRecognition no soportado en este navegador')
      return
    }
    if (!listening) return
    try {
      recognitionRef.current.stop()
    } catch (e) {
      setError('stop-failed')
    } finally {
      setListening(false)
    }
  }, [listening, supported])

  const toggleListening = useCallback(() => {
    if (listening) stopListening()
    else startListening()
  }, [listening, startListening, stopListening])

  return { listening, supported, error, startListening, stopListening, toggleListening }
}

