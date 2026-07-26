-- ============================================================
-- MIGRACIÓN 13: Tabla para Historial de Eventos de Pedido (Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS historial_pedidos (
    id_historial SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    estado VARCHAR(30) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    actor_rol VARCHAR(30) DEFAULT 'sistema', -- 'cliente', 'admin', 'productor', 'trabajador', 'sistema'
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_historial_pedidos_pedido ON historial_pedidos(id_pedido);
