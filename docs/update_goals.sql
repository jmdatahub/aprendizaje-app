-- Añadir columna para objetivo semanal (en minutos)
ALTER TABLE habilidades ADD COLUMN objetivo_semanal_minutos INTEGER DEFAULT NULL;

-- Ejemplo: Establecer meta de 3 horas (180 min) para una habilidad
-- UPDATE habilidades SET objetivo_semanal_minutos = 180 WHERE id = '...';
