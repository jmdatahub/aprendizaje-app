"use client";

import { useState, useEffect, useCallback } from 'react';
import { sendChatMessage } from '@/lib/apiClient';

// Types
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

interface UseWeeklyTestReturn {
  testStatus: TestStatus;
  testData: Pregunta[];
  testError: string | null;
  generateWeeklyTest: (force?: boolean) => Promise<void>;
  startTest: () => void;
  resetTest: () => void;
}

const SECTORES_NOMBRES = [
  'Salud y Rendimiento', 'Ciencias Naturales', 'Ciencias Fisicas', 
  'Matematicas y Logica', 'Tecnologia y Computacion', 'Historia y Filosofia', 
  'Artes y Cultura', 'Economia y Negocios', 'Sociedad y Psicologia'
];

/**
 * Hook for managing weekly test state and generation
 * Extracted from AppContext for better separation of concerns
 */
export function useWeeklyTest(): UseWeeklyTestReturn {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testData, setTestData] = useState<Pregunta[]>([]);
  const [testError, setTestError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load test state from localStorage on mount
  useEffect(() => {
    const storedTestStatus = localStorage.getItem('weekly_test_status');
    const storedTestData = localStorage.getItem('weekly_test_data');
    if (storedTestStatus) setTestStatus(storedTestStatus as TestStatus);
    if (storedTestData) {
      try {
        setTestData(JSON.parse(storedTestData));
      } catch {
        // Invalid data, ignore
      }
    }
    setMounted(true);
  }, []);

  // Persist test state to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('weekly_test_status', testStatus);
    localStorage.setItem('weekly_test_data', JSON.stringify(testData));
    if (testError) localStorage.setItem('weekly_test_error', testError);
    else localStorage.removeItem('weekly_test_error');
  }, [testStatus, testData, testError, mounted]);

  const generateWeeklyTest = useCallback(async (force = false) => {
    if (!force && (testStatus === 'generating' || testStatus === 'ready' || testStatus === 'in_progress')) return;
    
    setTestStatus('generating');
    setTestData([]);
    setTestError(null);
    
    try {
      // Collect learning items from localStorage
      const allItems: any[] = [];
      SECTORES_NOMBRES.forEach(nombre => {
        try {
          const key = `sector_data_${nombre.toLowerCase()}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            if (data && Array.isArray(data.items)) allItems.push(...data.items);
          }
        } catch { /* ignore */ }
      });

      if (allItems.length < 3) {
        throw new Error("No hay suficientes aprendizajes guardados para generar un test. Necesitas al menos 3.");
      }

      // Select random items
      const seleccionados = [];
      for (let i = 0; i < 10; i++) {
        seleccionados.push(allItems[Math.floor(Math.random() * allItems.length)]);
      }

      // Generate questions using AI
      const nuevasPreguntas: Pregunta[] = [];
      
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
        const response = await sendChatMessage(
          [{ role: 'user', content: prompt }], 
          'Eres un profesor experto que crea exámenes precisos basados estrictamente en el texto provisto. JSON Only.', 
          { verbosity: 'concise' }
        );
        
        let parsed = [];
        try {
          const text = response.respuesta || response.content || "[]";
          const jsonMatch = text.match(/\[.*\]/s);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch {
          throw new Error("Error al procesar la respuesta del generador de exámenes.");
        }

        parsed.forEach((p: any, i: number) => {
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
        // Fallback with simulated questions
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
  }, [testStatus]);

  const startTest = useCallback(() => {
    setTestStatus('in_progress');
  }, []);

  const resetTest = useCallback(() => {
    setTestStatus('idle');
    setTestData([]);
    setTestError(null);
  }, []);

  return {
    testStatus,
    testData,
    testError,
    generateWeeklyTest,
    startTest,
    resetTest
  };
}
