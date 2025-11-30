import { AIEState, UnderstandingLevel } from './types';

export function getSystemInstructions(state: AIEState): string {
  const baseInstruction = "Adapta tu explicación al nivel del usuario.";
  
  let levelInstruction = "";
  switch (state.level) {
    case 'low':
      levelInstruction = `
        NIVEL DETECTADO: BAJO / PRINCIPIANTE.
        - Usa lenguaje extremadamente simple y cotidiano.
        - Evita tecnicismos o explícalos con metáforas simples.
        - Usa ejemplos de la vida diaria.
        - Ve paso a paso, muy despacio.
        - Sé muy alentador y paciente.
      `;
      break;
    case 'medium':
      levelInstruction = `
        NIVEL DETECTADO: MEDIO / ESTÁNDAR.
        - Usa un tono explicativo claro y directo.
        - Puedes usar términos técnicos si los defines brevemente.
        - Estructura la respuesta en puntos clave.
        - Equilibra teoría y práctica.
      `;
      break;
    case 'high':
      levelInstruction = `
        NIVEL DETECTADO: AVANZADO / EXPERTO.
        - Usa lenguaje técnico preciso y riguroso.
        - Ve directo al grano, sin simplificaciones excesivas.
        - Profundiza en matices, excepciones y casos complejos.
        - Trata al usuario como a un colega conocedor.
      `;
      break;
  }

  let gapInstruction = "";
  if (state.gaps.length > 0) {
    const lastGap = state.gaps[state.gaps.length - 1];
    gapInstruction = `
      ATENCIÓN: Se ha detectado una posible laguna cognitiva reciente sobre: "${lastGap.topic}".
      Si es relevante para la respuesta actual, asegúrate de aclarar este concepto suavemente para corregir la idea errónea: "${lastGap.misconception}".
    `;
  }

  return [baseInstruction, levelInstruction, gapInstruction].filter(Boolean).join('\n');
}

export function shouldInsertMiniEval(messageCount: number): boolean {
  // Insert mini-eval every 3-5 messages roughly
  // This is a simple heuristic, can be made smarter
  return messageCount > 0 && (messageCount + 1) % 4 === 0;
}

export function getMiniEvalPrompt(topic: string, level: UnderstandingLevel): string {
  if (level === 'low') {
    return `Para asegurarnos de que vamos bien, ¿cómo le explicarías esto a un amigo en una frase sencilla?`;
  } else if (level === 'medium') {
    return `Pequeña comprobación: ¿Cuál crees que es la diferencia clave entre esto y lo anterior?`;
  } else {
    return `Para validar comprensión: ¿Qué implicaciones tendría esto en un caso límite?`;
  }
}
