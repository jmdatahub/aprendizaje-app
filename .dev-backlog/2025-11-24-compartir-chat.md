# [DONE] Funcionalidad de Compartir Chat

**Fecha**: 2025-11-24  
**Prioridad**: Media  
**Categoría**: Chat / Colaboración

## Descripción
Implementar la funcionalidad para compartir conversaciones del chat de profundización con otras personas.

## Funcionalidades Propuestas

### 1. Compartir por enlace
- Generar un enlace único para cada conversación
- Opciones de privacidad:
  - Solo lectura
  - Permitir comentarios
  - Colaboración activa

### 2. Compartir por email
- Enviar invitación por correo electrónico
- Incluir resumen de la conversación

### 3. Exportar conversación
- Exportar como PDF
- Exportar como texto plano
- Exportar como Markdown

## Consideraciones Técnicas
- Necesitaremos una tabla en Supabase para almacenar conversaciones compartidas
- Sistema de permisos para controlar acceso
- Generación de enlaces únicos (UUID)
- Posible integración con servicios de email

## Notas
- Esta funcionalidad está inspirada en ChatGPT
- El botón ya está en la UI pero no es funcional
