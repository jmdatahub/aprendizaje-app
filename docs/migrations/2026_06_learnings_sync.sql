-- =====================================================================
-- LEARNINGS SYNC — sincronización de aprendizajes entre dispositivos
-- Aplicado y verificado el 2026-06-16 en el proyecto JM CODE.
--
-- Los aprendizajes viven en localStorage (`sector_data_<sectorId>`). Esta tabla
-- es el espejo en Supabase para sincronizar entre móvil y ordenador.
-- Clave = el `id` generado por el cliente (texto), para que el upsert sea
-- idempotente y no se dupliquen items. Resolución de conflictos: last-write-wins
-- por `updated_at`. Borrados = tombstone (`deleted_at`).
-- RLS pública (modo sin login), igual que el resto.
-- =====================================================================

create table if not exists learnings (
  id text primary key,                 -- id del cliente (coincide con localStorage)
  sector_id text not null,             -- clave de sector en texto ('health', 'tech'...)
  title text,
  summary text,
  content text,
  tags text[] default '{}',
  is_favorite boolean default false,
  personal_note text,
  srs jsonb,                           -- estado SRS (repetición espaciada)
  review_history jsonb default '[]',
  item_date timestamptz,               -- fecha original de creación (campo `date`)
  updated_at timestamptz default now(),-- se actualiza en cada cambio (para LWW)
  deleted_at timestamptz               -- tombstone de borrado
);

create index if not exists idx_learnings_sector on learnings(sector_id);
create index if not exists idx_learnings_updated on learnings(updated_at);

alter table learnings enable row level security;
drop policy if exists public_all_learnings on learnings;
create policy public_all_learnings on learnings for all using (true) with check (true);
