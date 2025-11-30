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

/**
 * Generic API request wrapper with error handling
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getBaseUrl()
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
  
  // Add timeout to prevent hanging requests
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
  
  try {
    console.log(`[apiRequest] Fetching: ${fullUrl}`)
    
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

    console.log(`[apiRequest] Success from ${fullUrl}`)
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
export async function apiGet<T>(url: string, headers?: HeadersInit): Promise<T> {
  return apiRequest<T>(url, { method: 'GET', headers })
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  url: string,
  body?: any,
  headers?: HeadersInit
): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  })
}
