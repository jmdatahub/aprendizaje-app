# [TODO] Añadir Personas al Chat

**Fecha**: 2025-11-24  
**Prioridad**: Media  
**Categoría**: Chat / Colaboración

## Descripción
Permitir añadir personas a una conversación de chat para colaborar en tiempo real o de forma asíncrona.

## Funcionalidades Propuestas

### 1. Invitar usuarios
- Buscar usuarios por email o nombre de usuario
- Enviar invitaciones
- Notificaciones de nuevas invitaciones

### 2. Gestión de participantes
- Ver lista de participantes activos
- Roles: Admin, Editor, Lector
- Remover participantes
- Transferir propiedad del chat

### 3. Colaboración en tiempo real
- Ver quién está escribiendo (typing indicators)
- Notificaciones de nuevos mensajes
- Sincronización en tiempo real con WebSockets o Supabase Realtime

### 4. Menciones
- Mencionar a otros participantes con @usuario
- Notificaciones de menciones

## Consideraciones Técnicas
- Tabla de participantes en Supabase
- Sistema de permisos granular
- Posible uso de Supabase Realtime para sincronización
- Notificaciones push (opcional)

## Dependencias
- Sistema de usuarios/autenticación
- Base de datos de conversaciones compartidas

## Notas
- Esta funcionalidad está inspirada en ChatGPT y otras plataformas colaborativas
- El botón ya está en la UI pero no es funcional
