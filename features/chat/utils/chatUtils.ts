import { ChatMessage } from "../services/chatStorage";

export type SectionKey = 'health' | 'nature' | 'physics' | 'math' | 'tech' | 'history' | 'arts' | 'economy' | 'society';

export interface SectionResult {
  section: SectionKey;
  confidence: number;
}

export interface ChatMetadata {
  title: string;
  section: SectionKey;
  emoji: string;
  color: string;
  tags: string[];
}

const SECTOR_KEYWORDS: Record<SectionKey, string[]> = {
  health: ['salud', 'medicina', 'cuerpo', 'mente', 'ejercicio', 'nutrición', 'enfermedad', 'health', 'medicine', 'body', 'mind', 'exercise', 'nutrition', 'vitaminas', 'frutas', 'dieta', 'hospital', 'doctor'],
  nature: ['naturaleza', 'biología', 'animales', 'plantas', 'medio ambiente', 'clima', 'tierra', 'nature', 'biology', 'animals', 'plants', 'environment', 'climate', 'ecosistema', 'marino', 'selva', 'bosque', 'especies'],
  physics: ['física', 'química', 'espacio', 'universo', 'átomo', 'energía', 'materia', 'physics', 'chemistry', 'space', 'universe', 'atom', 'energy', 'newton', 'leyes', 'gravedad', 'fuerza', 'movimiento'],
  math: ['matemáticas', 'números', 'álgebra', 'geometría', 'cálculo', 'lógica', 'estadística', 'math', 'numbers', 'algebra', 'geometry', 'calculus', 'logic', 'sumas', 'restas', 'divisiones', 'multiplicaciones', 'ecuación', 'derivadas', 'integrales', 'funciones'],
  tech: ['tecnología', 'programación', 'ordenador', 'ia', 'internet', 'software', 'hardware', 'tech', 'programming', 'computer', 'ai', 'internet', 'red neuronal', 'algoritmo', 'código', 'app', 'web'],
  history: ['historia', 'guerra', 'siglo', 'imperio', 'revolución', 'antiguo', 'pasado', 'history', 'war', 'century', 'empire', 'revolution', 'ancient', 'cervantes', 'personaje', 'biografía', 'fecha', 'acontecimiento', 'quijote'],
  arts: ['arte', 'música', 'pintura', 'literatura', 'cine', 'cultura', 'diseño', 'art', 'music', 'painting', 'literature', 'cinema', 'culture', 'libro', 'autor', 'poesía', 'teatro', 'museo'],
  economy: ['economía', 'dinero', 'negocios', 'mercado', 'finanzas', 'empresa', 'inversión', 'economy', 'money', 'business', 'market', 'finance', 'company', 'banco', 'ahorro', 'gasto', 'presupuesto'],
  society: ['sociedad', 'psicología', 'política', 'leyes', 'educación', 'gente', 'comunidad', 'society', 'psychology', 'politics', 'laws', 'education', 'people', 'emociones', 'sentimientos', 'relaciones', 'gobierno']
};

export function detectSectionFromText(text: string): SectionResult {
  const lowerText = text.toLowerCase();
  let maxScore = 0;
  let bestSection: SectionKey = 'society'; // Default fallback

  Object.entries(SECTOR_KEYWORDS).forEach(([section, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      // Simple inclusion check, can be improved with regex for whole words if needed
      if (lowerText.includes(keyword.toLowerCase())) score++;
    });
    
    if (score > maxScore) {
      maxScore = score;
      bestSection = section as SectionKey;
    }
  });

  // Normalize confidence (cap at 1.0)
  const confidence = Math.min(maxScore / 3, 1); // Threshold of 3 keywords for full confidence

  return { section: bestSection, confidence };
}

export type ChatSectorKey =
  | 'health'
  | 'nature'
  | 'physics'
  | 'math'
  | 'tech'
  | 'history'
  | 'arts'
  | 'economy'
  | 'society'
  | 'undefined';

export interface ChatSectorInfo {
  key: ChatSectorKey;
  label: string;
  emoji: string;
  colorClass: string;
}

const SECTOR_LABELS: Record<ChatSectorKey, string> = {
  health: "Salud y Rendimiento",
  nature: "Ciencias Naturales",
  physics: "Ciencias Físicas",
  math: "Matemáticas y Lógica",
  tech: "Tecnología y Computación",
  history: "Historia y Filosofía",
  arts: "Artes y Cultura",
  economy: "Economía y Negocios",
  society: "Sociedad y Psicología",
  undefined: "General"
};

const SECTOR_EMOJIS: Record<ChatSectorKey, string> = {
  health: "🍎",
  nature: "🌱",
  physics: "⚛️",
  math: "🔢",
  tech: "💻",
  history: "📜",
  arts: "🎨",
  economy: "💰",
  society: "🧠",
  undefined: "💭"
};

const SECTOR_COLORS: Record<ChatSectorKey, string> = {
  health: "bg-green-100 text-green-800",
  nature: "bg-emerald-100 text-emerald-800",
  physics: "bg-purple-100 text-purple-800",
  math: "bg-yellow-100 text-yellow-800",
  tech: "bg-cyan-100 text-cyan-800",
  history: "bg-orange-100 text-orange-800",
  arts: "bg-pink-100 text-pink-800",
  economy: "bg-teal-100 text-teal-800",
  society: "bg-indigo-100 text-indigo-800",
  undefined: "bg-gray-100 text-gray-800"
};

export function detectChatSector(messages: ChatMessage[]): ChatSectorInfo {
  const textToAnalyze = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ');

  const { section } = detectSectionFromText(textToAnalyze);
  
  // Map internal SectionKey to ChatSectorKey (they match mostly, but handling undefined)
  const sectorKey = section as ChatSectorKey;

  return {
    key: sectorKey,
    label: SECTOR_LABELS[sectorKey] || SECTOR_LABELS.undefined,
    emoji: SECTOR_EMOJIS[sectorKey] || SECTOR_EMOJIS.undefined,
    colorClass: SECTOR_COLORS[sectorKey] || SECTOR_COLORS.undefined
  };
}

export function getChatMetadata(messages: ChatMessage[]): ChatMetadata {
  const sectorInfo = detectChatSector(messages);
  
  // Generate a title
  const firstUserMsg = messages.find(m => m.role === 'user')?.content || 'Nuevo Chat';
  const title = firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg;

  return {
    title,
    section: sectorInfo.key as SectionKey, // Backwards compatibility for now
    emoji: sectorInfo.emoji,
    color: sectorInfo.colorClass, // Using colorClass as color for now
    tags: [sectorInfo.key]
  };
}
