const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación JWT
 * Verifica el token en el header Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado. Token no proporcionado.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Agregar datos del usuario al request (incluye rol)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol || 'cliente'
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Inicia sesión nuevamente.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token inválido.'
    });
  }
};

/**
 * Middleware opcional: si hay token lo decodifica, si no, continúa
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email, rol: decoded.rol || 'cliente' };
    }
  } catch (error) {
    // Token inválido, pero no bloqueamos
  }
  next();
};

/**
 * Middleware de administrador: verifica que el usuario sea admin
 * Debe usarse DESPUÉS de authMiddleware
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

/**
 * Middleware de productor: verifica que sea productor o admin
 */
const producerOnly = (req, res, next) => {
  if (!req.user || (req.user.rol !== 'productor' && req.user.rol !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de productor.'
    });
  }
  next();
};

/**
 * Middleware de trabajador: verifica que sea trabajador o admin
 */
const workerOnly = (req, res, next) => {
  if (!req.user || (req.user.rol !== 'trabajador' && req.user.rol !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de trabajador.'
    });
  }
  next();
};

module.exports = { authMiddleware, optionalAuth, adminOnly, producerOnly, workerOnly };
