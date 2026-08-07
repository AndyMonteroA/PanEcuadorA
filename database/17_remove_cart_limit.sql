-- ============================================================
-- MIGRACIÓN 17: Eliminar límite de 100 productos por pedido
-- PanEcuador
-- ============================================================

-- Eliminar el CHECK constraint que limita a 100 items por pedido
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_cantidad_total_items_check;
