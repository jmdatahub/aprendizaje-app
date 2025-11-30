# Pendientes de Desarrollo

## Mejoras de IA

### Selector de nivel de detalle de las respuestas del tutor IA
- **Descripción**: Implementar un control (slider, selector o botones) que permita elegir el nivel de detalle de las respuestas de la IA en el chat.
- **Ejemplo**:
  - Nivel "Corto": Respuesta breve y concisa.
  - Nivel "Largo": Respuesta profunda, con contexto histórico, detalles técnicos, etc.
- **Implementación técnica**: Este selector deberá modificar el prompt del sistema o los parámetros de configuración (`verbosity`) enviados al backend/modelo.
