import { useState, useEffect } from "react"

// Import type via a helper interface to avoid circular dependency issues if we strictly imported form the component file
// ideally types should be in a separate file, but for now we follow existing pattern
export interface HabitMinimal {
  id: string
  text: string
  lastChecked: string | null
  withNotification?: boolean
  notificationTime?: string // Deprecated
  notificationTimes?: string[]
  customMessage?: string
}

export function useHabitNotifications(habits: HabitMinimal[], telegramConfig?: { token: string, chatId: string }) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [notificationTime, setNotificationTime] = useState("20:00") // Global default

  useEffect(() => {
    if (typeof window !== 'undefined') {
       // Check existing permission
       if ('Notification' in window) {
          setPermission(Notification.permission)
       }
       
       // Load global time setting
       const savedTime = localStorage.getItem("focus_timer_notification_time")
       if (savedTime) setNotificationTime(savedTime)
    }
  }, [])

  // Save global time
  useEffect(() => {
     localStorage.setItem("focus_timer_notification_time", notificationTime)
  }, [notificationTime])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert("Tu navegador no soporta notificaciones de escritorio")
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
       new Notification("¡Notificaciones activadas!", {
          body: "Te avisaremos para cumplir tus hábitos 🚀",
          icon: '/favicon.ico'
       })
    }
  }

  const sendTelegramMessage = async (text: string) => {
     if (!telegramConfig?.token || !telegramConfig?.chatId) return
     
     try {
       await fetch('/api/notify/telegram', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
             token: telegramConfig.token,
             chatId: telegramConfig.chatId,
             text: text
          })
       })
     } catch (e) {
        console.error("Error sending telegram", e)
     }
  }

  const checkAndNotifyAuto = () => {
    // Only proceed if permissions granted OR Telegram is configured
    // We want to run the check logic anyway to support Telegram even if browser denied
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const today = now.toISOString().split('T')[0]

    // Check each habit individually
    habits.forEach(habit => {
        // Skip if done or disabled
        if (habit.lastChecked === today) return
        if (habit.withNotification === false) return

        // Determin effective times
        let targetTimes: string[] = []
        if (habit.notificationTimes && habit.notificationTimes.length > 0) {
            targetTimes = habit.notificationTimes
        } else if (habit.notificationTime) {
            targetTimes = [habit.notificationTime]
        } else {
            targetTimes = [notificationTime] // Global fallback
        }

        targetTimes.forEach(time => {
            if (!time) return

            const [targetHour, targetMinute] = time.split(':').map(Number)
            
            // Check if time passed
            // Simplification: We check if Current Time >= Target Time
            // To avoid spam, we rely on LocalStorage flag for "Today + TimeSlot"
            const isAfterTarget = currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)
            
            if (!isAfterTarget) return

            // Check if already notified TODAY for this specific TIME slot
            const notifKey = `focus_notif_${habit.id}_${today}_${time}`
            if (localStorage.getItem(notifKey)) return

            // Mark as notified immediately to prevent double firing
            localStorage.setItem(notifKey, "true")

            const title = habit.customMessage || "¡Recordatorio de Hábito! 🔥"
            const body = `Es hora de cumplir con: ${habit.text}`

            // 1. Browser Notification
            if (permission === 'granted') {
                try {
                    new Notification(title, {
                        body,
                        icon: '/favicon.ico',
                        tag: `habit-${habit.id}-${time}`
                    })
                } catch (e) {
                    console.error("Error sending habit notification", e)
                }
            }

            // 2. Telegram Notification
            if (telegramConfig?.token && telegramConfig?.chatId) {
                sendTelegramMessage(`${title}\n\n${body}`)
            }
        })
    })
  }

  // Check every minute
  useEffect(() => {
     const interval = setInterval(checkAndNotifyAuto, 60000)
     checkAndNotifyAuto() // Run on mount too
     return () => clearInterval(interval)
  }, [habits, permission, notificationTime, telegramConfig]) // Re-run if config changes

  const sendNotificationNow = () => {
    if (permission === 'granted') {
      new Notification("Prueba de notificación", {
        body: "¡Si ves esto, las notificaciones funcionan! 🔥",
        icon: '/favicon.ico'
      })
    }
    if (telegramConfig?.token && telegramConfig?.chatId) {
       sendTelegramMessage("¡Prueba de notificación desde el Habit Tracker! 🔥")
    }
  }

  return {
    permission,
    requestPermission,
    sendNotificationNow,
    notificationTime,
    setNotificationTime
  }
}
