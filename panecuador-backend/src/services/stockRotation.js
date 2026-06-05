const pool = require('../config/db');

/**
 * Servicio de rotación de stock
 * Verifica productos cuyo stock ha superado la vida útil (3 días)
 * y los marca como no disponibles
 */

async function verificarStockVencido() {
  try {
    console.log('🔄 Verificando stock vencido...');

    // Productos con stock vencido (fecha_elaboracion_stock + vida_util_dias < ahora)
    const result = await pool.query(`
      UPDATE productos
      SET disponible = FALSE
      WHERE fecha_elaboracion_stock IS NOT NULL
        AND fecha_elaboracion_stock + (vida_util_dias || ' days')::INTERVAL < CURRENT_TIMESTAMP
        AND disponible = TRUE
        AND stock > 0
      RETURNING id_producto, nombre, stock, vida_util_dias, fecha_elaboracion_stock
    `);

    if (result.rows.length > 0) {
      console.log(`⚠️  ${result.rows.length} productos marcados como no disponibles por stock vencido:`);
      result.rows.forEach(p => {
        console.log(`   - ${p.nombre} (stock: ${p.stock}, elaborado: ${p.fecha_elaboracion_stock})`);
      });

      // Notificar a usuarios que tenían alertas de estos productos
      for (const producto of result.rows) {
        await pool.query(`
          INSERT INTO notificaciones (id_usuario, tipo, mensaje)
          SELECT ap.id_usuario, 'producto',
                 'El producto "' || $2 || '" ha sido retirado temporalmente por frescura del stock.'
          FROM alertas_producto ap
          WHERE ap.id_producto = $1 AND ap.notificado = FALSE
        `, [producto.id_producto, producto.nombre]);
      }
    } else {
      console.log('✅ No hay stock vencido.');
    }

    return result.rows;
  } catch (error) {
    console.error('❌ Error al verificar stock vencido:', error);
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

module.exports = { verificarStockVencido, renovarStock };
