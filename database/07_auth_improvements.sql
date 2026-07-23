-- ============================================================
-- MIGRACIÓN 07: Password Reset Tokens + Google OAuth Support
-- Ejecutar: psql -U panecuador_user -d panaderia_db -f 07_auth_improvements.sql
-- ============================================================

-- 1. Tabla para tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_usuario ON password_reset_tokens(id_usuario);

-- 2. Soporte para Google OAuth (login social)
-- Agregar google_id para vincular cuentas de Google
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Permitir password_hash NULL (usuarios que solo usan Google)
ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
