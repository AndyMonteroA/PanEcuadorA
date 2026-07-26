-- ============================================================
-- MIGRACIÓN 11: Reactivar Todos los Productos y Renovar Stock Fresco
-- PanEcuador
-- ============================================================

UPDATE productos 
SET disponible = TRUE,
    stock = CASE WHEN stock < 10 THEN 50 ELSE stock END,
    fecha_elaboracion_stock = CURRENT_TIMESTAMP,
    fecha_vencimiento_stock = CURRENT_TIMESTAMP + (vida_util_dias || ' days')::INTERVAL;
