-- ============================================================
-- MIGRACIÓN 15: Opción de uso múltiple por usuario y campañas de cupones
-- ============================================================

ALTER TABLE cupones ADD COLUMN IF NOT EXISTS es_multiuso_usuario BOOLEAN DEFAULT FALSE;
