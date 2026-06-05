const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/notifications
 * Obtener notificaciones del usuario
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { leida, limit = 20 } = req.query;

    let query = 'SELECT * FROM notificaciones WHERE id_usuario = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (leida !== undefined) {
      query += ` AND leida = $${paramIndex++}`;
      params.push(leida === 'true');
    }

    query += ` ORDER BY fecha DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Contar no leídas
    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE',
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows,
      noLeidas: parseInt(unreadResult.rows[0].count)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Marcar notificación como leída
 */
router.put('/:id/read', authMiddleware, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE id_notificacion = $1 AND id_usuario = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notificación marcada como leída.' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/notifications/read-all
 * Marcar todas como leídas
 */
router.put('/read-all', authMiddleware, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE id_usuario = $1 AND leida = FALSE',
      [req.user.id]
    );
    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
