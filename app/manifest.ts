import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mi App de Aprendizaje',
    short_name: 'Aprende',
    description: 'Aprende y consolida conocimientos con tu tutor personal IA',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c1022',
    theme_color: '#0c1022',
    orientation: 'portrait',
    categories: ['education', 'productivity'],
    lang: 'es',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Tutor IA',
        short_name: 'Aprender',
        description: 'Habla con tu tutor IA',
        url: '/aprender',
      },
      {
        name: 'Mis aprendizajes',
        short_name: 'Notas',
        description: 'Tus conocimientos guardados',
        url: '/aprendizajes',
      },
      {
        name: 'Focus Timer',
        short_name: 'Focus',
        description: 'Sesión de concentración',
        url: '/focus-timer',
      },
    ],
  }
}
