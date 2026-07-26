-- ============================================================
-- MIGRACIÓN 12: Tabla para suscripciones de alerta de stock (Próxima Hornada)
-- ============================================================

CREATE TABLE IF NOT EXISTS suscripciones_stock (
    id_suscripcion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_usuario, id_producto)
);
