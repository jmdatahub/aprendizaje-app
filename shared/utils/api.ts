/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Get base URL for API requests
 * In browser: use relative URLs
 * In server: use absolute URLs (for SSR)
 */
function getBaseUrl(): string {
  // Browser
  if (typeof window !== 'undefined') {
    return ''
  }
  
  // Server - try multiple sources
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // For local development, use localhost
  const port = process.env.PORT || 3000
  return `http://localhost:${port}`
}

interface ApiRequestOptions extends RequestInit {
  /**
   * Timeout in milliseconds. Default is 60000ms (60 seconds).
   * AI responses can take a while, so use a longer timeout by default.
   */
  timeout?: number;
}

/**
 * Generic API request wrapper with error handling
 */
export async function apiRequest<T>(
  url: string,
  options?: ApiRequestOptions
): Promise<T> {
  const baseUrl = getBaseUrl()
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
  
  // Use configurable timeout, default to 60 seconds (AI responses can be slow)
  const timeoutMs = options?.timeout ?? 60000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.error(`[apiRequest] Error response from ${fullUrl}:`, response.status, data)
      throw new ApiError(
        response.status,
        data?.error || `Error ${response.status}`,
        data
      )
    }

    return data as T
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof ApiError) {
      throw error
    }
    
    // Better error messages
    let message = 'Error de red o servidor'
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        message = 'La solicitud tardó demasiado tiempo (timeout)'
      } else {
        message = error.message
      }
    }
    
    console.error(`[apiRequest] Failed to fetch ${fullUrl}:`, message, error)
    throw new ApiError(500, message, error)
  }
}

/**
 * GET request helper
 */
export async function apiGet<T>(url: string, headers?: HeadersInit, timeout?: number): Promise<T> {
  return apiRequest<T>(url, { method: 'GET', headers, timeout })
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  url: string,
  body?: any,
  headers?: HeadersInit,
  timeout?: number
): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers,
    timeout,
  })
}
