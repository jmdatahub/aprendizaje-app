
import { HabitMinimal } from "../hooks/useHabitNotifications"

export type HabitCategory = "health" | "study" | "work" | "mindfulness" | "finance" | "social" | "other"

// We use the same interface but now we know it comes from DB
export interface Habit extends HabitMinimal {
  history: string[] // strings YYYY-MM-DD
  createdAt: string
  streak: number
  category: HabitCategory
  telegramConfig?: {
      chatId?: string
  }
}

const API_URL = '/api/habits'

export const habitService = {
  
  async list(chatId?: string): Promise<Habit[]> {
    const params = chatId ? `?chat_id=${chatId}` : ''
    const res = await fetch(`${API_URL}${params}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    
    // Map DB to Frontend
    return data.data.map((h: any) => ({
       id: h.id,
       text: h.text,
       category: h.category,
       streak: h.streak,
       lastChecked: null, // Calculated from history? Or we trust DB? 
       // Actually 'lastChecked' is transient in the current frontend logic (checked today?)
       // We can derive it.
       history: h.history,
       createdAt: h.created_at,
       withNotification: h.with_notification,
       notificationTimes: h.notification_times,
       customMessage: h.custom_message,
       telegramConfig: { chatId: h.telegram_chat_id }
    }))
  },

  async create(habit: Partial<Habit>): Promise<Habit> {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: habit.text,
            category: habit.category,
            streak: habit.streak,
            with_notification: habit.withNotification,
            notification_times: habit.notificationTimes,
            custom_message: habit.customMessage,
            telegram_chat_id: habit.telegramConfig?.chatId,
            created_at: habit.createdAt
        })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return {
        ...habit,
        id: data.data.id
    } as Habit
  },

  async update(id: string, updates: Partial<Habit>) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: updates.text,
            category: updates.category,
            with_notification: updates.withNotification,
            notification_times: updates.notificationTimes,
            custom_message: updates.customMessage
        })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.data
  },

  async delete(id: string) {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return true
  },

  async toggleLog(id: string, date: string) {
    const res = await fetch(`${API_URL}/${id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.action // 'checked' | 'unchecked'
  },

  async syncMigrate(habits: Habit[]) {
    // Solo enviamos si hay hábitos locales
    if (habits.length === 0) return
    const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habits })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.migrated
  }
}
