const pool = require('../config/db');

/**
 * Servicio de rotación de stock
 * Verifica productos cuyo stock ha superado la vida útil (3 días)
 * y los marca como no disponibles
 */

async function verificarStockVencido() {
  try {
    console.log('🔄 Verificando rotación y frescura de stock...');

    // 1. Refrescar productos con stock que tenían fechas vencidas o nulas para mantener disponible = TRUE
    await pool.query(`
      UPDATE productos
      SET disponible = TRUE,
          fecha_elaboracion_stock = CURRENT_TIMESTAMP,
          fecha_vencimiento_stock = CURRENT_TIMESTAMP + (COALESCE(vida_util_dias, 3) || ' days')::INTERVAL
      WHERE (fecha_vencimiento_stock IS NULL OR fecha_vencimiento_stock < CURRENT_TIMESTAMP)
        AND stock > 0
    `);

    // 2. Solo marcar disponible = FALSE si el stock es 0 o negativo
    const result = await pool.query(`
      UPDATE productos
      SET disponible = FALSE
      WHERE stock <= 0 AND disponible = TRUE
      RETURNING id_producto, nombre, stock
    `);

    return result.rows;
  } catch (error) {
    console.error('❌ Error al verificar stock:', error);
    throw error;
  }
}

async function renovarTodosElStock(nuevoStockDefecto = 20) {
  try {
    const result = await pool.query(`
      UPDATE productos
      SET stock = CASE WHEN stock <= 0 THEN $1 ELSE stock END,
          disponible = TRUE,
          fecha_elaboracion_stock = CURRENT_TIMESTAMP,
          fecha_vencimiento_stock = CURRENT_TIMESTAMP + (COALESCE(vida_util_dias, 3) || ' days')::INTERVAL
      RETURNING *
    `, [nuevoStockDefecto]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error renovando todo el stock:', error);
    throw error;
  }
}

/**
 * Renueva la disponibilidad de productos cuando se actualiza su stock
 * (debe llamarse cuando el productor agrega nuevo stock)
 */
async function renovarStock(idProducto, nuevoStock) {
  try {
    const result = await pool.query(`
      UPDATE productos
      SET stock = $1,
          disponible = TRUE,
          fecha_elaboracion_stock = CURRENT_TIMESTAMP,
          fecha_vencimiento_stock = CURRENT_TIMESTAMP + (vida_util_dias || ' days')::INTERVAL
      WHERE id_producto = $2
      RETURNING *
    `, [nuevoStock, idProducto]);

    if (result.rows.length > 0) {
      const producto = result.rows[0];
      console.log(`📦 Stock renovado: ${producto.nombre} → ${nuevoStock} unidades (vence: ${producto.fecha_vencimiento_stock})`);

      // Notificar a usuarios con alertas
      await pool.query(`
        UPDATE alertas_producto SET notificado = TRUE
        WHERE id_producto = $1 AND notificado = FALSE
      `, [idProducto]);

      const alertas = await pool.query(`
        SELECT id_usuario FROM alertas_producto
        WHERE id_producto = $1
      `, [idProducto]);

      for (const alerta of alertas.rows) {
        await pool.query(`
          INSERT INTO notificaciones (id_usuario, tipo, mensaje)
          VALUES ($1, 'producto', $2)
        `, [alerta.id_usuario, `¡"${producto.nombre}" está disponible de nuevo!`]);
      }
    }

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error al renovar stock:', error);
    throw error;
  }
}

module.exports = { verificarStockVencido, renovarStock, renovarTodosElStock };
