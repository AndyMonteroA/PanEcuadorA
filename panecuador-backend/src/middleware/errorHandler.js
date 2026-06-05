/**
 * Middleware global de manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  // Error de validación de PostgreSQL
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'El registro ya existe (duplicado).',
      detail: err.detail
    });
  }

  // Error de restricción de clave foránea
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida. El recurso relacionado no existe.',
      detail: err.detail
    });
  }

  // Error de CHECK constraint
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Valor fuera de rango permitido.',
      detail: err.detail
    });
  }

  // Error genérico
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
