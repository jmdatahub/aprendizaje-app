-- Tabla de Recordatorios
CREATE TABLE recordatorios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habilidad_id UUID REFERENCES habilidades(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes, ...
  hora TIME NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida por día/hora (para el cron job)
CREATE INDEX idx_recordatorios_dia_hora ON recordatorios(dia_semana, hora);
CREATE INDEX idx_recordatorios_habilidad ON recordatorios(habilidad_id);
