-- ============================================================
-- RLS Migration for encuestas_zener database
-- ============================================================
-- Run as superuser on the encuestas_zener DB.
--
-- This script enables RLS on key tables and creates policies
-- for admin access and user-scoped access.
--
-- The existing role (EVyqGzlJ9ypHyOsuALes or similar) is NOT
-- a superuser, so RLS policies WILL be enforced.
-- ============================================================

-- Replace with the actual app role name used in .env
-- Check with: SELECT current_user; or look at PG_USER in .env
-- \set app_role 'EVyqGzlJ9ypHyOsuALes'

-- Step 1: Enable RLS on key tables
ALTER TABLE formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_formulario ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_respuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE borradores_respuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_formulario ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;

-- Tables left without RLS (global reference data or auth-only):
-- usuarios, invitaciones, campos_plantilla, refresh_tokens, notificaciones, recordatorios_enviados

-- Step 2: Create RLS policies
-- Replace 'app_role_here' with the actual PostgreSQL role name
-- used by the encuestas-zener application (from PG_USER in .env)

-- ============================================================
-- FORMULARIOS
-- ============================================================

-- Admin can do everything
CREATE POLICY admin_all_formularios ON formularios FOR ALL TO app_role_here
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- Users see forms they created or that are assigned to them
CREATE POLICY user_formularios ON formularios FOR SELECT TO app_role_here
  USING (
    creado_por = current_setting('app.user_id', true)::int
    OR EXISTS (
      SELECT 1 FROM asignaciones_formulario af
      WHERE af.formulario_id = formularios.id
      AND af.proveedor_id = current_setting('app.user_id', true)::int
    )
  );

-- Users can insert forms
CREATE POLICY insert_formularios ON formularios FOR INSERT TO app_role_here
  WITH CHECK (
    creado_por = current_setting('app.user_id', true)::int
  );

-- Users can update forms they created
CREATE POLICY update_formularios ON formularios FOR UPDATE TO app_role_here
  USING (
    creado_por = current_setting('app.user_id', true)::int
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- ============================================================
-- ASIGNACIONES_FORMULARIO
-- ============================================================

CREATE POLICY admin_all_asignaciones ON asignaciones_formulario FOR ALL TO app_role_here
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- Users see their own assignments
CREATE POLICY user_asignaciones ON asignaciones_formulario FOR SELECT TO app_role_here
  USING (
    proveedor_id = current_setting('app.user_id', true)::int
    OR EXISTS (
      SELECT 1 FROM formularios f
      WHERE f.id = asignaciones_formulario.formulario_id
      AND f.creado_por = current_setting('app.user_id', true)::int
    )
  );

-- Users can update their own assignments (e.g., mark complete)
CREATE POLICY update_asignaciones ON asignaciones_formulario FOR UPDATE TO app_role_here
  USING (
    proveedor_id = current_setting('app.user_id', true)::int
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- ============================================================
-- RESPUESTAS_FORMULARIO
-- ============================================================

CREATE POLICY admin_all_respuestas ON respuestas_formulario FOR ALL TO app_role_here
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- Users see their own responses and responses to their forms
CREATE POLICY user_respuestas ON respuestas_formulario FOR SELECT TO app_role_here
  USING (
    proveedor_id = current_setting('app.user_id', true)::int
    OR EXISTS (
      SELECT 1 FROM formularios f
      WHERE f.id = respuestas_formulario.formulario_id
      AND f.creado_por = current_setting('app.user_id', true)::int
    )
  );

-- Users can insert their own responses
CREATE POLICY insert_respuestas ON respuestas_formulario FOR INSERT TO app_role_here
  WITH CHECK (
    proveedor_id = current_setting('app.user_id', true)::int
  );

-- ============================================================
-- VALORES_RESPUESTA
-- ============================================================

CREATE POLICY admin_all_valores ON valores_respuesta FOR ALL TO app_role_here
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- Users see values for their own responses
CREATE POLICY user_valores ON valores_respuesta FOR SELECT TO app_role_here
  USING (
    EXISTS (
      SELECT 1 FROM respuestas_formulario rf
      WHERE rf.id = valores_respuesta.respuesta_id
      AND (rf.proveedor_id = current_setting('app.user_id', true)::int
           OR EXISTS (
             SELECT 1 FROM formularios f
             WHERE f.id = rf.formulario_id
             AND f.creado_por = current_setting('app.user_id', true)::int
           ))
    )
  );

-- Users can insert values for their own responses
CREATE POLICY insert_valores ON valores_respuesta FOR INSERT TO app_role_here
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM respuestas_formulario rf
      WHERE rf.id = valores_respuesta.respuesta_id
      AND rf.proveedor_id = current_setting('app.user_id', true)::int
    )
  );

-- ============================================================
-- BORRADORES_RESPUESTA
-- ============================================================

CREATE POLICY admin_all_borradores ON borradores_respuesta FOR ALL TO app_role_here
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- Users see and manage only their own drafts
CREATE POLICY user_borradores ON borradores_respuesta FOR ALL TO app_role_here
  USING (
    proveedor_id = current_setting('app.user_id', true)::int
  );

-- ============================================================
-- PLANTILLAS
-- ============================================================

CREATE POLICY admin_all_plantillas ON plantillas FOR ALL TO app_role_here
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- All authenticated users can read active templates
CREATE POLICY read_active_plantillas ON plantillas FOR SELECT TO app_role_here
  USING (
    activa = true
    OR creado_por = current_setting('app.user_id', true)::int
  );

-- Users can create templates
CREATE POLICY insert_plantillas ON plantillas FOR INSERT TO app_role_here
  WITH CHECK (
    creado_por = current_setting('app.user_id', true)::int
  );

-- Users can update templates they created
CREATE POLICY update_plantillas ON plantillas FOR UPDATE TO app_role_here
  USING (
    creado_por = current_setting('app.user_id', true)::int
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = current_setting('app.user_id', true)::int
      AND rol = 'admin'
    )
  );

-- ============================================================
-- Verification queries (run after applying)
-- ============================================================
-- Check RLS is enabled:
--   SELECT relname, relrowsecurity FROM pg_class WHERE relrowsecurity = true;
--
-- Test as app role:
--   SET ROLE app_role_here;
--   SET app.user_id = '1';
--   SELECT * FROM formularios;
--   RESET ROLE;
-- ============================================================
