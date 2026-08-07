const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../services/emailService');

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

    // 2. Calcular total de items
    const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0);

    // 3. Identificar si hay stock insuficiente (para cálculo de fecha dinámica)
    let hayStockInsuficiente = false;
    for (const item of items) {
      if (item.cantidad > item.stock) hayStockInsuficiente = true;
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
         WHERE UPPER(codigo) = UPPER($1) AND activo = TRUE 
         AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
         AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)`,
        [codigo_cupon.trim()]
      );

      if (cuponResult.rows.length > 0) {
        const cupon = cuponResult.rows[0];

        const usoPrevio = await client.query(
          'SELECT 1 FROM uso_cupones_usuario WHERE id_cupon = $1 AND id_usuario = $2',
          [cupon.id_cupon, userId]
        );

        if (usoPrevio.rows.length === 0) {
          idCupon = cupon.id_cupon;
          if (cupon.tipo_descuento === 'porcentaje') {
            descuento = subtotal * (parseFloat(cupon.valor) / 100);
          } else {
            descuento = parseFloat(cupon.valor);
          }
        }
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

    // Calcular fecha y franja horaria estimada (Dinámica — Fórmula del Profesor)
    let finalFechaEntrega = fecha_entrega_programada;
    let finalFranjaHoraria = franja_horaria;

    if (!finalFechaEntrega) {
      const now = new Date();
      let diasAAgregar = 1;
      
      // Factor 1: Hora del pedido — después de las 18:00 +1 día
      if (now.getHours() >= 18) diasAAgregar += 1;
      
      // Factor 2: Complejidad — preparación > 5 horas +1 día
      if (tiempoEstimadoTotal > 300) diasAAgregar += 1;
      
      // Factor 3: Stock insuficiente — tiempo de reposición del proveedor +1 día
      if (hayStockInsuficiente) diasAAgregar += 1;
      
      // Factor 4: Zona geográfica — si provincia ≠ Los Ríos +1 día envío interprovincial
      const dirData = await client.query('SELECT provincia FROM direcciones WHERE id_direccion = $1', [id_direccion]);
      if (dirData.rows.length > 0) {
        const prov = (dirData.rows[0].provincia || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (prov !== 'los rios') diasAAgregar += 1;
      }
      
      const fechaCalculada = new Date();
      fechaCalculada.setDate(now.getDate() + diasAAgregar);
      finalFechaEntrega = fechaCalculada.toISOString().split('T')[0];
    }

    if (!finalFranjaHoraria) {
      finalFranjaHoraria = '09:00 - 12:00';
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

    // Incrementar uso del cupón y registrar uso único por el usuario
    if (idCupon) {
      await client.query('UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id_cupon = $1', [idCupon]);
      await client.query(
        `INSERT INTO uso_cupones_usuario (id_cupon, id_usuario, id_pedido)
         VALUES ($1, $2, $3)
         ON CONFLICT (id_cupon, id_usuario) DO NOTHING`,
        [idCupon, userId, pedido.id_pedido]
      );
    }

    // 10. Crear detalle del pedido, descontar stock, registrar reposiciones y ganancias
    for (const item of items) {
      const itemSubtotal = parseFloat(item.precio) * item.cantidad;

      await client.query(`
        INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [pedido.id_pedido, item.id_producto, item.cantidad,
          parseFloat(item.precio).toFixed(2), itemSubtotal.toFixed(2)]);

      // Descontar stock disponible (puede quedar negativo, se permite venta sobre stock)
      const stockActual = item.stock || 0;
      const stockADescontar = Math.min(stockActual, item.cantidad);
      if (stockADescontar > 0) {
        await client.query(
          'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2',
          [stockADescontar, item.id_producto]
        );
      }

      // Registrar pendiente de reposición si cantidad > stock
      if (item.cantidad > stockActual) {
        const cantidadPendiente = item.cantidad - stockActual;
        await client.query(`
          INSERT INTO pendiente_reposicion (id_producto, id_pedido, cantidad_pendiente)
          VALUES ($1, $2, $3)
        `, [item.id_producto, pedido.id_pedido, cantidadPendiente]);
      }

      // Acumular ganancia en fondo de reinversión: G_total = G(t) × cantidad
      const precioCompraRes = await client.query('SELECT precio_compra FROM productos WHERE id_producto = $1', [item.id_producto]);
      const precioCompra = parseFloat(precioCompraRes.rows[0]?.precio_compra || 0);
      const gananciaUnit = parseFloat(item.precio) - precioCompra;
      const gananciaTotal = gananciaUnit * item.cantidad;
      if (gananciaUnit > 0) {
        await client.query(`
          INSERT INTO fondo_reinversion (id_pedido, id_producto, cantidad_vendida, ganancia_unitaria, ganancia_total, tipo, descripcion)
          VALUES ($1, $2, $3, $4, $5, 'venta', $6)
        `, [pedido.id_pedido, item.id_producto, item.cantidad,
            gananciaUnit.toFixed(2), gananciaTotal.toFixed(2),
            `Venta de ${item.cantidad}x ${item.nombre}`]);
      }
    }

    // 11. Vaciar carrito
    await client.query('DELETE FROM carrito WHERE id_usuario = $1', [userId]);

    // 12. Crear notificación e historial de evento inicial
    await client.query(`
      INSERT INTO notificaciones (id_usuario, tipo, mensaje)
      VALUES ($1, 'pedido', $2)
    `, [userId, `Tu pedido #${pedido.id_pedido} ha sido recibido. Tiempo estimado de elaboración: ${tiempoEstimadoTotal} minutos.`]);

    await client.query(`
      INSERT INTO historial_pedidos (id_pedido, estado, titulo, descripcion, actor_rol)
      VALUES ($1, 'pendiente', 'Pedido Recibido', 'El pedido fue ingresado exitosamente en el sistema.', 'cliente')
    `, [pedido.id_pedido]);

    await client.query('COMMIT');

    // Enviar email de confirmación (no bloquea la respuesta)
    try {
      const userResult = await pool.query(
        'SELECT nombre, email FROM usuarios WHERE id_usuario = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        const { nombre, email } = userResult.rows[0];
        sendOrderConfirmationEmail(email, nombre, pedido, items);
      }
    } catch (emailErr) {
      console.error('Error enviando email de confirmación:', emailErr);
    }

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

    // Historial de eventos (Audit Trail)
    const historialResult = await pool.query(`
      SELECT * FROM historial_pedidos
      WHERE id_pedido = $1
      ORDER BY fecha_evento ASC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...pedidoResult.rows[0],
        items: detalleResult.rows,
        historial_eventos: historialResult.rows
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

/**
 * POST /api/orders/validate-coupon
 * Validar código de cupón y obtener el valor del descuento en tiempo real
 */
router.post('/validate-coupon', authMiddleware, async (req, res, next) => {
  try {
    const { codigo_cupon, subtotal } = req.body;

    if (!codigo_cupon) {
      return res.status(400).json({ success: false, message: 'Ingresa un código de cupón.' });
    }

    const cuponResult = await pool.query(
      `SELECT * FROM cupones 
       WHERE UPPER(codigo) = UPPER($1) AND activo = TRUE 
       AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
       AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)`,
      [codigo_cupon.trim()]
    );

    if (cuponResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cupón no válido, expirado o agotado.' });
    }

    const cupon = cuponResult.rows[0];

    // Verificar si el usuario ya utilizó este cupón anteriormente (si no es de uso múltiple)
    if (!cupon.es_multiuso_usuario) {
      const usoPrevio = await pool.query(
        'SELECT 1 FROM uso_cupones_usuario WHERE id_cupon = $1 AND id_usuario = $2',
        [cupon.id_cupon, req.user.id]
      );

      if (usoPrevio.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Ya has utilizado el cupón "${cupon.codigo}". Válido solo 1 vez por usuario.`
        });
      }
    }

    const subtotalVal = parseFloat(subtotal) || 0;
    let descuento = 0;

    if (cupon.tipo_descuento === 'porcentaje') {
      descuento = subtotalVal * (parseFloat(cupon.valor) / 100);
    } else {
      descuento = parseFloat(cupon.valor);
    }

    if (descuento > subtotalVal) descuento = subtotalVal;

    res.json({
      success: true,
      data: {
        codigo: cupon.codigo,
        tipo_descuento: cupon.tipo_descuento,
        valor: parseFloat(cupon.valor),
        monto_descuento: parseFloat(descuento.toFixed(2)),
        total_con_descuento: parseFloat((subtotalVal - descuento).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

