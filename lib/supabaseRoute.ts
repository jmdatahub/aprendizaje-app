import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Creates a Supabase client for use in API routes (server-side)
 * Extracts the user's auth token from the request headers if available
 */
export function getSupabaseForRequest(request: NextRequest | Request) {
  // Try to get the auth token from the Authorization header
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  // Create client with user's token if available
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
  }

  // Fallback to anonymous client
  return createClient(supabaseUrl, supabaseAnonKey)
}
