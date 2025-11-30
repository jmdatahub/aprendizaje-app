'use client'

import { useEffect, useRef, useState } from 'react'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type Props = {
  messages: ChatMessage[]
  onSend: (text: string) => void
  onRestart: () => void
  onSaveChat: () => void
  onCreateResumen: () => void
  listening: boolean
  onToggleListening: () => void
  hasAudioSupport: boolean
  renderVoice?: React.ReactNode
  renderFinalize?: React.ReactNode
}

export default function AprenderLayoutStable({
  messages,
  onSend,
  onRestart,
  onSaveChat,
  onCreateResumen,
  listening,
  onToggleListening,
  hasAudioSupport,
  renderVoice,
  renderFinalize,
}: Props) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 md:px-8 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <a href="/" className="text-sm text-blue-600 hover:underline">← Volver al mapa</a>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-800">Conversa y Aprende</h1>
            <p className="text-sm text-slate-600">Habla conmigo como con una persona. Yo te guío paso a paso.</p>
          </div>
          <div className="hidden md:block" />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-[18rem,1fr] gap-6">
          {/* Sidebar */}
          <aside className="bg-white rounded-2xl shadow-sm p-4 w-full h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-800">Tus chats</h2>
              <button onClick={onRestart} className="text-xs px-2 py-1 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition">Nuevo chat</button>
            </div>
            <p className="text-xs text-slate-500">Aún no tienes chats guardados. Guarda uno cuando te guste lo que has aprendido.</p>
          </aside>

          {/* Chat zone */}
          <section className="bg-white rounded-3xl shadow-lg p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-4">
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">💡 Consejos: escribe en lenguaje normal; yo te respondo corto y con una pregunta para seguir.</div>

            {/* Messages */}
            <div className="h-[360px] md:h-[420px] overflow-y-auto space-y-3">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`transition-all duration-200 ease-out leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[75%]'
                        : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[80%]'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-900"
              />
              {renderVoice ?? (
              <button
                type="button"
                onClick={onToggleListening}
                disabled={!hasAudioSupport}
                className={`px-4 py-2 rounded-2xl border flex items-center gap-2 text-sm transition ${
                  !hasAudioSupport
                    ? 'opacity-50 cursor-not-allowed text-slate-400 border-slate-200'
                    : listening
                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                { !hasAudioSupport ? 'Sin micro' : (listening ? 'Escuchando...' : 'Hablar') }
              </button>) }
              <button
                type="button"
                onClick={submit}
                className="rounded-2xl px-5 py-2 font-medium shadow-sm bg-blue-500 hover:bg-blue-600 text-white"
              >
                Enviar
              </button>
              <button type="button" onClick={onSaveChat} className="rounded-2xl px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200">Guardar chat</button>
              {renderFinalize ?? (
                <button type="button" onClick={onCreateResumen} className="rounded-2xl px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white">Crear resumen</button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
