-- ============================================================
-- MIGRACIÓN 17: Eliminar límite fijo de 100 productos por pedido
-- y agregar configuración dinámica del límite desde el admin
-- PanEcuador
-- ============================================================

-- 1. Eliminar el CHECK constraint rígido que limitaba a 100 items por pedido
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_cantidad_total_items_check;

-- 2. Agregar configuración dinámica del límite del carrito (administrable desde panel admin)
--    El admin puede cambiar este valor en cualquier momento desde Configuración del Sitio
INSERT INTO configuracion_sitio (clave, valor, descripcion, tipo) VALUES
  ('limite_carrito', '9999', 'Cantidad máxima de productos permitidos en el carrito por pedido (0 = sin límite)', 'numero')
ON CONFLICT (clave) DO NOTHING;
