'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const s = await (supabase as any)?.auth?.getSession?.()
        setSessionInfo(s?.data?.session || null)
      } catch {}
    })()
  }, [])

  const sendMagicLink = async () => {
    try {
      setStatus('Enviando enlace...')
      const { error } = await (supabase as any)?.auth?.signInWithOtp?.({
        email,
        options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      })
      if (error) setStatus('No se pudo enviar el enlace')
      else setStatus('Revisa tu correo para iniciar sesion')
    } catch {
      setStatus('No se pudo enviar el enlace')
    }
  }

  const signOut = async () => {
    try {
      await (supabase as any)?.auth?.signOut?.()
      setSessionInfo(null)
      setStatus('Sesion cerrada')
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="mx-auto max-w-md px-6 py-12">
        <Link href="/" className="text-blue-600 hover:underline">Volver</Link>
        <h1 className="mt-4 mb-6 text-3xl font-bold text-gray-800">Iniciar sesion</h1>

        {sessionInfo ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-2 text-gray-700">Ya estas autenticado.</div>
            <div className="text-sm text-gray-500">Usuario: {sessionInfo?.user?.email || sessionInfo?.user?.id}</div>
            <div className="mt-4 flex gap-2">
              <button onClick={signOut} className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300">Cerrar sesion</button>
              <Link href="/aprender" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Ir a Aprender</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-6 shadow">
            <label className="mb-2 block text-sm text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 p-2"
              placeholder="tu@correo.com"
            />
            <button onClick={sendMagicLink} className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Enviar enlace de acceso</button>
            {status && <div className="mt-3 text-sm text-gray-600">{status}</div>}
          </div>
        )}
      </div>
    </div>
  )
}


