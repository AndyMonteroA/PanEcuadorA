const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

// Google OAuth (solo si está configurado)
let OAuth2Client;
try {
  const { OAuth2Client: GoogleClient } = require('google-auth-library');
  OAuth2Client = GoogleClient;
} catch (e) {
  console.warn('⚠️  google-auth-library no instalada, Google login deshabilitado');
}

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
       RETURNING id_usuario, nombre, apellido, email, telefono, rol, fecha_registro`,
      [nombre, apellido, email, passwordHash, telefono || null]
    );

    const user = result.rows[0];

    // Generar JWT (incluye rol)
    const token = jwt.sign(
      { id: user.id_usuario, email: user.email, rol: user.rol },
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
          rol: user.rol,
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
    // Si el usuario solo tiene Google y no tiene password, indicar
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Esta cuenta usa inicio de sesión con Google. Usa el botón de Google para ingresar.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.'
      });
    }

    // Generar JWT (incluye rol)
    const token = jwt.sign(
      { id: user.id_usuario, email: user.email, rol: user.rol },
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
          fotoPerfil: user.foto_perfil_url,
          rol: user.rol
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
      `SELECT id_usuario, nombre, apellido, email, telefono, foto_perfil_url, rol, fecha_registro
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
        rol: user.rol,
        fechaRegistro: user.fecha_registro,
        suscripcion: suscripcion.rows[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
});
/**
 * POST /api/auth/forgot-password
 * Solicitar restablecimiento de contraseña
 */
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    // Buscar usuario
    const result = await pool.query(
      'SELECT id_usuario, nombre, email FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );

    // Siempre responder OK para no revelar si el email existe
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Si el email está registrado, recibirás un enlace de recuperación.'
      });
    }

    const user = result.rows[0];

    // Invalidar tokens anteriores
    await pool.query(
      'UPDATE password_reset_tokens SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE',
      [user.id_usuario]
    );

    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      'INSERT INTO password_reset_tokens (id_usuario, token, expira_en) VALUES ($1, $2, $3)',
      [user.id_usuario, token, expiraEn]
    );

    // Enviar email
    try {
      await sendPasswordResetEmail(user.email, token, user.nombre);
    } catch (emailErr) {
      console.error('Error enviando email de reset:', emailErr);
      // No falla silenciosamente en producción
    }

    res.json({
      success: true,
      message: 'Si el email está registrado, recibirás un enlace de recuperación.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Restablecer contraseña con token
 */
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token, password } = req.body;

    // Buscar token válido
    const tokenResult = await pool.query(
      `SELECT prt.*, u.email FROM password_reset_tokens prt
       JOIN usuarios u ON prt.id_usuario = u.id_usuario
       WHERE prt.token = $1 AND prt.usado = FALSE AND prt.expira_en > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.'
      });
    }

    const resetToken = tokenResult.rows[0];

    // Hash nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Actualizar contraseña
    await pool.query(
      'UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2',
      [passwordHash, resetToken.id_usuario]
    );

    // Marcar token como usado
    await pool.query(
      'UPDATE password_reset_tokens SET usado = TRUE WHERE id = $1',
      [resetToken.id]
    );

    res.json({
      success: true,
      message: '¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/google
 * Inicio de sesión con Google OAuth
 */
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Token de Google requerido.' });
    }

    if (!OAuth2Client || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        success: false,
        message: 'Login con Google no está configurado en el servidor.'
      });
    }

    // Verificar token con Google
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name, family_name, picture } = payload;

    // Buscar usuario por google_id o email
    let userResult = await pool.query(
      'SELECT * FROM usuarios WHERE google_id = $1 OR email = $2 LIMIT 1',
      [googleId, email]
    );

    let user;

    if (userResult.rows.length > 0) {
      // Usuario existente — vincular Google si no lo tiene
      user = userResult.rows[0];
      if (!user.google_id) {
        await pool.query(
          'UPDATE usuarios SET google_id = $1 WHERE id_usuario = $2',
          [googleId, user.id_usuario]
        );
      }
      // Actualizar foto de perfil si viene de Google y no tiene una
      if (picture && !user.foto_perfil_url) {
        await pool.query(
          'UPDATE usuarios SET foto_perfil_url = $1 WHERE id_usuario = $2',
          [picture, user.id_usuario]
        );
      }
    } else {
      // Usuario nuevo — crear cuenta
      const insertResult = await pool.query(
        `INSERT INTO usuarios (nombre, apellido, email, google_id, foto_perfil_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [given_name || 'Usuario', family_name || 'Google', email, googleId, picture || null]
      );
      user = insertResult.rows[0];
    }

    if (!user.activo) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta ha sido desactivada.'
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id_usuario, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: '¡Bienvenido con Google!',
      data: {
        user: {
          id: user.id_usuario,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          telefono: user.telefono,
          fotoPerfil: user.foto_perfil_url,
          rol: user.rol || 'cliente'
        },
        token
      }
    });
  } catch (error) {
    if (error.message && error.message.includes('Token used too late')) {
      return res.status(401).json({
        success: false,
        message: 'Token de Google expirado. Intenta de nuevo.'
      });
    }
    next(error);
  }
});

module.exports = router;
