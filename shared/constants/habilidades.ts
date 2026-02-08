// Categorías sugeridas para habilidades prácticas
export const CATEGORIAS_HABILIDADES = [
  { id: 'deportes', key: 'deportes', icono: '🏀', label: 'Deportes' },
  { id: 'musica', key: 'musica', icono: '🎸', label: 'Música' },
  { id: 'arte', key: 'arte', icono: '🎨', label: 'Arte' },
  { id: 'programacion', key: 'programacion', icono: '💻', label: 'Programación' },
  { id: 'idiomas', key: 'idiomas', icono: '🗣️', label: 'Idiomas' },
  { id: 'cocina', key: 'cocina', icono: '🍳', label: 'Cocina' },
  { id: 'bienestar', key: 'bienestar', icono: '🧘', label: 'Bienestar' },
  { id: 'gaming', key: 'gaming', icono: '🎮', label: 'Gaming' },
  { id: 'otra', key: 'otra', icono: '✏️', label: 'Otra...' },
] as const;

// Experiencia previa con horas equivalentes
export const EXPERIENCIA_PREVIA = [
  { id: 'ninguna', label: 'Soy principiante total', horas: 0, icono: '🌱' },
  { id: 'algo', label: 'Tengo algo de experiencia', horas: 10, icono: '🌿' },
  { id: 'intermedia', label: 'Nivel intermedio', horas: 50, icono: '🌳' },
  { id: 'avanzada', label: 'Experiencia avanzada', horas: 200, icono: '⭐' },
] as const;

// Sistema de niveles basado en horas
export const NIVELES_HABILIDAD = [
  { id: 'novato', label: 'Novato', icono: '🌱', minHoras: 0, maxHoras: 10, color: 'green' },
  { id: 'aprendiz', label: 'Aprendiz', icono: '🌿', minHoras: 10, maxHoras: 50, color: 'emerald' },
  { id: 'intermedio', label: 'Intermedio', icono: '🌳', minHoras: 50, maxHoras: 200, color: 'blue' },
  { id: 'avanzado', label: 'Avanzado', icono: '⭐', minHoras: 200, maxHoras: 500, color: 'purple' },
  { id: 'experto', label: 'Experto', icono: '🔥', minHoras: 500, maxHoras: 1000, color: 'orange' },
  { id: 'maestro', label: 'Maestro', icono: '💎', minHoras: 1000, maxHoras: Infinity, color: 'yellow' },
] as const;

// Función helper para calcular nivel basado en segundos totales
export function calcularNivel(segundosTotales: number) {
  const horas = segundosTotales / 3600;
  const nivel = NIVELES_HABILIDAD.find(n => horas >= n.minHoras && horas < n.maxHoras);
  return nivel || NIVELES_HABILIDAD[0];
}

// Función helper para formatear tiempo
export function formatearTiempo(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  
  if (horas === 0) {
    return `${minutos}m`;
  }
  return `${horas}h ${minutos}m`;
}

// Función helper para obtener progreso hacia siguiente nivel (0-100)
export function calcularProgresoNivel(segundosTotales: number): number {
  const horas = segundosTotales / 3600;
  const nivelActual = calcularNivel(segundosTotales);
  const nivelIndex = NIVELES_HABILIDAD.findIndex(n => n.id === nivelActual.id);
  
  if (nivelIndex === NIVELES_HABILIDAD.length - 1) {
    return 100; // Maestro no tiene siguiente nivel
  }
  
  const horasEnNivel = horas - nivelActual.minHoras;
  const horasParaSiguiente = nivelActual.maxHoras - nivelActual.minHoras;
  
  return Math.min(100, Math.round((horasEnNivel / horasParaSiguiente) * 100));
}

export type CategoriaHabilidad = typeof CATEGORIAS_HABILIDADES[number];
export type ExperienciaPrevia = typeof EXPERIENCIA_PREVIA[number];
export type NivelHabilidad = typeof NIVELES_HABILIDAD[number];
