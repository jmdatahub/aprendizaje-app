-- =====================================================================
-- VOCABULARY SYNC — sincronización del vocabulario de idiomas entre dispositivos
--
-- El vocabulario vive en localStorage (`vocab_data_<lang>`). Esta tabla es el
-- espejo en Supabase para sincronizar entre móvil y ordenador.
-- Clave = el `id` generado por el cliente (texto), para que el upsert sea
-- idempotente. Resolución de conflictos: last-write-wins por `updated_at`.
-- Borrados = tombstone (`deleted_at`). RLS pública (modo sin login), igual que
-- el resto de tablas de la app.
--
-- Espejo de docs/migrations/2026_06_learnings_sync.sql.
-- =====================================================================

create table if not exists vocabulary (
  id text primary key,                  -- id del cliente (coincide con localStorage)
  lang text not null default 'en',      -- idioma destino ('en', extensible)
  word text,                            -- término en inglés
  translation text,                     -- traducción al español
  part_of_speech text,                  -- noun/verb/adjective/adverb/phrasal_verb/idiom/expression/other
  phonetic text,                        -- transcripción IPA
  example text,                         -- frase de ejemplo en contexto
  example_translation text,             -- traducción del ejemplo
  cefr text,                            -- nivel CEFR (A1..C2)
  synonyms text[] default '{}',         -- sinónimos
  notes text,                           -- nota personal
  status text default 'new',            -- new/learning/known/leech
  source text default 'manual',         -- manual/ai/telegram
  srs jsonb,                            -- estado SRS (repetición espaciada)
  lapses int default 0,                 -- nº de fallos acumulados (para leech)
  review_history jsonb default '[]',    -- historial de repasos
  learned_at timestamptz,               -- 1er acierto (cuenta para meta semanal)
  mastered_at timestamptz,              -- alcanzó intervalo >= 21 días
  created_at timestamptz default now(),
  updated_at timestamptz default now(), -- se actualiza en cada cambio (para LWW)
  deleted_at timestamptz                -- tombstone de borrado
);

create index if not exists idx_vocabulary_lang on vocabulary(lang);
create index if not exists idx_vocabulary_updated on vocabulary(updated_at);

alter table vocabulary enable row level security;
drop policy if exists public_all_vocabulary on vocabulary;
create policy public_all_vocabulary on vocabulary for all using (true) with check (true);
