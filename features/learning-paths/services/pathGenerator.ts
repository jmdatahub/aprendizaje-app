import { sendChatMessage } from '@/lib/apiClient';
import { LearningPath, PathStep } from '../types';

// Helper to get all learnings from all sectors
const getAllLearnings = () => {
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
        if (data && Array.isArray(data.items)) {
            // Add sector name to each item for reference
            allItems.push(...data.items.map((item: any) => ({ ...item, sectorName: nombre })));
        }
      }
    } catch {}
  });
  return allItems;
};

export const generateLearningPath = async (topic: string): Promise<LearningPath> => {
  const allLearnings = getAllLearnings();
  
  // Filter learnings that might be relevant (simple text match first to reduce token usage)
  // or send a larger batch if token limit allows. For now, let's send titles of EVERYTHING 
  // if it's not too huge, or filter by sector if topic matches a sector name.
  
  // Let's try to send all titles + IDs.
  const itemsForPrompt = allLearnings.map(item => ({
    id: item.id,
    title: item.title,
    sector: item.sectorName,
    summary: item.summary.substring(0, 100) // Short summary
  }));

  const prompt = `
    El usuario quiere una "Ruta de Aprendizaje" sobre el tema: "${topic}".
    
    Tengo la siguiente lista de aprendizajes disponibles en mi base de datos:
    ${JSON.stringify(itemsForPrompt)}
    
    TU TAREA:
    1. Selecciona EXACTAMENTE 3 aprendizajes de esta lista que encajen con el tema "${topic}".
    2. Ordénalos lógicamente para aprender (de lo básico a lo complejo).
    3. Si no hay suficientes aprendizajes exactos, busca los más relacionados posibles.
    4. Genera un título atractivo para la ruta.
    5. Para cada paso, escribe una breve frase "reasoning" (máximo 10 palabras) explicando por qué es el siguiente paso.
    
    IMPORTANTE:
    - SOLO usa los items provistos. NO inventes nada.
    - DEBES devolver EXACTAMENTE 3 pasos.
    - Devuelve un JSON con este formato:
    {
      "title": "Título de la Ruta",
      "steps": [
        { "learningId": "id_del_item", "reasoning": "Breve razón..." }
      ]
    }
  `;

  try {
    const response = await sendChatMessage([
        { role: 'user', content: prompt }
    ], 'Eres un experto pedagogo creando rutas de estudio. JSON Only.', { verbosity: 'concise' });

    let result = { title: '', steps: [] };
    try {
        const text = response.respuesta || response.content || "{}";
        const jsonMatch = text.match(/\{.*\}/s);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
        console.error("Error parsing LLM response", e);
        throw new Error("No se pudo generar la ruta. Intenta con otro tema.");
    }

    if (!result.steps || result.steps.length === 0) {
        throw new Error("No se encontraron aprendizajes suficientes para este tema.");
    }

    // Reconstruct full steps with metadata
    const fullSteps: PathStep[] = result.steps.map((step: any) => {
        const original = allLearnings.find(l => l.id === step.learningId);
        if (!original) return null;
        return {
            id: Math.random().toString(36).substr(2, 9),
            learningId: original.id,
            title: original.title,
            description: step.reasoning || step.description,
            completed: false,
            sectorName: original.sectorName
        };
    }).filter((s:any) => s !== null);

    return {
        id: Math.random().toString(36).substr(2, 9),
        title: result.title || `Ruta de ${topic}`,
        sector: topic,
        steps: fullSteps,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completed: false,
        currentStepIndex: 0
    };

  } catch (error) {
    console.error("Error generating path:", error);
    throw error;
  }
};
