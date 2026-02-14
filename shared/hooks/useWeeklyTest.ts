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
    
    let loadedData: Pregunta[] = [];
    if (storedTestData) {
      try {
        loadedData = JSON.parse(storedTestData);
        setTestData(loadedData);
      } catch {
        // Invalid data, ignore
      }
    }

    if (storedTestStatus) {
       // Loop prevention: If status is 'ready' or 'in_progress' but we have no data, force reset to 'idle'
       if ((storedTestStatus === 'ready' || storedTestStatus === 'in_progress') && loadedData.length === 0) {
          console.warn("Detected inconsistent state: ready/in_progress but no data. Resetting to idle.");
          setTestStatus('idle');
       } else {
          setTestStatus(storedTestStatus as TestStatus);
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

  // Watchdog: If sticking in 'generating' for > 15s, force fallback
  useEffect(() => {
     let watchdogTimer: NodeJS.Timeout;
     
     if (testStatus === 'generating') {
        watchdogTimer = setTimeout(() => {
           console.warn("Watchdog detected stuck generation. Forcing fallback.");
           
           // Force fallback generation logic (duplicated safety)
           const allItems: any[] = [];
           try {
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
           } catch {}

           const nuevasPreguntasFallback: Pregunta[] = [];
           const safeSelections = allItems.length > 0 ? allItems : [
             { id: 'mock1', title: 'Concepto General', summary: 'Resumen genérico.' },
             { id: 'mock2', title: 'Conocimiento Básico', summary: 'Otro resumen.' },
             { id: 'mock3', title: 'Práctica', summary: 'Contenido práctico.' }
           ];

           for (let i = 0; i < 10; i++) {
               const item = safeSelections[i % safeSelections.length] || safeSelections[0];
               const isTest = i >= 8;
               
               nuevasPreguntasFallback.push({
                   id: Math.random().toString(36).substr(2, 9),
                   tipo: isTest ? 'test' : 'abierta',
                   aprendizajeId: item.id || 'mock_id',
                   titulo: item.title || 'Tema General',
                   enunciado: isTest 
                     ? `Sobre el tema "${item.title}", selecciona la afirmación correcta:` 
                     : `Explica brevemente un punto clave sobre "${item.title}":`,
                   tiempoLimite: 30,
                   opciones: isTest ? [
                     "Es fundamental.",
                     "No tiene relevancia.",
                     "Fue refutado.",
                     "Solo teórico."
                   ] : undefined
               });
           }
           
           setTestData(nuevasPreguntasFallback);
           setTestStatus('ready');
        }, 15000); // 15 seconds max
     }

     return () => clearTimeout(watchdogTimer);
  }, [testStatus]);

  const generateWeeklyTest = useCallback(async (force = false) => {
    if (!force && (testStatus === 'generating' || testStatus === 'ready' || testStatus === 'in_progress')) return;
    
    setTestData([]);
    setTestError(null);
    
    // Define allItems in outer scope for fallback access
    const allItems: any[] = [];

    try {
      // Collect learning items from localStorage
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

      // Select random items (Reduced to 5 for speed, generate 2 questions each)
      const seleccionados = [];
      const sourceItems = allItems.length > 0 ? allItems : [];
      // Shuffle
      const shuffled = [...sourceItems].sort(() => 0.5 - Math.random());
      // Take up to 5
      const selectedItems = shuffled.slice(0, 5);
      
      // If we have very few items, duplicate them to reach at least 3-4 for variety
      while (selectedItems.length < 5 && selectedItems.length > 0) {
         selectedItems.push(selectedItems[selectedItems.length % sourceItems.length]);
      }

      // Generate questions using AI
      const nuevasPreguntas: Pregunta[] = [];
      
      const contentForPrompt = selectedItems.map((s, i) => 
        `TEMA ${i+1}: "${s.title}"\nCONTENIDO: ${s.summary.substring(0, 300)}...`
      ).join('\n\n');

      const prompt = `Genera 10 preguntas de examen (2 por cada tema) basadas en los siguientes textos.
      
      ${contentForPrompt}
      
      REGLAS OBLIGATORIAS:
      1. BASADO EN CONTENIDO: Cada pregunta debe basarse en la información provista.
      2. CONTEXTO: Incluye contexto. Ej: "Según el texto sobre el ojo..."
      3. RESPUESTAS CORTAS: 1-5 palabras.
      4. FORMATO:
         - 8 preguntas "abierta".
         - 2 preguntas "test".
      
      Devuelve JSON array:
      [
          { "enunciado": "¿Pregunta...?", "tiempo": 30, "titulo_tema": "Título Original", "tipo": "abierta" },
          { "enunciado": "¿Pregunta test...?", "tiempo": 20, "titulo_tema": "Título Original", "tipo": "test", "opciones": ["A", "B", "C", "D"] }
      ]`;

      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Timeout generating test")), 10000); // 10s timeout
        });

        // Race against AI 
        const response: any = await Promise.race([
          sendChatMessage(
            [{ role: 'user', content: prompt }], 
            'Eres un profesor experto que crea exámenes precisos. JSON Only.', 
            { verbosity: 'concise' }
          ),
          timeoutPromise
        ]);
        
        // Fix: Declare parsed variable properly
        let parsed: any[] = [];
        try {
          const text = response.respuesta || response.content || "[]";
          const jsonMatch = text.match(/\[.*\]/s);
          const jsonStr = jsonMatch ? jsonMatch[0] : text;
          
          try {
             parsed = JSON.parse(jsonStr);
          } catch (e) {
             // Try to find ANY array-like structure if strictly valid JSON failed
             const fallbackMatch = text.match(/\[[\s\S]*\]/);
             if (fallbackMatch) {
                parsed = JSON.parse(fallbackMatch[0]);
             } else {
                throw e;
             }
          }
          
          if (!Array.isArray(parsed)) throw new Error("La respuesta no es un array");
        } catch (parseError) {
          console.error("Error parsing AI response for test generation", parseError);
          console.error("Raw response text:", response.respuesta || response.content);
          throw new Error("Error al procesar la respuesta del generador de exámenes.");
        }

        parsed.forEach((p: any, i: number) => {
          const originalItem = selectedItems.find(s => s.title === p.titulo_tema) || selectedItems[i % selectedItems.length];
          
          if (p.enunciado) {
             nuevasPreguntas.push({
                id: Math.random().toString(36).substr(2, 9),
                tipo: p.tipo === 'test' ? 'test' : 'abierta',
                aprendizajeId: originalItem.id,
                titulo: originalItem.title,
                enunciado: p.enunciado,
                tiempoLimite: Math.min(Math.max(p.tiempo || 30, 20), 40),
                opciones: p.opciones
             });
          }
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
        if (nuevasPreguntas[nuevasPreguntas.length - 1]) {
           nuevasPreguntas[nuevasPreguntas.length - 1].tipo = 'test';
           nuevasPreguntas[nuevasPreguntas.length - 1].opciones = ["Opción A", "Opción B", "Opción C", "Opción D"];
        }
        if (nuevasPreguntas[nuevasPreguntas.length - 2]) {
           nuevasPreguntas[nuevasPreguntas.length - 2].tipo = 'test';
           nuevasPreguntas[nuevasPreguntas.length - 2].opciones = ["Verdadero", "Falso", "No se sabe", "Depende"];
        }
      }

      if (nuevasPreguntas.length > 0) {
        // AI generation successful
        setTestData(nuevasPreguntas);
        setTimeout(() => setTestStatus('ready'), 0);
        return;
      }
      
      // If we reached here, AI returned 0 valid questions. Proceed to fallback.
      console.warn("AI returned 0 valid questions. Using fallback.");

    } catch (e: any) {
      console.warn("Error generating weekly test with AI, falling back to local generation", e);
    }

    // FALLBACK GENERATION (Runs if AI fails or returns empty)
    const nuevasPreguntasFallback: Pregunta[] = [];
      
    // Use allItems if available, otherwise safety mocks
    const safeSelections = allItems.length > 0 ? allItems : [
      { id: 'mock1', title: 'Concepto General', summary: 'Resumen genérico para pruebas.' },
      { id: 'mock2', title: 'Conocimiento Básico', summary: 'Otro resumen genérico.' },
      { id: 'mock3', title: 'Práctica', summary: 'Contenido de práctica.' }
    ];

    // Generate 10 local questions
    for (let i = 0; i < 10; i++) {
        const item = safeSelections[i % safeSelections.length] || safeSelections[0];
        const isTest = i >= 8; // Last 2 are multiple choice
        
        nuevasPreguntasFallback.push({
            id: Math.random().toString(36).substr(2, 9),
            tipo: isTest ? 'test' : 'abierta',
            aprendizajeId: item.id || 'mock_id',
            titulo: item.title || 'Tema General',
            enunciado: isTest 
              ? `Sobre el tema "${item.title}", selecciona la afirmación correcta:` 
              : `Explica brevemente un punto clave sobre "${item.title}":`,
            tiempoLimite: 30,
            opciones: isTest ? [
              "Es fundamental para el entendimiento global.",
              "No tiene aplicación práctica conocida.",
              "Fue refutado recientemente.",
              "Solo aplica en casos teóricos."
            ] : undefined
        });
    }
      
    setTestData(nuevasPreguntasFallback);
    setTimeout(() => setTestStatus('ready'), 0);

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
