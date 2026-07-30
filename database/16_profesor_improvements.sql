-- ============================================================
-- MIGRACIÓN 16: Mejoras Sugeridas por el Profesor
-- Fórmula de precios, ganancias, reposiciones, envíos, evidencia
-- ============================================================

-- 1. Nuevas columnas en productos para modelo de precios del profesor
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_compra DECIMAL(10,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS incremento_mensual DECIMAL(10,2) DEFAULT 0.10;

-- 2. Historial de cambios de precios (compra y venta)
CREATE TABLE IF NOT EXISTS historial_precios (
    id_historial SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    precio_compra_anterior DECIMAL(10,2),
    precio_compra_nuevo DECIMAL(10,2),
    precio_venta_anterior DECIMAL(10,2),
    precio_venta_nuevo DECIMAL(10,2),
    delta_compra DECIMAL(10,2) DEFAULT 0,       -- ΔC(t)
    incremento_aplicado DECIMAL(10,2) DEFAULT 0, -- I
    ganancia_unitaria DECIMAL(10,2) DEFAULT 0,   -- G(t) = PV(t) - PC(t)
    motivo VARCHAR(200),                          -- 'Incremento mensual', 'Ajuste proveedor', etc.
    actor VARCHAR(100),                           -- Quién realizó el cambio
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_historial_precios_producto ON historial_precios(id_producto);

-- 3. Pendiente de reposición al proveedor (cuando se vende por encima del stock)
CREATE TABLE IF NOT EXISTS pendiente_reposicion (
    id_pendiente SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    id_pedido INT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    cantidad_pendiente INT NOT NULL CHECK (cantidad_pendiente > 0),
    estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'solicitado', 'recibido')),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pendiente_reposicion_producto ON pendiente_reposicion(id_producto);

-- 4. Fondo de reinversión (acumula ganancias por venta)
CREATE TABLE IF NOT EXISTS fondo_reinversion (
    id_movimiento SERIAL PRIMARY KEY,
    id_pedido INT REFERENCES pedidos(id_pedido) ON DELETE SET NULL,
    id_producto INT REFERENCES productos(id_producto) ON DELETE SET NULL,
    cantidad_vendida INT NOT NULL,
    ganancia_unitaria DECIMAL(10,2) NOT NULL,
    ganancia_total DECIMAL(10,2) NOT NULL,        -- G_total = G(t) × cantidad
    tipo VARCHAR(30) DEFAULT 'venta' CHECK (tipo IN ('venta', 'reinversion', 'ajuste')),
    descripcion TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Estados de envío con evidencia (trazabilidad de entregas)
CREATE TABLE IF NOT EXISTS estados_envio (
    id_estado_envio SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    estado VARCHAR(50) NOT NULL,                   -- 'despachado', 'en_transito', 'entregado'
    descripcion TEXT,
    evidencia_url TEXT,                             -- foto o comprobante de entrega
    registrado_por VARCHAR(100),                    -- nombre del actor
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estados_envio_pedido ON estados_envio(id_pedido);

-- 6. Agregar campo de evidencia a tabla devoluciones
ALTER TABLE devoluciones ADD COLUMN IF NOT EXISTS evidencia_url TEXT;

-- 7. Reseñas de ejemplo para productos (con verificación segura de pedido)
DO $$
DECLARE
    prod RECORD;
    usuario_existente INT;
    pedido_existente INT;
BEGIN
    SELECT id_usuario INTO usuario_existente FROM usuarios LIMIT 1;
    
    IF usuario_existente IS NOT NULL THEN
        FOR prod IN SELECT id_producto, nombre FROM productos LOOP
            IF NOT EXISTS (SELECT 1 FROM reseñas WHERE id_producto = prod.id_producto LIMIT 1) THEN
                -- Buscar pedido entregado con este producto o cualquier pedido existente
                SELECT p.id_pedido INTO pedido_existente
                FROM pedidos p
                JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
                WHERE dp.id_producto = prod.id_producto
                LIMIT 1;

                IF pedido_existente IS NULL THEN
                    SELECT id_pedido INTO pedido_existente FROM pedidos LIMIT 1;
                END IF;
                
                -- Solo insertar reseñas si existe un pedido válido en la base de datos
                IF pedido_existente IS NOT NULL THEN
                    INSERT INTO reseñas (id_usuario, id_producto, id_pedido, calificacion, comentario)
                    SELECT 
                        usuario_existente,
                        prod.id_producto,
                        pedido_existente,
                        (ARRAY[4, 5, 5, 4, 3])[gs],
                        (ARRAY[
                            '¡Excelente calidad! Muy fresco y con un sabor auténtico.',
                            'Superó mis expectativas. Lo volveré a pedir sin duda.',
                            'Buen producto, llegó a tiempo y en perfecto estado.',
                            'Muy rico, toda la familia lo disfrutó. Recomendado.',
                            'Buena relación calidad-precio. El sabor es muy agradable.'
                        ])[gs]
                    FROM generate_series(1, 3 + (prod.id_producto % 3)) AS gs;
                END IF;
            END IF;
        END LOOP;
    END IF;
END $$;

-- 8. Inicializar precio_compra como 60% del precio de venta
UPDATE productos SET precio_compra = ROUND(precio * 0.60, 2) WHERE precio_compra = 0 OR precio_compra IS NULL;

-- 9. Activar la disponibilidad y frescura de TODOS los productos
UPDATE productos 
SET disponible = TRUE, 
    stock = CASE WHEN stock <= 0 THEN 25 ELSE stock END,
    fecha_elaboracion_stock = CURRENT_TIMESTAMP,
    fecha_vencimiento_stock = CURRENT_TIMESTAMP + INTERVAL '3 days';
