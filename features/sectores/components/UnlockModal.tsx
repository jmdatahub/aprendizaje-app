'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner, Sheet } from '@/shared/components'
import { SectorWithProgress } from '../types'
import { playSuccess } from '@/shared/utils/sounds'
import { useApp } from '@/shared/contexts/AppContext'
import { apiGet } from '@/shared/utils/api'
import { ApiResponse } from '@/shared/types/api'

interface UnlockModalProps {
  sector: SectorWithProgress | null
  onClose: () => void
}

interface SurpriseResponse extends ApiResponse<{
  chiste: string;
  sorpresa: string;
}> {}

export function UnlockModal({ sector, onClose }: UnlockModalProps) {
  const router = useRouter()
  const { t } = useApp()
  const [loading, setLoading] = useState(false)
  const [surprise, setSurprise] = useState<{ chiste: string; sorpresa: string } | null>(null)

  const loadSurprise = async () => {
    if (!sector || surprise) return

    setLoading(true)
    try {
      const resp = await apiGet<SurpriseResponse>(`/api/sorpresas?sector=${encodeURIComponent(sector.nombre)}`)
      if (resp.success && resp.data) {
        setSurprise({
          chiste: resp.data.chiste || '',
          sorpresa: resp.data.sorpresa || '',
        })
      } else {
        throw new Error(resp.error || 'Error loading surprise')
      }
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

  return (
    <Sheet
      open={!!sector}
      onClose={onClose}
      title={sector?.nombre}
      desktopMaxWidth="max-w-lg"
      footer={(
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-3 sm:py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium min-h-[44px] sm:min-h-0 w-full sm:w-auto"
          >
            {t('common.cancel')}
          </button>
          <button
            className="rounded-lg bg-primary px-6 py-3 sm:py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium shadow-sm hover:shadow transition-all min-h-[44px] sm:min-h-0 w-full sm:w-auto active:scale-[0.98]"
            onClick={() => {
              if (!sector) return
              router.push(`/aprender?tema=${encodeURIComponent(sector.nombre)}&intent=suggest_topics&autostart=1`)
              onClose()
            }}
            disabled={loading}
          >
            {t('unlock_modal.unlock_button')}
          </button>
        </div>
      )}
    >
      <div className="p-4 sm:p-6">
        <div className="mb-3 text-sm text-muted-foreground">
          {t('common.unlock_surprise')}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <LoadingSpinner />
            <span>{t('common.loading')}</span>
          </div>
        ) : surprise ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-muted p-4 text-foreground italic border border-border break-words">
              &ldquo;{surprise.chiste}&rdquo;
            </p>

            <button
              type="button"
              onClick={() => {
                if (!sector) return
                playSuccess()
                router.push(`/aprender?tema=${encodeURIComponent(sector.nombre)}&continueContext=${encodeURIComponent(surprise.sorpresa)}&autostart=1`)
                onClose()
              }}
              className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-4 sm:p-5 text-left border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-5xl sm:text-6xl">💡</span>
              </div>
              <div className="flex items-start gap-3 relative z-10">
                <span className="text-2xl shrink-0">💡</span>
                <div className="min-w-0">
                  <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1">
                    {t('unlock_modal.did_you_know')}
                  </h4>
                  <p className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed break-words">
                    {surprise.sorpresa}
                  </p>
                  <div className="mt-2 sm:mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {t('unlock_modal.click_to_learn')} →
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : null}
      </div>
    </Sheet>
  )
}
