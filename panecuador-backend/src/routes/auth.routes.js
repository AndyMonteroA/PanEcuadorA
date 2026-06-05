const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Registro de nuevo usuario
 */
router.post('/register', [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('telefono').optional().trim()
], async (req, res, next) => {
  try {
    // Validar campos
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nombre, apellido, email, password, telefono } = req.body;

    // Verificar si el email ya existe
    const existingUser = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una cuenta con este email.'
      });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_usuario, nombre, apellido, email, telefono, fecha_registro`,
      [nombre, apellido, email, passwordHash, telefono || null]
    );

    const user = result.rows[0];

    // Generar JWT
    const token = jwt.sign(
      { id: user.id_usuario, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: '¡Bienvenido a PanEcuador!',
      data: {
        user: {
          id: user.id_usuario,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          telefono: user.telefono,
          fechaRegistro: user.fecha_registro
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Inicio de sesión
 */
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.'
      });
    }

    const user = result.rows[0];

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.'
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id_usuario, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      data: {
        user: {
          id: user.id_usuario,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          telefono: user.telefono,
          fotoPerfil: user.foto_perfil_url
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Obtener datos del usuario autenticado
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id_usuario, nombre, apellido, email, telefono, foto_perfil_url, fecha_registro
       FROM usuarios WHERE id_usuario = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    const user = result.rows[0];

    // Obtener suscripción activa si tiene
    const suscripcion = await pool.query(
      `SELECT su.*, m.nombre as membresia_nombre, m.descuento_porcentaje
       FROM suscripciones_usuario su
       JOIN membresias m ON su.id_membresia = m.id_membresia
       WHERE su.id_usuario = $1 AND su.estado = 'activa'
       LIMIT 1`,
      [req.user.id]
    );

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
        suscripcion: suscripcion.rows[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
