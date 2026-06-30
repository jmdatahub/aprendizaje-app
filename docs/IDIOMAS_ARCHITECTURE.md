# Módulo "Idiomas" — Arquitectura y Plan (Vocabulario de Inglés)

> Estado: **IMPLEMENTADO Y VERIFICADO EN PRODUCCIÓN** (Fases 1, 2 y base de 3).
> Autor: planificado y construido con Claude Code. Fecha base: 2026-06-29.
>
> ✅ **Sin pasos manuales.** Decisión final: el vocabulario se sincroniza usando
> la tabla `learnings` YA EXISTENTE en producción (sector reservado
> `__vocab_en__`, campos extra en `content` como JSON), en lugar de una tabla
> nueva. Motivo: el proyecto Supabase de producción (`shqkwxribvuktcxtuujr`)
> está en una cuenta a la que no se le puede aplicar DDL desde estas
> herramientas. Reutilizar `learnings` (RLS pública, ya accesible) hace que el
> sync cross-device y las tools de Telegram funcionen sin crear nada.
>
> Verificado contra la BD real: subir → leer desde "otro dispositivo" → borrar
> (tombstone) → OK; producción queda limpia. Build/typecheck/52 tests en verde;
> flujo apuntar→practicar→métricas verificado en navegador.
>
> La migración `docs/migrations/2026_07_vocabulary.sql` queda como **mejora
> futura OPCIONAL** (tabla dedicada `vocabulary` más limpia) si algún día hay
> acceso DDL; migrar entonces sería copiar las filas de `__vocab_en__`.
>
> **Revisión sistemática (post-lanzamiento).** Auditoría multi-ángulo
> (correctitud, UX/móvil, datos/seguridad). Corregido: cupo real de palabras
> nuevas/día (las nuevas no contaban como "vencidas"), stats sin doble conteo,
> estado leech>known, aislamiento del sector `__vocab_en__` en TODAS las tools
> del agente (search/get/quiz/stats/review_today), `dir` pre-repaso, borrado con
> tombstone local, cloze→productivo sin match, rate-limit/cap/validación en las
> rutas, parseo JSON robusto, y UX (editar palabras, confirmación in-line,
> preventDragClose, selects sin zoom iOS, aria del anillo). Lógica de grading
> centralizada en `computeReviewedState` con tests unitarios. **Deuda técnica
> conocida:** la corrección depende de que cada query sobre `learnings` excluya
> el sector reservado — la tabla dedicada lo resolvería de raíz.
> Objetivo de Jorge: aprender **20 palabras de vocabulario a la semana (~3/día)**,
> que él mismo propone, con buen vocabulario (B2–C2, nada básico), en contexto
> (ejemplos), con seguimiento real y sincronizado entre móvil y PC.

---

## 1. Visión y objetivos medibles

**Qué es:** una sección de aprendizaje de vocabulario de inglés dentro de la app,
basada en repetición espaciada (SRS) y aprendizaje **en contexto** (frase de
ejemplo + modo cloze), donde Jorge apunta las palabras que no domina y la app se
encarga de hacérselas practicar en el momento óptimo.

**Objetivos medibles (KPIs del producto):**

| KPI | Definición | Meta |
|---|---|---|
| Palabras aprendidas / semana | Palabras nuevas recordadas correctamente ≥1 vez por primera vez esa semana | **20** |
| Cadencia diaria | Palabras nuevas introducidas al día | **~3** |
| Retención | % de aciertos en repasos vencidos | **85–90%** |
| Palabras dominadas (lifetime) | Palabras con intervalo SRS ≥ 21 días | crece sin techo |
| Racha | Días consecutivos con al menos 1 práctica | sin perder |

**Nivel del vocabulario:** solo **B2, C1, C2** (CEFR). La IA clasifica cada
palabra y avisa si es demasiado básica (A1–B1) antes de guardarla.

---

## 2. Decisiones de diseño (fundamentadas en investigación)

Resumen de la investigación realizada y cómo se traduce en decisiones. Fuentes al
final del documento.

1. **SRS sí, FSRS más adelante.** FSRS-6 (2025) reduce 20–30% los repasos para la
   misma retención, pero SM-2 "lite" (ya implementado en [`lib/srs.ts`](../lib/srs.ts))
   es suficiente para lanzar. → **Reutilizamos `lib/srs.ts` tal cual.** El modelo de
   datos se diseña para que migrar a FSRS después sea aditivo (no rompe nada).

2. **Contexto > palabra aislada (lo más importante).** Las tarjetas de
   palabra→traducción aislada son mucho peores que el vocabulario en contexto; el
   cerebro necesita ~17 exposiciones y el significado depende del contexto. →
   **Cada palabra lleva frase de ejemplo natural + modo cloze** (frase con hueco).

3. **Receptivo vs. productivo.** Recordar EN→ES (receptivo) es más fácil que ES→EN
   (productivo); dominar exige ambos. → **La práctica alterna dirección**; una
   palabra solo se considera "dominada" cuando sobrevive a intervalos largos
   (que ya incluyen pruebas productivas).

4. **Cadencia.** 10–25 palabras nuevas/día es sostenible; retención objetivo
   85–90% (subir al 95% dispara el trabajo sin ganancia real). → La meta de
   **~3/día** está bien calibrada y es realista a largo plazo.

5. **Leeches.** Palabras que se fallan repetidamente (umbral Anki típico: 8
   lapsos) deben tratarse aparte, no envenenar la cola diaria. → **Detector de
   leeches** (umbral configurable) → cajón "Atascadas" con ayuda reforzada
   (mnemotecnia/ejemplo nuevo generado por IA).

6. **Nivel garantizado.** Existen referencias estándar (Oxford 5000, English
   Vocabulary Profile, CEFR). → La IA del VPS **etiqueta el nivel CEFR** y filtra
   lo básico.

---

## 3. Decisión de arquitectura clave: store dedicado, patrón reutilizado

Se evaluaron dos caminos:

- **(A) Reutilizar la tabla `learnings` / modelo de sectores** con `sector_id =
  'idiomas'`, metiendo word/translation/ejemplo en `title/summary/content`.
  *Ventaja:* sync y gamificación gratis. *Problema:* los campos estructurados del
  vocabulario (parte de la oración, fonética, CEFR, lapsos, dirección…) no caben
  limpios; se pierde queryabilidad y se ensucia el modelo.

- **(B) Store y tabla dedicados (`vocabulary`)**, **clonando** el patrón de sync
  probado de `learnings`. *Ventaja:* modelo limpio y consultable, extensible a
  FSRS y a más idiomas. *Coste:* algo de código nuevo (una ruta de sync y un
  servicio espejo del existente).

**Elegido: (B).** Coherente con el objetivo de "arquitectura perfecta". El SRS se
comparte (`lib/srs.ts`), y la racha/gamificación se alimenta también con las
fechas de práctica de vocabulario (streak unificada).

---

## 4. Modelo de datos

### 4.1 Tipo `VocabWord` (cliente)

```ts
// features/idiomas/types.ts
import type { SrsState } from '@/lib/srs'

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type PartOfSpeech =
  | 'noun' | 'verb' | 'adjective' | 'adverb'
  | 'phrasal_verb' | 'idiom' | 'expression' | 'other'
export type WordStatus = 'new' | 'learning' | 'known' | 'leech'

export interface VocabWord {
  id: string                      // uuid cliente (idempotencia en sync)
  lang: 'en'                      // idioma destino (extensible: 'fr', 'de'…)

  word: string                    // término en inglés (front receptivo)
  translation: string             // traducción al español (front productivo)
  partOfSpeech: PartOfSpeech
  phonetic?: string               // /juːˈbɪkwɪtəs/
  example: string                 // frase natural en inglés que usa la palabra
  exampleTranslation?: string     // traducción de la frase
  cefr?: CefrLevel                // nivel estimado por IA
  synonyms?: string[]             // opcional, refuerzo
  notes?: string                  // nota personal de Jorge

  status: WordStatus
  source: 'manual' | 'ai' | 'telegram'

  srs: SrsState                   // estado SM-2 (lib/srs.ts) — receptivo por ahora
  lapses: number                  // nº de 'again' acumulados (para leech)
  reviewHistory: { date: string; grade: 'again' | 'good' | 'easy'; dir: 'recv' | 'prod' }[]

  learnedAt?: string              // ISO: 1er acierto (cuenta para meta semanal)
  masteredAt?: string            // ISO: alcanzó intervalo ≥ 21d (dominada)
  createdAt: string
  updatedAt: string               // last-write-wins en sync
  deletedAt?: string | null       // tombstone
}
```

**Extensión futura (no en v1):** `srsProductive?: SrsState` para SRS dual
receptivo/productivo independiente. El campo `reviewHistory[].dir` ya deja
constancia de la dirección desde el día 1.

### 4.2 localStorage

```
Clave:  vocab_data_en
Valor:  { items: VocabWord[], updatedAt: string }
```

Mismo patrón aditivo y tolerante a fallos que `sector_data_<id>`
(ver [`learningsSync.ts`](../features/learning/services/learningsSync.ts)).

### 4.3 Tabla Supabase `vocabulary` (migración)

Clon del patrón de `learnings` (id de cliente, LWW por `updated_at`, tombstone,
RLS pública modo sin login). Ver `docs/migrations/2026_07_vocabulary.sql` (se
crea en la Fase 2).

```sql
create table if not exists vocabulary (
  id text primary key,
  lang text not null default 'en',
  word text not null,
  translation text,
  part_of_speech text,
  phonetic text,
  example text,
  example_translation text,
  cefr text,
  synonyms text[] default '{}',
  notes text,
  status text default 'new',
  source text default 'manual',
  srs jsonb,
  lapses int default 0,
  review_history jsonb default '[]',
  learned_at timestamptz,
  mastered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
create index if not exists idx_vocab_lang on vocabulary(lang);
create index if not exists idx_vocab_updated on vocabulary(updated_at);
alter table vocabulary enable row level security;
drop policy if exists public_all_vocabulary on vocabulary;
create policy public_all_vocabulary on vocabulary for all using (true) with check (true);
```

---

## 5. Capas y estructura de archivos

```
features/idiomas/
  types.ts                       # VocabWord, enums
  services/
    vocabStorage.ts              # read/write localStorage (CRUD + selección de cola)
    vocabSync.ts                 # espejo de learningsSync.ts (push+pull, LWW)
    vocabStats.ts                # KPIs: semana, día, racha, dominadas, due count
  hooks/
    useVocab.ts                  # estado reactivo + escucha evento 'vocab-synced'
    useVocabSession.ts           # motor de la sesión de práctica (cola, grading)
  components/
    AddWordSheet.tsx             # "Apunta palabra": input + autocompletar IA + revisar
    VocabCard.tsx                # tarjeta flip (recv/prod) + cloze
    PracticeSession.tsx          # sesión de práctica (again/good/easy + previews)
    WeeklyRing.tsx               # anillo 20/semana + mini-meta diaria 3
    VocabList.tsx                # lista/búsqueda/filtros (nivel, estado)
    LeechDrawer.tsx              # cajón "Atascadas"

app/idiomas/
  page.tsx                       # tablero + lista + accesos (Apuntar / Practicar)
  practica/page.tsx              # sesión de práctica a pantalla (mobile-first)

app/api/idiomas/
  generate/route.ts             # POST { word } -> tarjeta generada por brain-server
  sync/route.ts                  # POST { items } -> upsert + pull (clon de learnings/sync)

lib/agent/tools.ts               # + tool 'add_vocab_word' (Fase 2)
shared/locales/{es,en}.ts        # claves i18n nuevas (namespace 'idiomas')
shared/components/MobileBottomNav.tsx  # (opcional) entrada a /idiomas
features/stats/components/HomeDashboard.tsx  # StatCard de vocabulario semanal
shared/contexts/AppContext.tsx   # AppSettings += { vocabDailyGoal, vocabWeeklyGoal, learningLanguages }
```

**Reutilización directa (sin reescribir):**
- `lib/srs.ts` → `initSrs`, `reviewSrs`, `isDue`, `daysUntilDue`.
- Patrón de `lib/review.ts::applyReview` → adaptado a `applyVocabReview`.
- Patrón de `features/learning/services/learningsSync.ts` → `vocabSync.ts`.
- `lib/brain.ts::brainComplete` → generación de tarjetas.
- `features/stats/components/HomeDashboard.tsx` `StatCard` → tarjeta de vocabulario.

---

## 6. Motor de práctica

### 6.1 Selección de la cola diaria (`getTodayQueue`)

```
1. DUE   = palabras con isDue(srs, now) === true y status != 'leech'
2. NEW   = palabras status 'new' (nunca practicadas), hasta `vocabDailyGoal` (3)
           priorizando las que Jorge apuntó manualmente (source != 'ai-bulk')
3. Cola  = [...DUE, ...NEW]  (vencidas primero; nunca se acumulan leeches)
```

Las leeches NO entran en la cola normal; viven en el cajón "Atascadas".

### 6.2 Dirección (receptivo/productivo)

- `reps` 0–1 → **receptivo** (ver `word` → recordar `translation`). Más fácil, fija
  el reconocimiento.
- `reps` ≥ 2 → **productivo** (ver `translation` → recordar `word`). Exige recall
  real. Se registra `dir: 'prod'` en `reviewHistory`.

### 6.3 Modos de tarjeta

- **Flip** (por defecto): cara A (según dirección) → "mostrar" → cara B con
  traducción + ejemplo + fonética → botones `otra vez / bien / fácil`.
- **Cloze**: la frase de ejemplo con la palabra oculta (`He was ____ about the
  result.`) → recordar la palabra → revelar. (Recomendado por la investigación.)

Los botones muestran el **próximo intervalo** usando `reviewSrs(...).intervalDays`
con `intervalLabel` (mismo patrón que [`app/repaso/hoy`](../app/repaso/hoy/page.tsx)).

### 6.4 Grading y persistencia (`applyVocabReview`)

Adaptación de `lib/review.ts::applyReview`:
- Calcula `newSrs = reviewSrs(prev, grade, now)`.
- Si `grade === 'again'` → `lapses++`; si `lapses >= leechThreshold (8)` →
  `status = 'leech'`.
- Primer acierto (`good`/`easy` y `learnedAt` vacío) → `learnedAt = now`
  (cuenta para la meta semanal).
- Si `newSrs.intervalDays >= 21` y `masteredAt` vacío → `masteredAt = now`,
  `status = 'known'`.
- `updatedAt = now` (para LWW) y dispara sync.

### 6.5 Tratamiento de leeches

En "Atascadas": botón **"Dame una pista"** → la IA genera mnemotecnia + un
ejemplo nuevo más simple; al acertarla 2 veces seguidas, `lapses` se reduce y
vuelve a la rotación.

---

## 7. Generación con IA (brain-server, sin coste de API)

`POST /api/idiomas/generate` con `{ word }`. Server-side llama a
[`brainComplete`](../lib/brain.ts) con `json: true`:

**Prompt (system):** experto lexicógrafo ES/EN. Devuelve SOLO JSON con:
`{ word, translation, partOfSpeech, phonetic, example, exampleTranslation,
cefr, synonyms[] }`. Reglas: ejemplo natural y útil que **muestre el matiz** de la
palabra; nivel CEFR honesto; si la palabra es A1–B1, marcar `cefr` correcto para
que el cliente avise "demasiado básica".

**Validación cliente:** se valida el JSON (Zod o validación manual estilo
[`lib/validate.ts`](../lib/validate.ts)); Jorge **revisa y edita** antes de
guardar (decisión: IA con revisión). Si `cefr ∈ {A1,A2,B1}` → aviso no bloqueante.

**Fallback:** si el brain-server no está configurado/responde, el formulario
permite alta manual.

---

## 8. UI / pantallas (mobile-first, prioridad de Jorge)

### `/idiomas` (tablero)
- Cabecera: **WeeklyRing** (X/20 esta semana) + mini-meta diaria (●●○ = 2/3) +
  racha + nº dominadas + nº vencidas hoy.
- CTA grande: **"Practicar"** (lleva a `/idiomas/practica`).
- CTA secundario: **"+ Apunta palabra"** (abre `AddWordSheet`).
- Lista con búsqueda y filtros (nivel CEFR, estado, idioma) + acceso a "Atascadas".

### `/idiomas/practica`
- Sesión a pantalla completa (oculta bottom-nav, como `/repaso`). Tarjeta + 3
  botones con previsualización de intervalos. Barra de progreso de la sesión.
- Al terminar: resumen (aciertos, nuevas aprendidas hoy, racha).

### "Apunta palabra" (Sheet)
- Disponible desde `/idiomas` y como acceso rápido global (botón flotante en home
  o atajo). Flujo: escribe la palabra → "Generar" → IA rellena → revisa/edita →
  Guardar. Queda `dueDate = now` → aparece hoy en la práctica.

### Home + Perfil
- **HomeDashboard:** nueva `StatCard` "Vocabulario (7d): X/20" con `href="/idiomas"`.
- **SettingsModal / Perfil:** "Idiomas que aprendo: 🇬🇧 Inglés" + objetivo
  diario/semanal configurables (`AppSettings`).

---

## 9. Seguimiento y métricas (`vocabStats.ts`)

- **Semana:** `learnedAt` dentro de la semana ISO actual → cuenta para 20/sem.
- **Día:** `learnedAt` hoy → mini-meta de 3.
- **Racha:** se integra con `shared/utils/gamification.ts` alimentando las fechas
  de práctica de vocabulario al cálculo unificado (no una racha separada).
- **Dominadas:** `status === 'known'` (intervalo ≥ 21d).
- **Vencidas hoy:** `isDue(srs, now)`.
- Persistencia de objetivos en `AppSettings` (`vocabWeeklyGoal=20`,
  `vocabDailyGoal=3`, `leechThreshold=8`).

> Decisión sobre la meta semanal: se cuenta **"palabra aprendida"** = recordada
> correctamente por primera vez esa semana (no solo "añadida"). Es realista para
> ~3/día y mide aprendizaje, no acumulación. "Dominadas" queda como marcador
> lifetime de prestigio. Ambos umbrales son configurables.

---

## 10. Integración con Telegram (Fase 2)

Nueva tool `add_vocab_word` en [`lib/agent/tools.ts`](../lib/agent/tools.ts)
(misma forma que `create_learning`): Jorge dice *"apunta ubiquitous"* → el handler
llama internamente a la generación IA + inserta en `vocabulary`. Así caza palabras
desde el móvil sin abrir la app; al sincronizar aparecen en la práctica.

---

## 11. Plan por fases (con criterios de aceptación)

### Fase 1 — Núcleo local (práctica + apuntar + métricas)
1. `types.ts` + `vocabStorage.ts` (CRUD, cola diaria, leech).
2. `/api/idiomas/generate` + `AddWordSheet` (IA con revisión, aviso CEFR).
3. `applyVocabReview` + `PracticeSession` + `VocabCard` (flip + cloze, 2 direcciones).
4. `/idiomas` tablero + `WeeklyRing` + `VocabList` + `/idiomas/practica`.
5. `vocabStats.ts` + `StatCard` en HomeDashboard + entrada en Perfil/Settings.
6. i18n (`idiomas.*`) y, opcional, entrada en MobileBottomNav.

**Aceptación Fase 1:** Jorge apunta una palabra (IA la completa, él la edita y
guarda); aparece hoy en "Practicar"; al recordarla suma a la meta semanal; el
intervalo crece; el home muestra X/20; todo persiste tras recargar. `npm run build`
y `npm test` en verde.

### Fase 2 — Sincronización cross-device + Telegram
7. Migración `vocabulary` + `/api/idiomas/sync` + `vocabSync.ts` (LWW, tombstone).
8. Disparo de sync en los mismos puntos que learnings.
9. Tool `add_vocab_word` en el agente + prueba por Telegram.

**Aceptación Fase 2:** una palabra apuntada en el móvil aparece en el PC (y
viceversa) tras sync; "apunta X" por Telegram crea la tarjeta.

### Fase 3 — Mejoras (backlog)
- SRS dual receptivo/productivo (`srsProductive`).
- ✅ **Audio TTS** (hecho): `features/idiomas/hooks/useSpeak.ts` (Web Speech API, voz
  inglesa en-GB/en-US, ritmo 0.92). Botón de pronunciar en la tarjeta de práctica
  (palabra + ejemplo), en la lista y en el alta/edición. En productivo no se ofrece
  antes de revelar para no dar la respuesta.
- Migración opcional a FSRS.
- Multi-idioma (francés, etc.) reutilizando `lang`.
- Importación masiva desde una lista (Oxford 5000) como banco opcional.

---

## 12. Riesgos y decisiones abiertas

- **Calidad del ejemplo IA:** mitigado con revisión humana + regenerar.
- **Coste/latencia brain-server:** timeout 120s ya contemplado; alta manual como
  fallback.
- **Doble fuente de verdad (local vs Supabase):** se replica exactamente la
  estrategia LWW ya probada en `learnings` (riesgo conocido y acotado).
- **Meta semanal demasiado dura/fácil:** umbrales configurables; ajustables tras
  uso real.

---

## 13. Fuentes de la investigación

- [FSRS vs SM-2 (DeckStudy, 2026)](https://deckstudy.com/blog/fsrs-vs-sm2-modern-spaced-repetition)
- [Spaced repetition para idiomas (Migaku, 2026)](https://migaku.com/blog/language-fun/spaced-repetition-for-language-learners-a-2026-guide)
- [Por qué el contexto es crítico (Clozemaster)](https://www.clozemaster.com/blog/problem-with-single-word-flashcards-context-critical-in-language-learning/)
- [Leeches (Anki Manual)](https://docs.ankiweb.net/leeches.html)
- [Cuántas tarjetas/día (Speakada)](https://speakada.com/how-many-anki-cards-per-day-should-i-do-to-be-fluent-in-a-language/)
- [Oxford 5000 por nivel CEFR (PDF)](https://www.oxfordlearnersdictionaries.com/external/pdf/wordlists/oxford-3000-5000/The_Oxford_5000_by_CEFR_level.pdf)
