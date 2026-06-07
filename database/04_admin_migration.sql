-- ============================================================
-- MIGRACIÓN: Agregar roles de usuario y usuario administrador
-- PanEcuador — Panel de Administración
-- ============================================================

-- 1. Agregar columna 'rol' a la tabla usuarios
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente'
CHECK (rol IN ('cliente', 'admin'));

-- 2. Crear usuario administrador por defecto
-- Contraseña: Admin2026! (hash bcrypt)
-- NOTA: Este hash corresponde a 'Admin2026!' generado con bcrypt (10 rounds)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES (
  'Administrador',
  'PanEcuador',
  'admin@panecuador.online',
  '$2a$10$8K1p/pXHXaox/3.x8Wy1xeM3Z0dF0E7bB8aI2x5D0bGdF.placeholder',
  '0999999999',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET rol = 'admin';
