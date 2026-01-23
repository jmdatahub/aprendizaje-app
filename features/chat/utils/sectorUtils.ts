import { ChatMessage } from "@/features/chat/services/chatStorage";

export interface SectorData {
  id: string;
  key: string;
  icono: string;
  emoji: string;
  colorClass: string;
  keywords: string[];
}

export const SECTORES_DATA: SectorData[] = [
  {
    id: "dental",
    key: "dental",
    icono: "🦷",
    emoji: "🦷",
    colorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    keywords: ["diente", "molar", "caries", "encía", "boca", "dental", "odontólogo", "cepillado"]
  },
  {
    id: "historia",
    key: "history",
    icono: "📚",
    emoji: "📚",
    colorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    keywords: ["historia", "guerra", "siglo", "rey", "imperio", "antiguo", "revolución", "batalla"]
  },
  {
    id: "ciencias",
    key: "science",
    icono: "🧬",
    emoji: "🧬",
    colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    keywords: ["ciencia", "biología", "física", "química", "célula", "átomo", "energía", "planeta"]
  },
  {
    id: "arte",
    key: "art",
    icono: "🎨",
    emoji: "🎨",
    colorClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    keywords: ["arte", "pintura", "música", "escultura", "color", "artista", "cuadro", "museo"]
  },
  {
    id: "tecnologia",
    key: "technology",
    icono: "💻",
    emoji: "💻",
    colorClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    keywords: ["tecnología", "ordenador", "internet", "robot", "programación", "digital", "software", "app"]
  },
  {
    id: "idiomas",
    key: "languages",
    icono: "🗣️",
    emoji: "🗣️",
    colorClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    keywords: ["idioma", "inglés", "español", "francés", "verbo", "gramática", "traducción", "palabra"]
  },
  {
    id: "geografia",
    key: "geography",
    icono: "🌍",
    emoji: "🌍",
    colorClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    keywords: ["geografía", "país", "capital", "montaña", "río", "mapa", "continente", "ciudad"]
  }
];

export const detectChatSector = (messages: ChatMessage[]): SectorData => {
  if (!messages.length) return { ...SECTORES_DATA[0], key: "general", emoji: "💭", colorClass: "bg-muted text-muted-foreground" };

  // Combine first few messages to analyze context
  const textToAnalyze = messages
    .slice(0, 5)
    .map(m => m.content.toLowerCase())
    .join(" ");

  let bestMatch = SECTORES_DATA[0];
  let maxMatches = 0;

  for (const sector of SECTORES_DATA) {
    let matches = 0;
    for (const keyword of sector.keywords) {
      if (textToAnalyze.includes(keyword)) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = sector;
    }
  }

  if (maxMatches > 0) {
    return bestMatch;
  }

  // Default fallback
  return {
    id: "general",
    key: "general",
    icono: "💭",
    emoji: "💭",
    colorClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
    keywords: []
  };
};
