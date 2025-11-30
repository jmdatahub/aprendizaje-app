export const SECTORES_DATA = [
  { id: 1, key: 'health', nombre: 'Salud y Rendimiento', icono: '🍎', color: 'green' },
  { id: 2, key: 'nature', nombre: 'Ciencias Naturales', icono: '🔬', color: 'blue' },
  { id: 3, key: 'physics', nombre: 'Ciencias Fisicas', icono: '⚛️', color: 'purple' },
  { id: 4, key: 'math', nombre: 'Matematicas y Logica', icono: '🔢', color: 'yellow' },
  { id: 5, key: 'tech', nombre: 'Tecnologia y Computacion', icono: '💻', color: 'blue' },
  { id: 6, key: 'history', nombre: 'Historia y Filosofia', icono: '📜', color: 'orange' },
  { id: 7, key: 'arts', nombre: 'Artes y Cultura', icono: '🎨', color: 'pink' },
  { id: 8, key: 'economy', nombre: 'Economia y Negocios', icono: '💰', color: 'green' },
  { id: 9, key: 'society', nombre: 'Sociedad y Psicologia', icono: '🧠', color: 'purple' },
] as const;

export type SectorKey = typeof SECTORES_DATA[number]['key'];
export type SectorId = typeof SECTORES_DATA[number]['id'];

export const getSectorById = (id: number | string) => {
  return SECTORES_DATA.find(s => s.id.toString() === id.toString() || s.key === id);
};
