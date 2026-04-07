-- Migración: Agregar campos empresa y respondedor
-- No elimina datos, solo agrega columnas nuevas

-- Agregar columnas a usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa VARCHAR(200);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS respondedor VARCHAR(200);

-- Agregar columnas a invitaciones
ALTER TABLE invitaciones ADD COLUMN IF NOT EXISTS empresa VARCHAR(200);
ALTER TABLE invitaciones ADD COLUMN IF NOT EXISTS respondedor VARCHAR(200);

-- Agregar columna rol a invitaciones (si no existe ya)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitaciones' AND column_name = 'rol'
  ) THEN
    ALTER TABLE invitaciones ADD COLUMN rol rol_type NOT NULL DEFAULT 'usuario';
  END IF;
END $$;
