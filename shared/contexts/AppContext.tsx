"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { es } from '@/shared/locales/es';
import { en } from '@/shared/locales/en';
import { sendChatMessage } from '@/lib/apiClient';

// Types
export type Language = 'es' | 'en';
export type ChatMode = 'integrated' | 'page';
export type DateFormat = 'classic' | 'relative';
export type TestStatus = 'idle' | 'generating' | 'ready' | 'in_progress' | 'error';

export type Pregunta = {
  id: string
  tipo: 'abierta' | 'test'
  aprendizajeId: string
  titulo: string
  enunciado: string
  tiempoLimite: number
  respuestaUsuario?: string
  feedback?: string
  esCorrecta?: boolean
  opciones?: string[]
}

export interface AppSettings {
  language: Language;
  chatMode: ChatMode;
  darkMode: boolean;
  dateFormat: DateFormat;
}

interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  t: (key: string, params?: Record<string, any>) => any;
  formatDate: (date: string | Date | number) => string;
  testStatus: TestStatus;
  testData: Pregunta[];
  testError: string | null;
  generateWeeklyTest: (force?: boolean) => Promise<void>;
  startTest: () => void;
  resetTest: () => void;
}

// Default Settings
const DEFAULT_SETTINGS: AppSettings = {
  language: 'es',
  chatMode: 'integrated',
  darkMode: false,
  dateFormat: 'classic'
};

// Helper for nested keys
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, obj) || path;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  
  // Weekly Test State
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testData, setTestData] = useState<Pregunta[]>([]);
  const [testError, setTestError] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('app_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Error loading settings", e);
      }
    }
    
    // Load test state
    const storedTestStatus = localStorage.getItem('weekly_test_status');
    const storedTestData = localStorage.getItem('weekly_test_data');
    if (storedTestStatus) setTestStatus(storedTestStatus as TestStatus);
    if (storedTestData) setTestData(JSON.parse(storedTestData));

    setMounted(true);
  }, []);

  // Persist settings and apply side effects (Dark Mode)
  useEffect(() => {
    if (!mounted) return;

    // Save to localStorage
    localStorage.setItem('app_settings', JSON.stringify(settings));

    // Apply Dark Mode
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings, mounted]);

  // Persist test state
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('weekly_test_status', testStatus);
    localStorage.setItem('weekly_test_data', JSON.stringify(testData));
    if (testError) localStorage.setItem('weekly_test_error', testError);
    else localStorage.removeItem('weekly_test_error');
  }, [testStatus, testData, testError, mounted]);

  const generateWeeklyTest = async (force = false) => {
    if (!force && (testStatus === 'generating' || testStatus === 'ready' || testStatus === 'in_progress')) return;
    
    setTestStatus('generating');
    setTestData([]);
    setTestError(null);

    // Don't await here if we want it to be truly background from the caller's perspective, 
    // but the caller usually doesn't await it anyway in event handlers.
    // We'll execute the logic.
    
    try {
      const SECTORES_NOMBRES = [
        'Salud y Rendimiento', 'Ciencias Naturales', 'Ciencias Fisicas', 
        'Matematicas y Logica', 'Tecnologia y Computacion', 'Historia y Filosofia', 
        'Artes y Cultura', 'Economia y Negocios', 'Sociedad y Psicologia'
      ];

      const allItems: any[] = [];
      SECTORES_NOMBRES.forEach(nombre => {
        try {
          const key = `sector_data_${nombre.toLowerCase()}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            if (data && Array.isArray(data.items)) allItems.push(...data.items);
          }
        } catch {}
      });

      if (allItems.length < 3) {
        throw new Error("No hay suficientes aprendizajes guardados para generar un test. Necesitas al menos 3.");
      }

      // Select items
      const seleccionados = [];
      for (let i = 0; i < 10; i++) {
          seleccionados.push(allItems[Math.floor(Math.random() * allItems.length)]);
      }

      // Generate questions
      const nuevasPreguntas: Pregunta[] = [];
      
      // Prepare content for prompt
      const contentForPrompt = seleccionados.map((s, i) => 
        `TEMA ${i+1}: "${s.title}"\nCONTENIDO: ${s.summary.substring(0, 400)}...`
      ).join('\n\n');

      const prompt = `Genera 10 preguntas de examen basadas en los siguientes textos.
      
      ${contentForPrompt}
      
      REGLAS OBLIGATORIAS:
      1. BASADO EN CONTENIDO: Cada pregunta debe basarse en la información provista en "CONTENIDO", NO solo en el título.
      2. CONTEXTO: Incluye contexto en la pregunta. Ej: "Según el texto sobre el ojo, ¿qué función cumple la retina?" (NO: "¿Qué hace la retina?").
      3. RESPUESTAS CORTAS: Las preguntas deben poder responderse con 1-5 palabras.
      4. CONCRECIÓN: Pregunta por datos específicos, funciones, nombres o características. EVITA preguntas abstractas o de "Explica...".
      5. FORMATO:
         - 8 preguntas "abierta" (respuesta corta).
         - 2 preguntas "test" (4 opciones, solo 1 correcta).
      
      EJEMPLOS:
      MAL: "¿Qué es el sol?" (Muy general, sin contexto)
      BIEN: "Según el texto, ¿qué elemento químico compone principalmente el sol?" (Concreto, basado en texto)
      
      Devuelve JSON array:
      [
          { "enunciado": "¿Según el texto X, qué [dato específico]...?", "tiempo": 30, "titulo_tema": "Título Original", "tipo": "abierta" },
          { "enunciado": "¿Cuál es la función principal de [X] mencionada en el texto?", "tiempo": 20, "titulo_tema": "Título Original", "tipo": "test", "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"] }
      ]`;

      try {
          const response = await sendChatMessage([
            { role: 'user', content: prompt }
          ], 'Eres un profesor experto que crea exámenes precisos basados estrictamente en el texto provisto. JSON Only.', { verbosity: 'concise' });
          
          let parsed = [];
          try {
              const text = response.respuesta || response.content || "[]";
              const jsonMatch = text.match(/\[.*\]/s);
              parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
          } catch {
              throw new Error("Error al procesar la respuesta del generador de exámenes.");
          }

          parsed.forEach((p: any, i: number) => {
              // Match question to original learning item if possible, otherwise use index fallback
              const originalItem = seleccionados.find(s => s.title === p.titulo_tema) || seleccionados[i % seleccionados.length];
              
              nuevasPreguntas.push({
                  id: Math.random().toString(36).substr(2, 9),
                  tipo: p.tipo === 'test' ? 'test' : 'abierta',
                  aprendizajeId: originalItem.id,
                  titulo: originalItem.title,
                  enunciado: p.enunciado,
                  tiempoLimite: Math.min(Math.max(p.tiempo || 30, 20), 40),
                  opciones: p.opciones
              });
          });
      } catch (e) {
          // Fallback mejorado con contexto simulado
          console.warn("Using fallback questions due to generation error", e);
          seleccionados.forEach((s, i) => {
              const esTest = i >= 8;
              nuevasPreguntas.push({
                  id: Math.random().toString(36).substr(2, 9),
                  tipo: esTest ? 'test' : 'abierta',
                  aprendizajeId: s.id,
                  titulo: s.title,
                  enunciado: esTest 
                    ? `Basado en lo aprendido sobre "${s.title}", ¿cuál de estas afirmaciones es correcta?` 
                    : `Menciona un concepto clave relacionado con "${s.title}"`,
                  tiempoLimite: 30,
                  opciones: esTest ? [
                      "Es un concepto fundamental.",
                      "No tiene relevancia práctica.",
                      "Se descubrió en el siglo XX.",
                      "Es una teoría descartada."
                  ] : undefined
              });
          });
      }

      // Ensure at least 2 test questions
      const testCount = nuevasPreguntas.filter(p => p.tipo === 'test').length;
      if (testCount < 2 && nuevasPreguntas.length >= 2) {
          nuevasPreguntas[nuevasPreguntas.length - 1].tipo = 'test';
          nuevasPreguntas[nuevasPreguntas.length - 1].opciones = ["Opción A", "Opción B", "Opción C", "Opción D"];
          nuevasPreguntas[nuevasPreguntas.length - 2].tipo = 'test';
          nuevasPreguntas[nuevasPreguntas.length - 2].opciones = ["Verdadero", "Falso", "No se sabe", "Depende"];
      }

      setTestData(nuevasPreguntas);
      setTestStatus('ready');

    } catch (e: any) {
      console.error("Error generating weekly test", e);
      setTestStatus('error');
      setTestError(e.message || "Ha ocurrido un error inesperado al generar el test.");
    }
  };

  const startTest = () => {
    setTestStatus('in_progress');
  };

  const resetTest = () => {
    setTestStatus('idle');
    setTestData([]);
    setTestError(null);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const t = (key: string, params?: Record<string, any>) => {
    const dict = settings.language === 'es' ? es : en;
    let value = getNestedValue(dict, key);
    
    // Fallback to English if translation is missing (value equals key)
    if (value === key && settings.language !== 'en') {
      value = getNestedValue(en, key);
    }
    
    if (typeof value === 'string' && params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        if (paramKey !== 'returnObjects') {
          value = value.replace(`{${paramKey}}`, String(paramValue));
        }
      });
    }
    
    return value;
  };

  const formatDate = (date: string | Date | number) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    if (settings.dateFormat === 'relative') {
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(diff / (1000 * 60));

      if (days > 30) return d.toLocaleDateString(settings.language === 'es' ? 'es-ES' : 'en-US');
      if (days > 1) return settings.language === 'es' ? `hace ${days} días` : `${days} days ago`;
      if (days === 1) return settings.language === 'es' ? 'ayer' : 'yesterday';
      if (hours > 1) return settings.language === 'es' ? `hace ${hours} horas` : `${hours} hours ago`;
      if (minutes > 1) return settings.language === 'es' ? `hace ${minutes} minutos` : `${minutes} minutes ago`;
      return settings.language === 'es' ? 'hace un momento' : 'just now';
    }

    return d.toLocaleDateString(settings.language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, t, formatDate, testStatus, testData, testError, generateWeeklyTest, startTest, resetTest }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
