-- ============================================================
-- MIGRACIÓN: Agregar roles de usuario y usuario administrador
-- PanEcuador — Panel de Administración
-- ============================================================

-- 1. Agregar columna 'rol' a la tabla usuarios y su restricción
ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'cliente';

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS check_rol;
ALTER TABLE usuarios ADD CONSTRAINT check_rol CHECK (rol IN ('cliente', 'admin', 'productor'));

-- 2. Crear usuario administrador por defecto
-- Contraseña: Admin2026! (hash bcrypt)
-- NOTA: Este hash corresponde a 'Admin2026!' generado con bcrypt (10 rounds)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES (
  'Administrador',
  'PanEcuador',
  'admin@panecuador.online',
  '$2a$10$opc3.VBbGeKK0upMt6jOcuNeLpxXaJ9F8eTfPo9nCkvPaZG8piF5O',
  '0999999999',
  'admin'
);
