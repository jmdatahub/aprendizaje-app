import { useCallback } from 'react';

const translations: Record<string, string> = {
  "chat.empty_state_title": "¡Hola!",
  "chat.empty_state_desc": "Soy tu tutor personal. Pregúntame lo que quieras aprender hoy.",
  "chat.topic_intent": "Quiero aprender sobre {topic}",
  "chat.default_greeting": "Hola, ¿en qué puedo ayudarte hoy?",
  "chat.error_generic": "Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.",
  "chat.error_connection": "Error de conexión. Verifica tu internet.",
  "chat.summary_default_title": "Resumen de aprendizaje",
  "chat.summary_default_desc": "Resumen generado automáticamente.",
  "chat.summary_provisional_title": "Borrador de aprendizaje",
  "chat.summary_provisional_desc": "Generando contenido...",
  "chat.summary_error_title": "Error al generar",
  "chat.summary_error_desc": "No se pudo generar el resumen.",
  "chat.save_learning": "Guardar Aprendizaje",
  "chat.save_success": "¡Guardado correctamente!",
  "chat.summary_title": "Resumen",
  "learnings.title_label": "Título",
  "learnings.summary_label": "Resumen",
  "learnings.section_label": "Sector",
  "learnings.tags_label": "Etiquetas",
  "learnings.add_tag_placeholder": "Añadir etiqueta...",
  "learnings.favorite_label": "Favorito",
  "learnings.review_label": "Revisar más tarde",
  "common.cancel": "Cancelar",
  "settings.select_language": "Seleccionar idioma",
  "sectors.dental": "Dental",
  "sectors.history": "Historia",
  "sectors.science": "Ciencias",
  "sectors.art": "Arte",
  "sectors.technology": "Tecnología",
  "sectors.languages": "Idiomas",
  "sectors.geography": "Geografía",
  "sectors.general": "General"
};

export const useTranslation = () => {
  const t = useCallback((key: string, params?: Record<string, string>) => {
    let text = translations[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(`{${paramKey}}`, paramValue);
      });
    }
    
    return text;
  }, []);

  return { t };
};
