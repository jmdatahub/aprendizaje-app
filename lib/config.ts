/**
 * Centralized application configuration
 */

export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  
  api: {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    openai: {
      key: process.env.OPENAI_API_KEY,
      useStub: process.env.USE_STUB_AI === '1' || !process.env.OPENAI_API_KEY,
    },
  },

  features: {
    repasoMensual: true,
    voiceInput: false,
    gamification: true,
  },
} as const

/**
 * Validate required environment variables
 */
export function validateConfig() {
  const warnings: string[] = []

  if (!config.api.supabase.url) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL no está configurada')
  }
  if (!config.api.supabase.anonKey) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada')
  }
  if (!config.api.openai.key && !config.api.openai.useStub) {
    warnings.push('OPENAI_API_KEY no está configurada (usando modo stub)')
  }

  if (warnings.length > 0 && config.isDevelopment) {
    console.warn('⚠️ Advertencias de configuración:', warnings)
  }

  return warnings
}
