-- ============================================================
-- MIGRACIÓN 10: Flujo de Reposición y Producción Interna (KDS)
-- PanEcuador
-- ============================================================

CREATE TABLE IF NOT EXISTS tareas_produccion (
    id_tarea          SERIAL PRIMARY KEY,
    id_producto       INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    id_productor      INT NOT NULL REFERENCES productores(id_productor) ON DELETE CASCADE,
    cantidad          INT NOT NULL CHECK (cantidad > 0),
    estado            VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'preparando', 'completado')),
    id_trabajador     INT REFERENCES trabajadores(id_trabajador) ON DELETE SET NULL,
    fecha_creacion    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_completado  TIMESTAMP
);

-- Permisos al usuario admin_pan
GRANT ALL PRIVILEGES ON TABLE tareas_produccion TO admin_pan;
GRANT ALL PRIVILEGES ON SEQUENCE tareas_produccion_id_tarea_seq TO admin_pan;
