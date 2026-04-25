import './globals.css'
import { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { AppProvider } from '@/shared/contexts/AppContext'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Mi App de Aprendizaje',
  description: 'Aprende y consolida conocimientos',
}

// Inline script to apply dark mode before hydration (avoids FOUC).
const themeScript = `
(function(){
  try {
    var s = localStorage.getItem('app_settings');
    if (s) {
      var p = JSON.parse(s);
      if (p && p.darkMode) document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={jakartaSans.variable}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}