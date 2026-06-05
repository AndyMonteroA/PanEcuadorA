-- ============================================================
-- ÍNDICES DE RENDIMIENTO — PanEcuador
-- ============================================================

-- Productos
CREATE INDEX idx_productos_categoria    ON productos(id_categoria);
CREATE INDEX idx_productos_productor    ON productos(id_productor);
CREATE INDEX idx_productos_disponible   ON productos(disponible);
CREATE INDEX idx_productos_precio       ON productos(precio);
CREATE INDEX idx_productos_complejidad  ON productos(complejidad);
CREATE INDEX idx_productos_vencimiento  ON productos(fecha_vencimiento_stock);

-- Pedidos
CREATE INDEX idx_pedidos_usuario        ON pedidos(id_usuario);
CREATE INDEX idx_pedidos_estado         ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha          ON pedidos(fecha_pedido);
CREATE INDEX idx_pedidos_entrega        ON pedidos(fecha_entrega_programada);

-- Detalle pedido
CREATE INDEX idx_detalle_pedido         ON detalle_pedido(id_pedido);

-- Carrito
CREATE INDEX idx_carrito_usuario        ON carrito(id_usuario);

-- Búsqueda
CREATE INDEX idx_busqueda_usuario       ON historial_busqueda(id_usuario);
CREATE INDEX idx_busqueda_fecha         ON historial_busqueda(fecha);

-- Notificaciones
CREATE INDEX idx_notif_usuario_leida    ON notificaciones(id_usuario, leida);

-- Suscripciones
CREATE INDEX idx_suscripcion_usuario    ON suscripciones_usuario(id_usuario);
CREATE INDEX idx_suscripcion_estado     ON suscripciones_usuario(estado);

-- Favoritos
CREATE INDEX idx_favoritos_usuario      ON favoritos(id_usuario);

-- Reseñas
CREATE INDEX idx_resenas_producto       ON reseñas(id_producto);

-- Alertas producto
CREATE INDEX idx_alertas_producto       ON alertas_producto(id_producto, notificado);

-- Turnos
CREATE INDEX idx_asignacion_fecha       ON asignacion_turnos(fecha);
CREATE INDEX idx_asignacion_trabajador  ON asignacion_turnos(id_trabajador);

-- Búsqueda full-text en productos (PostgreSQL específico)
CREATE INDEX idx_productos_nombre_text  ON productos USING gin(to_tsvector('spanish', nombre));
