-- ============================================
-- Encuestas Zener Chile - Esquema de Base de Datos
-- ============================================

-- Tipos enumerados
CREATE TYPE rol_type AS ENUM ('admin', 'usuario');
CREATE TYPE campo_type AS ENUM ('texto', 'texto_largo', 'numero', 'fecha', 'seleccion_unica', 'seleccion_multiple', 'archivo');
CREATE TYPE estado_invitacion AS ENUM ('pendiente', 'registrada');
CREATE TYPE estado_formulario AS ENUM ('pendiente', 'completado', 'vencido');

-- ============================================
-- Tabla: usuarios
-- ============================================
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  rut VARCHAR(12) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  rol rol_type NOT NULL DEFAULT 'usuario',
  activo BOOLEAN NOT NULL DEFAULT true,
  empresa VARCHAR(200),
  respondedor VARCHAR(200),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso TIMESTAMP
);

CREATE INDEX idx_usuarios_rut ON usuarios(rut);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- ============================================
-- Tabla: invitaciones
-- ============================================
CREATE TABLE invitaciones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  rut VARCHAR(12) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  estado estado_invitacion NOT NULL DEFAULT 'pendiente',
  rol rol_type NOT NULL DEFAULT 'usuario',
  invitado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  empresa VARCHAR(200),
  respondedor VARCHAR(200),
  fecha_invitacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_registro TIMESTAMP
);

CREATE INDEX idx_invitaciones_token ON invitaciones(token);
CREATE INDEX idx_invitaciones_email ON invitaciones(email);
CREATE INDEX idx_invitaciones_estado ON invitaciones(estado);

-- ============================================
-- Tabla: plantillas
-- ============================================
CREATE TABLE plantillas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla: campos_plantilla
-- ============================================
CREATE TABLE campos_plantilla (
  id SERIAL PRIMARY KEY,
  plantilla_id INTEGER NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
  etiqueta VARCHAR(255) NOT NULL,
  tipo campo_type NOT NULL,
  requerido BOOLEAN NOT NULL DEFAULT false,
  opciones JSONB DEFAULT '[]'::jsonb,
  orden INTEGER NOT NULL DEFAULT 0,
  placeholder TEXT
);

CREATE INDEX idx_campos_plantilla_plantilla ON campos_plantilla(plantilla_id);
CREATE INDEX idx_campos_plantilla_orden ON campos_plantilla(plantilla_id, orden);

-- ============================================
-- Tabla: formularios
-- ============================================
CREATE TABLE formularios (
  id SERIAL PRIMARY KEY,
  plantilla_id INTEGER NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_limite TIMESTAMP,
  estado estado_formulario NOT NULL DEFAULT 'pendiente',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_formularios_plantilla ON formularios(plantilla_id);
CREATE INDEX idx_formularios_estado ON formularios(estado);

-- ============================================
-- Tabla: asignaciones_formulario
-- ============================================
CREATE TABLE asignaciones_formulario (
  id SERIAL PRIMARY KEY,
  formulario_id INTEGER NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
  proveedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado estado_formulario NOT NULL DEFAULT 'pendiente',
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_respuesta TIMESTAMP,
  UNIQUE(formulario_id, proveedor_id)
);

CREATE INDEX idx_asignaciones_formulario ON asignaciones_formulario(formulario_id);
CREATE INDEX idx_asignaciones_proveedor ON asignaciones_formulario(proveedor_id);
CREATE INDEX idx_asignaciones_estado ON asignaciones_formulario(estado);

-- ============================================
-- Tabla: respuestas_formulario
-- ============================================
CREATE TABLE respuestas_formulario (
  id SERIAL PRIMARY KEY,
  asignacion_id INTEGER NOT NULL REFERENCES asignaciones_formulario(id) ON DELETE CASCADE,
  formulario_id INTEGER NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
  proveedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_respuestas_asignacion ON respuestas_formulario(asignacion_id);
CREATE INDEX idx_respuestas_formulario ON respuestas_formulario(formulario_id);
CREATE INDEX idx_respuestas_proveedor ON respuestas_formulario(proveedor_id);

-- ============================================
-- Tabla: valores_respuesta
-- ============================================
CREATE TABLE valores_respuesta (
  id SERIAL PRIMARY KEY,
  respuesta_id INTEGER NOT NULL REFERENCES respuestas_formulario(id) ON DELETE CASCADE,
  campo_plantilla_id INTEGER NOT NULL REFERENCES campos_plantilla(id) ON DELETE CASCADE,
  valor_texto TEXT,
  valor_numero NUMERIC,
  valor_fecha DATE,
  valor_json JSONB,
  archivo_url TEXT
);

CREATE INDEX idx_valores_respuesta ON valores_respuesta(respuesta_id);
CREATE INDEX idx_valores_campo ON valores_respuesta(campo_plantilla_id);

-- ============================================
-- Tabla: borradores_respuesta
-- ============================================
CREATE TABLE borradores_respuesta (
  id SERIAL PRIMARY KEY,
  asignacion_id INTEGER NOT NULL REFERENCES asignaciones_formulario(id) ON DELETE CASCADE,
  proveedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  campo_plantilla_id INTEGER NOT NULL REFERENCES campos_plantilla(id) ON DELETE CASCADE,
  valor_texto TEXT,
  valor_numero NUMERIC,
  valor_fecha DATE,
  valor_json JSONB,
  archivo_url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(asignacion_id, campo_plantilla_id)
);

CREATE INDEX idx_borradores_asignacion ON borradores_respuesta(asignacion_id);
CREATE INDEX idx_borradores_proveedor ON borradores_respuesta(proveedor_id);

-- ============================================
-- Tabla: refresh_tokens
-- ============================================
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);

-- ============================================
-- Triggers
-- ============================================

-- Actualizar ultimo_acceso al enviar respuesta
CREATE OR REPLACE FUNCTION actualizar_ultimo_acceso()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP
  WHERE id = NEW.proveedor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ultimo_acceso
AFTER INSERT ON respuestas_formulario
FOR EACH ROW EXECUTE FUNCTION actualizar_ultimo_acceso();

-- Actualizar fecha_actualizacion de plantilla
CREATE OR REPLACE FUNCTION actualizar_plantilla_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE plantillas SET fecha_actualizacion = CURRENT_TIMESTAMP
  WHERE id = NEW.plantilla_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plantilla_actualizacion
AFTER INSERT OR UPDATE OR DELETE ON campos_plantilla
FOR EACH ROW EXECUTE FUNCTION actualizar_plantilla_timestamp();

-- Marcar formularios vencidos
CREATE OR REPLACE FUNCTION marcar_vencidos()
RETURNS VOID AS $$
BEGIN
  UPDATE asignaciones_formulario
  SET estado = 'vencido'
  WHERE estado = 'pendiente'
  AND formulario_id IN (
    SELECT id FROM formularios
    WHERE fecha_limite IS NOT NULL
    AND fecha_limite < CURRENT_TIMESTAMP
    AND estado = 'pendiente'
  );

  UPDATE formularios
  SET estado = 'vencido'
  WHERE estado = 'pendiente'
  AND fecha_limite IS NOT NULL
  AND fecha_limite < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
