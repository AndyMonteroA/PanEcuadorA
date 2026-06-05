const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * GET /api/users/profile
 * Obtener perfil completo del usuario con direcciones y métodos de pago
 */
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Datos del usuario
    const userResult = await pool.query(
      `SELECT id_usuario, nombre, apellido, email, telefono, foto_perfil_url, fecha_registro
       FROM usuarios WHERE id_usuario = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    // Direcciones
    const addressResult = await pool.query(
      'SELECT * FROM direcciones WHERE id_usuario = $1 ORDER BY es_principal DESC',
      [userId]
    );

    // Métodos de pago (sin datos sensibles)
    const paymentResult = await pool.query(
      `SELECT id_metodo, tipo, ultimos_4_digitos, marca, es_principal, activo
       FROM metodos_pago WHERE id_usuario = $1 AND activo = TRUE`,
      [userId]
    );

    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        fotoPerfil: user.foto_perfil_url,
        fechaRegistro: user.fecha_registro,
        direcciones: addressResult.rows,
        metodosPago: paymentResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/profile
 * Actualizar datos del perfil
 */
router.put('/profile', authMiddleware, [
  body('nombre').optional().trim().notEmpty(),
  body('apellido').optional().trim().notEmpty(),
  body('telefono').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nombre, apellido, telefono } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE usuarios SET
        nombre = COALESCE($1, nombre),
        apellido = COALESCE($2, apellido),
        telefono = COALESCE($3, telefono)
       WHERE id_usuario = $4
       RETURNING id_usuario, nombre, apellido, email, telefono`,
      [nombre, apellido, telefono, userId]
    );

    res.json({
      success: true,
      message: 'Perfil actualizado.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/addresses
 * Agregar dirección
 */
router.post('/addresses', authMiddleware, [
  body('calle').trim().notEmpty().withMessage('La calle es obligatoria'),
  body('ciudad').trim().notEmpty().withMessage('La ciudad es obligatoria'),
  body('provincia').trim().notEmpty().withMessage('La provincia es obligatoria'),
  body('alias').optional().trim(),
  body('referencia').optional().trim(),
  body('es_principal').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { alias, calle, ciudad, provincia, referencia, es_principal } = req.body;
    const userId = req.user.id;

    // Si es principal, quitar la marca de las demás
    if (es_principal) {
      await pool.query(
        'UPDATE direcciones SET es_principal = FALSE WHERE id_usuario = $1',
        [userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO direcciones (id_usuario, alias, calle, ciudad, provincia, referencia, es_principal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, alias, calle, ciudad, provincia, referencia, es_principal || false]
    );

    res.status(201).json({
      success: true,
      message: 'Dirección agregada.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/addresses/:id
 * Eliminar dirección
 */
router.delete('/addresses/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM direcciones WHERE id_direccion = $1 AND id_usuario = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dirección no encontrada.' });
    }

    res.json({ success: true, message: 'Dirección eliminada.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/payment-methods
 * Agregar método de pago
 */
router.post('/payment-methods', authMiddleware, [
  body('tipo').isIn(['tarjeta_credito', 'tarjeta_debito', 'transferencia']),
  body('ultimos_4_digitos').optional().isLength({ min: 4, max: 4 }),
  body('marca').optional().trim(),
  body('token_cifrado').notEmpty(),
  body('es_principal').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { tipo, ultimos_4_digitos, marca, token_cifrado, es_principal } = req.body;
    const userId = req.user.id;

    if (es_principal) {
      await pool.query(
        'UPDATE metodos_pago SET es_principal = FALSE WHERE id_usuario = $1',
        [userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO metodos_pago (id_usuario, tipo, ultimos_4_digitos, marca, token_cifrado, es_principal)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_metodo, tipo, ultimos_4_digitos, marca, es_principal`,
      [userId, tipo, ultimos_4_digitos, marca, token_cifrado, es_principal || false]
    );

    res.status(201).json({
      success: true,
      message: 'Método de pago agregado.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
