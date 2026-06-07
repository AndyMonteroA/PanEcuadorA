-- ============================================================
-- MIGRACIÓN 05: Vincular trabajadores a productores
-- ============================================================

-- Agregar campo id_productor a trabajadores
ALTER TABLE trabajadores
ADD COLUMN id_productor INT REFERENCES productores(id_productor) ON DELETE SET NULL;

-- Comentario descriptivo
COMMENT ON COLUMN trabajadores.id_productor IS 'Productor (panadería) al que pertenece el trabajador';
