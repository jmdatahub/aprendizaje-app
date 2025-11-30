'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/shared/components'
import { SectorWithProgress } from '../types'
import { playSuccess } from '@/shared/utils/sounds'
import { useApp } from '@/shared/contexts/AppContext'

interface UnlockModalProps {
  sector: SectorWithProgress | null
  onClose: () => void
}

export function UnlockModal({ sector, onClose }: UnlockModalProps) {
  const router = useRouter()
  const { t } = useApp()
  const [loading, setLoading] = useState(false)
  const [surprise, setSurprise] = useState<{ chiste: string; sorpresa: string } | null>(null)

  const loadSurprise = async () => {
    if (!sector || surprise) return

    setLoading(true)
    try {
      const response = await fetch(`/api/sorpresas?sector=${encodeURIComponent(sector.nombre)}`)
      const data = await response.json()
      setSurprise({
        chiste: data?.chiste || '',
        sorpresa: data?.sorpresa || '',
      })
    } catch (error) {
      console.error('Error loading surprise:', error)
      setSurprise({
        chiste: 'Error al cargar el chiste',
        sorpresa: 'Pero puedes desbloquear esta sección de todos modos',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = () => {
    if (!sector) return

    try {
      sessionStorage.setItem(
        'aprende_intro',
        JSON.stringify({
          tema: sector.nombre,
          chiste: surprise?.chiste || '',
          sorpresa: surprise?.sorpresa || '',
        })
      )
    } catch {}

    router.push(`/aprender?tema=${encodeURIComponent(sector.nombre)}&autostart=1`)
    onClose()
  }

  // Load surprise when modal opens
  if (sector && !surprise && !loading) {
    loadSurprise()
  }

  if (!sector) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg animate-scale-in border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-sm text-muted-foreground">
          {t('common.unlock_surprise')}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <LoadingSpinner />
            <span>{t('common.loading')}</span>
          </div>
        ) : surprise ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-muted p-4 text-foreground italic border border-border">
              "{surprise.chiste}"
            </p>
            
            <button 
              onClick={() => {
                playSuccess()
                router.push(`/aprender?tema=${encodeURIComponent(sector.nombre)}&continueContext=${encodeURIComponent(surprise.sorpresa)}&autostart=1`)
                onClose()
              }}
              className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-5 text-left border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-6xl">💡</span>
              </div>
              <div className="flex items-start gap-3 relative z-10">
                <span className="text-2xl shrink-0">💡</span>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1 group-hover:underline decoration-amber-400/50 underline-offset-2">
                    {t('unlock_modal.did_you_know')}
                  </h4>
                  <p className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed">
                    {surprise.sorpresa}
                  </p>
                  <div className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0">
                    <span>{t('unlock_modal.click_to_learn')}</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            className="rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium shadow-sm hover:shadow transition-all"
            onClick={() => {
              router.push(`/aprender?tema=${encodeURIComponent(sector.nombre)}&intent=suggest_topics&autostart=1`)
              onClose()
            }}
            disabled={loading}
          >
            {t('unlock_modal.unlock_button')}
          </button>
        </div>
      </div>
    </div>
  )
}
