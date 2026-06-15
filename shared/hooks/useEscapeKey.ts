import { useEffect } from 'react'

/**
 * Dismiss-on-Escape for dialogs/modals (WCAG-friendly keyboard handling).
 * Attaches a keydown listener only while `active` is true and cleans it up
 * automatically. Pass the modal's open flag as `active` so it doesn't fire
 * while closed.
 */
export function useEscapeKey(handler: () => void, active: boolean = true): void {
  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handler, active])
}
