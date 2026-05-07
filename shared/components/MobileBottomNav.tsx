"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, BookOpen, Target, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  icon: typeof Home
  label: string
  /** Other paths that should still highlight this tab. */
  matches?: (pathname: string) => boolean
}

const ITEMS: NavItem[] = [
  { href: "/", icon: Home, label: "Inicio", matches: (p) => p === "/" || p === "/mapa" },
  { href: "/aprender", icon: MessageCircle, label: "Aprender" },
  { href: "/aprendizajes", icon: BookOpen, label: "Notas", matches: (p) => p.startsWith("/aprendizajes") },
  { href: "/habilidades", icon: Target, label: "Skills", matches: (p) => p.startsWith("/habilidades") },
  { href: "/focus-timer", icon: Timer, label: "Focus" },
]

/**
 * Persistent bottom tab bar for mobile. Hidden on desktop (md+).
 * Hidden on screens where it would be in the way (chat with keyboard, exam, login).
 */
export function MobileBottomNav() {
  const pathname = usePathname() || "/"

  // Hide on screens that need full focus or use bottom for input
  const HIDDEN_ROUTES = [
    /^\/aprender/,            // chat: input fixed at bottom + virtual keyboard
    /^\/repaso/,              // weekly test: full focus
    /^\/login/,
  ]
  if (HIDDEN_ROUTES.some(re => re.test(pathname))) return null

  return (
    <nav
      role="navigation"
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map(item => {
          const Icon = item.icon
          const active = item.matches ? item.matches(pathname) : pathname === item.href
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[56px] transition-colors active:bg-accent/40 relative",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    active ? "scale-110" : "scale-100"
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className={cn(
                  "text-[10px] leading-none tracking-tight",
                  active ? "font-semibold" : "font-normal"
                )}>
                  {item.label}
                </span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-foreground"
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Spacer that pushes content above the bottom nav. Use as the LAST child in
 * pages that scroll to the bottom (so content isn't hidden behind the bar).
 */
export function MobileBottomNavSpacer() {
  const pathname = usePathname() || "/"
  const HIDDEN = [/^\/aprender/, /^\/repaso/, /^\/login/]
  if (HIDDEN.some(re => re.test(pathname))) return null
  return (
    <div
      aria-hidden="true"
      className="md:hidden"
      style={{ height: `calc(56px + env(safe-area-inset-bottom))` }}
    />
  )
}
