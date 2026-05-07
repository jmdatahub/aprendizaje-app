-- =====================================================
-- INDEX MIGRATION — performance for current query patterns
-- Apply once in: Supabase Dashboard > SQL Editor
-- Safe to re-run (uses IF NOT EXISTS).
-- =====================================================

-- aprendizajes: GET /api/aprendizajes filters by deleted_at IS NULL and orders by created_at DESC.
-- Partial index keeps the index small (only live rows) and lets PG skip the trash.
CREATE INDEX IF NOT EXISTS idx_aprendizajes_live_created
  ON aprendizajes (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_aprendizajes_trash_deleted
  ON aprendizajes (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

-- habilidades: same pattern + orders by updated_at.
CREATE INDEX IF NOT EXISTS idx_habilidades_live_updated
  ON habilidades (updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_habilidades_trash_deleted
  ON habilidades (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

-- sesiones_practica: queried by habilidad_id, ordered by fecha DESC.
CREATE INDEX IF NOT EXISTS idx_sesiones_habilidad_fecha
  ON sesiones_practica (habilidad_id, fecha DESC);

-- chat_mensajes: queried by chat_id, ordered by created_at.
-- The new "last 16 messages" pattern especially benefits from this.
CREATE INDEX IF NOT EXISTS idx_chat_mensajes_chat_created
  ON chat_mensajes (chat_id, created_at DESC);

-- chats: list ordered by created_at desc.
CREATE INDEX IF NOT EXISTS idx_chats_created
  ON chats (created_at DESC);

-- habits: filtered by telegram_chat_id (cron + bot).
CREATE INDEX IF NOT EXISTS idx_habits_telegram_chat_id
  ON habits (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- habit_logs: looked up by (habit_id, completed_at) pair (toggle/check).
-- Unique to enforce idempotency, also fast lookups.
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_unique
  ON habit_logs (habit_id, completed_at);

-- recordatorios: cron filters by (dia_semana, active=true).
CREATE INDEX IF NOT EXISTS idx_recordatorios_dia_active
  ON recordatorios (dia_semana, hora)
  WHERE active = true;

-- exam_history: GET orders by created_at desc.
CREATE INDEX IF NOT EXISTS idx_exam_history_created
  ON exam_history (created_at DESC);

-- =====================================================
-- VACUUM / ANALYZE after big index creation is recommended
-- but Supabase auto-handles this; run manually if needed:
--   ANALYZE aprendizajes; ANALYZE habilidades; ...
-- =====================================================
