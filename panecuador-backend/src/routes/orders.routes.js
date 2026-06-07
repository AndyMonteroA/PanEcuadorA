const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/orders
 * Crear pedido desde el carrito
 * Incluye cálculo de estimación de tiempo de entrega
 */
router.post('/', authMiddleware, async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      id_direccion,
      id_metodo_pago,
      codigo_cupon,
      fecha_entrega_programada,
      franja_horaria,
      notas_cliente
    } = req.body;

    const userId = req.user.id;

    // 1. Obtener items del carrito
    const carritoResult = await client.query(`
      SELECT c.*, p.precio, p.stock, p.nombre, p.tiempo_elaboracion_min, p.disponible
      FROM carrito c
      JOIN productos p ON c.id_producto = p.id_producto
      WHERE c.id_usuario = $1
    `, [userId]);

    if (carritoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío.'
      });
    }

    const items = carritoResult.rows;

    // 2. Validar máximo 100 productos
    const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0);
    if (totalItems > 100) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `El pedido no puede superar 100 productos. Tienes ${totalItems}.`
      });
    }

    // 3. Verificar stock y disponibilidad de cada producto
    for (const item of items) {
      if (!item.disponible) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `El producto "${item.nombre}" ya no está disponible.`
        });
      }
      if (item.stock < item.cantidad) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para "${item.nombre}". Disponible: ${item.stock}, solicitado: ${item.cantidad}`
        });
      }
    }

    // 4. Verificar dirección pertenece al usuario
    const dirResult = await client.query(
      'SELECT 1 FROM direcciones WHERE id_direccion = $1 AND id_usuario = $2',
      [id_direccion, userId]
    );
    if (dirResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Dirección inválida.' });
    }

    // 5. Verificar método de pago
    const pagoResult = await client.query(
      'SELECT 1 FROM metodos_pago WHERE id_metodo = $1 AND id_usuario = $2 AND activo = TRUE',
      [id_metodo_pago, userId]
    );
    if (pagoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Método de pago inválido.' });
    }

    // 6. Calcular subtotal y tiempo estimado de elaboración
    let subtotal = 0;
    let tiempoEstimadoTotal = 0;

    items.forEach(item => {
      subtotal += parseFloat(item.precio) * item.cantidad;
      tiempoEstimadoTotal += item.tiempo_elaboracion_min * item.cantidad;
    });

    // 7. Aplicar cupón si existe
    let descuento = 0;
    let idCupon = null;

    if (codigo_cupon) {
      const cuponResult = await client.query(
        `SELECT * FROM cupones 
         WHERE codigo = $1 AND activo = TRUE 
         AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
         AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)`,
        [codigo_cupon]
      );

      if (cuponResult.rows.length > 0) {
        const cupon = cuponResult.rows[0];
        idCupon = cupon.id_cupon;

        if (cupon.tipo_descuento === 'porcentaje') {
          descuento = subtotal * (parseFloat(cupon.valor) / 100);
        } else {
          descuento = parseFloat(cupon.valor);
        }

        // Incrementar uso del cupón
        await client.query(
          'UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id_cupon = $1',
          [idCupon]
        );
      }
    }

    // 8. Verificar si tiene suscripción PanPass para descuento adicional
    const suscripcionResult = await client.query(
      `SELECT m.descuento_porcentaje
       FROM suscripciones_usuario su
       JOIN membresias m ON su.id_membresia = m.id_membresia
       WHERE su.id_usuario = $1 AND su.estado = 'activa'
       LIMIT 1`,
      [userId]
    );

    if (suscripcionResult.rows.length > 0) {
      const descuentoPanPass = subtotal * (parseFloat(suscripcionResult.rows[0].descuento_porcentaje) / 100);
      descuento += descuentoPanPass;
    }

    const total = Math.max(0, subtotal - descuento);

    // Calcular fecha y franja horaria estimada (Estilo Amazon)
    let finalFechaEntrega = fecha_entrega_programada;
    let finalFranjaHoraria = franja_horaria;

    if (!finalFechaEntrega) {
      const now = new Date();
      let diasAAgregar = 1;
      
      // Si el pedido se realiza después de las 18:00 (6:00 PM), se agrega 1 día más
      if (now.getHours() >= 18) {
        diasAAgregar += 1;
      }
      
      // Si la preparación total supera las 5 horas (300 minutos), se agrega 1 día más
      if (tiempoEstimadoTotal > 300) {
        diasAAgregar += 1;
      }
      
      const fechaCalculada = new Date();
      fechaCalculada.setDate(now.getDate() + diasAAgregar);
      finalFechaEntrega = fechaCalculada.toISOString().split('T')[0];
    }

    if (!finalFranjaHoraria) {
      finalFranjaHoraria = '09:00 - 12:00'; // Franja por defecto por la mañana
    }

    // 9. Crear el pedido
    const pedidoResult = await client.query(`
      INSERT INTO pedidos (id_usuario, id_direccion, id_metodo_pago, id_cupon,
                           subtotal, descuento, total, cantidad_total_items,
                           tiempo_estimado_min, fecha_entrega_programada,
                           franja_horaria, notas_cliente)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [userId, id_direccion, id_metodo_pago, idCupon,
        subtotal.toFixed(2), descuento.toFixed(2), total.toFixed(2),
        totalItems, tiempoEstimadoTotal,
        finalFechaEntrega, finalFranjaHoraria,
        notas_cliente || null]);

    const pedido = pedidoResult.rows[0];

    // 10. Crear detalle del pedido y actualizar stock
    for (const item of items) {
      const itemSubtotal = parseFloat(item.precio) * item.cantidad;

      await client.query(`
        INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [pedido.id_pedido, item.id_producto, item.cantidad,
          parseFloat(item.precio).toFixed(2), itemSubtotal.toFixed(2)]);

      // Descontar stock
      await client.query(
        'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2',
        [item.cantidad, item.id_producto]
      );
    }

    // 11. Vaciar carrito
    await client.query('DELETE FROM carrito WHERE id_usuario = $1', [userId]);

    // 12. Crear notificación
    await client.query(`
      INSERT INTO notificaciones (id_usuario, tipo, mensaje)
      VALUES ($1, 'pedido', $2)
    `, [userId, `Tu pedido #${pedido.id_pedido} ha sido recibido. Tiempo estimado de elaboración: ${tiempoEstimadoTotal} minutos.`]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: '¡Pedido creado exitosamente!',
      data: {
        pedido: {
          id: pedido.id_pedido,
          estado: pedido.estado,
          subtotal: pedido.subtotal,
          descuento: pedido.descuento,
          total: pedido.total,
          totalItems: pedido.cantidad_total_items,
          tiempoEstimadoMin: pedido.tiempo_estimado_min,
          fechaEntregaProgramada: pedido.fecha_entrega_programada,
          franjaHoraria: pedido.franja_horaria,
          fechaPedido: pedido.fecha_pedido
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * GET /api/orders
 * Historial de pedidos del usuario
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { estado, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT p.*,
             d.alias AS direccion_alias, d.calle AS direccion_calle,
             d.ciudad AS direccion_ciudad
      FROM pedidos p
      LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
      WHERE p.id_usuario = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (estado) {
      query += ` AND p.estado = $${paramIndex++}`;
      params.push(estado);
    }

    query += ` ORDER BY p.fecha_pedido DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id
 * Detalle de un pedido con sus productos
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Pedido
    const pedidoResult = await pool.query(`
      SELECT p.*,
             d.alias AS direccion_alias, d.calle, d.ciudad, d.provincia, d.referencia,
             mp.tipo AS metodo_tipo, mp.ultimos_4_digitos, mp.marca,
             dev.id_devolucion, dev.estado AS devolucion_estado, dev.motivo AS devolucion_motivo, dev.fecha_solicitud AS devolucion_fecha_solicitud
      FROM pedidos p
      LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
      LEFT JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo
      LEFT JOIN devoluciones dev ON p.id_pedido = dev.id_pedido
      WHERE p.id_pedido = $1 AND p.id_usuario = $2
    `, [req.params.id, req.user.id]);

    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
    }

    // Detalle (productos)
    const detalleResult = await pool.query(`
      SELECT dp.*, p.nombre, p.descripcion,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen
      FROM detalle_pedido dp
      JOIN productos p ON dp.id_producto = p.id_producto
      WHERE dp.id_pedido = $1
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...pedidoResult.rows[0],
        items: detalleResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/orders/:id/cancel
 * Cancelar pedido (solo si está pendiente)
 */
router.put('/:id/cancel', authMiddleware, async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pedido = await client.query(
      'SELECT * FROM pedidos WHERE id_pedido = $1 AND id_usuario = $2',
      [req.params.id, req.user.id]
    );

    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
    }

    if (pedido.rows[0].estado !== 'pendiente') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden cancelar pedidos pendientes.'
      });
    }

    // Restaurar stock
    const detalles = await client.query(
      'SELECT * FROM detalle_pedido WHERE id_pedido = $1',
      [req.params.id]
    );

    for (const det of detalles.rows) {
      await client.query(
        'UPDATE productos SET stock = stock + $1 WHERE id_producto = $2',
        [det.cantidad, det.id_producto]
      );
    }

    // Cambiar estado
    await client.query(
      "UPDATE pedidos SET estado = 'cancelado' WHERE id_pedido = $1",
      [req.params.id]
    );

    // Notificación
    await client.query(`
      INSERT INTO notificaciones (id_usuario, tipo, mensaje)
      VALUES ($1, 'pedido', $2)
    `, [req.user.id, `Tu pedido #${req.params.id} ha sido cancelado.`]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Pedido cancelado. Stock restaurado.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
