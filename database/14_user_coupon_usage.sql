-- ============================================================
-- MIGRACIÓN 14: Restricción de 1 solo uso de cupón por usuario
-- ============================================================

CREATE TABLE IF NOT EXISTS uso_cupones_usuario (
    id_uso SERIAL PRIMARY KEY,
    id_cupon INT NOT NULL REFERENCES cupones(id_cupon) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_pedido INT REFERENCES pedidos(id_pedido) ON DELETE SET NULL,
    fecha_uso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_cupon, id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_uso_cupones_usuario ON uso_cupones_usuario(id_cupon, id_usuario);
