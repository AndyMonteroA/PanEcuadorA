-- ============================================================
-- MIGRACIÓN 08: Portal de Trabajadores y Cocina
-- PanEcuador
-- Ejecutar: sudo -u postgres psql -d panaderia_db -f 08_worker_portal.sql
-- ============================================================

-- 1. Modificar restricción de roles en la tabla usuarios para incluir 'trabajador'
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS check_rol;
ALTER TABLE usuarios ADD CONSTRAINT check_rol CHECK (rol IN ('cliente', 'admin', 'productor', 'trabajador'));

-- 2. Vincular tabla trabajadores a usuarios
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

-- 3. Agregar estado de elaboración a cada producto del pedido (cola de preparación)
ALTER TABLE detalle_pedido ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'pendiente' 
  CHECK (estado IN ('pendiente', 'preparando', 'completado'));

-- 4. Dar permisos sobre todo a admin_pan
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_pan;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_pan;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO admin_pan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin_pan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin_pan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO admin_pan;
