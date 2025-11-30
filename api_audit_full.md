# Auditoría Completa de Endpoints

## 1. Inventario de Endpoints

### Dominio: Learning (Aprendizaje)

#### `POST /api/aprender`
- **Ubicación**: `app/api/aprender/route.ts`
- **Descripción**: Endpoint híbrido. Si `confirmar=true`, guarda un aprendizaje en BD. Si no, genera un resumen/draft con IA.
- **Recibe**: `{ confirmar?: boolean, conversacion: [], titulo?, resumen?, sectorId? }`
- **Devuelve**:
  - Guardado: `{ ok: true, id: number }`
  - Draft: `{ titulo, resumen, tags, sector_id, engine }`
- **Uso**: Pantalla de Chat (al pulsar "Guardar aprendizaje").

#### `GET /api/aprendizajes`
- **Ubicación**: `app/api/aprendizajes/route.js` (JavaScript)
- **Descripción**: Devuelve TODO: lista de aprendizajes, estadísticas por sector y sectores desbloqueados.
- **Recibe**: Nada.
- **Devuelve**: `{ data: [], agregados: [{ sector_id, total }], progreso: [] }`
- **Uso**: Pantalla "Mis Aprendizajes" (Dashboard).

#### `GET /api/sectores`
- **Ubicación**: `app/api/sectores/route.ts`
- **Descripción**: Devuelve la lista estática de sectores.
- **Recibe**: Nada.
- **Devuelve**: `Array<{ id, nombre, icono, color }>`
- **Uso**: Home, Selectores de sector.

### Dominio: Chat

#### `POST /api/chat`
- **Ubicación**: `app/api/chat/route.ts`
- **Descripción**: Motor principal del chat con IA (GPT-4o-mini). Incluye lógica de "Stub" y análisis AIE.
- **Recibe**: `{ messages: [], context?: string, config?: { verbosity } }`
- **Devuelve**: `{ respuesta: string, engine: string }`
- **Uso**: Componente `UnifiedTutorChat`.

#### `GET /api/chats`
- **Ubicación**: `app/api/chats/route.ts`
- **Descripción**: Lista el historial de chats guardados.
- **Recibe**: Nada.
- **Devuelve**: `{ chats: [{ id, titulo, created_at }] }`
- **Uso**: Sidebar del Chat.

#### `POST /api/chats`
- **Ubicación**: `app/api/chats/route.ts`
- **Descripción**: Guarda un historial de chat (diferente a guardar un aprendizaje).
- **Recibe**: `{ titulo, conversacion }`
- **Devuelve**: `{ ok: true, id }`
- **Uso**: Sidebar del Chat (botón guardar chat).

#### `POST /api/recommendations`
- **Ubicación**: `app/api/recommendations/route.ts`
- **Descripción**: Genera temas y subtemas relacionados basados en la conversación.
- **Recibe**: `{ messages: [] }`
- **Devuelve**: `{ relatedTopics: [], subtopics: [] }`
- **Uso**: Final del chat, sugerencias automáticas.

### Dominio: Tests & Review

#### `GET /api/repaso`
- **Ubicación**: `app/api/repaso/route.js` (JavaScript)
- **Descripción**: Genera preguntas de repaso simples basadas en aprendizajes recientes (lógica local/stub).
- **Recibe**: Query params `limite`, `dias`.
- **Devuelve**: `{ preguntas: [{ tipo, enunciado, ... }] }`
- **Uso**: Pantalla "Repaso" o "Test Semanal".

#### `POST /api/test-me`
- **Ubicación**: `app/api/test-me/route.ts`
- **Descripción**: Genera 3 preguntas de evaluación sobre un contenido específico usando IA.
- **Recibe**: `{ content: string }`
- **Devuelve**: `{ questions: string[] }`
- **Uso**: Botón "Ponme a prueba" en aprendizajes.

### Dominio: Games (Juegos)

#### `GET /api/sorpresas`
- **Ubicación**: `app/api/sorpresas/route.js` (JavaScript)
- **Descripción**: Devuelve un chiste y una curiosidad según el sector. Archivo muy grande (22KB) con datos hardcodeados.
- **Recibe**: Query param `sector`.
- **Devuelve**: `{ chiste, sorpresa, seed, sector }`
- **Uso**: Modales de bloqueo, pantallas de carga.

---

## 2. Detección de Problemas

### 2.1. Endpoints "Cajón Desastre"
- **`POST /api/aprender`**: Viola el principio de responsabilidad única. Mezcla **generación** (IA) con **persistencia** (BD). Esto hace que el endpoint sea confuso y difícil de tipar.
- **`GET /api/aprendizajes`**: Devuelve datos crudos, estadísticas agregadas y progreso en una sola llamada. Aunque eficiente para el dashboard actual, acopla la vista a la API. Si el dashboard cambia, hay que tocar este endpoint.

### 2.2. Inconsistencias Técnicas
- **Mezcla JS/TS**: `aprendizajes`, `repaso` y `sorpresas` están en JavaScript, mientras el resto está en TypeScript. Esto reduce la seguridad de tipos.
- **Formatos de Respuesta**:
  - Algunos devuelven `{ ok: true, ... }`.
  - Otros devuelven `{ data: ... }`.
  - Otros devuelven la estructura directa (ej: `{ preguntas: [] }`).
  - `GET /api/sectores` devuelve un Array directamente (sin envoltorio JSON).

### 2.3. Duplicación de Lógica
- **Cliente OpenAI**: Se instancia manualmente en `chat`, `recommendations`, `test-me`, `aprender` y `sorpresas`. Si cambia la config de OpenAI, hay que tocar 5 archivos.
- **Lógica Stub**: La lógica de "si no hay API Key, usa datos falsos" está repetida y dispersa.

---

## 3. Propuesta de Reorganización

Estructura sugerida basada en dominios (DDD ligero):

### `/api/learning`
- `GET /api/learning/items`: Listar aprendizajes (paginado, filtros).
- `POST /api/learning/items`: Guardar nuevo aprendizaje.
- `POST /api/learning/analyze`: (Antes `aprender` modo draft) Generar resumen/tags con IA.
- `GET /api/learning/stats`: (Nuevo) Solo estadísticas y progreso.
- `GET /api/learning/sectors`: (Antes `sectores`) Lista de sectores.

### `/api/chat`
- `POST /api/chat/completion`: (Antes `chat`) Motor de conversación.
- `POST /api/chat/recommendations`: (Antes `recommendations`) Sugerencias.
- `GET /api/chat/history`: (Antes `chats` GET) Historial.
- `POST /api/chat/history`: (Antes `chats` POST) Guardar chat.

### `/api/tests`
- `GET /api/tests/weekly`: (Antes `repaso`) Generar examen semanal.
- `POST /api/tests/evaluate-content`: (Antes `test-me`) Generar preguntas sobre un texto.

### `/api/games`
- `GET /api/games/daily-trivia`: (Antes `sorpresas`) Chiste/Curiosidad.

---

## 4. Contratos Claros (Ejemplos Críticos)

### A. Guardar Aprendizaje
**POST** `/api/learning/items`

**INPUT**:
```json
{
  "title": "string (required)",
  "summary": "string (required)",
  "content": "string (optional)",
  "sectorId": "number (required)",
  "tags": "string[] (optional)",
  "sourceConversation": "object[] (optional)"
}
```

**OUTPUT (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "createdAt": "ISO-DATE"
  }
}
```

### B. Chat Completion
**POST** `/api/chat/completion`

**INPUT**:
```json
{
  "messages": [
    { "role": "user|assistant|system", "content": "string" }
  ],
  "config": {
    "verbosity": "concise|normal|detailed",
    "context": "string"
  }
}
```

**OUTPUT (200 OK)**:
```json
{
  "success": true,
  "data": {
    "content": "string",
    "role": "assistant",
    "metadata": {
      "engine": "gpt-4o-mini",
      "usage": { "tokens": 150 }
    }
  }
}
```

---

## 5. Plan de Mejora por Fases

### FASE 1: Estandarización y Seguridad (Sin romper rutas)
1.  **Migrar todo a TypeScript**: Convertir `aprendizajes`, `repaso` y `sorpresas` a `.ts`.
2.  **Unificar Cliente OpenAI**: Crear `lib/openai.ts` para centralizar la instancia y la lógica de "Stub".
3.  **Tipar Respuestas**: Definir interfaces compartidas (ej: `ApiResponse<T>`) para que todos los endpoints devuelvan `{ success: boolean, data?: T, error?: string }`.

### FASE 2: Refactorización de "Cajón Desastre"
1.  Dividir `POST /api/aprender` en dos:
    - Crear `POST /api/learning/analyze` para la parte de IA.
    - Usar `POST /api/learning/items` (o mantener `aprender` temporalmente) para guardar.
2.  Actualizar el frontend (`UnifiedTutorChat`) para usar estos dos endpoints secuencialmente.

### FASE 3: Reorganización de Rutas
1.  Mover archivos a las nuevas carpetas (`app/api/learning/...`, `app/api/chat/...`).
2.  Crear `redirects` en `next.config.js` o mantener archivos "proxy" en las rutas viejas para no romper clientes antiguos (si los hubiera).

### FASE 4: Optimización
1.  Mover los datos estáticos de `sorpresas` (22KB) a un archivo JSON o base de datos, cargándolos bajo demanda.
2.  Implementar validación con **Zod** en todos los inputs POST.
