const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * GET /api/reviews/product/:id
 * Obtener reseñas de un producto
 */
router.get('/product/:id', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(`
      SELECT r.*, u.nombre, u.apellido, u.foto_perfil_url
      FROM reseñas r
      JOIN usuarios u ON r.id_usuario = u.id_usuario
      WHERE r.id_producto = $1
      ORDER BY r.fecha DESC
      LIMIT $2 OFFSET $3
    `, [req.params.id, parseInt(limit), offset]);

    // Estadísticas
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(AVG(calificacion), 0) as promedio,
        COUNT(CASE WHEN calificacion = 5 THEN 1 END) as cinco,
        COUNT(CASE WHEN calificacion = 4 THEN 1 END) as cuatro,
        COUNT(CASE WHEN calificacion = 3 THEN 1 END) as tres,
        COUNT(CASE WHEN calificacion = 2 THEN 1 END) as dos,
        COUNT(CASE WHEN calificacion = 1 THEN 1 END) as uno
      FROM reseñas WHERE id_producto = $1
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        resenas: result.rows,
        estadisticas: stats.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reviews
 * Crear reseña (solo si compró el producto)
 */
router.post('/', authMiddleware, [
  body('id_producto').isInt(),
  body('id_pedido').isInt(),
  body('calificacion').isInt({ min: 1, max: 5 }),
  body('comentario').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id_producto, id_pedido, calificacion, comentario } = req.body;

    // Verificar que el usuario hizo este pedido y contiene el producto
    const verificar = await pool.query(`
      SELECT 1 FROM pedidos p
      JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
      WHERE p.id_pedido = $1 AND p.id_usuario = $2 AND dp.id_producto = $3
      AND p.estado = 'entregado'
    `, [id_pedido, req.user.id, id_producto]);

    if (verificar.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes reseñar productos de pedidos entregados.'
      });
    }

    const result = await pool.query(`
      INSERT INTO reseñas (id_usuario, id_producto, id_pedido, calificacion, comentario)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, id_producto, id_pedido, calificacion, comentario || null]);

    res.status(201).json({
      success: true,
      message: '¡Gracias por tu reseña!',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// FAVORITOS
// ============================================================

/**
 * GET /api/reviews/favorites
 * Obtener favoritos del usuario
 */
router.get('/favorites', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT f.id_favorito, f.fecha_agregado,
             p.id_producto, p.nombre, p.precio, p.disponible, p.stock,
             c.nombre AS categoria_nombre,
             pr.nombre_negocio AS productor_nombre,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen
      FROM favoritos f
      JOIN productos p ON f.id_producto = p.id_producto
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN productores pr ON p.id_productor = pr.id_productor
      WHERE f.id_usuario = $1
      ORDER BY f.fecha_agregado DESC
    `, [req.user.id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reviews/favorites/:productId
 * Toggle favorito (agregar o quitar)
 */
router.post('/favorites/:productId', authMiddleware, async (req, res, next) => {
  try {
    const productId = req.params.productId;

    // Verificar si ya es favorito
    const existing = await pool.query(
      'SELECT id_favorito FROM favoritos WHERE id_usuario = $1 AND id_producto = $2',
      [req.user.id, productId]
    );

    if (existing.rows.length > 0) {
      // Quitar de favoritos
      await pool.query(
        'DELETE FROM favoritos WHERE id_usuario = $1 AND id_producto = $2',
        [req.user.id, productId]
      );
      res.json({ success: true, message: 'Eliminado de favoritos.', esFavorito: false });
    } else {
      // Agregar a favoritos
      await pool.query(
        'INSERT INTO favoritos (id_usuario, id_producto) VALUES ($1, $2)',
        [req.user.id, productId]
      );
      res.json({ success: true, message: '¡Agregado a favoritos!', esFavorito: true });
    }
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DEVOLUCIONES
// ============================================================

/**
 * POST /api/reviews/returns
 * Solicitar devolución
 */
router.post('/returns', authMiddleware, [
  body('id_pedido').isInt(),
  body('motivo').trim().notEmpty().withMessage('El motivo es obligatorio')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id_pedido, motivo } = req.body;

    // Verificar que el pedido pertenece al usuario y está entregado
    const pedido = await pool.query(
      "SELECT 1 FROM pedidos WHERE id_pedido = $1 AND id_usuario = $2 AND estado = 'entregado'",
      [id_pedido, req.user.id]
    );

    if (pedido.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes solicitar devolución de pedidos entregados.'
      });
    }

    // Verificar que no haya devolución previa
    const devExistente = await pool.query(
      'SELECT 1 FROM devoluciones WHERE id_pedido = $1',
      [id_pedido]
    );

    if (devExistente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una solicitud de devolución para este pedido.'
      });
    }

    const result = await pool.query(`
      INSERT INTO devoluciones (id_pedido, id_usuario, motivo)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id_pedido, req.user.id, motivo]);

    // Notificación
    await pool.query(`
      INSERT INTO notificaciones (id_usuario, tipo, mensaje)
      VALUES ($1, 'pedido', $2)
    `, [req.user.id, `Tu solicitud de devolución para el pedido #${id_pedido} ha sido recibida.`]);

    res.status(201).json({
      success: true,
      message: 'Solicitud de devolución enviada.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
