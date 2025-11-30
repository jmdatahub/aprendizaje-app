"use client"

import { useEffect } from "react"

export function ThemeInitializer() {
  useEffect(() => {
    const applyTheme = () => {
      try {
        const storedSettings = localStorage.getItem('app_settings')
        if (storedSettings) {
          const settings = JSON.parse(storedSettings)
          if (settings.darkMode) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        }
      } catch (e) {
        console.error("Error applying theme", e)
      }
    }

    applyTheme()
  }, [])

  return null
}
