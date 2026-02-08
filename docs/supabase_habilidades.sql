-- =====================================================
-- HABILIDADES: Migración SQL para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================

-- Tabla principal de habilidades
create table if not exists habilidades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nombre text not null,
  categoria text,
  descripcion text,
  guia_generada text,
  tiempo_total_segundos integer default 0,
  nivel text default 'novato',
  experiencia_previa text default 'ninguna',
  deleted_at timestamp with time zone default null, -- Para soft delete (papelera)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabla de sesiones de práctica
create table if not exists sesiones_practica (
  id uuid primary key default gen_random_uuid(),
  habilidad_id uuid references habilidades(id) on delete cascade,
  duracion_segundos integer not null,
  resumen text,
  fecha timestamp with time zone default now()
);

-- Índices para mejor rendimiento
create index if not exists idx_habilidades_user on habilidades(user_id);
create index if not exists idx_sesiones_habilidad on sesiones_practica(habilidad_id);

-- RLS (Row Level Security)
alter table habilidades enable row level security;
alter table sesiones_practica enable row level security;

-- =====================================================
-- POLÍTICAS PARA ACCESO PÚBLICO (sin autenticación)
-- Esto permite que la app funcione sin login
-- =====================================================

-- Eliminar políticas anteriores si existen
drop policy if exists "Users can view own habilidades" on habilidades;
drop policy if exists "Users can insert own habilidades" on habilidades;
drop policy if exists "Users can update own habilidades" on habilidades;
drop policy if exists "Users can delete own habilidades" on habilidades;
drop policy if exists "Users can view own sesiones" on sesiones_practica;
drop policy if exists "Users can insert own sesiones" on sesiones_practica;
drop policy if exists "Public access habilidades" on habilidades;
drop policy if exists "Public access sesiones" on sesiones_practica;

-- Políticas de acceso público (sin restricción de usuario)
create policy "Public access habilidades"
  on habilidades for all
  using (true)
  with check (true);

create policy "Public access sesiones"
  on sesiones_practica for all
  using (true)
  with check (true);

-- Trigger para actualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_habilidades_updated_at on habilidades;

create trigger update_habilidades_updated_at
  before update on habilidades
  for each row
  execute function update_updated_at_column();
