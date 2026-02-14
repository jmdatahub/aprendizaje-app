-- =====================================================
-- HABITS: Migración SQL para Supabase (Habit Tracker v3)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================

-- Tabla principal de hábitos
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  text text not null,
  category text default 'other',
  streak integer default 0,
  -- Configuración de notificaciones
  with_notification boolean default true,
  notification_time text, -- Deprecated, solo para backwards compat
  notification_times text[], -- Array de horas "HH:MM"
  custom_message text,
  -- Bot Integration
  telegram_chat_id text, -- ID de chat para el bot
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabla de logs de hábitos (completados)
-- Es más eficiente tener una tabla separada que un array gigante en `habits`
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade,
  completed_at date not null, -- Guardamos solo la fecha YYYY-MM-DD
  created_at timestamp with time zone default now(),
  unique(habit_id, completed_at) -- Evitar duplicados por día
);

-- Índices
create index if not exists idx_habits_user on habits(user_id);
create index if not exists idx_habits_chat_id on habits(telegram_chat_id);
create index if not exists idx_habit_logs_habit on habit_logs(habit_id);
create index if not exists idx_habit_logs_date on habit_logs(completed_at);

-- RLS (Row Level Security)
alter table habits enable row level security;
alter table habit_logs enable row level security;

-- =====================================================
-- POLÍTICAS PUBLICAS (Modo sin login estricto)
-- =====================================================

-- Habits
create policy "Public access habits"
  on habits for all
  using (true)
  with check (true);

-- Logs
create policy "Public access habit_logs"
  on habit_logs for all
  using (true)
  with check (true);

-- Trigger para updated_at
create trigger update_habits_updated_at
  before update on habits
  for each row
  execute function update_updated_at_column();
