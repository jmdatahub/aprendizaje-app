import { ImageResponse } from 'next/og'

// iOS "Add to Home Screen" icon. Next.js auto-injects
// <link rel="apple-touch-icon" href="/apple-icon">. iOS ignores SVG/maskable
// manifest icons, so without this the installed app shows a generic icon.
// Generated from code (no external asset) and matched to app/icon.svg branding.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // iOS applies its own rounded mask, so fill the whole canvas.
          background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
        }}
      >
        <svg width="108" height="108" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 7c-3 0-6 1.5-9 3v14c3-1.5 6-2 9-2s6 0.5 9 2V10c-3-1.5-6-3-9-3z M16 7v15"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 22c3-1.5 6-2 9-2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
          <path
            d="M7 10c3-1.5 6-3 9-3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
