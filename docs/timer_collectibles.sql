-- =====================================================
-- FOCUS TIMER: Gamificación y Coleccionables
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================

-- Tabla para guardar el progreso y desbloqueables del timer
create table if not exists focus_timer_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_minutes_focused bigint default 0,
  unlocked_skins text[] default array['coffee-cup'], -- Skins desbloqueadas por ID
  current_skin text default 'coffee-cup',
  sessions_completed integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table focus_timer_data enable row level security;

-- Políticas de acceso (Simulando acceso público si no hay auth, como en el resto de la app)
drop policy if exists "Public access focus_timer_data" on focus_timer_data;

create policy "Public access focus_timer_data"
  on focus_timer_data for all
  using (true)
  with check (true);

-- Insertar fila inicial para el usuario actual (opcional, se puede manejar desde el código)
-- Nota: En esta app el user_id puede ser nulo para invitados, pero aquí usamos una tabla persistente.
-- Si se usa sin login, se puede usar un user_id '00000000-0000-0000-0000-000000000000'.

-- Trigger para updated_at
drop trigger if exists update_focus_timer_data_updated_at on focus_timer_data;
create trigger update_focus_timer_data_updated_at
  before update on focus_timer_data
  for each row
  execute function update_updated_at_column();
