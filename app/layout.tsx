import './globals.css'
import { Metadata } from 'next'
import { AppProvider } from '@/shared/contexts/AppContext'
import { ThemeInitializer } from '@/components/ThemeInitializer'

export const metadata: Metadata = {
  title: 'Mi App de Aprendizaje',
  description: 'Aprende y consolida conocimientos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <ThemeInitializer />
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}