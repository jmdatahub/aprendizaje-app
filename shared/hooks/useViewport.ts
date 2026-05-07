"use client"

import { useEffect, useState } from "react"

/**
 * SSR-safe matchMedia hook. Returns false during SSR to avoid hydration mismatches.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setMatches("matches" in e ? e.matches : (e as MediaQueryList).matches)
    handler(mql)
    mql.addEventListener?.("change", handler as (e: MediaQueryListEvent) => void)
    return () => mql.removeEventListener?.("change", handler as (e: MediaQueryListEvent) => void)
  }, [query])

  return matches
}

/** True when viewport is < 768px (Tailwind md breakpoint). */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)")
}

/** True when user prefers reduced motion. Honor in heavy framer-motion animations. */
export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)")
}

/**
 * Detects virtual keyboard on mobile by watching VisualViewport. Returns the
 * pixel offset that the keyboard occupies (0 when closed). Useful to lift
 * sticky-bottom inputs above the keyboard on iOS where they would otherwise be
 * hidden.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      // Difference between layout viewport and visual viewport bottom
      const layoutH = window.innerHeight
      const visualBottom = vv.height + vv.offsetTop
      const diff = layoutH - visualBottom
      setInset(diff > 80 ? diff : 0) // small drifts ignored
    }
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    update()
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  return inset
}
