import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const response = NextResponse.next()

  // Decode defensively — attackers use %2e%2e, double/triple encoding, mixed case, etc.
  // We loop-decode until stable (or up to 5 iterations) and check both raw + fully-decoded forms.
  function fullyDecode(s: string): string | null {
    let prev = s
    for (let i = 0; i < 5; i++) {
      try {
        const next = decodeURIComponent(prev)
        if (next === prev) return next
        prev = next
      } catch {
        return null // malformed
      }
    }
    return prev
  }
  const decodedPath = fullyDecode(pathname)
  const decodedSearch = fullyDecode(search)
  if (decodedPath === null || decodedSearch === null) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const suspiciousPatterns = [
    /\.\.[\\/]/,                   // path traversal (forward or back slash)
    /<script/i,                    // XSS attempt
    /javascript:/i,                // XSS
    /vbscript:/i,                  // legacy XSS vector
    /data:text\/html/i,            // data URI XSS
    /\x00/,                        // null bytes (any form, raw)
    /[\r\n]/,                      // CRLF injection
    /%2e%2e[%/]/i,                 // encoded traversal in raw URL
    /%00/i,                        // encoded null byte in raw URL
  ]
  const target = pathname + ' ' + search + ' ' + decodedPath + ' ' + decodedSearch
  if (suspiciousPatterns.some(p => p.test(target))) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Restrict API routes: only accept JSON content-type on POST/PUT/PATCH
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      // Allow multipart for any potential file uploads, but block others
      if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
        return new NextResponse('Unsupported Media Type', { status: 415 })
      }
    }

    // Bound payload: reject bodies larger than 1MB at the edge.
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
    const MAX_BODY = 1_000_000 // 1MB
    if (contentLength > MAX_BODY) {
      return new NextResponse('Payload Too Large', { status: 413 })
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
