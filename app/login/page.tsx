'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const s = await supabase.auth.getSession()
        setSessionInfo(s?.data?.session || null)
      } catch {}
    })()
  }, [])

  const sendMagicLink = async () => {
    if (!email.trim()) return
    setStatusType('loading')
    setStatus('Enviando enlace…')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      })
      if (error) {
        setStatusType('error')
        setStatus('No se pudo enviar el enlace. Revisa el email e inténtalo de nuevo.')
      } else {
        setStatusType('success')
        setStatus(`Te hemos enviado un enlace mágico a ${email}. Ábrelo desde tu móvil para entrar.`)
      }
    } catch {
      setStatusType('error')
      setStatus('No se pudo enviar el enlace. Comprueba tu conexión.')
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setSessionInfo(null)
      setStatusType('idle')
      setStatus('Sesión cerrada')
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <div className="px-4 sm:px-6 pt-4">
        <Link
          href="/"
          aria-label="Volver al inicio"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline min-h-[40px] px-2 -ml-2 rounded-lg active:bg-blue-100/40"
        >
          <span aria-hidden="true">←</span>
          <span className="text-sm font-medium">Volver</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 -mt-8">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center mb-7">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center mb-4 shadow-lg shadow-indigo-300/40">
              <svg viewBox="0 0 32 32" className="w-9 h-9 text-white">
                <path d="M16 7c-3 0-6 1.5-9 3v14c3-1.5 6-2 9-2s6 0.5 9 2V10c-3-1.5-6-3-9-3z M16 7v15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
              {sessionInfo ? '¡Hola de nuevo!' : 'Bienvenido'}
            </h1>
            <p className="text-sm text-gray-500">
              {sessionInfo
                ? 'Continúa donde lo dejaste'
                : 'Te enviaremos un enlace mágico a tu correo'}
            </p>
          </div>

          {sessionInfo ? (
            <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-gray-100">
              <div className="mb-1 text-xs uppercase tracking-wider text-gray-400 font-semibold">Sesión activa</div>
              <div className="text-sm text-gray-700 break-all mb-5">
                {sessionInfo?.user?.email || sessionInfo?.user?.id}
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/aprender"
                  className="rounded-xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] transition-transform text-center"
                >
                  Ir a Aprender →
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-xl bg-gray-100 px-4 py-3 text-gray-700 hover:bg-gray-200 active:scale-[0.98] transition-transform"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); sendMagicLink() }}
              className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-gray-100"
            >
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-gray-700">
                Tu correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={statusType === 'loading' || statusType === 'success'}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                placeholder="tu@correo.com"
                required
              />
              <button
                type="submit"
                disabled={statusType === 'loading' || statusType === 'success' || !email.trim()}
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 transition-all min-h-[48px]"
              >
                {statusType === 'loading' ? 'Enviando…' : statusType === 'success' ? '✓ Enlace enviado' : 'Enviar enlace mágico'}
              </button>

              {status && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mt-4 text-sm rounded-xl p-3 ${
                    statusType === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : statusType === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}
                >
                  {status}
                </div>
              )}

              <p className="mt-5 text-center text-xs text-gray-400">
                Sin contraseñas. Solo necesitas tu email.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
