const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/subscriptions/plans
 * Listar planes de membresía PanPass
 */
router.get('/plans', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM membresias WHERE activo = TRUE ORDER BY precio_mensual ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/my
 * Obtener suscripción activa del usuario
 */
router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT su.*, m.nombre AS plan_nombre, m.precio_mensual,
             m.incluye_caja, m.descuento_porcentaje, m.descripcion AS plan_descripcion
      FROM suscripciones_usuario su
      JOIN membresias m ON su.id_membresia = m.id_membresia
      WHERE su.id_usuario = $1
      ORDER BY su.fecha_inicio DESC
      LIMIT 1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, message: 'Sin suscripción activa.' });
    }

    // Si tiene PanPass Plus, obtener cajas
    const suscripcion = result.rows[0];
    let cajas = [];

    if (suscripcion.incluye_caja) {
      const cajasResult = await pool.query(`
        SELECT cp.*, 
               json_agg(json_build_object(
                 'producto', p.nombre,
                 'cantidad', dc.cantidad
               )) AS productos
        FROM cajas_panpass cp
        LEFT JOIN detalle_caja dc ON cp.id_caja = dc.id_caja
        LEFT JOIN productos p ON dc.id_producto = p.id_producto
        WHERE cp.id_suscripcion = $1
        GROUP BY cp.id_caja
        ORDER BY cp.mes_anio DESC
        LIMIT 6
      `, [suscripcion.id_suscripcion]);

      cajas = cajasResult.rows;
    }

    res.json({
      success: true,
      data: {
        ...suscripcion,
        cajas
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions
 * Suscribirse a un plan PanPass
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { id_membresia, id_metodo_pago } = req.body;

    // Verificar que no tenga suscripción activa
    const existente = await pool.query(
      "SELECT 1 FROM suscripciones_usuario WHERE id_usuario = $1 AND estado = 'activa'",
      [req.user.id]
    );

    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una suscripción activa. Cancélala primero para cambiar de plan.'
      });
    }

    // Verificar plan existe
    const plan = await pool.query(
      'SELECT * FROM membresias WHERE id_membresia = $1 AND activo = TRUE',
      [id_membresia]
    );

    if (plan.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
    }

    // Verificar método de pago
    const pago = await pool.query(
      'SELECT 1 FROM metodos_pago WHERE id_metodo = $1 AND id_usuario = $2 AND activo = TRUE',
      [id_metodo_pago, req.user.id]
    );

    if (pago.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Método de pago inválido.' });
    }

    // Calcular fecha de renovación (30 días)
    const result = await pool.query(`
      INSERT INTO suscripciones_usuario (id_usuario, id_membresia, id_metodo_pago, fecha_renovacion)
      VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '30 days')
      RETURNING *
    `, [req.user.id, id_membresia, id_metodo_pago]);

    // Notificación
    await pool.query(`
      INSERT INTO notificaciones (id_usuario, tipo, mensaje)
      VALUES ($1, 'suscripcion', $2)
    `, [req.user.id, `¡Bienvenido a ${plan.rows[0].nombre}! Disfruta de tus beneficios desde hoy.`]);

    res.status(201).json({
      success: true,
      message: `¡Te has suscrito a ${plan.rows[0].nombre}!`,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/subscriptions/cancel
 * Cancelar suscripción activa
 */
router.put('/cancel', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      UPDATE suscripciones_usuario SET estado = 'cancelada'
      WHERE id_usuario = $1 AND estado = 'activa'
      RETURNING *
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tienes suscripción activa.'
      });
    }

    res.json({
      success: true,
      message: 'Suscripción cancelada. Tus beneficios estarán activos hasta el fin del período.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
