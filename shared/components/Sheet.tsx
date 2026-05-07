"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Title for accessibility (sr-only if titleVisuallyHidden). */
  title?: string
  titleVisuallyHidden?: boolean
  /** Disables drag-to-dismiss handle (e.g. forms with potential lost data). */
  preventDragClose?: boolean
  /** Max height as % of viewport. Default 92. */
  maxHeightVh?: number
  /** Sheet size variant on desktop only. Mobile is always bottom-sheet. */
  desktopVariant?: "centered" | "side-right"
  desktopMaxWidth?: string
  /** Class merged into the panel container. */
  className?: string
  /** Optional footer area (rendered in a sticky bottom region with safe-area). */
  footer?: React.ReactNode
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
const TRANSITION_MS = 280

/**
 * Universal sheet/modal primitive.
 * - Mobile (< md): bottom sheet, swipe-down to dismiss, respects safe area.
 * - Desktop (>= md): centered modal, optionally side-panel.
 * Body scroll is locked while open. Focus is trapped inside.
 */
export function Sheet({
  open,
  onClose,
  children,
  title,
  titleVisuallyHidden = false,
  preventDragClose = false,
  maxHeightVh = 92,
  desktopVariant = "centered",
  desktopMaxWidth = "max-w-lg",
  className = "",
  footer,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<Element | null>(null)
  const titleId = useRef(`sheet-title-${Math.random().toString(36).slice(2, 9)}`).current

  // Track mount + visibility separately so we can run an exit transition
  // before unmounting from the DOM. Start unmounted to keep SSR clean.
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  // Drag-to-dismiss state
  const dragStartY = useRef<number | null>(null)
  const dragStartTime = useRef<number>(0)
  const [dragOffset, setDragOffset] = useState(0)

  useEffect(() => {
    if (open) {
      setMounted(true)
    } else if (mounted) {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), TRANSITION_MS)
      return () => clearTimeout(t)
    }
  }, [open, mounted])

  // Once mounted, flip to visible on the next frame so the CSS transition runs.
  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [mounted])

  // Body scroll lock + focus management while OPEN.
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`

    const t = setTimeout(() => {
      const root = panelRef.current
      const first = root?.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }, TRANSITION_MS + 30)

    return () => {
      clearTimeout(t)
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
      ;(previouslyFocused.current as HTMLElement | null)?.focus?.()
    }
  }, [open])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== "Tab") return
    const root = panelRef.current
    if (!root) return
    const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter(el => el.offsetParent !== null || el === document.activeElement)
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [onClose])

  // Touch drag-to-dismiss for mobile
  const onTouchStart = (e: React.TouchEvent) => {
    if (preventDragClose) return
    dragStartY.current = e.touches[0].clientY
    dragStartTime.current = Date.now()
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (preventDragClose || dragStartY.current === null) return
    const dy = e.touches[0].clientY - dragStartY.current
    if (dy > 0) setDragOffset(dy)
  }
  const onTouchEnd = () => {
    if (preventDragClose || dragStartY.current === null) return
    const dy = dragOffset
    const dt = Date.now() - dragStartTime.current
    const velocity = dy / Math.max(dt, 1) // px/ms
    if (dy > 100 || velocity > 0.5) {
      onClose()
    }
    dragStartY.current = null
    setDragOffset(0)
  }

  if (!mounted || typeof window === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar"
        onClick={onClose}
        className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] cursor-default transition-opacity duration-[280ms] ${visible ? "opacity-100" : "opacity-0"}`}
      />

      {/* Panel container — slides up on mobile, fades on desktop */}
      <div
        ref={panelRef}
        className={`
          relative w-full bg-card text-foreground shadow-2xl flex flex-col
          border-t border-border md:border
          rounded-t-2xl md:rounded-2xl
          md:m-4 md:w-full md:${desktopMaxWidth}
          ${desktopVariant === "side-right" ? "md:mr-0 md:ml-auto md:rounded-r-none md:h-full md:max-h-screen" : ""}
          ${className}
          will-change-transform transition-transform duration-[280ms] ease-out
          ${visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
        `}
        style={{
          maxHeight: `${maxHeightVh}vh`,
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle (mobile only) */}
        {!preventDragClose && (
          <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0 select-none touch-none">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" aria-hidden="true" />
          </div>
        )}

        {/* Title row */}
        {title && (
          <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0 ${titleVisuallyHidden ? "sr-only" : ""}`}>
            <h2 id={titleId} className="text-base sm:text-lg font-semibold truncate">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-1 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Sticky footer with safe-area */}
        {footer && (
          <div
            className="shrink-0 border-t border-border/60 bg-card px-4 sm:px-6 py-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
